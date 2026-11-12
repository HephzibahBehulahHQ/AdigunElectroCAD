/**
 * Balanced, steady-state per-phase induction-motor equivalent-circuit point.
 * Parameters are explicit so a project must supply traceable motor data.
 * This model does not represent flux transients, saturation, harmonics,
 * unbalance, or a protection-device time-current curve.
 */
export interface InductionMotorEquivalentCircuit {
  statorResistanceOhm: number;
  statorReactanceOhm: number;
  rotorResistanceOhm: number;
  rotorReactanceOhm: number;
  magnetizingReactanceOhm: number;
  frequencyHz: number;
  polePairs: number;
}

export type WindingConnection = "star" | "delta";

export interface InductionMotorOperatingPoint {
  phaseVoltageV: number;
  phaseCurrentA: number;
  lineCurrentA: number;
  rotorCurrentA: number;
  synchronousSpeedRpm: number;
  slip: number;
  electromagneticTorqueNm: number;
}

type Complex = { re: number; im: number };
const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const multiply = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const divide = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const magnitude = (a: Complex): number => Math.hypot(a.re, a.im);

function validate(parameters: InductionMotorEquivalentCircuit, lineVoltageV: number, slip: number) {
  const positive = [parameters.statorResistanceOhm, parameters.rotorResistanceOhm, parameters.frequencyHz, lineVoltageV];
  const nonNegative = [parameters.statorReactanceOhm, parameters.rotorReactanceOhm, parameters.magnetizingReactanceOhm];
  if (!positive.every(Number.isFinite) || positive.some(value => value <= 0)
      || !nonNegative.every(Number.isFinite) || nonNegative.some(value => value < 0)
      || !Number.isInteger(parameters.polePairs) || parameters.polePairs < 1
      || !Number.isFinite(slip) || slip <= 0 || slip > 1) {
    throw new Error("Motor equivalent-circuit values must be finite and physically valid; slip must be in (0, 1].");
  }
}

/** Compute the balanced, positive-slip T-equivalent-circuit operating point. */
export function inductionMotorOperatingPoint(
  parameters: InductionMotorEquivalentCircuit,
  lineVoltageV: number,
  slip: number,
  connection: WindingConnection,
): InductionMotorOperatingPoint {
  validate(parameters, lineVoltageV, slip);
  if (connection !== "star" && connection !== "delta") throw new Error("Select star or delta winding connection.");

  const phaseVoltageV = connection === "star" ? lineVoltageV / Math.sqrt(3) : lineVoltageV;
  const stator: Complex = { re: parameters.statorResistanceOhm, im: parameters.statorReactanceOhm };
  const magnetizing: Complex = { re: 0, im: parameters.magnetizingReactanceOhm };
  const rotor: Complex = { re: parameters.rotorResistanceOhm / slip, im: parameters.rotorReactanceOhm };
  const parallel = divide(multiply(magnetizing, rotor), add(magnetizing, rotor));
  const phaseCurrent = divide({ re: phaseVoltageV, im: 0 }, add(stator, parallel));
  const branchVoltage = multiply(phaseCurrent, parallel);
  const rotorCurrent = divide(branchVoltage, rotor);
  const synchronousSpeedRpm = 60 * parameters.frequencyHz / parameters.polePairs;
  const synchronousAngularSpeed = 2 * Math.PI * parameters.frequencyHz / parameters.polePairs;
  const electromagneticTorqueNm = 3 * magnitude(rotorCurrent) ** 2 * parameters.rotorResistanceOhm / slip / synchronousAngularSpeed;

  return {
    phaseVoltageV,
    phaseCurrentA: magnitude(phaseCurrent),
    lineCurrentA: connection === "star" ? magnitude(phaseCurrent) : Math.sqrt(3) * magnitude(phaseCurrent),
    rotorCurrentA: magnitude(rotorCurrent),
    synchronousSpeedRpm,
    slip,
    electromagneticTorqueNm,
  };
}
