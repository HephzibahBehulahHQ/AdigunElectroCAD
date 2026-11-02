import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";
import type { ReversingState } from "../simulation/reversingStarter";

export function createReversingCircuit(): CircuitDocument {
  const component = (id: string, definitionId: string, reference: string, x: number, y: number, properties: ComponentInstance["properties"]): ComponentInstance => ({ id, definitionId, reference, x, y, rotation: 0, properties });
  const components = [
    component("supply", "iec.ac-supply.01", "X1", 120, 160, { outputEnabled: true, frequencyHz: 50 }),
    component("breaker", "iec.circuit-breaker.01", "Q1", 120, 280, { closed: false }),
    component("forward", "iec.motor-starter.01", "KM1", 360, 140, { energized: false }),
    component("reverse", "iec.motor-starter.01", "KM2", 360, 420, { energized: false }),
    component("motor", "iec.induction-motor.01", "M1", 680, 260, { energized: true, nominalSpeedRpm: 1440 }),
    component("overload-control", "overload.thermal", "F1", 120, 620, { tripped: false }),
    component("forward-command", "logic.no-contact", "SF", 300, 620, { input: false }),
    component("forward-permit", "logic.gate-and", "GF", 460, 620, { inputA: false, inputB: false }),
    component("reverse-command", "logic.no-contact", "SR", 620, 620, { input: false }),
    component("reverse-permit", "logic.gate-and", "GR", 780, 620, { inputA: false, inputB: false }),
  ];
  const wires: Wire[] = [];
  const connect = (from: string, source: string, to: string, target: string) => wires.push({ id: `reversing-wire-${wires.length + 1}`, from: { componentId: from, terminalId: source }, to: { componentId: to, terminalId: target }, points: [], netName: `REV_${wires.length + 1}` });
  const phases = ["l1", "l2", "l3"];
  for (const phase of phases) {
    connect("supply", `${phase}-out`, "breaker", `${phase}-in`);
    for (const starter of ["forward", "reverse"]) connect("breaker", `${phase}-out`, starter, `${phase}-in`);
  }
  for (let index = 0; index < 3; index++) {
    connect("forward", `${phases[index]}-out`, "motor", ["u1", "v1", "w1"][index]);
    connect("reverse", `${phases[index]}-out`, "motor", ["w1", "v1", "u1"][index]);
  }
  for (const direction of ["forward", "reverse"]) {
    connect(`${direction}-command`, "out", `${direction}-permit`, "in-a");
    connect("overload-control", "aux-96", `${direction}-permit`, "in-b");
    connect(`${direction}-permit`, "out", direction, "a1");
  }
  return { id: "reversing-circuit", name: "Forward / Reverse power circuit", description: "KM2 interchanges L1/L3. Boolean command permits include F1 NC interruption. Physical coil-voltage, holding/interlock wiring and overload power poles remain incomplete.", revision: 1, components, wires };
}

export function applyReversingState(document: CircuitDocument, state: ReversingState): CircuitDocument {
  return { ...document, components: document.components.map((component) => {
    const properties = { ...component.properties };
    if (component.id === "breaker") properties.closed = state.breakerClosed;
    if (component.id === "overload-control") properties.tripped = state.overloadTripped;
    if (component.id === "forward-command") properties.input = state.contactor === "forward";
    if (component.id === "reverse-command") properties.input = state.contactor === "reverse";
    if (component.id === "forward") properties.energized = state.contactor === "forward";
    if (component.id === "reverse") properties.energized = state.contactor === "reverse";
    return { ...component, properties };
  }) };
}
