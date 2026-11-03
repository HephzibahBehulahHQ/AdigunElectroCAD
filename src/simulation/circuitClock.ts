import { evaluateWiredControl } from "./wiredControl";
import { advanceCircuitThermal } from "./thermalRuntime";
import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { executeCircuitModels } from "./circuitModels";
import { edgeTrigger, setResetLatch } from "./controlLogic";
import { PLC_REGISTER_COUNT, scanPlcProgram } from "./plcProgram";
import { scanSafetyReset } from "./safetyReset";
import { advanceCylinder, valve52Direction } from "./pneumaticState";
import { timerParameterError } from "./functionalModels";

export function setCircuitBooleanInput(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, componentId: string, property: string, value: boolean): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  const definition = component && catalog.get(component.definitionId);
  if (!component || !definition || typeof { ...definition.propertiesSchema, ...component.properties }[property] !== "boolean" || property.startsWith("runtime") || property === "scanOutput") throw new Error("Select a defined Boolean parameter.");
  const next = advanceCircuitThermal({ ...document, components: document.components.map((item) => item.id === componentId ? { ...item, properties: { ...item.properties, [property]: value } } : item) }, catalog, 0);
  const coils = evaluateWiredControl(next, catalog);
  return latchSafetyFaults({ ...next, components: next.components.map(item => coils.has(item.id) ? { ...item, properties: { ...item.properties, runtimeCoilEnergized: coils.get(item.id)!.energized } } : item) }, catalog);
}

export function setCircuitLevelInput(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, componentId: string, levelPercent: number): CircuitDocument {
  const component = document.components.find((item) => item.id === componentId);
  if (!component || catalog.get(component.definitionId)?.simulationModelId !== "sensor-level-4-20" || !Number.isFinite(levelPercent) || levelPercent < 0 || levelPercent > 100) throw new Error("Select a level sensor and enter 0–100 percent.");
  return latchSafetyFaults({ ...document, components: document.components.map((item) => item.id === componentId ? { ...item, properties: { ...item.properties, levelPercent } } : item) }, catalog);
}

