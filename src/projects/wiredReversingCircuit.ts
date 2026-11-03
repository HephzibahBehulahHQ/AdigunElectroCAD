import { wiredReversingRoutes } from "./wiredReversingRoutes";
import type { CircuitDocument, Wire } from "../types/electrical";
import { createWiredHoldingTemplate } from "./wiredHoldingCircuit";

/** Both directions use their own NO holding contact and the opposite coil's NC contact. */
export function createWiredReversingCircuit(): CircuitDocument {
  const document = createWiredHoldingTemplate().document;
  document.id = "wired-reversing-interlocks";
  document.name = "Wired forward/reverse interlocks";
  document.description = "Ideal AC coils, wired NO holding and opposing NC interlocks, shared STOP/overload and actual phase interchange. No mechanical interlock, coast-down or safety certification.";
  const forward = document.components.find(c => c.id === "contactor")!;
  forward.definitionId = "contactor.three-pole-no-nc";
  document.components.push({ ...structuredClone(forward), id: "reverse", reference: "KM2", x: 580, y: 380 });
  document.components.push({ id: "reverse-start", definitionId: "pushbutton.start-no", reference: "S2", x: 1000, y: 180, rotation: 0, properties: { pressed: false } });
  for (const wire of document.wires) if (["w17", "w20"].includes(wire.id)) {
    wire.to = { componentId: "reverse", terminalId: "aux-21" };
    wire.points = [];
  }
  const connect = (from: string, fromTerminal: string, to: string, toTerminal: string) => {
    document.wires.push({ id: `reverse-${document.wires.length}`, from: { componentId: from, terminalId: fromTerminal }, to: { componentId: to, terminalId: toTerminal }, points: [] } as Wire);
  };
  connect("reverse", "aux-22", "contactor", "a1");
  connect("overload", "aux-96", "reverse-start", "13");
  connect("overload", "aux-96", "reverse", "aux-13");
  connect("reverse-start", "14", "contactor", "aux-21");
  connect("reverse", "aux-14", "contactor", "aux-21");
  connect("contactor", "aux-22", "reverse", "a1");
  connect("control", "neutral", "reverse", "a2");
  for (let phase = 1; phase <= 3; phase++) {
    connect("breaker", `l${phase}-out`, "reverse", `l${phase}-in`);
    connect("reverse", `l${phase}-out`, "overload", `l${4 - phase}-in`);
  }
  const positions: Record<string, [number, number]> = { supply: [500, 140], breaker: [500, 260], contactor: [340, 420], reverse: [660, 420], overload: [500, 560], motor: [500, 680], control: [100, 140], stop: [100, 320], start: [900, 320], "reverse-start": [900, 540] };
  for (const c of document.components) [c.x, c.y] = positions[c.id];
  for (const w of document.wires) w.points = (wiredReversingRoutes[w.id] ?? []).map(point => ({ ...point }));
  return document;
}
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createWiredReversingTemplate(): ProjectTemplate {
  const document = createWiredReversingCircuit();
  const step = (name: string, changes: CircuitSequenceStep["changes"], speed: number): CircuitSequenceStep => ({ name, durationSeconds: .1, changes, expectations: [{ reference: "M1", label: "Nominal motor point", exact: speed ? `${speed} rpm / 7.5 kW` : "STANDBY" }] });
  const operatingSequence = [
    step("Press forward START", [{ reference: "S1", properties: { pressed: true } }], 1440),
    step("Release forward START; holding contact retains KM1", [{ reference: "S1", properties: { pressed: false } }], 1440),
    step("Reverse START cannot bypass KM1 NC interlock", [{ reference: "S2", properties: { pressed: true } }], 1440),
    step("Release reverse START", [{ reference: "S2", properties: { pressed: false } }], 1440),
    step("Press STOP", [{ reference: "S0", properties: { pressed: true } }], 0),
    step("Release STOP", [{ reference: "S0", properties: { pressed: false } }], 0),
    step("Press reverse START", [{ reference: "S2", properties: { pressed: true } }], -1440),
    step("Release reverse START; holding contact retains KM2", [{ reference: "S2", properties: { pressed: false } }], -1440),
    step("Forward START cannot bypass KM2 NC interlock", [{ reference: "S1", properties: { pressed: true } }], -1440),
    step("Release forward START", [{ reference: "S1", properties: { pressed: false } }], -1440),
    step("Trip overload", [{ reference: "F1", properties: { tripped: true } }], 0),
    step("Reset overload without restarting", [{ reference: "F1", properties: { tripped: false } }], 0),
  ];
  return { id: document.id, name: document.name, description: document.description, category: "Motor Control", level: "Advanced", document, operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [
    { reference: "KM1", label: "Wired control coil", valueIncludes: "OFF" },
    { reference: "KM2", label: "Wired control coil", valueIncludes: "OFF" },
    { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
  ] };
}
