import { describe, expect, it } from "vitest";
import { initialStarDeltaState, starDeltaContacts, transitionStarDelta } from "../src/simulation/starDeltaStarter";
describe("star-delta sequencing", () => {
  it("opens star for the complete transition interval before closing delta", () => {
    let state = transitionStarDelta(initialStarDeltaState(), "close-breaker");
    state = transitionStarDelta(state, "start");
    expect(starDeltaContacts(state)).toEqual({ main: true, star: true, delta: false });
    state = transitionStarDelta(state, "tick", 5000);
    expect(starDeltaContacts(state)).toEqual({ main: true, star: false, delta: false });
    state = transitionStarDelta(state, "tick", 199);
    expect(state.stage).toBe("transition");
    state = transitionStarDelta(state, "tick", 1);
    expect(starDeltaContacts(state)).toEqual({ main: true, star: false, delta: true });
  });
  it("drops every contactor on overload and requires a fresh start after reset", () => {
    let state = transitionStarDelta(transitionStarDelta(initialStarDeltaState(), "close-breaker"), "start");
    state = transitionStarDelta(state, "trip-overload");
    expect(starDeltaContacts(state)).toEqual({ main: false, star: false, delta: false });
    state = transitionStarDelta(state, "reset-overload");
    expect(state.stage).toBe("stopped");
  });
  it("does not restart after supply restoration", () => {
    let state = transitionStarDelta(transitionStarDelta(initialStarDeltaState(), "close-breaker"), "start");
    state = transitionStarDelta(state, "open-breaker");
    state = transitionStarDelta(state, "close-breaker");
    expect(state.stage).toBe("stopped");
  });
});
