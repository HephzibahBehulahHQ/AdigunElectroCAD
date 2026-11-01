import { evaluateFunctionalModel, type FunctionalModelResult } from "./functionalModels";
import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";

export interface CircuitModelRun { componentId: string; reference: string; modelId: string; output: FunctionalModelResult; }

export function executeCircuitModels(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitModelRun[] {
  return document.components.flatMap((component) => {
    const definition = catalog.get(component.definitionId);
    if (!definition) return [];
    const output = evaluateFunctionalModel(definition.simulationModelId, component.properties);
    return output ? [{ componentId: component.id, reference: component.reference, modelId: definition.simulationModelId, output }] : [];
  });
}
