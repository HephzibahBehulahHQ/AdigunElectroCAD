import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";

/** Count only a continuously observed, unconnected timer output on the current sheet. */
export function observeUnconnectedTimers(canvas: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, previous: ReadonlyMap<string, number>, now: number, enabled: boolean): { since: Map<string, number>; elapsed: Map<string, number> } {
  const since = new Map<string, number>(), elapsed = new Map<string, number>();
  if (!enabled || !Number.isFinite(now)) return { since, elapsed };
  for (const component of canvas.components) {
    if (catalog.get(component.definitionId)?.simulationModelId !== "catalog-on-delay-timer") continue;
    if (canvas.wires.some((wire) => [wire.from, wire.to].some((endpoint) => endpoint.componentId === component.id && endpoint.terminalId === "18"))) continue;
    const key = `${canvas.id}:${component.id}`;
    const before = previous.get(key);
    const start = before !== undefined && Number.isFinite(before) && before <= now ? before : now;
    since.set(key, start);
    elapsed.set(component.id, now - start);
  }
  return { since, elapsed };
}
