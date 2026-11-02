import { expect, it } from "vitest";
import { initialSafetyReset, scanSafetyReset } from "../src/simulation/safetyReset";

it("rejects held reset on startup and retains enable after a valid reset is released", () => {
  let state = scanSafetyReset(initialSafetyReset(), true, true, true);
  expect(state.armed).toBe(false);
  state = scanSafetyReset(state, true, true, false);
  state = scanSafetyReset(state, true, true, true);
  expect(state.armed).toBe(true);
  expect(scanSafetyReset(state, true, true, false).armed).toBe(true);
});

it.each(["A", "B"])("requires a new reset after channel %s opens, including reset held during recovery", (channel) => {
  let state = scanSafetyReset(initialSafetyReset(), true, true, false);
  state = scanSafetyReset(state, true, true, true);
  state = scanSafetyReset(state, channel !== "A", channel !== "B", true);
  expect(state.armed).toBe(false);
  state = scanSafetyReset(state, true, true, true);
  expect(state.armed).toBe(false);
  state = scanSafetyReset(state, true, true, false);
  expect(state.armed).toBe(false);
  state = scanSafetyReset(state, true, true, true);
  expect(state.armed).toBe(true);
});
