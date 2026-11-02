import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { executeCircuitModels } from "./circuitModels";
import { edgeTrigger, setResetLatch } from "./controlLogic";

export function resetCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitDocument {
  return { ...document, components: document.components.map((component) => {
    const properties = { ...component.properties };
    delete properties.runtimePrevious; delete properties.scanOutput;
    if (catalog.get(component.definitionId)?.simulationModelId === "catalog-on-delay-timer") properties.elapsedSeconds = 0;
    return { ...component, properties };
  }) };
}

/** Advance a runtime document; the saved design remains unchanged. */
export function advanceCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, deltaSeconds: number): CircuitDocument {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("Simulation time step must be finite and non-negative.");
  const evaluated = new Map(executeCircuitModels(document, catalog).map((run) => [run.componentId, run.evaluatedProperties]));
  return { ...document, components: document.components.map((component) => {
    const definition = catalog.get(component.definitionId);
    const model = definition?.simulationModelId;
    if (model && ["logic-set-coil", "logic-reset-coil", "logic-edge-positive", "logic-edge-negative"].includes(model) && deltaSeconds > 0) {
      const active = evaluated.get(component.id)!;
      const previous = (typeof active.runtimePrevious === "boolean" ? active.runtimePrevious : active.previous) === true;
      const input = active.input === true;
      if (model.startsWith("logic-edge-")) return { ...component, properties: { ...component.properties, runtimePrevious: input, scanOutput: edgeTrigger(previous, input)[model === "logic-edge-positive" ? "positive" : "negative"] } };
      return { ...component, properties: { ...component.properties, runtimePrevious: setResetLatch(previous, model === "logic-set-coil" && input, model === "logic-reset-coil" && input) } };
    }
    if (definition?.simulationModelId !== "catalog-on-delay-timer") return component;
    const properties = evaluated.get(component.id) ?? { ...definition.propertiesSchema, ...component.properties };
    const previous = Number(properties.elapsedSeconds ?? 0);
    const elapsedSeconds = properties.energized === true ? Math.round(((Number.isFinite(previous) ? Math.max(0, previous) : 0) + deltaSeconds) * 1e9) / 1e9 : 0;
    return { ...component, properties: { ...component.properties, elapsedSeconds } };
  }) };
}
