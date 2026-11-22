import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createCompressorRestartDelayProject(): ProjectTemplate {
  const id = "plc-compressor-restart-delay";
  const name = "Refrigeration compressor restart delay";
  const description = "The PLC blocks a compressor command until it has observed two simulated seconds with the output off. Cooling demand and a wired enable are both required. A separate coil indicates demand waiting on the delay. This example models command timing only.";
  const enableSignal = { componentId: "enable", terminalId: "out" };
  const enableInput = { componentId: "plc", terminalId: "in-1" };
  const cases = [
    { name: "Request cooling during the initial delay.", demand: true, seconds: 1, command: "OFF", waiting: "ON" },
    { name: "Complete the initial delay and start the compressor command.", demand: true, seconds: 1, command: "ON", waiting: "OFF" },
    { name: "Hold cooling demand. The compressor command stays on.", demand: true, seconds: .1, command: "ON", waiting: "OFF" },
    { name: "Remove cooling demand and stop the command.", demand: false, seconds: .1, command: "OFF", waiting: "OFF" },
    { name: "Restore demand early. The command remains off.", demand: true, seconds: 1, command: "OFF", waiting: "ON" },
    { name: "After the minimum off interval, allow restart.", demand: true, seconds: 1, command: "ON", waiting: "OFF" },
    { name: "Disconnect the enable wire during cooling.", demand: true, connected: false, seconds: .1, command: "OFF", waiting: "OFF" },
    { name: "Reconnect enable early. The delay still blocks restart.", demand: true, connected: true, seconds: 1, command: "OFF", waiting: "ON" },
    { name: "Complete the new delay and allow restart.", demand: true, seconds: 1, command: "ON", waiting: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, demand, seconds, command, waiting, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: demand } }],
    wireChanges: connected === undefined ? undefined : [{ from: enableSignal, to: enableInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: command },
      { reference: "K2", label: "Coil", exact: waiting },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "demand", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 220, rotation: 0, properties: { input: false } },
        { id: "enable", definitionId: "logic.no-contact", reference: "S2", x: 165, y: 500, rotation: 0, properties: { input: true } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LDN Q0; TON T0 2; LD I0; AND I1; PUSH; LD Q0; OR T0; ANDPOP; OUT Q0; LD I0; AND I1; ANDN Q0; OUT Q1",
        } },
        { id: "compressor", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "waiting", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "demand-i0", netName: "COOLING_DEMAND", from: { componentId: "demand", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "enable-i1", netName: "COMPRESSOR_ENABLE", from: enableSignal, to: enableInput, points: [] },
        { id: "compressor-q0", netName: "COMPRESSOR_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "compressor", terminalId: "in" }, points: [] },
        { id: "waiting-q1", netName: "WAITING_ON_DELAY", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "waiting", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 OFF · Q1 OFF" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