function latchSafetyFaults(next: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitDocument {
  const faults = new Set(executeCircuitModels(next, catalog).filter((run) => ["catalog-safety-relay", "safety-dual-relay"].includes(run.modelId) && (run.evaluatedProperties.channelAClosed !== true || run.evaluatedProperties.channelBClosed !== true)).map((run) => run.componentId));
  return { ...next, components: next.components.map((item) => faults.has(item.id) ? { ...item, properties: { ...item.properties, runtimeSafetyArmed: false, runtimeResetReady: false } } : item) };
}

export function resetCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitDocument {
  return { ...document, components: document.components.map((component) => {
    const properties = { ...component.properties };
    delete properties.runtimePrevious; delete properties.scanOutput;
    delete properties.runtimeCoilEnergized;
    delete properties.runtimeThermalLevel; delete properties.runtimeThermalTripped; delete properties.runtimeThermalResetPrevious; delete properties.runtimeThermalError; delete properties.runtimeLoadCurrentA;
    delete properties.runtimeQ0; delete properties.runtimeError;
    delete properties.runtimeSpool; delete properties.runtimePositionPercent;
    delete properties.runtimeInput0Previous; delete properties.runtimeInput1Previous;
    for (let index = 0; index < PLC_REGISTER_COUNT; index++) delete properties[`runtimeD${index}`];
    delete properties.runtimeSafetyArmed; delete properties.runtimeResetReady; delete properties.runtimeResetPrevious;
    if (catalog.get(component.definitionId)?.simulationModelId === "catalog-on-delay-timer") properties.elapsedSeconds = 0;
    return { ...component, properties };
  }) };
}

/** Advance a runtime document; the saved design remains unchanged. */
export function advanceCircuitClock(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, deltaSeconds: number): CircuitDocument {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("Simulation time step must be finite and non-negative.");
  document = advanceCircuitThermal(document, catalog, deltaSeconds);
  const evaluated = new Map(executeCircuitModels(document, catalog).map((run) => [run.componentId, run.evaluatedProperties]));
  return { ...document, components: document.components.map((component) => {
    const definition = catalog.get(component.definitionId);
    const model = definition?.simulationModelId;
    if (model === "contactor-dol-v1") return { ...component, properties: { ...component.properties, runtimeCoilEnergized: evaluated.get(component.id)?.energized === true } };
    if (model && ["pneumatic-valve-5-2", "pneumatic-cylinder-single", "pneumatic-cylinder-double"].includes(model) && deltaSeconds > 0) {
      const active = evaluated.get(component.id)!;
      if (active.runtimeSignalError) return component;
      try {
        const update: Record<string, string | number | boolean> = model === "pneumatic-valve-5-2" ? { runtimeSpool: valve52Direction(active) } : { runtimePositionPercent: advanceCylinder(active, model === "pneumatic-cylinder-single", deltaSeconds) };
        return { ...component, properties: { ...component.properties, ...update } };
      } catch { return component; } // The model result reports invalid parameters/commands; motion is not advanced.
    }
    if ((model === "catalog-safety-relay" || model === "safety-dual-relay") && deltaSeconds > 0) {
      const active = evaluated.get(component.id)!;
      const state = scanSafetyReset({ armed: active.runtimeSafetyArmed === true, resetReady: active.runtimeResetReady === true, previousReset: active.runtimeResetPrevious === true }, active.channelAClosed === true, active.channelBClosed === true, active.reset === true);
      return { ...component, properties: { ...component.properties, runtimeSafetyArmed: state.armed, runtimeResetReady: state.resetReady, runtimeResetPrevious: state.previousReset } };
    }
    if (model === "catalog-plc-digital-io" && typeof component.properties.program === "string" && component.properties.program.trim() && deltaSeconds > 0) {
      const active = evaluated.get(component.id)!;
      // Invalid wired inputs must not execute instructions or mutate retained registers.
      if (active.runtimeSignalError) return { ...component, properties: { ...component.properties, runtimeQ0: false, runtimeError: String(active.runtimeSignalError) } };
      const previousRegisters = Array.from({ length: PLC_REGISTER_COUNT }, (_, index) => Number(active[`runtimeD${index}`] ?? 0));
      const result = scanPlcProgram(component.properties.program, active.inputA === true, active.inputB === true, active.runtimeQ0 === true, Number(active.analogInput0 ?? 0), previousRegisters, [active.runtimeInput0Previous === true, active.runtimeInput1Previous === true]);
      const registers = result.ok ? result.registers ?? previousRegisters : previousRegisters;
      return { ...component, properties: { ...component.properties, ...Object.fromEntries(registers.map((value, index) => [`runtimeD${index}`, value])), runtimeInput0Previous: active.inputA === true, runtimeInput1Previous: active.inputB === true, runtimeQ0: result.output, runtimeError: result.ok ? "" : result.error } };
    }
    if (model && ["logic-set-coil", "logic-reset-coil", "logic-edge-positive", "logic-edge-negative"].includes(model) && deltaSeconds > 0) {
      const active = evaluated.get(component.id)!;
      const previous = (typeof active.runtimePrevious === "boolean" ? active.runtimePrevious : active.previous) === true;
      const input = active.input === true;
      if (model.startsWith("logic-edge-")) return { ...component, properties: { ...component.properties, runtimePrevious: input, scanOutput: edgeTrigger(previous, input)[model === "logic-edge-positive" ? "positive" : "negative"] } };
      return { ...component, properties: { ...component.properties, runtimePrevious: setResetLatch(previous, model === "logic-set-coil" && input, model === "logic-reset-coil" && input) } };
    }
    if (definition?.simulationModelId !== "catalog-on-delay-timer") return component;
    const properties = evaluated.get(component.id) ?? { ...definition.propertiesSchema, ...component.properties };
    if (properties.runtimeSignalError || timerParameterError(properties)) return component;
    const previous = Number(properties.elapsedSeconds ?? 0);
    const elapsedSeconds = properties.energized === true ? Math.round(((Number.isFinite(previous) ? Math.max(0, previous) : 0) + deltaSeconds) * 1e9) / 1e9 : 0;
    return { ...component, properties: { ...component.properties, elapsedSeconds } };
  }) };
}
