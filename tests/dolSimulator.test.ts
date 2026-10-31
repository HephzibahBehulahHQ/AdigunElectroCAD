import { describe, expect, it } from "vitest";
import { initialDolState, transitionDol } from "../src/simulation/dolSimulator";

describe("DOL motor starter model", () => {
  it("does not energize the contactor when START is pressed without control supply", () => {
    const state = transitionDol(initialDolState(), "press-start");
    expect(state.contactorEnergized).toBe(false);
    expect(state.motorState).toBe("stopped");
  });

  it("holds KM1 after START is released and starts the motor from the modeled power path", () => {
    let state = transitionDol(initialDolState(), "close-breaker");
    state = transitionDol(state, "press-start");
    expect(state.contactorEnergized).toBe(true);
    state = transitionDol(state, "release-start");
    expect(state.contactorEnergized).toBe(true);
    state = transitionDol(state, "tick", 2400);
    expect(state.motorState).toBe("running");
    expect(state.lineVoltageV).toBe(400);
    expect(state.lineCurrentA).toBeGreaterThanOrEqual(12.5);
  });

  it("opens the contactor on STOP and lets the motor coast down", () => {
    let state = transitionDol(initialDolState(), "close-breaker");
    state = transitionDol(state, "press-start");
    state = transitionDol(state, "release-start");
    state = transitionDol(state, "tick", 2000);
    state = transitionDol(state, "press-stop");
    expect(state.contactorEnergized).toBe(false);
    expect(state.motorState).toBe("stopping");
    state = transitionDol(state, "tick", 4000);
    expect(state.motorState).toBe("stopped");
    expect(state.motorSpeedRpm).toBe(0);
  });

  it("trips and safely resets the overload after the motor stops", () => {
    let state = transitionDol(initialDolState(), "close-breaker");
    state = transitionDol(state, "press-start");
    state = transitionDol(state, "trip-overload");
    expect(state.overloadTripped).toBe(true);
    expect(state.contactorEnergized).toBe(false);
    state = transitionDol(state, "reset-overload");
    expect(state.overloadTripped).toBe(false);
  });
});
