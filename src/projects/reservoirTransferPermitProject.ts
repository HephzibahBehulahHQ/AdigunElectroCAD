import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createReservoirTransferPermitProject(): ProjectTemplate {
  const id = "dual-reservoir-transfer-permit";
  const name = "Dual-reservoir transfer permissive";
  const description = "Two independent 4–20 mA signals feed separate ADCs and PLC inputs. Transfer requires a source indication more than 25 percentage points above the destination and a destination below 62.5%. The PLC signals high destination level separately. Either open loop inhibits both outputs. Both indications use equal normalized scales.";
  const fault = "ERROR: 4–20 mA level-transmitter loop is open; PLC input is invalid.";
  const samples = [
    { name: "Source 75%, destination 25%. Permit transfer.", source: 75, destination: 25, permit: "ON", high: "OFF" },
    { name: "At exactly 25 percentage points of difference, drop the permit.", source: 75, destination: 50, permit: "OFF", high: "OFF" },
    { name: "Destination reaches 62.5%. Raise the high-level output even with adequate differential.", source: 100, destination: 62.5, permit: "OFF", high: "ON" },
    { name: "The destination exceeds the source. Inhibit reverse transfer.", source: 25, destination: 50, permit: "OFF", high: "OFF" },
    { name: "With valid transfer levels, simulate an open source loop.", source: 75, destination: 25, open: "source", permit: fault, high: fault },
    { name: "Restore the source loop and open the destination loop.", source: 75, destination: 25, open: "destination", permit: fault, high: fault },
    { name: "Restore both loops and verify the transfer permit returns.", source: 75, destination: 25, permit: "ON", high: "OFF" },
  ];
  const operatingSequence = samples.map(({ name, source, destination, open, permit, high }): CircuitSequenceStep => ({
    name,
    durationSeconds: .1,
    changes: [
      { reference: "B1", properties: { levelPercent: source, simulateOpenLoop: open === "source" } },
      { reference: "B2", properties: { levelPercent: destination, simulateOpenLoop: open === "destination" } },
    ],
    expectations: [
      { reference: "K1", label: open ? "Signal fault" : "Coil", exact: permit },
      { reference: "K2", label: open ? "Signal fault" : "Coil", exact: high },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "source", definitionId: "sensor.level-4-20", reference: "B1", x: 130, y: 210, rotation: 0, properties: { levelPercent: 50 } },
        { id: "destination", definitionId: "sensor.level-4-20", reference: "B2", x: 130, y: 500, rotation: 0, properties: { levelPercent: 25 } },
        { id: "source-adc", definitionId: "signal.adc", reference: "ADC1", x: 350, y: 210, rotation: 0, properties: { requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "destination-adc", definitionId: "signal.adc", reference: "ADC2", x: 350, y: 500, rotation: 0, properties: { requireWiredInput: true, faultOnOutOfRange: true } },
        { id: "plc", definitionId: "iec.plc-digital-io.01", reference: "PLC1", x: 625, y: 360, rotation: 0, properties: {
          requireWiredAi0: true, requireWiredAi1: true,
          program: "SUB AI0 AI1 D0; GT D0 6912; OUT M0; GE AI1 17280; OUT Q1; LD M0; ANDN Q1; OUT Q0",
        } },
        { id: "permit", definitionId: "logic.output-coil", reference: "K1", x: 900, y: 210, rotation: 0, properties: { input: false } },
        { id: "high-level", definitionId: "logic.output-coil", reference: "K2", x: 900, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "source-loop", netName: "SOURCE_LEVEL_MA", from: { componentId: "source", terminalId: "signal" }, to: { componentId: "source-adc", terminalId: "in" }, points: [] },
        { id: "destination-loop", netName: "DESTINATION_LEVEL_MA", from: { componentId: "destination", terminalId: "signal" }, to: { componentId: "destination-adc", terminalId: "in" }, points: [] },
        { id: "source-ai0", netName: "SOURCE_LEVEL_RAW", from: { componentId: "source-adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-0" }, points: [] },
        { id: "destination-ai1", netName: "DESTINATION_LEVEL_RAW", from: { componentId: "destination-adc", terminalId: "out" }, to: { componentId: "plc", terminalId: "ai-1" }, points: [] },
        { id: "transfer-q0", netName: "TRANSFER_PERMIT", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "permit", terminalId: "in" }, points: [] },
        { id: "destination-q1", netName: "DESTINATION_HIGH", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "high-level", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "ADC1", label: "PLC raw value", valueIncludes: "13824" },
      { reference: "ADC2", label: "PLC raw value", valueIncludes: "6912" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
