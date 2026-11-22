import { compare, currentTransformerSecondaryAmp, dacMilliamp, edgeTrigger, encoderPulses, flowPulseHz, levelToMilliamp, loadCellMillivolt, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, pt100ResistanceOhm, setResetLatch, thermocoupleMillivolt, vibrationRms } from "./controlLogic";
import { cylinderPositionPercent, valve52Direction } from "./pneumaticState";
import { batteryStateOfCharge, busbarUtilizationPercent, cableTrayFillPercent, chargeControllerCurrentA, chillerCoolingW, compressorDeliveryLpm, damperPosition, dinRailFillPercent, distributionBoardUtilizationPercent, doorInterlockClosed, earthLeakageTripped, frlOutletPressureBar, gridTieClosed, humidistatOn, hydraulicCylinderForceN, inverterAcPowerW, lightCurtainClear, panelFanCoolingW, panelHeaterPowerW, phaseHealthy, pullCordHealthy, pumpFlowLpm, reliefValveOpen, safetyRelayEnergized, shieldedCableInterferenceFactor, solarPowerW, stackLightChannels, thermostatOn, threePhaseCableLossW, threePhaseVoltageDropV, zeroSpeedDetected } from "./industrialDevices";

export interface FunctionalModelResult { label: string; value: string; error?: string; }
export type SignalUnit = "boolean" | "milliamp" | "plc-raw" | "ohm" | "millivolt" | "hertz" | "acceleration" | "pulse-count" | "ampere" | "scalar" | "motion";
export interface FunctionalSignal { unit: SignalUnit; value: boolean | number | "extend" | "retract" | "hold"; error?: string; }
type Properties = Record<string, string | number | boolean>;
type Model = (properties: Properties) => FunctionalModelResult;
const number = (properties: Properties, key: string, fallback = 0) => typeof properties[key] === "number" && Number.isFinite(properties[key]) ? properties[key] : fallback;
const bool = (properties: Properties, key: string) => properties[key] === true;
const text = (properties: Properties, key: string, fallback = "") => typeof properties[key] === "string" ? properties[key] : fallback;
const binary = (value: boolean) => value ? "ON" : "OFF";
const signal = (unit: SignalUnit, value: FunctionalSignal["value"]): FunctionalSignal => ({ unit, value });
const fault = (error: string): FunctionalSignal => ({ unit: "boolean", value: false, error });
const levelLoopOpenError = "4–20 mA level-transmitter loop is open; PLC input is invalid.";
function adcSignal(properties: Properties): FunctionalSignal {
  const current = properties.milliamp;
  if (bool(properties, "faultOnOutOfRange") && (typeof current !== "number" || !Number.isFinite(current) || current < 4 || current > 20)) {
    return fault("ADC current is outside the configured 4–20 mA range.");
  }
  return signal("plc-raw", milliampToPlcRaw(number(properties, "milliamp", 4)));
}

const mathInput = (properties: Properties, key: string) => properties[key] === undefined ? 0 : typeof properties[key] === "number" ? properties[key] : NaN;
const nominalMotorPoint: Model = (p) => ({ label: "Nominal motor point", value: bool(p, "energized") ? `${number(p, "nominalSpeedRpm")} rpm / ${number(p, "ratedPowerKw")} kW` : "STANDBY" });
const breakerPath: Model = (p) => ({ label: "Breaker path", value: `${bool(p, "closed") ? "CLOSED" : "OPEN"} · ${number(p, "poles", 3)}P / ${number(p, "ratedCurrentA")} A` });

function resistanceTransmitterSignal(properties: Properties): FunctionalSignal {
  const lower = number(properties, "lowerOhm", NaN);
  const upper = number(properties, "upperOhm", NaN);
  const resistance = number(properties, "resistanceOhm", NaN);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || upper <= lower) {
    return fault("Transmitter calibration requires 0 ≤ lower resistance < upper resistance.");
  }
  if (!Number.isFinite(resistance) || resistance < lower || resistance > upper) {
    return fault("Transmitter resistance is outside its calibrated span.");
  }
  return signal("milliamp", 4 + 16 * ((resistance - lower) / (upper - lower)));
}

