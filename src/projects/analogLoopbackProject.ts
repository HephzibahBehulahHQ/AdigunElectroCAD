import type { ProjectTemplate } from "./templateLibrary";

import type { CircuitSequenceStep } from "./templateVerification";

export function createAnalogLoopbackProject(): ProjectTemplate {
  const id = "analog-output-loopback";
  const name = "4–20 mA output loopback · DAC / ADC";
  const description = "Commission an analog channel using a configurable raw command, a 4–20 mA DAC, and a monitoring ADC. A scanned PLC asserts Q0 only when the recovered raw count agrees with the independently entered target. This is a signal-level loopback with ideal converters.";
  const steps = [
    { name: "Verify zero scale", command: 0, target: 0, current: "4.00 mA", output: "ON" },
    { name: "Verify midscale", command: 13824, target: 13824, current: "12.00 mA", output: "ON" },
    { name: "Reject an output command that disagrees with the midscale target", command: 20736, target: 13824, current: "16.00 mA", output: "OFF" },
    { name: "Verify three-quarter scale against the corrected target", command: 20736, target: 20736, current: "16.00 mA", output: "ON" },
    { name: "Verify full scale", command: 27648, target: 27648, current: "20.00 mA", output: "ON" },
  ];
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "dac", definitionId: "signal.dac", reference: "DAC1", x: 180, y: 360, rotation: 0, properties: { raw: 0 } },
        { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 400, y: 360, rotation: 0, properties: { milliamp: 4, requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 620, y: 360, rotation: 0, properties: { program: "EQ AI0 0; OUT Q0", requireWiredAi0: true } },
        { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 840, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "loop-current", from: { componentId: "dac", terminalId: "out" }, to: { componentId: "adc", terminalId: "in" }, netName: "LOOP_MA", points: [] },
        { id: "loop-counts", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, netName: "LOOP_RAW", points: [] },
        { id: "loop-verdict", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "coil", terminalId: "in" }, netName: "LOOP_OK", points: [] },
      ],
    },
    testSequence: steps.map(({ name, command, target, current, output }) =>
      `${name}. Set DAC1 Raw to ${command}, set the PLC program to EQ AI0 ${target}; OUT Q0, and run. Expect ${current}, AI0 ${command}, and K1 ${output}.`,
    ),
    expectedOutputs: [
      { reference: "DAC1", label: "DAC output", valueIncludes: "4.00 mA" },
      { reference: "ADC1", label: "PLC raw value", valueIncludes: "0" },
      { reference: "PLC1", label: "I/O state", valueIncludes: "AI0 0" },
    ],
    operatingSequence: steps.map(({ name, command, target, current, output }): CircuitSequenceStep => ({
      name, durationSeconds: 0.1,
      changes: [
        { reference: "DAC1", properties: { raw: command } },
        { reference: "PLC1", properties: { program: `EQ AI0 ${target}; OUT Q0` } },
      ],
      expectations: [
        { reference: "DAC1", label: "DAC output", exact: current },
        { reference: "PLC1", label: "I/O state", exact: `I0 OFF · I1 OFF · Q0 ${output} · AI0 ${command}` },
        { reference: "K1", label: "Coil", exact: output },
      ],
    })),
  };
}
