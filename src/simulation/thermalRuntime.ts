import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { executeCircuitModels } from "./circuitModels";
import { evaluateWiredControl } from "./wiredControl";
import { advanceThermalOverload, secondsUntilThermalTrip, type ThermalOverloadParameters, type ThermalOverloadState } from "./thermalOverload";

type Properties = Readonly<Record<string, string | number | boolean>>;
const stateOf = (p: Properties): ThermalOverloadState => ({ level: Number(p.runtimeThermalLevel ?? 0), tripped: p.runtimeThermalTripped === true, resetPrevious: p.runtimeThermalResetPrevious === true });
const parametersOf = (p: Properties): ThermalOverloadParameters => ({ settingA: Number(p.settingA), overloadFactor: Number(p.overloadFactor), heatingTimeSeconds: Number(p.heatingTimeSeconds), coolingTimeSeconds: Number(p.coolingTimeSeconds), resetLevel: Number(p.resetLevel) });

function settleCoils(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): CircuitDocument {
  const coils = evaluateWiredControl(document, catalog);
  return { ...document, components: document.components.map(c => coils.has(c.id) ? { ...c, properties: { ...c.properties, runtimeCoilEnergized: coils.get(c.id)!.energized } } : c) };
}

/** Piecewise-constant nominal-current integration, splitting precisely at thermal trips. */
export function advanceCircuitThermal(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, seconds: number): CircuitDocument {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Thermal interval must be finite and non-negative.");
  if (document.id === "reference-dol-motor-starter") return document;
  const enabled = new Set(document.components.filter(c => catalog.get(c.definitionId)?.simulationModelId === "thermal-overload-dol-v1" && { ...catalog.get(c.definitionId)?.propertiesSchema, ...c.properties }.thermalEnabled === true).map(c => c.id));
  if (!enabled.size) return document;
  let current = settleCoils(document, catalog), remaining = seconds;
  // Each relay can trip at most once per interval; resets are consumed at its start.
  for (let iteration = 0; iteration < enabled.size + 3; iteration++) {
    const runs = new Map(executeCircuitModels(current, catalog).map(r => [r.componentId, r.evaluatedProperties]));
    let horizon = remaining;
    const samples = new Map<string, { state: ThermalOverloadState; currentA: number; parameters: ThermalOverloadParameters; error: string; valid: boolean }>();
    for (const id of enabled) {
      const p = runs.get(id)!;
      let state = stateOf(p), error = String(p.runtimeThermalError ?? ""), valid = true;
      const parameters = parametersOf(p), currentA = Number(p.runtimeLoadCurrentA);
      try {
        if (p.runtimeCurrentError) throw new Error(String(p.runtimeCurrentError));
        // A rejected reset edge is consumed now, not retried after this interval cools.
        state = advanceThermalOverload(state, currentA, 0, p.reset === true, parameters);
        if (!state.tripped) error = "";
        horizon = Math.min(horizon, secondsUntilThermalTrip(state, currentA, parameters));
      } catch (cause) {
        valid = false;
        error = cause instanceof Error ? cause.message : "Invalid thermal model input.";
        state = { ...state, tripped: true, resetPrevious: p.reset === true };
        // Stop affected coils before integrating any further current.
        if (p.runtimeThermalTripped !== true) horizon = 0;
      }
      samples.set(id, { state, currentA, parameters, error, valid });
    }
    current = { ...current, components: current.components.map(c => {
      const sample = samples.get(c.id);
      if (!sample) return c;
      const state = sample.valid ? advanceThermalOverload(sample.state, sample.currentA, horizon, sample.state.resetPrevious, sample.parameters) : sample.state;
      return { ...c, properties: { ...c.properties, runtimeThermalLevel: state.level, runtimeThermalTripped: state.tripped, runtimeThermalResetPrevious: state.resetPrevious, runtimeThermalError: sample.error, runtimeLoadCurrentA: sample.currentA } };
    }) };
    current = settleCoils(current, catalog);
    remaining = Math.max(0, remaining - horizon);
    if (remaining === 0) return current;
  }
  throw new Error("Thermal event integration did not settle.");
}
