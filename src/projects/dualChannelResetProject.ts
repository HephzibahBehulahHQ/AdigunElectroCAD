import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createDualChannelResetProject(): ProjectTemplate {
  const id = "wired-dual-channel-reset";
  const name = "Dual-channel inhibit · monitored reset";
  const description = "Two normally closed channel controls and a separate normally open reset control feed a modeled dual-channel relay. Its Boolean enable drives Q1. The example demonstrates restart inhibition and reset sequencing as an educational signal model.";
  const cases = [
    { name: "Startup with reset held", a: false, b: false, reset: true, output: "OFF" },
    { name: "Release reset with both channels healthy", a: false, b: false, reset: false, output: "OFF" },
    { name: "Press reset to enable", a: false, b: false, reset: true, output: "ON" },
    { name: "Release reset and retain enable", a: false, b: false, reset: false, output: "ON" },
    { name: "Open channel A", a: true, b: false, reset: false, output: "OFF" },
    { name: "Hold reset while channel A is open", a: true, b: false, reset: true, output: "OFF" },
    { name: "Restore channel A with reset held", a: false, b: false, reset: true, output: "OFF" },
    { name: "Release reset again", a: false, b: false, reset: false, output: "OFF" },
    { name: "Press a fresh reset", a: false, b: false, reset: true, output: "ON" },
    { name: "Open channel B", a: false, b: true, reset: false, output: "OFF" },
    { name: "Restore channel B without reset", a: false, b: false, reset: false, output: "OFF" },
  ];
  return {
    id, name, description, category: "Control & Signalling", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "channel-a", definitionId: "logic.nc-contact", reference: "S1", x: 160, y: 180, rotation: 0, properties: { input: false } },
        { id: "channel-b", definitionId: "logic.nc-contact", reference: "S2", x: 160, y: 360, rotation: 0, properties: { input: false } },
        { id: "reset", definitionId: "logic.no-contact", reference: "S3", x: 160, y: 540, rotation: 0, properties: { input: false } },
        { id: "monitor", definitionId: "safety.dual-relay", reference: "KSR1", x: 475, y: 360, rotation: 0, properties: { channelAClosed: false, channelBClosed: false, reset: false } },
        { id: "enable", definitionId: "logic.output-coil", reference: "Q1", x: 790, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "channel-a-input", from: { componentId: "channel-a", terminalId: "out" }, to: { componentId: "monitor", terminalId: "in-a" }, netName: "CHANNEL_A", points: [] },
        { id: "channel-b-input", from: { componentId: "channel-b", terminalId: "out" }, to: { componentId: "monitor", terminalId: "in-b" }, netName: "CHANNEL_B", points: [] },
        { id: "reset-input", from: { componentId: "reset", terminalId: "out" }, to: { componentId: "monitor", terminalId: "reset" }, netName: "RESET", points: [] },
        { id: "enable-output", from: { componentId: "monitor", terminalId: "out" }, to: { componentId: "enable", terminalId: "in" }, netName: "ENABLE", points: [] },
      ],
    },
    testSequence: cases.map(({ name, a, b, reset, output }) =>
      `${name}. Set Live Input on S1 ${a ? "on" : "off"}, S2 ${b ? "on" : "off"}, and S3 ${reset ? "on" : "off"}. Run the clock and expect Q1 ${output}.`,
    ),
    expectedOutputs: [
      { reference: "S1", label: "NC output", valueIncludes: "ON" },
      { reference: "KSR1", label: "Safety relay", valueIncludes: "OFF" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: cases.map(({ name, a, b, reset, output }): CircuitSequenceStep => ({
      name, durationSeconds: 0.1,
      changes: [
        { reference: "S1", properties: { input: a } },
        { reference: "S2", properties: { input: b } },
        { reference: "S3", properties: { input: reset } },
      ],
      expectations: [
        { reference: "KSR1", label: "Safety relay", exact: output },
        { reference: "Q1", label: "Coil", exact: output },
      ],
    })),
  };
}
