import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createDcPilotSharedReturnProject(): ProjectTemplate {
  const id = "dc-pilot-shared-return";
  const name = "24 V DC pilot panel shared return";
  const description = "An AC-fed DC supply powers two independently switched pilot lamps. A drawn junction links their return conductors. Opening the branch return extinguishes only H2. Opening the parent return extinguishes both lamps even while both test switches stay closed.";
  const returnSource = { componentId: "dc", terminalId: "zero-out" };
  const returnA = { from: returnSource, to: { componentId: "lamp-a", terminalId: "t2" } };
  const returnB = { from: returnSource, to: { componentId: "lamp-b", terminalId: "t2" } };
  const samples = [
    { name: "Start with both test switches released.", a: false, b: false, lampA: false, lampB: false },
    { name: "Press only test A. Only H1 lights.", a: true, b: false, lampA: true, lampB: false },
    { name: "Press only test B. Only H2 lights.", a: false, b: true, lampA: false, lampB: true },
    { name: "Press both tests. Both lamps light at 24 V DC.", a: true, b: true, lampA: true, lampB: true },
    { name: "Open the H2 return branch. H1 remains lit.", a: true, b: true, lampA: true, lampB: false, wireChanges: [{ ...returnB, connected: false }] },
    { name: "Restore the H2 return branch.", a: true, b: true, lampA: true, lampB: true, wireChanges: [{ ...returnB, connected: true }] },
    { name: "Open the parent return. Both lamps turn off.", a: true, b: true, lampA: false, lampB: false, wireChanges: [{ ...returnA, connected: false }] },
    { name: "Restore the parent return. Both lamps relight.", a: true, b: true, lampA: true, lampB: true, wireChanges: [{ ...returnA, connected: true }] },
  ];
  const operatingSequence = samples.map(({ name, a, b, lampA, lampB, wireChanges }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "S1", properties: { pressed: a } }, { reference: "S2", properties: { pressed: b } }],
    wireChanges,
    expectations: [
      { reference: "H1", label: "Indicator lamp", exact: lampA ? "LIT · 24 V DC" : "OFF" },
      { reference: "H2", label: "Indicator lamp", exact: lampB ? "LIT · 24 V DC" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 350, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 325, y: 350, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "test-a", definitionId: "pushbutton.start-no", reference: "S1", x: 565, y: 210, rotation: 0, properties: { pressed: false } },
        { id: "test-b", definitionId: "pushbutton.start-no", reference: "S2", x: 565, y: 500, rotation: 0, properties: { pressed: false } },
        { id: "lamp-a", definitionId: "user.indicator-lamp", reference: "H1", x: 850, y: 210, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Test A" } },
        { id: "lamp-b", definitionId: "user.indicator-lamp", reference: "H2", x: 850, y: 500, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#a16207", indication: "Test B" } },
      ],
      wires: [
        { id: "supply-line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "supply-neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "test-a-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "test-a", terminalId: "13" }, points: [] },
        { id: "test-b-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "test-b", terminalId: "13" }, points: [] },
        { id: "lamp-a-feed", netName: "LAMP_A_PLUS", from: { componentId: "test-a", terminalId: "14" }, to: { componentId: "lamp-a", terminalId: "t1" }, points: [] },
        { id: "lamp-b-feed", netName: "LAMP_B_PLUS", from: { componentId: "test-b", terminalId: "14" }, to: { componentId: "lamp-b", terminalId: "t1" }, points: [] },
        { id: "return-a", netName: "DC_RETURN", ...returnA, points: [] },
        { id: "return-b", netName: "DC_RETURN", ...returnB, points: [], branchOfWireId: "return-a", branchSource: "from", branchPosition: .45 },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal AC control supply", valueIncludes: "230 V" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
      { reference: "H2", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
  };
}
