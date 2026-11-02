export interface StarDeltaState {
  breakerClosed: boolean;
  overloadTripped: boolean;
  stage: "stopped" | "star" | "transition" | "delta";
  sequenceMs: number;
  starDurationMs: number;
  transitionDurationMs: number;
}
export type StarDeltaAction = "close-breaker" | "open-breaker" | "start" | "stop" | "trip-overload" | "reset-overload" | "tick";
export function initialStarDeltaState(starDurationMs = 5000, transitionDurationMs = 200): StarDeltaState {
  if (!Number.isFinite(starDurationMs) || starDurationMs <= 0 || !Number.isFinite(transitionDurationMs) || transitionDurationMs <= 0) throw new Error("Positive finite switching durations required");
  return { breakerClosed: false, overloadTripped: false, stage: "stopped", sequenceMs: 0, starDurationMs, transitionDurationMs };
}
export function starDeltaContacts(state: StarDeltaState) {
  const enabled = state.breakerClosed && !state.overloadTripped && state.stage !== "stopped";
  return { main: enabled, star: enabled && state.stage === "star", delta: enabled && state.stage === "delta" };
}

/** Balanced fixed winding impedance; excludes slip and transient motor behavior. */
export function starDeltaWindingPoint(state: StarDeltaState, lineVoltageV: number, resistanceOhm: number, reactanceOhm: number) {
  if (![lineVoltageV, resistanceOhm, reactanceOhm].every(Number.isFinite) || lineVoltageV < 0 || resistanceOhm <= 0 || reactanceOhm < 0) throw new Error("Invalid winding parameters");
  const contacts = starDeltaContacts(state);
  const windingVoltageV = contacts.star ? lineVoltageV / Math.sqrt(3) : contacts.delta ? lineVoltageV : 0;
  const windingCurrentA = windingVoltageV / Math.hypot(resistanceOhm, reactanceOhm);
  const lineCurrentA = contacts.delta ? Math.sqrt(3) * windingCurrentA : windingCurrentA;
  const realPowerW = 3 * windingCurrentA ** 2 * resistanceOhm;
  return { windingVoltageV, windingCurrentA, lineCurrentA, realPowerW };
}
/** Open-transition sequencing; contact states derive from one mutually exclusive stage. */
export function transitionStarDelta(state: StarDeltaState, action: StarDeltaAction, deltaMs = 0): StarDeltaState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Invalid simulation time step");
  const next = { ...state };
  if (action === "close-breaker") next.breakerClosed = true;
  if (action === "open-breaker") next.breakerClosed = false;
  if (action === "trip-overload") next.overloadTripped = true;
  if (action === "reset-overload" && next.stage === "stopped") next.overloadTripped = false;
  if (action === "start" && next.breakerClosed && !next.overloadTripped && next.stage === "stopped") { next.stage = "star"; next.sequenceMs = 0; }
  if (action === "stop" || !next.breakerClosed || next.overloadTripped) { next.stage = "stopped"; next.sequenceMs = 0; }
  if (action === "tick" && next.stage !== "stopped") {
    next.sequenceMs += deltaMs;
    next.stage = next.sequenceMs < next.starDurationMs ? "star" : next.sequenceMs < next.starDurationMs + next.transitionDurationMs ? "transition" : "delta";
  }
  return next;
}