export function timerParameterError(properties: Properties): string | undefined {
  for (const key of ["delaySeconds", "elapsedSeconds"]) {
    const value = properties[key] ?? 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return `${key} must be a finite, non-negative number.`;
    }
  }
  return undefined;
}
function pneumaticSignal(model: string, p: Properties): FunctionalSignal {
  try {
    if (model === "pneumatic-valve-5-2") return signal("motion", valve52Direction(p));
    if (model === "pneumatic-valve-3-2") return signal("motion", bool(p, "energized") ? "extend" : "retract");
    return signal("scalar", cylinderPositionPercent(p, model === "pneumatic-cylinder-single"));
  } catch (error) { return fault(error instanceof Error ? error.message : "Invalid pneumatic state."); }
}
function pneumaticDisplay(model: string, p: Properties): FunctionalModelResult {
  const result = pneumaticSignal(model, p);
  return { label: model.includes("cylinder") ? "Cylinder position" : "Valve motion command", error: result.error, value: result.error ? `ERROR: ${result.error}` : result.unit === "scalar" ? `${Number(result.value).toFixed(1)}%` : String(result.value) };
}
function pt100Signal(properties: Properties): FunctionalSignal {
  const temperature = properties.temperatureC === undefined ? 20 : typeof properties.temperatureC === "number" ? properties.temperatureC : NaN;
  try { return signal("ohm", pt100ResistanceOhm(temperature)); }
  catch (error) { return fault(error instanceof Error ? error.message : "Invalid PT100 temperature."); }
}
function thermocoupleSignal(properties: Properties): FunctionalSignal {
  const junction = (key: string, fallback: number) => properties[key] === undefined ? fallback : typeof properties[key] === "number" ? properties[key] as number : NaN;
  try { return signal("millivolt", thermocoupleMillivolt(junction("temperatureC", 20), junction("referenceJunctionC", 0))); }
  catch (error) { return fault(error instanceof Error ? error.message : "Invalid Type K junction temperature."); }
}
const memory = (p: Properties) => bool(p, typeof p.runtimePrevious === "boolean" ? "runtimePrevious" : "previous");
const edgeOutput = (p: Properties, kind: "positive" | "negative") => typeof p.scanOutput === "boolean" ? p.scanOutput : edgeTrigger(memory(p), bool(p, "input"))[kind];
const plcOutput = (p: Properties, terminalId = "out-0") => {
  const key = terminalId === "out-1" ? "runtimeQ1" : "runtimeQ0";
  const manualKey = terminalId === "out-1" ? "output1" : "output";
  return text(p, "program").trim() ? bool(p, key) : bool(p, manualKey);
};
const safetyOutput = (p: Properties) => safetyRelayEnergized(bool(p, "channelAClosed"), bool(p, "channelBClosed"), bool(p, "runtimeSafetyArmed"));

