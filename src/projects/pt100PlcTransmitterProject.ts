import { pt100ResistanceOhm } from "../simulation/controlLogic";
import type { ProjectTemplate } from "./templateLibrary";

export function createPt100PlcTransmitterProject(): ProjectTemplate {
  return {
    id: "pt100-plc-transmitter",
    name: "PT100 transmitter · PLC interlock",
    category: "Analog Instrumentation",
    level: "Advanced",
    description: "An RTD feeds a calibrated resistance transmitter, ADC and PLC. The PLC switches an output coil above half of the resistance span. The signal chain inhibits the PLC if the measured resistance leaves the calibrated span.",
    document: {
      id: "pt100-plc-transmitter", name: "PT100 transmitter · PLC interlock", revision: 1,
      description: "Nominal PT100 resistance is mapped linearly to 4–20 mA across the resistance at 0–100 °C. The PLC threshold is in raw counts, and the example does not model probe excitation or supply wiring.",
      components: [
        { id: "rtd", definitionId: "sensor.pt100", reference: "B1", x: 140, y: 320, rotation: 0, properties: { temperatureC: 0 } },
        { id: "tx", definitionId: "signal.resistance-transmitter", reference: "TX1", x: 340, y: 320, rotation: 0, properties: { lowerOhm: pt100ResistanceOhm(0), upperOhm: pt100ResistanceOhm(100), requireWiredInput: true } },
        { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 540, y: 320, rotation: 0, properties: { requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 740, y: 320, rotation: 0, properties: { program: "GT AI0 13824; OUT Q0", requireWiredAi0: true } },
        { id: "output", definitionId: "logic.output-coil", reference: "K1", x: 940, y: 320, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "rtd-ohm", from: { componentId: "rtd", terminalId: "signal" }, to: { componentId: "tx", terminalId: "in" }, netName: "RTD_OHM", points: [] },
        { id: "tx-current", from: { componentId: "tx", terminalId: "out" }, to: { componentId: "adc", terminalId: "in" }, netName: "4_20mA", points: [] },
        { id: "adc-raw", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, netName: "AI0_RAW", points: [] },
        { id: "plc-output", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "output", terminalId: "in" }, netName: "TEMP_ENABLE", points: [] },
      ],
    },
    testSequence: [
      "Run at 0 °C. TX1 supplies 4 mA, ADC1 reports 0 and K1 is OFF.",
      "Stop, set B1 to 100 °C, then Run. TX1 supplies 20 mA, ADC1 reports 27648 and K1 is ON.",
      "Set B1 to 110 °C and Run. The transmitter reports a span fault and the PLC inhibits the output.",
      "Return B1 to 100 °C and Run. The PLC recovers and K1 turns ON.",
    ],
    expectedOutputs: [
      { reference: "TX1", label: "Transmitter current", valueIncludes: "4.00 mA" },
      { reference: "ADC1", label: "PLC raw value", valueIncludes: "0" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: [
      { name: "Full scale", durationSeconds: .1, changes: [{ reference: "B1", properties: { temperatureC: 100 } }], expectations: [{ reference: "ADC1", label: "PLC raw value", exact: "27648" }, { reference: "K1", label: "Coil", exact: "ON" }] },
      { name: "Span fault", durationSeconds: .1, changes: [{ reference: "B1", properties: { temperatureC: 110 } }], expectations: [{ reference: "TX1", label: "Transmitter current", exact: "INVALID" }, { reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 OFF · AI0 INVALID · ERROR: Transmitter resistance is outside its calibrated span." }] },
      { name: "Recover", durationSeconds: .1, changes: [{ reference: "B1", properties: { temperatureC: 100 } }], expectations: [{ reference: "K1", label: "Coil", exact: "ON" }] },
    ],
  };
}
