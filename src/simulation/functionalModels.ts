import { compare, currentTransformerSecondaryAmp, dacMilliamp, edgeTrigger, encoderPulses, flowPulseHz, levelToMilliamp, loadCellMillivolt, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, pt100ResistanceOhm, setResetLatch, thermocoupleMillivolt, vibrationRms } from "./controlLogic";
import { batteryStateOfCharge, busbarUtilizationPercent, cableTrayFillPercent, chargeControllerCurrentA, chillerCoolingW, compressorDeliveryLpm, cylinderPosition, damperPosition, directionalValve32, directionalValve52, dinRailFillPercent, distributionBoardUtilizationPercent, doorInterlockClosed, earthLeakageTripped, frlOutletPressureBar, gridTieClosed, humidistatOn, hydraulicCylinderForceN, inverterAcPowerW, lightCurtainClear, panelFanCoolingW, panelHeaterPowerW, phaseHealthy, pullCordHealthy, pumpFlowLpm, reliefValveOpen, safetyRelayEnergized, shieldedCableInterferenceFactor, solarPowerW, stackLightChannels, thermostatOn, threePhaseCableLossW, threePhaseVoltageDropV, zeroSpeedDetected } from "./industrialDevices";

export interface FunctionalModelResult { label: string; value: string; }
type Properties = Record<string, string | number | boolean>;
type Model = (properties: Properties) => FunctionalModelResult;
const number = (properties: Properties, key: string, fallback = 0) => typeof properties[key] === "number" && Number.isFinite(properties[key]) ? properties[key] : fallback;
const bool = (properties: Properties, key: string) => properties[key] === true;
const text = (properties: Properties, key: string, fallback = "") => typeof properties[key] === "string" ? properties[key] : fallback;
const binary = (value: boolean) => value ? "ON" : "OFF";

