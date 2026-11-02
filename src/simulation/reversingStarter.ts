export type Direction = "forward" | "reverse";
export interface ReversingState {
  breakerClosed: boolean;
  overloadTripped: boolean;
  contactor: Direction | null;
  speedRpm: number;
  elapsedMs: number;
  notice: string;
}
export type ReversingAction = "close-breaker" | "open-breaker" | "start-forward" | "start-reverse" | "stop" | "trip-overload" | "reset-overload" | "tick";
export const initialReversingState = (): ReversingState => ({ breakerClosed: false, overloadTripped: false, contactor: null, speedRpm: 0, elapsedMs: 0, notice: "Stopped" });

/** Educational reversing control with signed speed and stop-before-reverse interlock. */
export function transitionReversing(state: ReversingState, action: ReversingAction, deltaMs = 0): ReversingState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Invalid simulation time step");
  const next = { ...state };
  if (action === "close-breaker") next.breakerClosed = true;
  if (action === "open-breaker") { next.breakerClosed = false; next.contactor = null; }
  if (action === "stop") { next.contactor = null; next.notice = "STOP — contactors released"; }
  if (action === "trip-overload") { next.overloadTripped = true; next.contactor = null; next.notice = "Overload tripped"; }
  if (action === "reset-overload") {
    if (next.contactor === null && Math.abs(next.speedRpm) <= 1) { next.overloadTripped = false; next.notice = "Overload reset — press START"; }
    else next.notice = "Reset rejected while moving";
  }
  if (action === "start-forward" || action === "start-reverse") {
    const requested = action === "start-forward" ? "forward" : "reverse";
    if (!next.breakerClosed || next.overloadTripped) next.notice = "START rejected — supply or overload";
    else if (next.contactor !== null && next.contactor !== requested) next.notice = "Opposite contactor interlock active";
    else if (next.contactor === null && Math.abs(next.speedRpm) > 1) next.notice = "Wait for motor to stop before restarting";
    else { next.contactor = requested; next.notice = `${requested} holding contact latched`; }
  }
  if (!next.breakerClosed || next.overloadTripped) next.contactor = null;
  if (action === "tick") {
    const target = next.contactor === "forward" ? 1440 : next.contactor === "reverse" ? -1440 : 0;
    const step = (next.contactor ? 600 : 450) * deltaMs / 1000;
    next.speedRpm += Math.sign(target - next.speedRpm) * Math.min(Math.abs(target - next.speedRpm), step);
    next.elapsedMs += deltaMs;
  }
  return next;
}
