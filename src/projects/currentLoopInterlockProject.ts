import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createCurrentLoopInterlockProject(): ProjectTemplate {
  const id = "ct-current-loop-plc-interlock";
  const name = "CT current loop and PLC interlock";
  const description = "An ideal CT feeds a 0–5 A to 4–20 mA transmitter, an ADC and a PLC. The PLC output is enabled for a valid measured current above half scale. An open signal lead or out-of-span current inhibits that output.";
  const secondary = { from: { componentId: "ct", terminalId: "signal" }, to: { componentId: "tx", terminalId: "in" } };
  const reading = (name: string, primaryA: number, current: string, indication: string): CircuitSequenceStep => ({
    name, durationSeconds: 0.1, changes: [{ reference: "TA1", properties: { primaryA } }],
    expectations: [{ reference: "TX1", label: "Transmitter current", exact: current }, { reference: "K1", label: "Coil", exact: indication }],
  });
  const fault = (name: string, message: string): CircuitSequenceStep => ({
    name, durationSeconds: 0.1, changes: [],
    expectations: [{ reference: "K1", label: "Signal fault", exact: "ERROR: " + message }],
  });
  const operatingSequence = [
    reading("Set the primary current to 0 A. Verify 4 mA and PLC output OFF.", 0, "4.00 mA", "OFF"),
    reading("Set primary current to 50 A. Verify 12 mA and PLC output OFF at the threshold.", 50, "12.00 mA", "OFF"),
    reading("Set primary current to 90 A. Verify 18.4 mA and PLC output ON.", 90, "18.40 mA", "ON"),
    {
      ...fault("Open the CT_SIGNAL lead. Verify a missing-input fault at the PLC output.", "Required analog terminal TX1.A IN has no wire."),
      wireChanges: [{ ...secondary, connected: false }],
    },
    {
      ...reading("Reconnect the CT_SIGNAL lead. Verify 18.4 mA and PLC output ON.", 90, "18.40 mA", "ON"),
      wireChanges: [{ ...secondary, connected: true }],
    },
    {
      ...fault("Set primary current to 110 A. Verify span fault and PLC output inhibition.", "Transmitter current is outside its calibrated span."),
      changes: [{ reference: "TA1", properties: { primaryA: 110 } }],
    },
    reading("Return to 90 A. Verify the loop and PLC output recover.", 90, "18.40 mA", "ON"),
  ];
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ct", definitionId: "sensor.current-transformer", reference: "TA1", x: 140, y: 330, rotation: 0, properties: { primaryA: 0, ratedPrimaryA: 100 } },
        { id: "tx", definitionId: "signal.current-transmitter", reference: "TX1", x: 340, y: 330, rotation: 0, properties: { lowerAmps: 0, upperAmps: 5, requireWiredInput: true } },
        { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 540, y: 330, rotation: 0, properties: { requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 740, y: 330, rotation: 0, properties: { program: "GT AI0 13824; OUT Q0", requireWiredAi0: true } },
        { id: "output", definitionId: "logic.output-coil", reference: "K1", x: 940, y: 330, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "ct-signal", ...secondary, points: [], netName: "CT_SIGNAL" },
        { id: "tx-loop", from: { componentId: "tx", terminalId: "out" }, to: { componentId: "adc", terminalId: "in" }, points: [], netName: "CURRENT_LOOP_MA" },
        { id: "plc-input", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [], netName: "CURRENT_RAW" },
        { id: "plc-output", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "output", terminalId: "in" }, points: [], netName: "VALID_HIGH_CURRENT" },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "TA1", label: "CT secondary", valueIncludes: "0.000 A" },
      { reference: "TX1", label: "Transmitter current", valueIncludes: "4.00 mA" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
