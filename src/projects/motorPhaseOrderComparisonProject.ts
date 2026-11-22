import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";
import type { Wire } from "../types/electrical";

export function createMotorPhaseOrderComparisonProject(): ProjectTemplate {
  const id = "parallel-motor-phase-order";
  const name = "Parallel motor feeders with opposite phase order";
  const description = "Two independently switched motors share one three-phase source. M1 uses L1/L2/L3 order. M2 swaps L2 and L3, giving opposite signed nominal speed. Opening one breaker or losing one conductor affects only its branch. The model traces phase order and nominal operation.";
  const openPhase = { from: { componentId: "breaker-b", terminalId: "l2-out" }, to: { componentId: "motor-b", terminalId: "w1" } };
  const fault = "ERROR: M2 does not have three distinct phases from one supply; unbalanced winding current is unavailable.";
  const forward = "1470 rpm / 7.5 kW", reverse = "-1470 rpm / 7.5 kW", off = "STANDBY";
  const cases = [
    { name: "Start with both branch breakers open.", a: false, b: false, motorA: off, motorB: off },
    { name: "Close Q1 only. M1 runs with forward phase order.", a: true, b: false, motorA: forward, motorB: off },
    { name: "Close Q2. Both motors report opposite signed directions.", a: true, b: true, motorA: forward, motorB: reverse },
    { name: "Open the L2 conductor in branch B. M1 continues and M2 reports phase loss.", a: true, b: true, connected: false, motorA: forward, motorB: fault },
    { name: "Open Q2 to isolate the branch.", a: true, b: false, motorA: forward, motorB: off },
    { name: "Restore the L2 conductor with Q2 still open.", a: true, b: false, connected: true, motorA: forward, motorB: off },
    { name: "Reclose Q2 and open Q1. Verify only the reverse branch runs.", a: false, b: true, motorA: off, motorB: reverse },
  ];
  const operatingSequence = cases.map(({ name, a, b, motorA, motorB, connected }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "Q1", properties: { closed: a } }, { reference: "Q2", properties: { closed: b } }],
    wireChanges: connected === undefined ? undefined : [{ ...openPhase, connected }],
    expectations: [
      { reference: "M1", label: "Nominal motor point", exact: motorA },
      { reference: "M2", label: motorB === fault ? "Signal fault" : "Nominal motor point", exact: motorB },
    ],
  }));
  const wires: Wire[] = [
    { id: "motor-a-pe", netName: "PE", from: { componentId: "supply", terminalId: "pe" }, to: { componentId: "motor-a", terminalId: "pe" }, points: [] },
    { id: "motor-b-pe", netName: "PE", from: { componentId: "supply", terminalId: "pe" }, to: { componentId: "motor-b", terminalId: "pe" }, points: [] },
  ];
  for (const [branch, terminals] of [["a", ["u1", "v1", "w1"]], ["b", ["u1", "w1", "v1"]]] as const) {
    for (const [index, phase] of ["l1", "l2", "l3"].entries()) {
      wires.push(
        { id: branch + "-source-" + phase, netName: phase.toUpperCase(), from: { componentId: "supply", terminalId: phase + "-out" }, to: { componentId: "breaker-" + branch, terminalId: phase + "-in" }, points: [] },
        { id: branch + "-branch-" + phase, netName: branch.toUpperCase() + "_" + phase.toUpperCase(), from: { componentId: "breaker-" + branch, terminalId: phase + "-out" }, to: { componentId: "motor-" + branch, terminalId: terminals[index] }, points: [] },
      );
    }
  }
  return {
    id, name, description, category: "Motor Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "supply", definitionId: "iec.ac-supply.01", reference: "X1", x: 540, y: 150, rotation: 0, properties: { outputEnabled: true, nominalVoltageV: 400, frequencyHz: 50 } },
        { id: "breaker-a", definitionId: "iec.circuit-breaker.01", reference: "Q1", x: 280, y: 345, rotation: 0, properties: { closed: false } },
        { id: "breaker-b", definitionId: "iec.circuit-breaker.01", reference: "Q2", x: 800, y: 345, rotation: 0, properties: { closed: false } },
        { id: "motor-a", definitionId: "iec.induction-motor.01", reference: "M1", x: 280, y: 545, rotation: 0, properties: { energized: true } },
        { id: "motor-b", definitionId: "iec.induction-motor.01", reference: "M2", x: 800, y: 545, rotation: 0, properties: { energized: true } },
      ],
      wires,
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" },
      { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
      { reference: "M2", label: "Nominal motor point", valueIncludes: "STANDBY" },
    ],
  };
}