const models: Record<string, Model> = {
  "logic-no": (p) => ({ label: "NO output", value: binary(normallyOpen(bool(p, "input"))) }),
  "logic-nc": (p) => ({ label: "NC output", value: binary(normallyClosed(bool(p, "input"))) }),
  "logic-output-coil": (p) => ({ label: "Coil", value: binary(outputCoil(bool(p, "input"))) }),
  "logic-set-coil": (p) => ({ label: "Latch", value: binary(setResetLatch(memory(p), bool(p, "input"), false)) }),
  "logic-reset-coil": (p) => ({ label: "Latch", value: binary(setResetLatch(memory(p), false, bool(p, "input"))) }),
  "logic-edge-positive": (p) => ({ label: "Positive edge", value: binary(edgeOutput(p, "positive")) }),
  "logic-edge-negative": (p) => ({ label: "Negative edge", value: binary(edgeOutput(p, "negative")) }),
  ...Object.fromEntries((["and", "or", "not", "nand", "nor", "xor"] as const).map((kind) => [`logic-gate-${kind}`, (p: Properties) => ({ label: `${kind.toUpperCase()} output`, value: binary(logicGate(kind, [bool(p, "inputA"), bool(p, "inputB")])) })])),
  ...Object.fromEntries((["greater-than", "less-than", "equal-to"] as const).map((kind) => [`logic-comparator-${kind}`, (p: Properties) => ({ label: "Comparator", value: binary(compare(kind, number(p, "left"), number(p, "right"))) })])),
  ...Object.fromEntries((["add", "subtract", "multiply", "divide"] as const).map((kind) => [`logic-math-${kind}`, (p: Properties) => { const result = mathBlock(kind, mathInput(p, "left"), mathInput(p, "right")); return { label: "Math output", error: result.ok ? undefined : result.reason, value: result.ok ? String(result.value) : `ERROR: ${result.reason}` }; }])),
  "sensor-pt100": (p) => { const result = pt100Signal(p); return { label: "PT100 resistance", error: result.error, value: result.error ? `ERROR: ${result.error}` : `${Number(result.value).toFixed(2)} Ω` }; },
  "sensor-thermocouple": (p) => { const result = thermocoupleSignal(p); return { label: "Type K terminal EMF", error: result.error, value: result.error ? `ERROR: ${result.error}` : `${Number(result.value).toFixed(3)} mV` }; },
  "sensor-flow": (p) => ({ label: "Pulse output", value: `${flowPulseHz(number(p, "flowLpm"), number(p, "pulsesPerLitre", 100)).toFixed(2)} Hz` }),
  "sensor-level-4-20": (p) => bool(p, "simulateOpenLoop") ? { label: "Signal fault", error: levelLoopOpenError, value: `ERROR: ${levelLoopOpenError}` } : ({ label: "Level signal", value: `${levelToMilliamp(number(p, "levelPercent", 50)).toFixed(2)} mA` }),
  "sensor-vibration": (p) => ({ label: "Vibration RMS", value: `${vibrationRms([number(p, "acceleration")]).toFixed(3)} m/s²` }),
  "sensor-encoder": (p) => ({ label: "Encoder pulses", value: String(encoderPulses(number(p, "revolutions"), number(p, "pulsesPerRevolution", 1024))) }),
  "sensor-load-cell": (p) => {
    const output = loadCellSignal(p);
    return output.error
      ? { label: "Load-cell output", value: "ERROR: " + output.error, error: output.error }
      : { label: "Load-cell output", value: Number(output.value).toFixed(3) + " mV" };
  },
  "sensor-current-transformer": (p) => {
    const output = currentTransformerSignal(p);
    return output.error
      ? { label: "CT secondary", value: "ERROR: " + output.error, error: output.error }
      : { label: "CT secondary", value: Number(output.value).toFixed(3) + " A" };
  },
  "signal-adc": (p) => {
    const converted = adcSignal(p);
    return converted.error
      ? { label: "PLC raw value", value: "INVALID", error: converted.error }
      : { label: "PLC raw value", value: String(converted.value) };
  },
  "signal-dac": (p) => ({ label: "DAC output", value: `${dacMilliamp(number(p, "raw")).toFixed(2)} mA` }),
  "signal-resistance-transmitter": (p) => {
    const result = resistanceTransmitterSignal(p);
    return { label: "Transmitter current", value: result.error ? "INVALID" : `${Number(result.value).toFixed(2)} mA`, error: result.error };
  },
  "pneumatic-valve-5-2": (p) => pneumaticDisplay("pneumatic-valve-5-2", p),
  "pneumatic-valve-3-2": (p) => pneumaticDisplay("pneumatic-valve-3-2", p),
  "pneumatic-cylinder-single": (p) => pneumaticDisplay("pneumatic-cylinder-single", p),
  "pneumatic-cylinder-double": (p) => pneumaticDisplay("pneumatic-cylinder-double", p),
  "hydraulic-pump": (p) => ({ label: "Pump flow", value: `${pumpFlowLpm(number(p, "displacementCcPerRev"), number(p, "rpm")).toFixed(2)} L/min` }),
  "hydraulic-cylinder": (p) => ({ label: "Cylinder force", value: `${hydraulicCylinderForceN(number(p, "pressureBar"), number(p, "boreDiameterMm")).toFixed(1)} N` }),
  "hydraulic-relief-valve": (p) => ({ label: "Relief valve", value: binary(reliefValveOpen(number(p, "pressureBar"), number(p, "settingBar"))) }),
  "pneumatic-compressor": (p) => ({ label: "Delivery", value: `${compressorDeliveryLpm(number(p, "ratedLpm"), bool(p, "running"), number(p, "loadFactor", 1)).toFixed(1)} L/min` }),
  "pneumatic-frl": (p) => ({ label: "Outlet pressure", value: `${frlOutletPressureBar(number(p, "supplyBar"), number(p, "regulatorBar"), number(p, "dropBar")).toFixed(2)} bar` }),
  "hvac-heater": (p) => ({ label: "Heater output", value: `${panelHeaterPowerW(number(p, "setpointC"), number(p, "temperatureC"), number(p, "ratedPowerW")).toFixed(0)} W` }),
  "hvac-cooling-fan": (p) => ({ label: "Heat removal", value: `${panelFanCoolingW(number(p, "airflowM3PerHour"), number(p, "temperatureRiseC")).toFixed(1)} W` }),
  "hvac-thermostat": (p) => climateContactResult("Thermostat", "hvac-thermostat", p),
  "hvac-humidistat": (p) => climateContactResult("Humidistat", "hvac-humidistat", p),
  "hvac-damper": (p) => {
    const error = damperParameterError(p);
    return error ? { label: "Damper position", value: `ERROR: ${error}`, error } : { label: "Damper position", value: `${damperFeedback(p).toFixed(1)}%` };
  },
  "hvac-chiller": (p) => ({ label: "Cooling output", value: `${chillerCoolingW(number(p, "ratedCoolingW"), bool(p, "compressorRunning")).toFixed(0)} W` }),
  "renewable-solar-panel": (p) => ({ label: "PV power", value: `${solarPowerW(number(p, "irradianceWPerM2"), number(p, "areaM2"), number(p, "efficiency")).toFixed(1)} W` }),
  "renewable-charge-controller": (p) => ({ label: "Charge current", value: `${chargeControllerCurrentA(number(p, "solarInputW"), number(p, "batteryVoltageV"), number(p, "maximumCurrentA")).toFixed(2)} A` }),
  "renewable-battery-bank": (p) => ({ label: "State of charge", value: `${batteryStateOfCharge(number(p, "previousPercent"), number(p, "currentA"), number(p, "capacityAh"), number(p, "elapsedHours")).toFixed(2)}%` }),
  "renewable-inverter": (p) => ({ label: "AC output", value: `${inverterAcPowerW(number(p, "dcPowerW"), number(p, "efficiency"), number(p, "ratedPowerW")).toFixed(1)} W` }),
  "renewable-grid-tie": (p) => ({ label: "Grid tie", value: binary(gridTieClosed(bool(p, "gridPresent"), number(p, "frequencyDifferenceHz"))) }),
  "safety-dual-relay": (p) => ({ label: "Safety relay", value: binary(safetyOutput(p)) }),
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
  "catalog-dc-control-supply": (p) => ({ label: "Control DC supply", value: bool(p, "outputEnabled") ? `${number(p, "nominalVoltageV", 24)} V DC / ${number(p, "ratedCurrentA", 4)} A nominal` : "OFF" }),
  "catalog-ac-supply": (p) => ({ label: "Nominal supply", value: bool(p, "outputEnabled") ? `${number(p, "nominalVoltageV")} V / ${number(p, "frequencyHz", 50)} Hz` : "OFF" }),
  "catalog-circuit-breaker": breakerPath,
  "breaker-3p-v1": breakerPath,
  "three-phase-source-v1": (p) => ({ label: "Nominal supply", value: `${number(p, "voltageV")} V / ${number(p, "frequencyHz")} Hz` }),
  "control-supply-v1": (p) => ({ label: "Nominal AC control supply", value: `${number(p, "voltageV")} V / ${number(p, "frequencyHz")} Hz` }),
  "indicator-lamp-v1": (p) => ({ label: "Indicator lamp", value: bool(p, "runtimeLampLit") ? `LIT · ${number(p, "runtimeLampVoltageV")} V ${bool(p, "dc") ? "DC" : "AC"}` : "OFF" }),
  "pushbutton-start-v1": (p) => ({ label: "Dry contact 13–14", value: bool(p, "pressed") ? "CLOSED" : "OPEN" }),
  "pushbutton-stop-v1": (p) => ({ label: "Dry contact 21–22", value: bool(p, "pressed") ? "OPEN" : "CLOSED" }),
  "catalog-fuse-switch": (p) => ({ label: "Fuse check", value: bool(p, "fuseHealthy") && number(p, "loadCurrentA") <= number(p, "ratedCurrentA") ? `${(number(p, "loadCurrentA") / number(p, "ratedCurrentA", 1) * 100).toFixed(1)}% load` : "TRIPPED / OVERRATING" }),
  "catalog-motor-starter": (p) => ({ label: "Starter contacts", value: bool(p, "energized") ? `CLOSED · ${number(p, "coilVoltageV")} V coil` : "OPEN" }),
  "catalog-interface-relay": (p) => ({ label: "Relay contacts", value: bool(p, "energized") ? `ENERGIZED · ${number(p, "changeoverContacts", 1)} CO` : "DE-ENERGIZED" }),
  "catalog-selector-switch": (p) => ({ label: "Switch state", value: `${bool(p, "closed") ? "CLOSED" : "OPEN"} · ${text(p, "contactForm", "NO")}` }),
  "catalog-induction-motor": nominalMotorPoint,
  "induction-motor-educational-v1": nominalMotorPoint,
  "catalog-control-transformer": (p) => ({ label: "Ideal ratio output", value: `${(number(p, "secondaryVoltageV") * (1 - number(p, "loadPercent") / 2000)).toFixed(1)} V from ${number(p, "primaryVoltageV")} V` }),
  "catalog-proximity-sensor": (p) => ({ label: "Sensor output", value: bool(p, "detected") ? `${text(p, "outputType", "PNP")} ON` : `${text(p, "outputType", "PNP")} OFF` }),
  "catalog-plc-digital-io": (p) => ({ label: "I/O state", error: text(p, "runtimeError") || undefined, value: `I0 ${binary(bool(p, "inputA"))} · I1 ${binary(bool(p, "inputB"))} · Q0 ${binary(plcOutput(p, "out-0"))}${(/\bQ1\b/.test(text(p, "program").toUpperCase()) || bool(p, "output1") || bool(p, "runtimeQ1")) ? ` · Q1 ${binary(plcOutput(p, "out-1"))}` : ""}${text(p, "program").toUpperCase().includes("AI0") ? ` · AI0 ${p.runtimeInvalidAi0 === true ? "INVALID" : number(p, "analogInput0")}` : ""}${text(p, "program").toUpperCase().includes("AI1") ? ` · AI1 ${p.runtimeInvalidAi1 === true ? "INVALID" : number(p, "analogInput1")}` : ""}${[...new Set(text(p, "program").toUpperCase().match(/\bD[0-7]\b/g) ?? [])].map((register) => ` · ${register} ${Number(number(p, `runtime${register}`).toPrecision(8))}`).join("")}${text(p, "runtimeError") ? ` · ERROR: ${text(p, "runtimeError")}` : ""}` }),
  "catalog-on-delay-timer": (p) => ({ label: "Timer contact", value: bool(p, "energized") && number(p, "elapsedSeconds") >= number(p, "delaySeconds") ? "CLOSED" : `${number(p, "elapsedSeconds").toFixed(1)} / ${number(p, "delaySeconds").toFixed(1)} s` }),
  "catalog-feed-through-terminal": (p) => ({ label: "Terminal continuity", value: bool(p, "continuityClosed") ? `CONNECTED · ${number(p, "conductorAreaMm2")} mm²` : "OPEN" }),
  "catalog-panel-meter": (p) => ({ label: `${text(p, "measurementKind", "Value")} reading`, value: `${number(p, "measuredValue")} / ${number(p, "scaleMaximum")}` }),
  "catalog-variable-frequency-drive": (p) => ({ label: "VFD output", value: !bool(p, "enabled") ? "DISABLED" : p.runtimeInputReady === false ? "INPUT SUPPLY INCOMPLETE" : `${Math.max(0, Math.min(number(p, "commandHz"), number(p, "maximumFrequencyHz"))).toFixed(1)} Hz` }),
  "catalog-solenoid-actuator": (p) => ({ label: "Actuator position", value: bool(p, "energized") ? number(p, "strokeMm") > 0 ? `EXTENDED ${number(p, "strokeMm")} mm` : "EXTENDED · stroke unset" : bool(p, "returnSpring") ? "RETRACTED" : "HOLD" }),
  "catalog-safety-relay": (p) => ({ label: "Safety enable", value: safetyOutput(p) ? "ENABLED · educational reset model" : "INHIBITED" }),
};

