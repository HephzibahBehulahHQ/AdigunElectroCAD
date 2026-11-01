import { describe, expect, it } from "vitest";
import { batteryStateOfCharge, compressorDeliveryLpm, cylinderPosition, damperPosition, directionalValve32, directionalValve52, earthLeakageTripped, frlOutletPressureBar, gridTieClosed, humidistatOn, hydraulicCylinderForceN, inverterAcPowerW, lightCurtainClear, phaseHealthy, pumpFlowLpm, reliefValveOpen, safetyRelayEnergized, solarPowerW, thermostatOn, thermalStep, threePhaseCableLossW, threePhaseVoltageDropV, zeroSpeedDetected } from "../src/simulation/industrialDevices";

describe("industrial device models", () => {
  it("models pneumatic and hydraulic actuation", () => {
    expect(directionalValve52(true, false)).toBe("extend");
    expect(directionalValve52(true, true, "retract")).toBe("retract");
    expect(directionalValve32(false)).toBe("exhaust");
    expect(cylinderPosition(50, "extend", 1, 4)).toBe(75);
    expect(pumpFlowLpm(10, 1000)).toBe(9);
    expect(hydraulicCylinderForceN(100, 50)).toBeCloseTo(19_634.95, 1);
    expect(reliefValveOpen(201, 200)).toBe(true);
    expect(compressorDeliveryLpm(100, true, 0.8)).toBe(80);
    expect(frlOutletPressureBar(8, 6, 0.5)).toBe(5.5);
  });

  it("models HVAC thermal control", () => {
    expect(thermalStep(20, 20, 1000, 0, 10_000, 0, 10)).toBe(21);
    expect(thermostatOn(18, 20, 2, false)).toBe(true);
    expect(thermostatOn(22, 20, 2, true)).toBe(false);
    expect(humidistatOn(65, 60, 4, false)).toBe(true);
    expect(damperPosition(20, 80, 3, 10)).toBeCloseTo(50);
  });

  it("models renewable-energy transfer and safety states", () => {
    expect(solarPowerW(1000, 2, 0.2)).toBe(400);
    expect(batteryStateOfCharge(50, 10, 100, 1)).toBeCloseTo(60);
    expect(inverterAcPowerW(1000, 0.9, 800)).toBe(800);
    expect(gridTieClosed(true, 0.1)).toBe(true);
    expect(safetyRelayEnergized(true, true, true)).toBe(true);
    expect(lightCurtainClear(true)).toBe(false);
    expect(zeroSpeedDetected(4)).toBe(true);
    expect(phaseHealthy(true, true, false)).toBe(false);
    expect(earthLeakageTripped(31, 30)).toBe(true);
  });

  it("calculates cable voltage drop and heat loss", () => {
    expect(threePhaseVoltageDropV(10, 100, 1.5)).toBeCloseTo(2.598, 3);
    expect(threePhaseCableLossW(10, 100, 1.5)).toBeCloseTo(45);
  });
});
