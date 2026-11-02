import { describe, expect, it } from "vitest";
import { initialReversingState, transitionReversing } from "../src/simulation/reversingStarter";
describe("reversing starter", () => {
  it("holds forward, rejects reverse, coasts to stop, then runs reverse", () => {
    let state = transitionReversing(initialReversingState(), "close-breaker");
    state = transitionReversing(state, "start-forward");
    state = transitionReversing(state, "tick", 3000);
    expect(state.speedRpm).toBe(1440);
    state = transitionReversing(state, "start-reverse");
    expect(state.contactor).toBe("forward");
    state = transitionReversing(state, "stop");
    expect(transitionReversing(state, "start-reverse").contactor).toBeNull();
    state = transitionReversing(state, "tick", 4000);
    state = transitionReversing(state, "start-reverse");
    state = transitionReversing(state, "tick", 3000);
    expect(state.speedRpm).toBe(-1440);
  });
  it("drops on supply loss and requires a fresh start after restoration", () => {
    let state = transitionReversing(transitionReversing(initialReversingState(), "close-breaker"), "start-forward");
    state = transitionReversing(state, "open-breaker");
    state = transitionReversing(state, "close-breaker");
    expect(state.contactor).toBeNull();
  });
  it("requires stopping before overload reset and never restarts on reset", () => {
    let state = transitionReversing(transitionReversing(initialReversingState(), "close-breaker"), "start-forward");
    state = transitionReversing(state, "tick", 1000);
    state = transitionReversing(state, "trip-overload");
    expect(transitionReversing(state, "reset-overload").overloadTripped).toBe(true);
    state = transitionReversing(state, "tick", 2000);
    state = transitionReversing(state, "reset-overload");
    expect(state.overloadTripped).toBe(false);
    expect(state.contactor).toBeNull();
  });
});
