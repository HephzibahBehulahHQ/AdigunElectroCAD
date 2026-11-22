import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createMixedVoltageRelayPanelProject(): ProjectTemplate {
  const id = "mixed-voltage-relay-panel";
  const name = "Isolated AC and DC relay indication panel";
  const description = "A switched 24 V DC relay coil operates two isolated changeover poles. The normally open pole powers a 230 V AC picked-up pilot. The normally closed pole powers a 24 V DC dropped-out pilot. Opening the AC pilot feed leaves the relay energized, while opening the coil return restores the DC indication.";
  const coilReturn = { from: { componentId: "relay", terminalId: "a2" }, to: { componentId: "dc", terminalId: "zero-out" } };
  const pickedUpFeed = { from: { componentId: "relay", terminalId: "24" }, to: { componentId: "picked-up", terminalId: "t1" } };
  const samples = [
    { name: "Leave the coil command released. The dropped-out pilot lights.", pressed: false, pickedUp: false, droppedOut: true },
    { name: "Close the coil command. Only the picked-up pilot lights.", pressed: true, pickedUp: true, droppedOut: false },
    { name: "Open the picked-up pilot feed. Both pilots go dark while the coil remains commanded.", pressed: true, pickedUp: false, droppedOut: false, wireChanges: [{ ...pickedUpFeed, connected: false }] },
    { name: "Restore the pilot feed. The picked-up pilot relights.", pressed: true, pickedUp: true, droppedOut: false, wireChanges: [{ ...pickedUpFeed, connected: true }] },
    { name: "Open the coil return. The dropped-out pilot lights despite the held command.", pressed: true, pickedUp: false, droppedOut: true, wireChanges: [{ ...coilReturn, connected: false }] },
    { name: "Restore the coil return. Verify the auxiliary indications change back.", pressed: true, pickedUp: true, droppedOut: false, wireChanges: [{ ...coilReturn, connected: true }] },
    { name: "Release the command. Verify the dropped-out pilot.", pressed: false, pickedUp: false, droppedOut: true },
  ];
  const operatingSequence = samples.map(({ name, pressed, pickedUp, droppedOut, wireChanges }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "S1", properties: { pressed } }],
    wireChanges,
    expectations: [
      { reference: "K1", label: "Relay contacts", exact: droppedOut ? "DE-ENERGIZED" : "ENERGIZED · 2 CO" },
      { reference: "H1", label: "Indicator lamp", exact: pickedUp ? "LIT · 230 V AC" : "OFF" },
      { reference: "H2", label: "Indicator lamp", exact: droppedOut ? "LIT · 24 V DC" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 360, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 300, y: 360, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "command", definitionId: "pushbutton.start-no", reference: "S1", x: 490, y: 190, rotation: 0, properties: { pressed: false } },
        { id: "relay", definitionId: "iec.interface-relay.02", reference: "K1", x: 640, y: 360, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, changeoverContacts: 2, energized: false } },
        { id: "picked-up", definitionId: "user.indicator-lamp", reference: "H1", x: 925, y: 210, rotation: 0, properties: { ratedVoltageV: 230, dc: false, color: "#15803d", indication: "Picked up" } },
        { id: "dropped-out", definitionId: "user.indicator-lamp", reference: "H2", x: 925, y: 510, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#a16207", indication: "Dropped out" } },
      ],
      wires: [
        { id: "line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "command-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "command", terminalId: "13" }, points: [] },
        { id: "coil-feed", netName: "COIL_PLUS", from: { componentId: "command", terminalId: "14" }, to: { componentId: "relay", terminalId: "a1" }, points: [] },
        { id: "coil-return", netName: "DC_RETURN", ...coilReturn, points: [] },
        { id: "no-feed", netName: "AC_LINE", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "relay", terminalId: "21" }, points: [] },
        { id: "nc-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "relay", terminalId: "11" }, points: [] },
        { id: "picked-up-feed", netName: "PICKED_UP", ...pickedUpFeed, points: [] },
        { id: "dropped-out-feed", netName: "DROPPED_OUT", from: { componentId: "relay", terminalId: "12" }, to: { componentId: "dropped-out", terminalId: "t1" }, points: [] },
        { id: "picked-up-return", netName: "AC_NEUTRAL", from: { componentId: "picked-up", terminalId: "t2" }, to: { componentId: "ac", terminalId: "neutral" }, points: [] },
        { id: "dropped-out-return", netName: "DC_RETURN", from: { componentId: "dropped-out", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
      { reference: "H2", label: "Indicator lamp", valueIncludes: "LIT · 24 V DC" },
    ],
  };
}
