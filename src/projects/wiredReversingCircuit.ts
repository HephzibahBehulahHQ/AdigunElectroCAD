import { wiredReversingRoutes } from "./wiredReversingRoutes";
import type { CircuitDocument, Wire } from "../types/electrical";
import { createWiredHoldingTemplate } from "./wiredHoldingCircuit";

/** Source-backed contactors with wired holding and opposing NC electrical interlocks. */
export function createWiredReversingCircuit(): CircuitDocument {
  const document = createWiredHoldingTemplate().document;
  document.id = "wired-reversing-interlocks";
  document.name = "Wired forward/reverse interlocks";
  document.description = "Siemens 7.5 kW motor with two SIRIUS 3RT contactors, SITOP 24 V DC controls, wired NO holding and opposing NC interlocks, shared STOP/3RU overload and actual phase interchange. No mechanical interlock, coast-down or safety certification.";
  const forward = document.components.find(c => c.id === "contactor")!;
  forward.definitionId = "iec.motor-starter.01";
  forward.properties = { ...forward.properties, nominalVoltageV: 400, ratedCurrentA: 17, ratedPowerKw: 7.5, coilVoltageV: 24, coilDc: true, auxiliaryNoContacts: 1, auxiliaryNcContacts: 1, energized: false };
  document.components.push({ ...structuredClone(forward), id: "reverse", reference: "KM2", x: 580, y: 380 });
  document.components.push({ id: "reverse-start", definitionId: "pushbutton.start-no", reference: "S2", x: 1000, y: 180, rotation: 0, properties: { pressed: false } });
  document.components.push({ id: "control-psu", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 100, y: 230, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } });
  const motor = document.components.find(c => c.id === "motor")!;
  motor.definitionId = "iec.induction-motor.01";
  Object.assign(motor.properties, { nominalVoltageV: 400, ratedCurrentA: 14.3, ratedPowerKw: 7.5, nominalSpeedRpm: 1470, frequencyHz: 50, powerFactor: 0.84, efficiencyPercent: 90.4, windingConnection: "Delta" });
  Object.assign(document.components.find(c => c.id === "overload")!.properties, { settingA: 14.3, settingMinA: 11, settingMaxA: 16, tripClass: 10 });
  const controlLine = document.wires.find(wire => wire.id === "w14")!;
  controlLine.from = { componentId: "control-psu", terminalId: "plus-out" };
  controlLine.points = [];
  const controlReturn = document.wires.find(wire => wire.id === "w18")!;
  controlReturn.from = { componentId: "control-psu", terminalId: "zero-out" };
  controlReturn.points = [{ x: 180, y: 250 }, { x: 180, y: 760 }, { x: 240, y: 760 }, { x: 240, y: 392 }];
  const connect = (from: string, fromTerminal: string, to: string, toTerminal: string) => {
    document.wires.push({ id: `reverse-${document.wires.length}`, from: { componentId: from, terminalId: fromTerminal }, to: { componentId: to, terminalId: toTerminal }, points: [] } as Wire);
  };
  connect("control", "line", "control-psu", "line-in");
  connect("control", "neutral", "control-psu", "neutral-in");
  for (const wire of document.wires) if (["w17", "w20"].includes(wire.id)) {
    wire.to = { componentId: "reverse", terminalId: "aux-21" };
    wire.points = [];
  }
  connect("reverse", "aux-22", "contactor", "a1");
  connect("overload", "aux-96", "reverse-start", "13");
  connect("overload", "aux-96", "reverse", "aux-13");
  connect("reverse-start", "14", "contactor", "aux-21");
  connect("reverse", "aux-14", "contactor", "aux-21");
  connect("contactor", "aux-22", "reverse", "a1");
  connect("control-psu", "zero-out", "reverse", "a2");
  for (let phase = 1; phase <= 3; phase++) {
    connect("breaker", `l${phase}-out`, "reverse", `l${phase}-in`);
    connect("reverse", `l${phase}-out`, "overload", `l${4 - phase}-in`);
  }
  const positions: Record<string, [number, number]> = { supply: [500, 140], breaker: [500, 260], contactor: [340, 420], reverse: [660, 420], overload: [500, 560], motor: [500, 680], control: [100, 140], "control-psu": [100, 260], stop: [100, 380], start: [900, 320], "reverse-start": [900, 540], "lamp-h1": [620, 690], "lamp-h2": [760, 690], "lamp-h3": [900, 690] };
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
    step("Press forward START", [{ reference: "S1", properties: { pressed: true } }], 1470),
    step("Release forward START; holding contact retains KM1", [{ reference: "S1", properties: { pressed: false } }], 1470),
    step("Reverse START cannot bypass KM1 NC interlock", [{ reference: "S2", properties: { pressed: true } }], 1470),
    step("Release reverse START", [{ reference: "S2", properties: { pressed: false } }], 1470),
    step("Press STOP", [{ reference: "S0", properties: { pressed: true } }], 0),
    step("Release STOP", [{ reference: "S0", properties: { pressed: false } }], 0),
    step("Press reverse START", [{ reference: "S2", properties: { pressed: true } }], -1470),
    step("Release reverse START; holding contact retains KM2", [{ reference: "S2", properties: { pressed: false } }], -1470),
    step("Forward START cannot bypass KM2 NC interlock", [{ reference: "S1", properties: { pressed: true } }], -1470),
    step("Release forward START", [{ reference: "S1", properties: { pressed: false } }], -1470),
    step("Trip overload", [{ reference: "F1", properties: { tripped: true } }], 0),
    step("Reset overload without restarting", [{ reference: "F1", properties: { tripped: false } }], 0),
  ];
  return { id: document.id, name: document.name, description: document.description, category: "Motor Control", level: "Advanced", document, operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [
    { reference: "KM1", label: "Starter contacts", valueIncludes: "OPEN" },
    { reference: "KM2", label: "Starter contacts", valueIncludes: "OPEN" },
    { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
  ] };
}