export function evaluateFunctionalModel(modelId: string, properties: Properties): FunctionalModelResult | undefined {
  if (modelId === "catalog-on-delay-timer") {
    const error = timerParameterError(properties);
    if (error) return { label: "Timer contact", error, value: `ERROR: ${error}` };
  }
  const signalError = text(properties, "runtimeSignalError");
  if (signalError) {
    if (modelId === "catalog-plc-digital-io") return models[modelId]({ ...properties, runtimeError: signalError });
    return { label: "Signal fault", error: signalError, value: `ERROR: ${signalError}` };
  }
  if (modelId === "contactor-dol-v1") return { label: "Wired control coil", value: `${number(properties, "runtimeCoilVoltageV")} V · ${bool(properties, "energized") ? "ENERGIZED" : "OFF"}` };
  if (modelId === "thermal-overload-dol-v1") {
    if (bool(properties, "thermalEnabled")) {
      const error = text(properties, "runtimeCurrentError");
      if (error) return { label: "Thermal overload", error, value: `ERROR: ${error}` };
      return { label: "Thermal overload", value: `${number(properties, "runtimeLoadCurrentA").toFixed(2)} A · ${(number(properties, "runtimeThermalLevel") * 100).toFixed(1)}% heat · ${bool(properties, "tripped") ? "TRIPPED" : "READY"}` };
    }
    return { label: "Overload NC contact", value: bool(properties, "tripped") ? "OPEN" : "CLOSED" };
  }
  if (modelId === "power-junction") return { label: "Attached power conductors", value: String(number(properties, "connectedConductors")) };
  if (modelId === "six-terminal-windings") {
    const supplyError = text(properties, "runtimeMotorSupplyError");
    if (supplyError) return { label: "Winding operating point", error: supplyError, value: `ERROR: ${supplyError}` };
    const connection = text(properties, "connection", "open");
    const voltage = number(properties, "lineVoltageV");
    if (bool(properties, "mechanicalTransientEnabled")) {
      const error = text(properties, "runtimeMotorModelError");
      if (error) return { label: "Winding operating point", error, value: `ERROR: ${error}` };
    }
    if (bool(properties, "equivalentCircuitEnabled")) {
      const error = text(properties, "runtimeMotorModelError");
      if (error) return { label: "Winding operating point", error, value: `ERROR: ${error}` };
      const windingVoltage = connection === "star" ? voltage / Math.sqrt(3) : connection === "delta" ? voltage : 0;
      const current = number(properties, "runtimeMotorLineCurrentA");
      const torque = number(properties, "runtimeElectromagneticTorqueNm");
      const speed = number(properties, "runtimeRotorSpeedRpm", number(properties, "initialRotorSpeedRpm"));
      const transient = bool(properties, "mechanicalTransientEnabled")
        ? ` · ${speed.toFixed(1)} rpm${voltage > 0 && connection !== "open" ? ` · ${number(properties, "runtimeSlip").toFixed(4)} slip` : speed > 0 ? " · COASTING" : ""}`
        : "";
      return { label: "Winding operating point", value: `${connection.toUpperCase()} · ${windingVoltage.toFixed(2)} V/winding · ${current.toFixed(2)} A line · ${torque.toFixed(2)} N·m${transient}` };
    }
    const resistance = number(properties, "resistanceOhm");
    const reactance = number(properties, "reactanceOhm");
    if (resistance <= 0 || reactance < 0) return { label: "Winding operating point", value: "INVALID IMPEDANCE", error: "Winding resistance must be positive and reactance non-negative." };
    const windingVoltage = connection === "star" ? voltage / Math.sqrt(3) : connection === "delta" ? voltage : 0;
    const current = windingVoltage / Math.hypot(resistance, reactance) * (connection === "delta" ? Math.sqrt(3) : 1);
    return { label: "Winding operating point", value: `${connection.toUpperCase()} · ${windingVoltage.toFixed(2)} V/winding · ${current.toFixed(2)} A line` };
  }
  return models[modelId]?.(properties);
}
export function hasFunctionalModel(modelId: string) { return ["contactor-dol-v1", "thermal-overload-dol-v1", "power-junction", "six-terminal-windings"].includes(modelId) || modelId in models; }

