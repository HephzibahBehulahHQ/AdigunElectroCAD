import { describe, expect, it } from "vitest";
import { inductionMotorOperatingPoint, type InductionMotorEquivalentCircuit } from "../src/simulation/inductionMotor";

const motor: InductionMotorEquivalentCircuit = {
  statorResistanceOhm: 0.8,
  statorReactanceOhm: 1.2,
  rotorResistanceOhm: 0.6,
  rotorReactanceOhm: 0.9,
  magnetizingReactanceOhm: 24,
  frequencyHz: 50,
  polePairs: 2,
};

describe("balanced induction-motor equivalent circuit", () => {
  it("derives per-phase current, line current, synchronous speed and torque for star and delta", () => {
    const star = inductionMotorOperatingPoint(motor, 400, 0.08, "star");
    const delta = inductionMotorOperatingPoint(motor, 400, 0.08, "delta");

    expect(star.phaseVoltageV).toBeCloseTo(400 / Math.sqrt(3));
    expect(star.lineCurrentA).toBeCloseTo(star.phaseCurrentA);
    expect(delta.phaseVoltageV).toBe(400);
    expect(delta.lineCurrentA).toBeCloseTo(Math.sqrt(3) * delta.phaseCurrentA);
    expect(star.synchronousSpeedRpm).toBe(1500);
    expect(star.electromagneticTorqueNm).toBeGreaterThan(0);
    expect(delta.electromagneticTorqueNm).toBeGreaterThan(star.electromagneticTorqueNm);
  });

  it("rejects missing, non-finite, and out-of-range machine data", () => {
    expect(() => inductionMotorOperatingPoint(motor, 400, 0, "star")).toThrow(/slip/);
    expect(() => inductionMotorOperatingPoint(motor, 400, 1.01, "star")).toThrow(/slip/);
    expect(() => inductionMotorOperatingPoint({ ...motor, rotorResistanceOhm: 0 }, 400, 0.08, "star")).toThrow(/physically valid/);
    expect(() => inductionMotorOperatingPoint(motor, Number.NaN, 0.08, "star")).toThrow(/physically valid/);
    expect(() => inductionMotorOperatingPoint(motor, 400, 0.08, "open" as "star")).toThrow(/star or delta/);
  });

  it("scales torque with the square of applied voltage for fixed slip and parameters", () => {
    const nominal = inductionMotorOperatingPoint(motor, 400, 0.08, "star");
    const reduced = inductionMotorOperatingPoint(motor, 200, 0.08, "star");
    expect(reduced.electromagneticTorqueNm / nominal.electromagneticTorqueNm).toBeCloseTo(0.25);
  });
});
