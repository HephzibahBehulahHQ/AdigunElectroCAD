import type { ProjectTemplate } from "./templateLibrary";

export function createTransformerPilotProject(): ProjectTemplate {
  const document: ProjectTemplate["document"] = {
    id: "transformer-pilot",
    name: "Isolated control transformer and pilot lamp",
    description: "A switched 230 V AC primary feeds an ideal 230:24 V isolation transformer. A pilot lamp is wired across its secondary. The model uses an editable ratio and optional load derating. It does not model transformer impedance, inrush or protection.",
    revision: 1,
    components: [
      { id: "supply", definitionId: "supply.control", reference: "X1", x: 140, y: 260, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
      { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 350, y: 200, rotation: 0, properties: { pressed: false } },
      { id: "transformer", definitionId: "generic.iec.control-transformer", reference: "T1", x: 580, y: 260, rotation: 0, properties: { primaryVoltageV: 230, secondaryVoltageV: 24, loadPercent: 0 } },
      { id: "lamp", definitionId: "user.indicator-lamp", reference: "H1", x: 860, y: 260, rotation: 0, properties: { ratedVoltageV: 24, dc: false, color: "#15803d", indication: "Control voltage" } },
    ],
    wires: [
      { id: "line", from: { componentId: "supply", terminalId: "line" }, to: { componentId: "start", terminalId: "13" }, points: [], netName: "L" },
      { id: "switched-line", from: { componentId: "start", terminalId: "14" }, to: { componentId: "transformer", terminalId: "p1" }, points: [], netName: "PRIMARY_L" },
      { id: "neutral", from: { componentId: "supply", terminalId: "neutral" }, to: { componentId: "transformer", terminalId: "p2" }, points: [], netName: "PRIMARY_N" },
      { id: "secondary-a", from: { componentId: "transformer", terminalId: "s1" }, to: { componentId: "lamp", terminalId: "t1" }, points: [], netName: "SECONDARY_A" },
      { id: "secondary-b", from: { componentId: "transformer", terminalId: "s2" }, to: { componentId: "lamp", terminalId: "t2" }, points: [{ x: 950, y: 405 }, { x: 660, y: 405 }], netName: "SECONDARY_B" },
    ],
  };
  const operatingSequence: NonNullable<ProjectTemplate["operatingSequence"]> = [
    { name: "Close the primary switch and verify 24 V AC", changes: [{ reference: "S1", properties: { pressed: true } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "LIT · 24 V AC" }] },
    { name: "Change the rated secondary to 12 V and verify lamp inhibition", changes: [{ reference: "T1", properties: { secondaryVoltageV: 12 } }], expectations: [{ reference: "H1", label: "Signal fault", exact: "ERROR: Applied voltage differs from the indicator rating." }] },
    { name: "Restore the ratio and open the primary switch", changes: [{ reference: "T1", properties: { secondaryVoltageV: 24 } }, { reference: "S1", properties: { pressed: false } }], expectations: [{ reference: "H1", label: "Indicator lamp", exact: "OFF" }] },
  ];
  return {
    id: document.id, name: document.name, description: document.description, category: "Control & Signalling", level: "Beginner", document,
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "T1", label: "Ideal ratio output", valueIncludes: "24.0 V from 230 V" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
    testSequence: operatingSequence.map(({ name }) => name), operatingSequence,
  };
}