export function climateContactClosed(modelId: "hvac-thermostat" | "hvac-humidistat", p: Properties): boolean {
  const previous = typeof p.runtimeClimateContact === "boolean" ? p.runtimeClimateContact : bool(p, "previous");
  return p.enabled !== false && (modelId === "hvac-thermostat"
    ? thermostatOn(number(p, "temperatureC"), number(p, "setpointC"), number(p, "hysteresisC"), previous)
    : humidistatOn(number(p, "humidityPercent"), number(p, "setpointPercent"), number(p, "hysteresisPercent"), previous));
}

function currentTransformerSignal(properties: Properties): FunctionalSignal {
  const rating = properties.ratedPrimaryA ?? 100;
  const primary = properties.primaryA ?? 0;
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return fault("CT primary rating must be finite and positive.");
  }
  if (typeof primary !== "number" || !Number.isFinite(primary) || primary < 0) {
    return fault("CT primary current must be finite and nonnegative.");
  }
  const current = currentTransformerSecondaryAmp(primary, rating);
  return Number.isFinite(current) ? signal("ampere", current) : fault("CT secondary calculation is outside the numerical range.");
}

function loadCellSignal(properties: Properties): FunctionalSignal {
  const capacity = properties.capacityN ?? 1000;
  const force = properties.forceN ?? 0;
  if (typeof capacity !== "number" || !Number.isFinite(capacity) || capacity <= 0) {
    return fault("Load-cell capacity must be finite and positive.");
  }
  if (typeof force !== "number" || !Number.isFinite(force) || force < 0 || force > capacity) {
    return fault("Load-cell force is outside the configured measuring range.");
  }
  return signal("millivolt", loadCellMillivolt(force, capacity));
}

