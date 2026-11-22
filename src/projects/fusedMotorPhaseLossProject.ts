import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";
import type { Wire } from "../types/electrical";

export function createFusedMotorPhaseLossProject(): ProjectTemplate {
  const id = "fused-motor-phase-loss";
  const name = "Fused motor feeder phase-loss check";
  const description = "A three-phase supply feeds a motor through three independent fuse poles. Opening one pole interrupts that phase and invalidates the balanced motor operating point. The sequence de-energizes the simulated source before restoring the pole. The model does not calculate fuse loading, melting, or unbalanced current.";
  const fault = "ERROR: M1 does not have three distinct phases from one supply; unbalanced winding current is unavailable.";
  const cases = [
    { name: "Start with the three-phase source off.", enabled: false, open: false, motor: "STANDBY" },
    { name: "Energize all three phases and verify the nominal operating point.", enabled: true, open: false, motor: "1470 rpm / 7.5 kW" },
    { name: "Open the L2 fuse pole. Verify the phase-loss diagnostic.", enabled: true, open: true, motor: fault },
    { name: "De-energize the source before restoring the fuse pole.", enabled: false, open: true, motor: "STANDBY" },
    { name: "Restore L2 with the source still off.", enabled: false, open: false, motor: "STANDBY" },
    { name: "Energize all three restored paths and verify recovery.", enabled: true, open: false, motor: "1470 rpm / 7.5 kW" },
  ];
  const operatingSequence = cases.map(({ name, enabled, open, motor }): CircuitSequenceStep => ({
    name,
    changes: [{ reference: "X1", properties: { outputEnabled: enabled } }, { reference: "F1", properties: { fuseL2Open: open } }],
    expectations: [
      { reference: "F1", label: "Fuse check", exact: open ? "OPEN · L2" : "0.0% load" },
      { reference: "M1", label: motor === fault ? "Signal fault" : "Nominal motor point", exact: motor },
    ],
  }));
  const wires: Wire[] = (["l1", "l2", "l3"] as const).flatMap((phase, index) => [
    { id: "source-" + phase, netName: phase.toUpperCase(), from: { componentId: "supply", terminalId: phase + "-out" }, to: { componentId: "fuses", terminalId: phase + "-in" }, points: [] },
    { id: "fused-" + phase, netName: "FUSED_" + phase.toUpperCase(), from: { componentId: "fuses", terminalId: phase + "-out" }, to: { componentId: "motor", terminalId: ["u1", "v1", "w1"][index] }, points: [] },
  ]);
  wires.push({ id: "motor-pe", netName: "PE", from: { componentId: "supply", terminalId: "pe" }, to: { componentId: "motor", terminalId: "pe" }, points: [] });
  return {
    id, name, description, category: "Motor Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "supply", definitionId: "iec.ac-supply.01", reference: "X1", x: 465, y: 160, rotation: 0, properties: { outputEnabled: false, nominalVoltageV: 400, frequencyHz: 50 } },
        { id: "fuses", definitionId: "iec.fuse-switch.01", reference: "F1", x: 465, y: 350, rotation: 0, properties: { fuseHealthy: true, fuseL1Open: false, fuseL2Open: false, fuseL3Open: false } },
        { id: "motor", definitionId: "iec.induction-motor.01", reference: "M1", x: 465, y: 545, rotation: 0, properties: { energized: true } },
      ],
      wires,
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "OFF" },
      { reference: "F1", label: "Fuse check", valueIncludes: "0.0% load" },
      { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
    ],
  };
}
