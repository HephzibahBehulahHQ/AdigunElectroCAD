import type { CircuitDocument, ElectricalComponentDefinition } from "../types/electrical";
import { executeCircuitModels } from "./circuitModels";
import { evaluateWiredControl } from "./wiredControl";
import { advanceThermalOverload, secondsUntilThermalTrip, type ThermalOverloadParameters, type ThermalOverloadState } from "./thermalOverload";
import { advanceInductionMotorSpeedRpm } from "./inductionMotor";

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
  const dynamicMotors = new Set(document.components.filter(c => catalog.get(c.definitionId)?.simulationModelId === "six-terminal-windings" && { ...catalog.get(c.definitionId)?.propertiesSchema, ...c.properties }.mechanicalTransientEnabled === true).map(c => c.id));
  if (!enabled.size && !dynamicMotors.size) return document;
  if (dynamicMotors.size && seconds > 1000) throw new Error("Mechanical transient intervals are limited to 1000 seconds per simulation advance.");
  let current = settleCoils(document, catalog), remaining = seconds;
  // Dynamic mechanics use bounded 10 ms steps; each relay may trip once per interval.
  const maxIterations = dynamicMotors.size ? Math.ceil(seconds / 0.01) + enabled.size + 3 : enabled.size + 3;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const runs = new Map(executeCircuitModels(current, catalog).map(r => [r.componentId, r.evaluatedProperties]));
    let horizon = dynamicMotors.size ? Math.min(remaining, 0.01) : remaining;
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
      const isDynamicMotor = dynamicMotors.has(c.id);
      if (!sample && !isDynamicMotor) return c;
      const nextProperties = { ...c.properties };
      if (sample) {
        const state = sample.valid ? advanceThermalOverload(sample.state, sample.currentA, horizon, sample.state.resetPrevious, sample.parameters) : sample.state;
        Object.assign(nextProperties, { runtimeThermalLevel: state.level, runtimeThermalTripped: state.tripped, runtimeThermalResetPrevious: state.resetPrevious, runtimeThermalError: sample.error, runtimeLoadCurrentA: sample.currentA });
      }
      if (isDynamicMotor) {
        const p = runs.get(c.id) ?? { ...catalog.get(c.definitionId)?.propertiesSchema, ...c.properties };
        let error = String(p.runtimeMotorModelError ?? "");
        try {
          if (p.equivalentCircuitEnabled !== true) throw new Error("Enable the explicit motor equivalent circuit before enabling mechanical transients.");
          const inertia = Number(p.rotorInertiaKgM2), loadTorque = Number(p.loadTorqueNm);
          const speed = Number(p.runtimeRotorSpeedRpm ?? p.initialRotorSpeedRpm ?? 0);
          const lineVoltage = Number(p.lineVoltageV);
          const energized = (p.connection === "star" || p.connection === "delta") && Number.isFinite(lineVoltage) && lineVoltage > 0;
          const synchronousSpeed = energized ? Number(p.runtimeSynchronousSpeedRpm) : 60 * Number(p.frequencyHz) / Number(p.polePairs);
          if (!Number.isFinite(inertia) || inertia <= 0) throw new Error("Enter a positive rotor inertia before enabling mechanical transients.");
          if (!Number.isFinite(loadTorque) || loadTorque < 0) throw new Error("Enter a finite non-negative mechanical load torque.");
          if (!Number.isFinite(synchronousSpeed) || synchronousSpeed <= 0) throw new Error("Motor synchronous speed must be finite and positive.");
          if (error) throw new Error(error);
          const torque = energized ? Number(p.runtimeElectromagneticTorqueNm) : 0;
          if (!Number.isFinite(torque) || torque < 0) throw new Error("Electromagnetic torque is invalid for the current motor operating point.");
          const nextSpeed = advanceInductionMotorSpeedRpm(speed, torque, loadTorque, inertia, synchronousSpeed, horizon);
          nextProperties.runtimeRotorSpeedRpm = nextSpeed;
          nextProperties.runtimeMotorModelError = "";
        } catch (cause) {
          nextProperties.runtimeMotorModelError = cause instanceof Error ? cause.message : "Invalid mechanical transient input.";
        }
      }
      return { ...c, properties: nextProperties };
    }) };
    current = settleCoils(current, catalog);
    remaining = Math.max(0, remaining - horizon);
    if (remaining === 0) return current;
  }
  throw new Error("Thermal event integration did not settle.");
}