function climateContactSignal(modelId: "hvac-thermostat" | "hvac-humidistat", properties: Properties): FunctionalSignal {
  const humidity = modelId === "hvac-humidistat";
  const measurement = properties[humidity ? "humidityPercent" : "temperatureC"] ?? 0;
  const setpoint = properties[humidity ? "setpointPercent" : "setpointC"] ?? 0;
  const hysteresis = properties[humidity ? "hysteresisPercent" : "hysteresisC"] ?? 0;
  const minimum = humidity ? 0 : -273.15;
  const maximum = humidity ? 100 : Infinity;
  const inRange = (value: string | number | boolean) =>
    typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
  if (!inRange(measurement) || !inRange(setpoint)) {
    return fault(humidity ? "Humidity and setpoint must be between 0 and 100 percent." : "Temperature and setpoint must be finite and at or above absolute zero.");
  }
  if (typeof hysteresis !== "number" || !Number.isFinite(hysteresis) || hysteresis < 0 || (humidity && hysteresis > 100)) {
    return fault(humidity ? "Humidity hysteresis must be between 0 and 100 percent." : "Temperature hysteresis must be finite and nonnegative.");
  }
  return signal("boolean", climateContactClosed(modelId, properties));
}

function climateContactResult(label: string, modelId: "hvac-thermostat" | "hvac-humidistat", properties: Properties): FunctionalModelResult {
  const output = climateContactSignal(modelId, properties);
  return output.error ? { label, value: "ERROR: " + output.error, error: output.error } : { label, value: binary(output.value === true) };
}

