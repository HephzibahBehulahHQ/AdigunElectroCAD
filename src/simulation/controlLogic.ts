export type LogicGate = "and" | "or" | "not" | "nand" | "nor" | "xor";
export type Comparator = "greater-than" | "less-than" | "equal-to";
export type MathOperation = "add" | "subtract" | "multiply" | "divide";

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function normallyOpen(input: boolean) { return input; }
export function normallyClosed(input: boolean) { return !input; }
export function outputCoil(input: boolean) { return input; }
export function setResetLatch(previous: boolean, set: boolean, reset: boolean) { return reset ? false : set ? true : previous; }
export function edgeTrigger(previous: boolean, current: boolean) { return { positive: current && !previous, negative: !current && previous }; }

export function logicGate(kind: LogicGate, inputs: boolean[]): boolean {
  const [first = false] = inputs;
  if (kind === "and") return inputs.every(Boolean);
  if (kind === "or") return inputs.some(Boolean);
  if (kind === "not") return !first;
  if (kind === "nand") return !inputs.every(Boolean);
  if (kind === "nor") return !inputs.some(Boolean);
  return inputs.filter(Boolean).length % 2 === 1;
}

export function compare(kind: Comparator, left: number, right: number, tolerance = 0.000_001): boolean {
  if (kind === "greater-than") return left > right;
  if (kind === "less-than") return left < right;
  return Math.abs(left - right) <= Math.max(0, tolerance);
}

export function mathBlock(kind: MathOperation, left: number, right: number): { ok: true; value: number } | { ok: false; reason: string } {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return { ok: false, reason: "Math inputs must be finite." };
  if (kind === "add") return { ok: true, value: left + right };
  if (kind === "subtract") return { ok: true, value: left - right };
  if (kind === "multiply") return { ok: true, value: left * right };
  if (right === 0) return { ok: false, reason: "Division by zero is invalid." };
  return { ok: true, value: left / right };
}

export function levelToMilliamp(levelPercent: number) { return 4 + clamp(levelPercent, 0, 100) * 0.16; }
export function milliampToPlcRaw(milliamp: number, rawFullScale = 27_648) { return Math.round(clamp((milliamp - 4) / 16, 0, 1) * rawFullScale); }
export function plcRawToMilliamp(raw: number, rawFullScale = 27_648) { return 4 + clamp(raw / rawFullScale, 0, 1) * 16; }
export function rawToEngineering(raw: number, minimum: number, maximum: number, rawFullScale = 27_648) { return minimum + clamp(raw / rawFullScale, 0, 1) * (maximum - minimum); }
export function dacMilliamp(raw: number, rawFullScale = 27_648) { return plcRawToMilliamp(raw, rawFullScale); }

export function pt100ResistanceOhm(temperatureC: number) { return 100 * (1 + 0.00385 * temperatureC); }
export function thermocoupleMillivolt(temperatureC: number) { return temperatureC * 0.041; }
export function flowPulseHz(flowLitresPerMinute: number, pulsesPerLitre: number) { return Math.max(0, flowLitresPerMinute) * Math.max(0, pulsesPerLitre) / 60; }
export function vibrationRms(accelerationSamples: number[]) {
  if (!accelerationSamples.length) return 0;
  return Math.sqrt(accelerationSamples.reduce((sum, value) => sum + value ** 2, 0) / accelerationSamples.length);
}
export function encoderPulses(revolutions: number, pulsesPerRevolution: number) { return Math.round(revolutions * Math.max(1, pulsesPerRevolution)); }
export function loadCellMillivolt(forceN: number, capacityN: number, sensitivityMvPerV = 2, excitationV = 5) { return clamp(forceN / Math.max(1, capacityN), 0, 1) * sensitivityMvPerV * excitationV; }
export function currentTransformerSecondaryAmp(primaryAmp: number, primaryRatedAmp: number, secondaryRatedAmp = 5) { return Math.max(0, primaryAmp) / Math.max(1, primaryRatedAmp) * Math.max(0, secondaryRatedAmp); }
