import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createRelayControlFeedLossProject(): ProjectTemplate {
  const id = "dc-relay-control-feed-loss";
  const name = "DC relay holding circuit and feed loss";
  const description = "A 24 V DC relay seals in through its first normally open pole. Its second pole drives a separate pilot. Opening the switched coil feed drops the relay and clears the hold. With START released, reconnecting the feed leaves the relay off until a fresh START command.";
  const controlFeed = { from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "stop", terminalId: "21" } };
  const cases = [
    { name: "Start with both buttons released.", start: false, stop: false, held: false },
    { name: "Press START. Energize the coil and pilot.", start: true, stop: false, held: true },
    { name: "Release START. The first contact holds the coil on.", start: false, stop: false, held: true },
    { name: "Open the coil control feed while the relay is held.", start: false, stop: false, held: false, connected: false },
    { name: "Reconnect the control feed with START released. Stay off.", start: false, stop: false, held: false, connected: true },
    { name: "Press START again to restore the hold.", start: true, stop: false, held: true },
    { name: "Press STOP with START released. Drop the relay.", start: false, stop: true, held: false },
    { name: "Release STOP. Keep the relay off until another START.", start: false, stop: false, held: false },
  ];
  const operatingSequence = cases.map(({ name, start, stop, held, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: .1,
    changes: [{ reference: "S1", properties: { pressed: start } }, { reference: "S0", properties: { pressed: stop } }],
    wireChanges: connected === undefined ? undefined : [{ ...controlFeed, connected }],
    expectations: [
      { reference: "K1", label: "Relay contacts", exact: held ? "ENERGIZED · 2 CO" : "DE-ENERGIZED" },
      { reference: "H1", label: "Indicator lamp", exact: held ? "LIT · 24 V DC" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 360, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 290, y: 360, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "stop", definitionId: "pushbutton.stop-nc", reference: "S0", x: 485, y: 190, rotation: 0, properties: { pressed: false } },
        { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 690, y: 190, rotation: 0, properties: { pressed: false } },
        { id: "relay", definitionId: "iec.interface-relay.02", reference: "K1", x: 650, y: 430, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, changeoverContacts: 2, energized: false } },
        { id: "pilot", definitionId: "user.indicator-lamp", reference: "H1", x: 935, y: 430, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Relay held" } },
      ],
      wires: [
        { id: "line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "coil-control-feed", netName: "COIL_CONTROL_FEED", ...controlFeed, points: [] },
        { id: "start-common", netName: "AFTER_STOP", from: { componentId: "stop", terminalId: "22" }, to: { componentId: "start", terminalId: "13" }, points: [] },
        { id: "hold-common", netName: "AFTER_STOP", from: { componentId: "stop", terminalId: "22" }, to: { componentId: "relay", terminalId: "11" }, points: [] },
        { id: "start-coil", netName: "COIL_COMMAND", from: { componentId: "start", terminalId: "14" }, to: { componentId: "relay", terminalId: "a1" }, points: [] },
        { id: "hold-coil", netName: "COIL_COMMAND", from: { componentId: "relay", terminalId: "14" }, to: { componentId: "relay", terminalId: "a1" }, points: [] },
        { id: "coil-return", netName: "DC_RETURN", from: { componentId: "relay", terminalId: "a2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
        { id: "pilot-common", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "relay", terminalId: "21" }, points: [] },
        { id: "pilot-feed", netName: "PILOT_PLUS", from: { componentId: "relay", terminalId: "24" }, to: { componentId: "pilot", terminalId: "t1" }, points: [] },
        { id: "pilot-return", netName: "DC_RETURN", from: { componentId: "pilot", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "K1", label: "Relay contacts", valueIncludes: "DE-ENERGIZED" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
  };
}
