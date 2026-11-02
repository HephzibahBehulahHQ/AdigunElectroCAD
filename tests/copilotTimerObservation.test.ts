import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { observeUnconnectedTimers } from "../src/copilot/timerObservation";
import { analyzeCanvas } from "../src/copilot/canvasAnalysis";
import type { CircuitDocument } from "../src/types/electrical";

function design(): CircuitDocument {
  const timer = [...catalogById.values()].find((definition) => definition.simulationModelId === "catalog-on-delay-timer")!;
  expect(timer).toBeDefined();
  return { id: "timers", name: "Timer check", description: "Continuous observation", revision: 1, components: [
    { id: "t1", definitionId: timer.id, reference: "T1", x: 100, y: 200, rotation: 0, properties: {} },
    { id: "k1", definitionId: "logic.output-coil", reference: "K1", x: 300, y: 200, rotation: 0, properties: {} },
  ], wires: [] };
}

it("offers the timer finding only after twenty continuously observed seconds", () => {
  const canvas = design();
  let observed = observeUnconnectedTimers(canvas, catalogById, new Map(), 1000, true);
  observed = observeUnconnectedTimers(canvas, catalogById, observed.since, 20_999, true);
  expect(analyzeCanvas(canvas, catalogById, "Timed output", observed.elapsed).find((item) => item.id === "timer:t1")).toBeUndefined();
  observed = observeUnconnectedTimers(canvas, catalogById, observed.since, 21_000, true);
  expect(analyzeCanvas(canvas, catalogById, "Timed output", observed.elapsed).find((item) => item.id === "timer:t1")).toBeDefined();
});

it("starts a fresh interval after connection, deletion or a sheet switch", () => {
  const canvas = design();
  const start = observeUnconnectedTimers(canvas, catalogById, new Map(), 1000, true);
  const connected = structuredClone(canvas);
  connected.wires.push({ id: "timer-load", from: { componentId: "t1", terminalId: "18" }, to: { componentId: "k1", terminalId: "in" }, points: [] });
  const reset = observeUnconnectedTimers(connected, catalogById, start.since, 30_000, true);
  expect(reset.since.size).toBe(0);
  expect(observeUnconnectedTimers(canvas, catalogById, reset.since, 31_000, true).elapsed.get("t1")).toBe(0);
  const removed = observeUnconnectedTimers({ ...canvas, components: [] }, catalogById, start.since, 30_000, true);
  expect(removed.since.size).toBe(0);
  expect(observeUnconnectedTimers({ ...canvas, id: "other-sheet" }, catalogById, start.since, 31_000, true).elapsed.get("t1")).toBe(0);
});

it("excludes disabled time and handles clock rollback without a false elapsed claim", () => {
  const canvas = design();
  const start = observeUnconnectedTimers(canvas, catalogById, new Map(), 1000, true);
  const disabled = observeUnconnectedTimers(canvas, catalogById, start.since, 30_000, false);
  expect(disabled.since.size).toBe(0);
  expect(observeUnconnectedTimers(canvas, catalogById, disabled.since, 60_000, true).elapsed.get("t1")).toBe(0);
  expect(observeUnconnectedTimers(canvas, catalogById, start.since, 500, true).elapsed.get("t1")).toBe(0);
});
