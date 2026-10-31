export type MotorState = "stopped" | "starting" | "running" | "stopping" | "tripped";
export type DolAction = "close-breaker" | "open-breaker" | "press-start" | "release-start" | "press-stop" | "trip-overload" | "reset-overload" | "tick" | "reset";

export interface DolSimulationState {
  breakerClosed: boolean;
  startPressed: boolean;
  contactorEnergized: boolean;
  overloadTripped: boolean;
  motorState: MotorState;
  motorSpeedRpm: number;
  lineVoltageV: number;
  lineCurrentA: number;
  elapsedMs: number;
  events: string[];
}

export const initialDolState = (): DolSimulationState => ({ breakerClosed: false, startPressed: false, contactorEnergized: false, overloadTripped: false, motorState: "stopped", motorSpeedRpm: 0, lineVoltageV: 0, lineCurrentA: 0, elapsedMs: 0, events: ["Simulation reset"] });

export function transitionDol(state: DolSimulationState, action: DolAction, elapsedMs = 0): DolSimulationState {
  let next = { ...state, events: [...state.events] };
  const record = (message: string) => { next.events = [message, ...next.events].slice(0, 20); };

  switch (action) {
    case "close-breaker": next.breakerClosed = true; record("Q1 closed — control supply available"); break;
    case "open-breaker": next.breakerClosed = false; next.contactorEnergized = false; record("Q1 opened — motor supply removed"); break;
    case "press-start": next.startPressed = true; record("S1 START pressed"); break;
    case "release-start": next.startPressed = false; record("S1 START released"); break;
    case "press-stop": next.startPressed = false; next.contactorEnergized = false; record("S0 STOP pressed — KM1 coil path opened"); break;
    case "trip-overload": next.overloadTripped = true; next.contactorEnergized = false; record("F1 overload trip — 95–96 opened"); break;
    case "reset-overload":
      if (!next.contactorEnergized && next.motorSpeedRpm <= 1) { next.overloadTripped = false; record("F1 manually reset"); }
      else record("F1 reset rejected while motor is energized or coasting");
      break;
    case "reset": return initialDolState();
    case "tick": break;
  }

  if (action !== "press-stop" && action !== "trip-overload" && action !== "open-breaker") {
    const shouldEnergize = next.breakerClosed && !next.overloadTripped && (next.startPressed || next.contactorEnergized);
    if (shouldEnergize !== next.contactorEnergized) record(shouldEnergize ? "KM1 coil energized — main and holding contacts closed" : "KM1 coil de-energized — contacts opened");
    next.contactorEnergized = shouldEnergize;
  }

  if (action === "tick") {
    const seconds = Math.max(0, elapsedMs) / 1000;
    const supplied = next.breakerClosed && next.contactorEnergized && !next.overloadTripped;
    const targetRpm = 1440;
    const rate = supplied ? 600 : 450;
    next.motorSpeedRpm = supplied ? Math.min(targetRpm, next.motorSpeedRpm + rate * seconds) : Math.max(0, next.motorSpeedRpm - rate * seconds);
    next.elapsedMs += Math.max(0, elapsedMs);
    next.lineVoltageV = supplied ? 400 : 0;
    next.lineCurrentA = supplied ? Math.max(12.5, 75 - next.motorSpeedRpm / 24) : 0;
  }

  const supplied = next.breakerClosed && next.contactorEnergized && !next.overloadTripped;
  next.motorState = next.overloadTripped ? "tripped" : supplied ? (next.motorSpeedRpm >= 1296 ? "running" : "starting") : next.motorSpeedRpm > 0 ? "stopping" : "stopped";
  return next;
}
