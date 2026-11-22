import type { CircuitSequenceStep } from "./templateVerification";
import type { ProjectTemplate } from "./templateLibrary";

export function createTankFillPermitProject(): ProjectTemplate {
  const id = "tank-fill-hysteresis-permit";
  const name = "Tank fill · hysteresis, permit and high-high alarm";
  const description = "A 4–20 mA transmitter and ADC feed a PLC fill demand latch. Filling starts at or below 25% and ends at or above 75%. A wired permit gates the pump command, and an independent high-high alarm activates at 87.5%. This circuit models control signals and does not simulate tank dynamics. A restored sensor loop or permit can resume a retained demand.";
  const coil = (reference: string, on: boolean) => ({ reference, label: "Coil", exact: on ? "ON" : "OFF" });
  const step = (name: string, changes: CircuitSequenceStep["changes"], pump: boolean, alarm = false): CircuitSequenceStep => ({
    name, changes, durationSeconds: 0.1, expectations: [coil("K1", pump), coil("K2", alarm)],
  });
  const level = (levelPercent: number) => [{ reference: "B1", properties: { levelPercent } }];
  const loopFault = "4–20 mA level-transmitter loop is open; PLC input is invalid.";

  return {
    id, name, description, category: "Analog Instrumentation", level: "Expert",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "level", definitionId: "sensor.level-4-20", reference: "B1", x: 140, y: 220, rotation: 0, properties: { levelPercent: 50 } },
        { id: "adc", definitionId: "signal.adc", reference: "ADC1", x: 340, y: 220, rotation: 0, properties: { requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "permit", definitionId: "logic.no-contact", reference: "S1", x: 340, y: 450, rotation: 0, properties: { input: true } },
        { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 610, y: 315, rotation: 0, properties: {
          requireWiredAi0: true,
          program: "LE AI0 6912; SET M0; GE AI0 20736; RESET M0; LD M0; AND I0; OUT Q0; GE AI0 24192; OUT Q1",
        } },
        { id: "pump", definitionId: "logic.output-coil", reference: "K1", x: 880, y: 235, rotation: 0, properties: { input: false } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "K2", x: 880, y: 425, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "level-loop", from: { componentId: "level", terminalId: "signal" }, to: { componentId: "adc", terminalId: "in" }, points: [], netName: "LEVEL_MA" },
        { id: "level-raw", from: { componentId: "adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [], netName: "LEVEL_RAW" },
        { id: "fill-permit", from: { componentId: "permit", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [], netName: "FILL_PERMIT" },
        { id: "pump-command", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "pump", terminalId: "in" }, points: [], netName: "FILL_COMMAND" },
        { id: "high-high", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "alarm", terminalId: "in" }, points: [], netName: "LEVEL_HIGH_HIGH" },
      ],
    },
    expectedOutputs: [
      { reference: "PLC1", label: "I/O state", valueIncludes: "AI0 13824" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
    testSequence: [
      "Run at 50%, then lower B1 to 25%. K1 starts. Return to 50% and verify that K1 stays on.",
      "Open S1 or simulate an open loop on B1. K1 turns off. Restore the permit and the loop to resume the retained fill demand.",
      "Raise B1 to 75% to stop filling. At 87.5%, K2 activates. Returning to 50% switches off K2 and leaves K1 off.",
    ],
    operatingSequence: [
      step("Initial deadband", [], false),
      step("Start at low threshold", level(25), true),
      step("Retain demand in deadband", level(50), true),
      step("Open the wired permit", [{ reference: "S1", properties: { input: false } }], false),
      step("Restore the wired permit", [{ reference: "S1", properties: { input: true } }], true),
      { ...step("Open loop inhibits both outputs", [{ reference: "B1", properties: { simulateOpenLoop: true } }], false), expectations: [
        ...["K1", "K2"].map((reference) => ({ reference, label: "Signal fault", exact: `ERROR: ${loopFault}` })),
        { reference: "PLC1", label: "I/O state", exact: `I0 ON · I1 OFF · Q0 OFF · Q1 OFF · AI0 INVALID · ERROR: ${loopFault}` },
      ] },
      step("Restore measured level", [{ reference: "B1", properties: { simulateOpenLoop: false } }], true),
      step("Stop at high threshold", level(75), false),
      step("Assert independent high-high alarm", level(87.5), false, true),
      step("Clear alarm without restarting fill", level(50), false),
    ],
  };
}
