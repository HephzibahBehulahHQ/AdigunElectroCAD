import { createReversingCircuit } from "./reversingCircuit";
import { starDeltaContacts, type StarDeltaState } from "../simulation/starDeltaStarter";
import type { CircuitDocument, Wire } from "../types/electrical";

export function createStarDeltaCircuit(): CircuitDocument {
  const base = createReversingCircuit();
  const powerIds = new Set(["supply", "breaker", "forward", "motor"]);
  const components = base.components.filter((component) => powerIds.has(component.id)).map((component) => ({ ...component, properties: { ...component.properties } }));
  const main = components.find((component) => component.id === "forward")!;
  main.reference = "KM1"; main.x = 340; main.y = 200;
  const motor = components.find((component) => component.id === "motor")!;
  motor.definitionId = "motor.six-terminal"; motor.x = 620; motor.y = 200;
  motor.properties = { resistanceOhm: 10, reactanceOhm: 10 };
  components.find((component) => component.id === "supply")!.properties.nominalVoltageV = 400;
  components.push({ ...main, id: "star", reference: "KM2", x: 340, y: 420, properties: { energized: false } }, { ...main, id: "delta", reference: "KM3", x: 620, y: 420, properties: { energized: false } });
  const wires = base.wires.filter((wire) => powerIds.has(wire.from.componentId) && powerIds.has(wire.to.componentId));
  const connect = (from: string, source: string, to: string, target: string) => wires.push({ id: `sd-wire-${wires.length + 1}`, from: { componentId: from, terminalId: source }, to: { componentId: to, terminalId: target }, points: [], netName: `SD_${wires.length + 1}` } as Wire);
  for (let index = 0; index < 3; index++) {
    const phase = ["l1", "l2", "l3"][index];
    const end = ["u2", "v2", "w2"][index];
    connect("motor", end, "star", `${phase}-in`);
    connect("motor", end, "delta", `${phase}-in`);
    connect("delta", `${phase}-out`, "motor", ["w1", "u1", "v1"][index]);
  }
  components.push({ id: "star-point", definitionId: "junction.power", reference: "X2", x: 340, y: 640, rotation: 0, properties: {} });
  for (const phase of ["l1", "l2", "l3"]) connect("star", `${phase}-out`, "star-point", "node");
  return { ...base, id: "star-delta-circuit", name: "Star–Delta power circuit", description: "Six-terminal motor with main, star and delta contactors. Control/protection wiring remains separate.", components, wires };
}
export function applyStarDeltaState(document: CircuitDocument, state: StarDeltaState): CircuitDocument {
  const contacts = starDeltaContacts(state);
  return { ...document, components: document.components.map((component) => {
    const properties = { ...component.properties };
    if (component.id === "breaker") properties.closed = state.breakerClosed && !state.overloadTripped;
    if (component.id === "forward") properties.energized = contacts.main;
    if (component.id === "star") properties.energized = contacts.star;
    if (component.id === "delta") properties.energized = contacts.delta;
    return { ...component, properties };
  }) };
}