function damperFeedback(p: Properties) {
  if (typeof p.runtimeDamperPositionPercent === "number") return p.runtimeDamperPositionPercent;
  const position = number(p, "positionPercent");
  return p.runtimeDamperCommandBound === true ? position : damperPosition(position, number(p, "commandPercent"), number(p, "elapsedSeconds", 1), number(p, "travelSeconds", 10));
}

export function damperParameterError(p: Properties): string | undefined {
  const travel = p.travelSeconds ?? 10;
  const position = p.runtimeDamperPositionPercent ?? p.positionPercent ?? 0;
  if (typeof travel !== "number" || !Number.isFinite(travel) || travel <= 0) return "Damper travel time must be finite and positive.";
  if (typeof position !== "number" || !Number.isFinite(position) || position < 0 || position > 100) return "Damper position must be between 0 and 100 percent.";
}

export function evaluateFunctionalSignal(modelId: string, properties: Properties, terminalId?: string): FunctionalSignal | undefined {
  if (text(properties, "runtimeSignalError")) return fault(text(properties, "runtimeSignalError"));
  if (modelId === "hvac-damper" && terminalId === "out") {
    const error = damperParameterError(properties);
    return error ? fault(error) : signal("scalar", damperFeedback(properties));
  }
  if (modelId === "hvac-thermostat" || modelId === "hvac-humidistat") return terminalId === "out" ? climateContactSignal(modelId, properties) : undefined;
  if (modelId === "catalog-circuit-breaker") return signal("boolean", bool(properties, "closed"));
  if (modelId === "catalog-selector-switch" && ["14", "22"].includes(terminalId ?? "")) return signal("boolean", bool(properties, "closed") && bool(properties, "inputSignal"));
  if (["pneumatic-valve-5-2", "pneumatic-valve-3-2", "pneumatic-cylinder-single", "pneumatic-cylinder-double"].includes(modelId)) return pneumaticSignal(modelId, properties);
  if (modelId === "thermal-overload-dol-v1" && (terminalId === "aux-96" || terminalId === "aux-98")) {
    const common = properties[terminalId === "aux-96" ? "aux95Input" : "aux97Input"];
    if (typeof common !== "boolean") return undefined;
    return signal("boolean", common && (terminalId === "aux-96" ? !bool(properties, "tripped") : bool(properties, "tripped")));
  }
  if (modelId === "catalog-safety-relay" || modelId === "safety-dual-relay") return signal("boolean", terminalId === "42" ? !safetyOutput(properties) : safetyOutput(properties));
  if (modelId === "catalog-motor-starter" && ["aux-14", "aux-22"].includes(terminalId ?? "")) {
    const common = properties[terminalId === "aux-14" ? "aux13Input" : "aux21Input"];
    if (typeof common !== "boolean") return undefined;
    return signal("boolean", common && (bool(properties, "energized") === (terminalId === "aux-14")));
  }
  if (modelId === "catalog-feed-through-terminal") return signal("boolean", bool(properties, "continuityClosed") && bool(properties, "inputSignal"));
  if (modelId === "catalog-on-delay-timer") {
    const error = timerParameterError(properties);
    if (error) return fault(error);
    if (terminalId !== "16" && terminalId !== "18") return undefined;
    const common = properties.timerContactCommon;
    if (typeof common !== "boolean") return undefined;
    const elapsed = bool(properties, "energized") && number(properties, "elapsedSeconds") >= number(properties, "delaySeconds");
    return signal("boolean", common && (terminalId === "18" ? elapsed : !elapsed));
  }
  if (modelId === "catalog-interface-relay" && /^[1-3][24]$/.test(terminalId ?? "")) {
    const common = properties[`contact${terminalId![0]}1`];
    if (typeof common !== "boolean") return undefined;
    return signal("boolean", common && (bool(properties, "energized") === terminalId!.endsWith("4")));
  }
  if (modelId === "catalog-proximity-sensor") return signal("boolean", bool(properties, "detected"));
  if (modelId === "catalog-plc-digital-io") return signal("boolean", plcOutput(properties, terminalId));
  if (modelId === "logic-no") return signal("boolean", normallyOpen(bool(properties, "input")));
  if (modelId === "logic-nc") return signal("boolean", normallyClosed(bool(properties, "input")));
  if (modelId === "logic-output-coil") return signal("boolean", outputCoil(bool(properties, "input")));
  if (modelId === "logic-set-coil") return signal("boolean", setResetLatch(memory(properties), bool(properties, "input"), false));
  if (modelId === "logic-reset-coil") return signal("boolean", setResetLatch(memory(properties), false, bool(properties, "input")));
  if (modelId === "logic-edge-positive") return signal("boolean", edgeOutput(properties, "positive"));
  if (modelId === "logic-edge-negative") return signal("boolean", edgeOutput(properties, "negative"));
  const gate = modelId.replace("logic-gate-", "");
  if (["and", "or", "not", "nand", "nor", "xor"].includes(gate)) return signal("boolean", logicGate(gate as "and" | "or" | "not" | "nand" | "nor" | "xor", [bool(properties, "inputA"), bool(properties, "inputB")]));
  const comparator = modelId.replace("logic-comparator-", "");
  if (["greater-than", "less-than", "equal-to"].includes(comparator)) return signal("boolean", compare(comparator as "greater-than" | "less-than" | "equal-to", number(properties, "left"), number(properties, "right")));
  const math = modelId.replace("logic-math-", "");
  if (["add", "subtract", "multiply", "divide"].includes(math)) { const result = mathBlock(math as "add" | "subtract" | "multiply" | "divide", mathInput(properties, "left"), mathInput(properties, "right")); return result.ok ? signal("scalar", result.value) : fault(result.reason); }
  if (modelId === "sensor-pt100") return pt100Signal(properties);
  if (modelId === "sensor-thermocouple") return thermocoupleSignal(properties);
  if (modelId === "sensor-flow") return signal("hertz", flowPulseHz(number(properties, "flowLpm"), number(properties, "pulsesPerLitre", 100)));
  if (modelId === "sensor-level-4-20") return bool(properties, "simulateOpenLoop") ? fault(levelLoopOpenError) : signal("milliamp", levelToMilliamp(number(properties, "levelPercent", 50)));
  if (modelId === "sensor-vibration") return signal("acceleration", vibrationRms([number(properties, "acceleration")]));
  if (modelId === "sensor-encoder") return signal("pulse-count", encoderPulses(number(properties, "revolutions"), number(properties, "pulsesPerRevolution", 1024)));
  if (modelId === "sensor-load-cell") return loadCellSignal(properties);
  if (modelId === "sensor-current-transformer" && terminalId === "signal") return currentTransformerSignal(properties);
  if (modelId === "signal-adc") return adcSignal(properties);
  if (modelId === "signal-dac") return signal("milliamp", dacMilliamp(number(properties, "raw")));
  if (modelId === "signal-resistance-transmitter") return resistanceTransmitterSignal(properties);
  return undefined;
}

