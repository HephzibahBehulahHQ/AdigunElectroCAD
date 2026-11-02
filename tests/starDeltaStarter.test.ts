import { describe, expect, it } from "vitest";
import { initialStarDeltaState, starDeltaContacts, starDeltaWindingPoint, transitionStarDelta } from "../src/simulation/starDeltaStarter";
describe("star-delta sequencing", () => {
  it("rejects invalid winding inputs", () => {
    const state = initialStarDeltaState();
    for (const values of [[400, 0, 10], [-1, 10, 10], [400, 10, -1], [Infinity, 10, 10], [400, NaN, 10]]) expect(() => starDeltaWindingPoint(state, ...values as [number, number, number])).toThrow();
  });
  it("computes balanced winding voltage and the one-third star line-current ratio", () => {
    let state = transitionStarDelta(transitionStarDelta(initialStarDeltaState(), "close-breaker"), "start");
    const star = starDeltaWindingPoint(state, 400, 10, 10);
    expect(star.windingVoltageV).toBeCloseTo(400 / Math.sqrt(3));
    state = transitionStarDelta(state, "tick", 5000);
    expect(starDeltaWindingPoint(state, 400, 10, 10).lineCurrentA).toBe(0);
    state = transitionStarDelta(state, "tick", 200);
    const delta = starDeltaWindingPoint(state, 400, 10, 10);
    expect(delta.lineCurrentA / star.lineCurrentA).toBeCloseTo(3);
    expect(delta.realPowerW / star.realPowerW).toBeCloseTo(3);
  });
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