/** Current-driven overload example using the same physical reversing power path. */
export function createThermalWiredReversingTemplate(): ProjectTemplate {
  const template = createWiredReversingTemplate();
  const document = template.document;
  document.id = "thermal-wired-reversing";
  document.name = "Thermal overload on reversing starter";
  document.description = "Current-driven educational thermal overload trips the energized reverse contactor through wired 95–96. F1 is set to 11 A, the 3RU range minimum, against the 14.3 A motor nameplate; the 3 s first-order response is an accelerated teaching model, not a certified relay curve.";
  Object.assign(document.components.find(c => c.id === "overload")!.properties, { thermalEnabled: true, settingA: 11, overloadFactor: 1, heatingTimeSeconds: 3, coolingTimeSeconds: 20, resetLevel: .5, reset: false });
  const step = (name: string, durationSeconds: number, changes: CircuitSequenceStep["changes"], exact: string): CircuitSequenceStep => ({ name, durationSeconds, changes, expectations: [{ reference: "M1", label: "Nominal motor point", exact }] });
  const operatingSequence = [
    step("Start reverse", .1, [{ reference: "S2", properties: { pressed: true } }], "-1470 rpm / 7.5 kW"),
    step("Release reverse START and heat the overload to trip", 3, [{ reference: "S2", properties: { pressed: false } }], "STANDBY"),
    step("Cool the tripped overload", 20, [{ reference: "F1", properties: { reset: false } }], "STANDBY"),
    step("Apply a fresh cool reset without restarting", 0, [{ reference: "F1", properties: { reset: true } }], "STANDBY"),
  ];
  return { ...template, id: document.id, name: document.name, description: document.description, level: "Advanced", document, operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [
    { reference: "KM1", label: "Starter contacts", valueIncludes: "OPEN" },
    { reference: "KM2", label: "Starter contacts", valueIncludes: "OPEN" },
    { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
  ] };
}
