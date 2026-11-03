/** Educational first-order thermal capacity model; not a certified relay curve. */
export interface ThermalOverloadParameters {
  settingA: number;
  overloadFactor: number;
  heatingTimeSeconds: number;
  coolingTimeSeconds: number;
  resetLevel: number;
}

export interface ThermalOverloadState {
  /** Normalized retained heat: 1 is the trip threshold. */
  level: number;
  tripped: boolean;
  resetPrevious: boolean;
}

export const coldThermalOverload = (): ThermalOverloadState => ({ level: 0, tripped: false, resetPrevious: false });

function thermalTarget(currentA: number, p: ThermalOverloadParameters): number {
  for (const [name, value] of Object.entries(p)) if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  if (p.settingA <= 0 || p.overloadFactor < 1 || p.heatingTimeSeconds <= 0 || p.coolingTimeSeconds <= 0) throw new Error("Thermal setting and time constants must be positive; overload factor must be at least one.");
  if (p.resetLevel < 0 || p.resetLevel >= 1) throw new Error("Thermal reset level must be in [0, 1).");
  if (!Number.isFinite(currentA) || currentA < 0) throw new Error("RMS load current must be finite and non-negative.");
  const ratio = currentA / p.settingA / p.overloadFactor;
  const target = ratio * ratio;
  if (!Number.isFinite(target)) throw new Error("Thermal current ratio exceeds the supported numerical range.");
  return target;
}

function validateState(state: ThermalOverloadState): void {
  if (!Number.isFinite(state.level) || state.level < 0) throw new Error("Retained thermal level must be finite and non-negative.");
  if (typeof state.tripped !== "boolean" || typeof state.resetPrevious !== "boolean") throw new Error("Thermal trip and reset memory must be Boolean.");
}

/** Exact threshold time under constant current; the caller must re-evaluate the circuit at this event. */
export function secondsUntilThermalTrip(state: ThermalOverloadState, currentA: number, p: ThermalOverloadParameters): number {
  validateState(state);
  const target = thermalTarget(currentA, p);
  if (state.tripped) return Infinity;
  if (state.level >= 1) return 0;
  if (target <= 1) return Infinity;
  return p.heatingTimeSeconds * Math.log1p((1 - state.level) / (target - 1));
}

/**
 * Integrates a constant-current interval exactly. A trip only opens an auxiliary
 * contact: current is NOT implicitly zeroed here. The circuit owns interruption.
 * Reset is a new command edge, accepted only while cool and carrying zero current.
 */
export function advanceThermalOverload(state: ThermalOverloadState, currentA: number, deltaSeconds: number, reset: boolean, p: ThermalOverloadParameters): ThermalOverloadState {
  validateState(state);
  const target = thermalTarget(currentA, p);
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) throw new Error("Thermal time step must be finite and non-negative.");
  if (typeof reset !== "boolean") throw new Error("Thermal reset command must be Boolean.");
  const acceptedReset = reset && !state.resetPrevious && state.level <= p.resetLevel && currentA === 0;
  const start = { ...state, tripped: acceptedReset ? false : state.tripped };
  const timeConstant = currentA === 0 ? p.coolingTimeSeconds : p.heatingTimeSeconds;
  let level = state.level + (target - state.level) * -Math.expm1(-deltaSeconds / timeConstant);
  // Preserve an asymptote below pickup when exp() rounds a long interval to one.
  if (state.level < 1 && target <= 1) level = Math.min(level, 1 - Number.EPSILON);
  const tripTime = secondsUntilThermalTrip(start, currentA, p);
  const timeTolerance = 8 * Number.EPSILON * Math.max(1, deltaSeconds);
  return { level, tripped: start.tripped || tripTime <= deltaSeconds + timeTolerance, resetPrevious: reset };
}
