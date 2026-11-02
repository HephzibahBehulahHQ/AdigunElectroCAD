import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";

export function resetCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitDocument {
  return { ...document, components: document.components.map((component) => catalog.get(component.definitionId)?.simulationModelId === "catalog-on-delay-timer"
    ? { ...component, properties: { ...component.properties, elapsedSeconds: 0 } } : component) };
}

/** Advance a runtime document; the saved design remains unchanged. */
export function advanceCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, deltaSeconds: number): CircuitDocument {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("Simulation time step must be finite and non-negative.");
  return { ...document, components: document.components.map((component) => {
    const definition = catalog.get(component.definitionId);
    if (definition?.simulationModelId !== "catalog-on-delay-timer") return component;
    const properties = { ...definition.propertiesSchema, ...component.properties };
    const previous = Number(properties.elapsedSeconds ?? 0);
    const elapsedSeconds = properties.energized === true ? (Number.isFinite(previous) ? Math.max(0, previous) : 0) + deltaSeconds : 0;
    return { ...component, properties: { ...component.properties, elapsedSeconds } };
  }) };
}
