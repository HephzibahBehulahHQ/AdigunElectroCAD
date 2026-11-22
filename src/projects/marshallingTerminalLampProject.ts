import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createMarshallingTerminalLampProject(): ProjectTemplate {
  const id = "dc-marshalling-terminal-lamp";
  const name = "DC marshalling terminals and field pilot";
  const description = "A panel switch feeds a remote 24 V DC pilot through separate line and return terminal blocks. Opening either terminal breaks the lamp circuit. The circuit models ideal continuity through the terminal blocks and the pilot voltage rating.";
  const samples = [
    { name: "Start with both terminals closed and the panel switch released.", pressed: false, feed: true, returnPath: true, lit: false },
    { name: "Close the switch. The pilot lights through both terminals.", pressed: true, feed: true, returnPath: true, lit: true },
    { name: "Open the line terminal. The pilot turns off.", pressed: true, feed: false, returnPath: true, lit: false },
    { name: "Close the line terminal and open the return terminal. The pilot stays off.", pressed: true, feed: true, returnPath: false, lit: false },
    { name: "Close the return terminal. The pilot relights.", pressed: true, feed: true, returnPath: true, lit: true },
    { name: "Release the switch. The pilot turns off with both terminals intact.", pressed: false, feed: true, returnPath: true, lit: false },
  ];
  const operatingSequence = samples.map(({ name, pressed, feed, returnPath, lit }): CircuitSequenceStep => ({
    name,
    changes: [
      { reference: "S1", properties: { pressed } },
      { reference: "X2", properties: { continuityClosed: feed } },
      { reference: "X3", properties: { continuityClosed: returnPath } },
    ],
    expectations: [
      { reference: "X2", label: "Terminal continuity", exact: feed ? "CONNECTED · 1 mm²" : "OPEN" },
      { reference: "X3", label: "Terminal continuity", exact: returnPath ? "CONNECTED · 1 mm²" : "OPEN" },
      { reference: "H1", label: "Indicator lamp", exact: lit ? "LIT · 24 V DC" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Beginner",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 350, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 290, y: 350, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "switch", definitionId: "pushbutton.start-no", reference: "S1", x: 470, y: 210, rotation: 0, properties: { pressed: false } },
        { id: "line-terminal", definitionId: "iec.feed-through-terminal.01", reference: "X2", x: 680, y: 210, rotation: 0, properties: { continuityClosed: true, conductorAreaMm2: 1 } },
        { id: "return-terminal", definitionId: "iec.feed-through-terminal.01", reference: "X3", x: 680, y: 485, rotation: 0, properties: { continuityClosed: true, conductorAreaMm2: 1 } },
        { id: "pilot", definitionId: "user.indicator-lamp", reference: "H1", x: 925, y: 350, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Field pilot" } },
      ],
      wires: [
        { id: "line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "switch-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "switch", terminalId: "13" }, points: [] },
        { id: "panel-line", netName: "PANEL_SWITCHED_PLUS", from: { componentId: "switch", terminalId: "14" }, to: { componentId: "line-terminal", terminalId: "1" }, points: [] },
        { id: "field-line", netName: "FIELD_SWITCHED_PLUS", from: { componentId: "line-terminal", terminalId: "2" }, to: { componentId: "pilot", terminalId: "t1" }, points: [] },
        { id: "field-return", netName: "FIELD_RETURN", from: { componentId: "pilot", terminalId: "t2" }, to: { componentId: "return-terminal", terminalId: "2" }, points: [] },
        { id: "panel-return", netName: "PANEL_RETURN", from: { componentId: "return-terminal", terminalId: "1" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X2", label: "Terminal continuity", valueIncludes: "CONNECTED" },
      { reference: "X3", label: "Terminal continuity", valueIncludes: "CONNECTED" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
  };
}
