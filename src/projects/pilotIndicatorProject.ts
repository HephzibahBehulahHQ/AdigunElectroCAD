import type { ProjectTemplate } from "./templateLibrary";

export function createPilotIndicatorProject(): ProjectTemplate {
  return {
    id: "wired-pilot-indicator",
    name: "Pilot indicator · switched control circuit",
    category: "Control & Signalling",
    level: "Beginner",
    description: "A momentary START contact and a normally closed STOP contact control a pilot indicator. The lamp needs a complete, correctly rated line and return path.",
    document: {
      id: "wired-pilot-indicator", name: "Pilot indicator · switched control circuit", revision: 1,
      description: "An ideal 230 V AC control supply, two dry contacts and a configurable pilot indicator. The model evaluates continuity and voltage matching.",
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 160, y: 200, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "stop", definitionId: "pushbutton.stop-nc", reference: "S0", x: 360, y: 200, rotation: 0, properties: { pressed: false } },
        { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 580, y: 200, rotation: 0, properties: { pressed: false } },
        { id: "indicator", definitionId: "user.indicator-lamp", reference: "H1", x: 800, y: 360, rotation: 0, properties: { ratedVoltageV: 230, dc: false, color: "#15803d", indication: "Test lamp" } },
      ],
      wires: [
        { id: "line", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "stop", terminalId: "21" }, netName: "L", points: [] },
        { id: "enable", from: { componentId: "stop", terminalId: "22" }, to: { componentId: "start", terminalId: "13" }, netName: "ENABLE", points: [] },
        { id: "lamp-line", from: { componentId: "start", terminalId: "14" }, to: { componentId: "indicator", terminalId: "t1" }, netName: "LAMP_L", points: [] },
        { id: "lamp-return", from: { componentId: "indicator", terminalId: "t2" }, to: { componentId: "ac", terminalId: "neutral" }, netName: "N", points: [{ x: 900, y: 540 }, { x: 60, y: 540 }] },
      ],
    },
    testSequence: [
      "With START released, the indicator is OFF.",
      "Press START. The indicator is LIT at 230 V AC.",
      "While START is held, press STOP. The indicator turns OFF.",
      "Release STOP while START is held. The indicator relights. Release START to turn it off.",
    ],
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "S1", label: "Dry contact 13–14", valueIncludes: "OPEN" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
    operatingSequence: [
      { name: "Press START", changes: [{ reference: "S1", properties: { pressed: true } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "LIT · 230 V AC" }] },
      { name: "Press STOP", changes: [{ reference: "S0", properties: { pressed: true } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "OFF" }] },
      { name: "Release STOP", changes: [{ reference: "S0", properties: { pressed: false } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "LIT · 230 V AC" }] },
      { name: "Release START", changes: [{ reference: "S1", properties: { pressed: false } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "OFF" }] },
    ],
  };
}
