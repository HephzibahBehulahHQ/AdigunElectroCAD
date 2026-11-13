import type { ElectricalComponentDefinition } from "../types/electrical";
export const windingCatalog: ElectricalComponentDefinition[] = [{
  id: "motor.six-terminal", name: "Six-terminal balanced winding motor", category: "Motors", referencePrefix: "M", symbolId: "motor",
  description: "Six accessible winding terminals for star/delta connection analysis.",
  terminals: [...["u1", "v1", "w1", "u2", "v2", "w2"].map((id) => ({ id, label: id.toUpperCase(), kind: "power" as const, direction: "bidirectional" as const })), { id: "pe", label: "PE", kind: "protective-earth", direction: "bidirectional" }],
  propertiesSchema: {
    resistanceOhm: 10, reactanceOhm: 10, equivalentCircuitEnabled: false,
    statorResistanceOhm: 0, statorReactanceOhm: 0, rotorResistanceOhm: 0, rotorReactanceOhm: 0,
    magnetizingReactanceOhm: 0, frequencyHz: 50, polePairs: 1, slip: 0,
    mechanicalTransientEnabled: false, rotorInertiaKgM2: 0, loadTorqueNm: 0, initialRotorSpeedRpm: 0,
  }, simulationModelId: "six-terminal-windings", simulationSupport: "numerical",
  documentation: "Connection and current derive from circuit wires and closed contacts. Fixed balanced impedance remains the default. Optional T-equivalent mode requires explicit motor parameters. Optional first-order rotor-speed steps additionally require this mode, positive user-entered inertia, and non-negative user-entered load torque. This educational model uses 10 ms steps and does not model flux, multi-mass mechanics, saturation, harmonics, or certified relay curves.", standardsReferences: ["IEC 60034-1"],
}, {
  id: "junction.power", name: "Power conductor junction", category: "Terminal Blocks", referencePrefix: "X", symbolId: "terminal",
  description: "Common electrical node joining attached power conductors.",
  terminals: [{ id: "node", label: "J", kind: "power", direction: "bidirectional" }],
  propertiesSchema: {}, simulationModelId: "power-junction", simulationSupport: "connectivity",
  documentation: "All wires attached to J share the same electrical node. No impedance or isolation is introduced. IEC 60617 is a diagram-reference family, not certification of this rendering. Source: https://webstore.iec.ch/en/publication/2723", standardsReferences: ["IEC 60617 — conductors and connecting devices (diagram reference)"],
}];