const models: Record<string, Model> = {
  "logic-no": (p) => ({ label: "NO output", value: binary(normallyOpen(bool(p, "input"))) }),
  "logic-nc": (p) => ({ label: "NC output", value: binary(normallyClosed(bool(p, "input"))) }),
  "logic-output-coil": (p) => ({ label: "Coil", value: binary(outputCoil(bool(p, "input"))) }),
  "logic-set-coil": (p) => ({ label: "Latch", value: binary(setResetLatch(bool(p, "previous"), bool(p, "input"), false)) }),
  "logic-reset-coil": (p) => ({ label: "Latch", value: binary(setResetLatch(bool(p, "previous"), false, bool(p, "input"))) }),
  "logic-edge-positive": (p) => ({ label: "Positive edge", value: binary(edgeTrigger(bool(p, "previous"), bool(p, "input")).positive) }),
  "logic-edge-negative": (p) => ({ label: "Negative edge", value: binary(edgeTrigger(bool(p, "previous"), bool(p, "input")).negative) }),
  ...Object.fromEntries((["and", "or", "not", "nand", "nor", "xor"] as const).map((kind) => [`logic-gate-${kind}`, (p: Properties) => ({ label: `${kind.toUpperCase()} output`, value: binary(logicGate(kind, [bool(p, "inputA"), bool(p, "inputB")])) })])),
  ...Object.fromEntries((["greater-than", "less-than", "equal-to"] as const).map((kind) => [`logic-comparator-${kind}`, (p: Properties) => ({ label: "Comparator", value: binary(compare(kind, number(p, "left"), number(p, "right"))) })])),
  ...Object.fromEntries((["add", "subtract", "multiply", "divide"] as const).map((kind) => [`logic-math-${kind}`, (p: Properties) => { const result = mathBlock(kind, number(p, "left"), number(p, "right")); return { label: "Math output", value: result.ok ? String(result.value) : result.reason }; }])),
  "sensor-pt100": (p) => ({ label: "PT100 resistance", value: `${pt100ResistanceOhm(number(p, "temperatureC", 20)).toFixed(2)} Ω` }),
  "sensor-thermocouple": (p) => ({ label: "Thermocouple output", value: `${thermocoupleMillivolt(number(p, "temperatureC", 20)).toFixed(3)} mV` }),
  "sensor-flow": (p) => ({ label: "Pulse output", value: `${flowPulseHz(number(p, "flowLpm"), number(p, "pulsesPerLitre", 100)).toFixed(2)} Hz` }),
  "sensor-level-4-20": (p) => ({ label: "Level signal", value: `${levelToMilliamp(number(p, "levelPercent", 50)).toFixed(2)} mA` }),
  "sensor-vibration": (p) => ({ label: "Vibration RMS", value: `${vibrationRms([number(p, "acceleration")]).toFixed(3)} m/s²` }),
  "sensor-encoder": (p) => ({ label: "Encoder pulses", value: String(encoderPulses(number(p, "revolutions"), number(p, "pulsesPerRevolution", 1024))) }),
  "sensor-load-cell": (p) => ({ label: "Load-cell output", value: `${loadCellMillivolt(number(p, "forceN"), number(p, "capacityN", 1000)).toFixed(3)} mV` }),
  "sensor-current-transformer": (p) => ({ label: "CT secondary", value: `${currentTransformerSecondaryAmp(number(p, "primaryA"), number(p, "ratedPrimaryA", 100)).toFixed(3)} A` }),
  "signal-adc": (p) => ({ label: "PLC raw value", value: String(milliampToPlcRaw(number(p, "milliamp", 4))) }),
  "signal-dac": (p) => ({ label: "DAC output", value: `${dacMilliamp(number(p, "raw")).toFixed(2)} mA` }),
  "pneumatic-valve-5-2": (p) => ({ label: "Valve position", value: directionalValve52(bool(p, "extendCoil"), bool(p, "retractCoil")) }),
  "pneumatic-valve-3-2": (p) => ({ label: "Valve path", value: directionalValve32(bool(p, "energized")) }),
  "pneumatic-cylinder-single": (p) => ({ label: "Next position", value: `${cylinderPosition(number(p, "positionPercent"), text(p, "direction") === "retract" ? "retract" : "extend", number(p, "elapsedSeconds", 1), number(p, "travelSeconds", 4)).toFixed(1)}%` }),
  "pneumatic-cylinder-double": (p) => ({ label: "Next position", value: `${cylinderPosition(number(p, "positionPercent"), text(p, "direction") === "retract" ? "retract" : text(p, "direction") === "hold" ? "hold" : "extend", number(p, "elapsedSeconds", 1), number(p, "travelSeconds", 4)).toFixed(1)}%` }),
  "hydraulic-pump": (p) => ({ label: "Pump flow", value: `${pumpFlowLpm(number(p, "displacementCcPerRev"), number(p, "rpm")).toFixed(2)} L/min` }),
  "hydraulic-cylinder": (p) => ({ label: "Cylinder force", value: `${hydraulicCylinderForceN(number(p, "pressureBar"), number(p, "boreDiameterMm")).toFixed(1)} N` }),
  "hydraulic-relief-valve": (p) => ({ label: "Relief valve", value: binary(reliefValveOpen(number(p, "pressureBar"), number(p, "settingBar"))) }),
  "pneumatic-compressor": (p) => ({ label: "Delivery", value: `${compressorDeliveryLpm(number(p, "ratedLpm"), bool(p, "running"), number(p, "loadFactor", 1)).toFixed(1)} L/min` }),
  "pneumatic-frl": (p) => ({ label: "Outlet pressure", value: `${frlOutletPressureBar(number(p, "supplyBar"), number(p, "regulatorBar"), number(p, "dropBar")).toFixed(2)} bar` }),
  "hvac-heater": (p) => ({ label: "Heater output", value: `${panelHeaterPowerW(number(p, "setpointC"), number(p, "temperatureC"), number(p, "ratedPowerW")).toFixed(0)} W` }),
  "hvac-cooling-fan": (p) => ({ label: "Heat removal", value: `${panelFanCoolingW(number(p, "airflowM3PerHour"), number(p, "temperatureRiseC")).toFixed(1)} W` }),
  "hvac-thermostat": (p) => ({ label: "Thermostat", value: binary(thermostatOn(number(p, "temperatureC"), number(p, "setpointC"), number(p, "hysteresisC"), bool(p, "previous"))) }),
  "hvac-humidistat": (p) => ({ label: "Humidistat", value: binary(humidistatOn(number(p, "humidityPercent"), number(p, "setpointPercent"), number(p, "hysteresisPercent"), bool(p, "previous"))) }),
  "hvac-damper": (p) => ({ label: "Damper position", value: `${damperPosition(number(p, "positionPercent"), number(p, "commandPercent"), number(p, "elapsedSeconds", 1), number(p, "travelSeconds", 10)).toFixed(1)}%` }),
  "hvac-chiller": (p) => ({ label: "Cooling output", value: `${chillerCoolingW(number(p, "ratedCoolingW"), bool(p, "compressorRunning")).toFixed(0)} W` }),
  "renewable-solar-panel": (p) => ({ label: "PV power", value: `${solarPowerW(number(p, "irradianceWPerM2"), number(p, "areaM2"), number(p, "efficiency")).toFixed(1)} W` }),
  "renewable-charge-controller": (p) => ({ label: "Charge current", value: `${chargeControllerCurrentA(number(p, "solarInputW"), number(p, "batteryVoltageV"), number(p, "maximumCurrentA")).toFixed(2)} A` }),
  "renewable-battery-bank": (p) => ({ label: "State of charge", value: `${batteryStateOfCharge(number(p, "previousPercent"), number(p, "currentA"), number(p, "capacityAh"), number(p, "elapsedHours")).toFixed(2)}%` }),
  "renewable-inverter": (p) => ({ label: "AC output", value: `${inverterAcPowerW(number(p, "dcPowerW"), number(p, "efficiency"), number(p, "ratedPowerW")).toFixed(1)} W` }),
  "renewable-grid-tie": (p) => ({ label: "Grid tie", value: binary(gridTieClosed(bool(p, "gridPresent"), number(p, "frequencyDifferenceHz"))) }),
  "safety-dual-relay": (p) => ({ label: "Safety relay", value: binary(safetyRelayEnergized(bool(p, "channelAClosed"), bool(p, "channelBClosed"), bool(p, "reset"))) }),
  "safety-light-curtain": (p) => ({ label: "Protected field", value: lightCurtainClear(bool(p, "interrupted")) ? "CLEAR" : "BLOCKED" }),
  "safety-pull-cord": (p) => ({ label: "Pull cord", value: pullCordHealthy(bool(p, "pulled")) ? "HEALTHY" : "TRIPPED" }),
  "safety-zero-speed": (p) => ({ label: "Zero speed", value: binary(zeroSpeedDetected(number(p, "rpm"), number(p, "thresholdRpm", 5))) }),
  "safety-phase-failure": (p) => ({ label: "Phase monitor", value: phaseHealthy(bool(p, "l1"), bool(p, "l2"), bool(p, "l3")) ? "HEALTHY" : "FAILED" }),
  "safety-earth-leakage": (p) => ({ label: "Earth leakage", value: earthLeakageTripped(number(p, "residualMilliamp"), number(p, "settingMilliamp")) ? "TRIPPED" : "HEALTHY" }),
  "panel-busbar": (p) => ({ label: "Busbar utilization", value: `${busbarUtilizationPercent(number(p, "currentA"), number(p, "ratedCurrentA")).toFixed(1)}%` }),
  "panel-distribution-board": (p) => ({ label: "Board utilization", value: `${distributionBoardUtilizationPercent(number(p, "energizedWays"), number(p, "totalWays")).toFixed(1)}%` }),
  "panel-din-rail": (p) => ({ label: "DIN rail fill", value: `${dinRailFillPercent(number(p, "occupiedMm"), number(p, "railLengthMm")).toFixed(1)}%` }),
  "panel-cooling-fan": (p) => ({ label: "Cooling capacity", value: `${panelFanCoolingW(number(p, "airflowM3PerHour"), number(p, "temperatureRiseC")).toFixed(1)} W` }),
  "panel-heater": (p) => ({ label: "Heater output", value: `${panelHeaterPowerW(number(p, "setpointC"), number(p, "temperatureC"), number(p, "ratedPowerW")).toFixed(1)} W` }),
  "panel-door-interlock": (p) => ({ label: "Door interlock", value: binary(doorInterlockClosed(bool(p, "doorClosed"), bool(p, "keyReleased"))) }),
  "panel-stack-light": (p) => { const channels = stackLightChannels(bool(p, "red"), bool(p, "yellow"), bool(p, "green")); return { label: "Stack light", value: `${channels.red ? "R" : ""}${channels.yellow ? "Y" : ""}${channels.green ? "G" : ""}` || "OFF" }; },
  "cable-multicore": (p) => ({ label: "Cable result", value: `${threePhaseVoltageDropV(number(p, "currentA"), number(p, "lengthM"), number(p, "resistanceOhmPerKm")).toFixed(2)} V / ${threePhaseCableLossW(number(p, "currentA"), number(p, "lengthM"), number(p, "resistanceOhmPerKm")).toFixed(1)} W` }),
  "cable-armored": (p) => ({ label: "Cable result", value: `${threePhaseVoltageDropV(number(p, "currentA"), number(p, "lengthM"), number(p, "resistanceOhmPerKm")).toFixed(2)} V / ${threePhaseCableLossW(number(p, "currentA"), number(p, "lengthM"), number(p, "resistanceOhmPerKm")).toFixed(1)} W` }),
  "cable-shielded": (p) => ({ label: "Interference factor", value: shieldedCableInterferenceFactor(bool(p, "shieldBonded")).toFixed(2) }),
  "cable-tray": (p) => ({ label: "Tray fill", value: `${cableTrayFillPercent(number(p, "usedAreaMm2"), number(p, "availableAreaMm2")).toFixed(1)}%` }),
};

export function evaluateFunctionalModel(modelId: string, properties: Properties): FunctionalModelResult | undefined { return models[modelId]?.(properties); }
export function hasFunctionalModel(modelId: string) { return modelId in models; }
