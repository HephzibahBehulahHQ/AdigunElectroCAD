import { compare, currentTransformerSecondaryAmp, dacMilliamp, edgeTrigger, encoderPulses, flowPulseHz, levelToMilliamp, loadCellMillivolt, logicGate, mathBlock, milliampToPlcRaw, normallyClosed, normallyOpen, outputCoil, pt100ResistanceOhm, setResetLatch, thermocoupleMillivolt, vibrationRms } from "./controlLogic";

export interface FunctionalModelResult { label: string; value: string; }
type Properties = Record<string, string | number | boolean>;
type Model = (properties: Properties) => FunctionalModelResult;
const number = (properties: Properties, key: string, fallback = 0) => typeof properties[key] === "number" && Number.isFinite(properties[key]) ? properties[key] : fallback;
const bool = (properties: Properties, key: string) => properties[key] === true;
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
};

export function evaluateFunctionalModel(modelId: string, properties: Properties): FunctionalModelResult | undefined { return models[modelId]?.(properties); }
export function hasFunctionalModel(modelId: string) { return modelId in models; }
