import { describe, expect, it } from "vitest";
import { advanceThermalOverload, coldThermalOverload, secondsUntilThermalTrip, type ThermalOverloadParameters } from "../src/simulation/thermalOverload";

const parameters: ThermalOverloadParameters = { settingA: 10, overloadFactor: 1, heatingTimeSeconds: 60, coolingTimeSeconds: 120, resetLevel: .5 };

describe("retained thermal overload", () => {
  it("trips at the analytic cold threshold and sooner when already warm", () => {
    const cold = coldThermalOverload();
    const threshold = 60 * Math.log(4 / 3);
    expect(secondsUntilThermalTrip(cold, 20, parameters)).toBeCloseTo(threshold, 12);
    expect(advanceThermalOverload(cold, 20, threshold - .001, false, parameters).tripped).toBe(false);
    expect(advanceThermalOverload(cold, 20, threshold, false, parameters).tripped).toBe(true);
    expect(secondsUntilThermalTrip({ ...cold, level: .5 }, 20, parameters)).toBeLessThan(threshold);
  });

  it("does not trip at or below the asymptotic pickup level even over very long intervals", () => {
    for (const current of [0, 5, 10]) {
      const warm = advanceThermalOverload(coldThermalOverload(), current, 1e6, false, parameters);
      expect(warm.tripped).toBe(false);
      expect(advanceThermalOverload(warm, current, 1, false, parameters).tripped).toBe(false);
    }
    expect(secondsUntilThermalTrip(coldThermalOverload(), 10.5, { ...parameters, overloadFactor: 1.05 })).toBe(Infinity);
  });

  it("retains heat on current loss and cools exponentially without resetting the latch", () => {
    const hot = { level: 1, tripped: true, resetPrevious: false };
    const cooled = advanceThermalOverload(hot, 0, 120, false, parameters);
    expect(cooled.level).toBeCloseTo(Math.exp(-1), 12);
    expect(cooled.tripped).toBe(true);
    expect(hot.level).toBe(1);
  });

  it("rejects hot reset and requires a fresh edge after cooling", () => {
    const hot = { level: 1, tripped: true, resetPrevious: false };
    const held = advanceThermalOverload(hot, 0, 240, true, parameters);
    expect(held.tripped).toBe(true);
    expect(advanceThermalOverload(held, 0, 1, true, parameters).tripped).toBe(true);
    const released = advanceThermalOverload(held, 0, 0, false, parameters);
    const reset = advanceThermalOverload(released, 0, 0, true, parameters);
    expect(reset.tripped).toBe(false);
    expect(reset.level).toBe(released.level);
    expect(advanceThermalOverload(released, 1, 0, true, parameters).tripped).toBe(true);
  });

  it("matches a coarse interval with many smaller steps under the same imposed current", () => {
    const one = advanceThermalOverload(coldThermalOverload(), 20, 45, false, parameters);
    let many = coldThermalOverload();
    for (let i = 0; i < 450; i++) many = advanceThermalOverload(many, 20, .1, false, parameters);
    expect(many.level).toBeCloseTo(one.level, 12);
    expect(many.tripped).toBe(one.tripped);
    // A relay cannot interrupt its own power conductors: continuing current still heats it.
    expect(one.level).toBeGreaterThan(1);
  });

  it.each([NaN, Infinity, -1])("rejects invalid current and time %s", value => {
    expect(() => advanceThermalOverload(coldThermalOverload(), value, 1, false, parameters)).toThrow();
    expect(() => advanceThermalOverload(coldThermalOverload(), 10, value, false, parameters)).toThrow();
  });

  it("rejects invalid settings and state without mutating the caller", () => {
    for (const invalid of [{ settingA: 0 }, { overloadFactor: .9 }, { heatingTimeSeconds: 0 }, { coolingTimeSeconds: -1 }, { resetLevel: 1 }, { resetLevel: -.1 }, { settingA: NaN }]) {
      expect(() => secondsUntilThermalTrip(coldThermalOverload(), 20, { ...parameters, ...invalid })).toThrow();
    }
    expect(() => advanceThermalOverload({ ...coldThermalOverload(), level: NaN }, 10, 1, false, parameters)).toThrow();
    expect(() => secondsUntilThermalTrip(coldThermalOverload(), Number.MAX_VALUE, parameters)).toThrow();
  });
});
