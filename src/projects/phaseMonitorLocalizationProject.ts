import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";
import type { Wire } from "../types/electrical";

export function createPhaseMonitorLocalizationProject(): ProjectTemplate {
  const id = "upstream-downstream-phase-monitor";
  const name = "Upstream and downstream phase-loss localization";
  const description = "Two phase monitors tap the same feeder on opposite sides of its fuse switch. A healthy source and a missing downstream phase identify an interruption between the taps. Turning the source off drops both indications. The monitors check for three distinct phases from one source.";
  const cases = [
    { name: "Start with the source off. Neither monitor reports healthy phases.", enabled: false, fuseL3Open: false, upstream: false, downstream: false },
    { name: "Energize the source. Both taps see three phases.", enabled: true, fuseL3Open: false, upstream: true, downstream: true },
    { name: "Open the L3 fuse. Only the downstream monitor fails.", enabled: true, fuseL3Open: true, upstream: true, downstream: false },
    { name: "Disable the source. Both monitors now fail.", enabled: false, fuseL3Open: true, upstream: false, downstream: false },
    { name: "Restore the fuse with the source still disabled.", enabled: false, fuseL3Open: false, upstream: false, downstream: false },
    { name: "Restore source power and verify both monitor indications.", enabled: true, fuseL3Open: false, upstream: true, downstream: true },
  ];
  const operatingSequence = cases.map(({ name, enabled, fuseL3Open, upstream, downstream }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "X1", properties: { outputEnabled: enabled } }, { reference: "F1", properties: { fuseL3Open } }],
    expectations: [
      { reference: "PF1", label: "Phase monitor", exact: upstream ? "HEALTHY" : "FAILED" },
      { reference: "PF2", label: "Phase monitor", exact: downstream ? "HEALTHY" : "FAILED" },
    ],
  }));
  const wires: Wire[] = ["l1", "l2", "l3"].flatMap((phase) => {
    const source = { componentId: "supply", terminalId: phase + "-out" };
    return [
      { id: "fuse-" + phase, netName: phase.toUpperCase(), from: source, to: { componentId: "fuse", terminalId: phase + "-in" }, points: [] },
      { id: "upstream-" + phase, netName: phase.toUpperCase(), from: source, to: { componentId: "upstream", terminalId: phase }, points: [] },
      { id: "downstream-" + phase, netName: "FUSED_" + phase.toUpperCase(), from: { componentId: "fuse", terminalId: phase + "-out" }, to: { componentId: "downstream", terminalId: phase }, points: [] },
    ];
  });
  return {
    id, name, description, category: "Motor Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "supply", definitionId: "iec.ac-supply.01", reference: "X1", x: 520, y: 155, rotation: 0, properties: { outputEnabled: false, nominalVoltageV: 400, frequencyHz: 50 } },
        { id: "fuse", definitionId: "iec.fuse-switch.01", reference: "F1", x: 520, y: 370, rotation: 0, properties: { fuseHealthy: true, fuseL3Open: false } },
        { id: "upstream", definitionId: "safety.phase-failure", reference: "PF1", x: 240, y: 535, rotation: 0, properties: { requireWiredPhases: true } },
        { id: "downstream", definitionId: "safety.phase-failure", reference: "PF2", x: 800, y: 535, rotation: 0, properties: { requireWiredPhases: true } },
      ],
      wires,
    },
    operatingSequence,
    testSequence: operatingSequence.map(({ name }) => name),
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "OFF" },
      { reference: "PF1", label: "Phase monitor", valueIncludes: "FAILED" },
      { reference: "PF2", label: "Phase monitor", valueIncludes: "FAILED" },
    ],
  };
}
