import type { CircuitDocument } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";

export function createAnalogLevelProject(): ProjectTemplate {
  const document: CircuitDocument = {
    id: "analog-level-threshold", name: "4–20 mA level threshold · ADC / PLC", revision: 1,
    description: "A level transmitter feeds an ADC and PLC AI0; Q0 commands K1 above 50% level.",
    components: [
      { id: "level", definitionId: "sensor.level-4-20", reference: "B1", x: 140, y: 300, rotation: 0, properties: { levelPercent: 50 } },
      { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 340, y: 300, rotation: 0, properties: { milliamp: 12 } },
      { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 540, y: 300, rotation: 0, properties: { program: "GT AI0 13824; OUT Q0" } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 740, y: 300, rotation: 0, properties: { input: false } },
    ],
    wires: [
      { id: "level-current", from: { componentId: "level", terminalId: "signal" }, to: { componentId: "adc", terminalId: "in" }, points: [], netName: "4_20mA" },
      { id: "adc-raw", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [], netName: "AI0_RAW" },
      { id: "plc-output", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, points: [], netName: "Q0" },
    ],
  };
  return {
    id: "template-500", name: document.name, category: "Analog Instrumentation", level: "Expert", document,
    description: "Dedicated level-transmitter → ADC → scanned PLC → output-coil circuit. Q0 is ON strictly above 50% level.",
    testSequence: ["Load and Run at 50%: AI0 is 13824 and Q0 is OFF.", "Select B1 and set Level Percent to 75, then Run: AI0 is 20736 and Q0 is ON.", "Set B1 back to 50 or 0, then Run: Q0 must turn OFF."],
    expectedOutputs: [
      { reference: "B1", label: "Level signal", valueIncludes: "12.00" },
      { reference: "ADC1", label: "PLC raw value", valueIncludes: "13824" },
      { reference: "PLC1", label: "I/O state", valueIncludes: "AI0 13824" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: [
      { name: "50% threshold stays off", durationSeconds: 0.1, changes: [], expectations: [{ reference: "K1", label: "Coil", exact: "OFF" }] },
      { name: "75% enables output", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { levelPercent: 75 } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 ON · AI0 20736" }, { reference: "K1", label: "Coil", exact: "ON" }] },
      { name: "50% disables output", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { levelPercent: 50 } }], expectations: [{ reference: "K1", label: "Coil", exact: "OFF" }] },
      { name: "100% full scale", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { levelPercent: 100 } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 ON · AI0 27648" }] },
      { name: "0% zero scale", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { levelPercent: 0 } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 OFF · AI0 0" }, { reference: "K1", label: "Coil", exact: "OFF" }] },
    ],
  };
}
