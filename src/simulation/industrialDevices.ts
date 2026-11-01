const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export type Direction = "extend" | "retract" | "hold";

export function directionalValve52(extendCoil: boolean, retractCoil: boolean, previous: Direction = "hold"): Direction {
  if (extendCoil === retractCoil) return previous;
  return extendCoil ? "extend" : "retract";
}
export function directionalValve32(energized: boolean) { return energized ? "supply" : "exhaust"; }
export function cylinderPosition(positionPercent: number, direction: Direction, elapsedSeconds: number, fullTravelSeconds: number) {
  const delta = Math.max(0, elapsedSeconds) / Math.max(0.001, fullTravelSeconds) * 100;
  return clamp(positionPercent + (direction === "extend" ? delta : direction === "retract" ? -delta : 0), 0, 100);
}
export function pumpFlowLpm(displacementCcPerRev: number, rpm: number, efficiency = 0.9) { return Math.max(0, displacementCcPerRev * rpm * clamp(efficiency, 0, 1) / 1000); }
export function hydraulicCylinderForceN(pressureBar: number, boreDiameterMm: number) { return Math.max(0, pressureBar) * 100_000 * Math.PI * (Math.max(0, boreDiameterMm) / 2000) ** 2; }
export function reliefValveOpen(pressureBar: number, settingBar: number) { return pressureBar >= Math.max(0, settingBar); }
export function compressorDeliveryLpm(ratedLpm: number, running: boolean, loadFactor = 1) { return running ? Math.max(0, ratedLpm) * clamp(loadFactor, 0, 1) : 0; }
export function frlOutletPressureBar(supplyBar: number, regulatorBar: number, dropBar = 0) { return Math.max(0, Math.min(supplyBar, regulatorBar) - Math.max(0, dropBar)); }

export function thermalStep(temperatureC: number, ambientC: number, heatInputW: number, coolingW: number, thermalMassJPerC: number, lossWPerC: number, elapsedSeconds: number) {
  const netW = heatInputW - coolingW - Math.max(0, lossWPerC) * (temperatureC - ambientC);
  return temperatureC + netW * Math.max(0, elapsedSeconds) / Math.max(1, thermalMassJPerC);
}
export function thermostatOn(temperatureC: number, setpointC: number, hysteresisC: number, previous: boolean) {
  const half = Math.max(0, hysteresisC) / 2;
  if (temperatureC <= setpointC - half) return true;
  if (temperatureC >= setpointC + half) return false;
  return previous;
}
export function humidistatOn(relativeHumidityPercent: number, setpointPercent: number, hysteresisPercent: number, previous: boolean) {
  const half = Math.max(0, hysteresisPercent) / 2;
  if (relativeHumidityPercent >= setpointPercent + half) return true;
  if (relativeHumidityPercent <= setpointPercent - half) return false;
  return previous;
}
export function damperPosition(positionPercent: number, commandPercent: number, elapsedSeconds: number, travelSeconds: number) {
  const maximumMove = Math.max(0, elapsedSeconds) / Math.max(0.001, travelSeconds) * 100;
  const target = clamp(commandPercent, 0, 100);
  const delta = target - positionPercent;
  return clamp(positionPercent + Math.sign(delta) * Math.min(Math.abs(delta), maximumMove), 0, 100);
}

export function solarPowerW(irradianceWPerM2: number, areaM2: number, efficiency: number, derate = 1) { return Math.max(0, irradianceWPerM2) * Math.max(0, areaM2) * clamp(efficiency, 0, 1) * clamp(derate, 0, 1); }
export function batteryStateOfCharge(previousPercent: number, currentA: number, capacityAh: number, elapsedHours: number) { return clamp(previousPercent + currentA * Math.max(0, elapsedHours) / Math.max(0.001, capacityAh) * 100, 0, 100); }
export function inverterAcPowerW(dcPowerW: number, efficiency = 0.94, ratedPowerW = Number.POSITIVE_INFINITY) { return Math.min(Math.max(0, ratedPowerW), Math.max(0, dcPowerW) * clamp(efficiency, 0, 1)); }
export function gridTieClosed(gridPresent: boolean, frequencyDifferenceHz: number, maximumDifferenceHz = 0.2) { return gridPresent && Math.abs(frequencyDifferenceHz) <= Math.max(0, maximumDifferenceHz); }

export function safetyRelayEnergized(channelAClosed: boolean, channelBClosed: boolean, reset: boolean) { return channelAClosed && channelBClosed && reset; }
export function lightCurtainClear(interrupted: boolean) { return !interrupted; }
export function pullCordHealthy(pulled: boolean) { return !pulled; }
export function zeroSpeedDetected(rpm: number, thresholdRpm = 5) { return Math.abs(rpm) <= Math.max(0, thresholdRpm); }
export function phaseHealthy(l1: boolean, l2: boolean, l3: boolean) { return l1 && l2 && l3; }
export function earthLeakageTripped(residualMilliamp: number, settingMilliamp: number) { return Math.max(0, residualMilliamp) >= Math.max(0, settingMilliamp); }

export function threePhaseVoltageDropV(currentA: number, cableLengthM: number, resistanceOhmPerKm: number, powerFactor = 1) {
  return Math.sqrt(3) * Math.max(0, currentA) * Math.max(0, cableLengthM) / 1000 * Math.max(0, resistanceOhmPerKm) * clamp(powerFactor, 0, 1);
}
export function threePhaseCableLossW(currentA: number, cableLengthM: number, resistanceOhmPerKm: number) {
  return 3 * Math.max(0, currentA) ** 2 * Math.max(0, cableLengthM) / 1000 * Math.max(0, resistanceOhmPerKm);
}
