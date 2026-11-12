import type { CircuitDocument, Wire } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";
import { createStarDeltaCircuit } from "./starDeltaCircuit";

/** Open-transition star/delta circuit with wired 230 V control and on-delay relays. */
export function createWiredStarDeltaCircuit(): CircuitDocument {
  const document = createStarDeltaCircuit();
  document.id = "wired-star-delta-control";
  document.name = "Wired open-transition star–delta starter";
  document.description = "Six-terminal motor feeder with wired START/STOP holding, current-driven thermal overload, 5 s star timer, 200 ms open transition, and star/delta NC electrical interlocks. Balanced fixed impedance; no mechanical interlock or motor transient model.";
  for (const component of document.components.filter(c => ["forward", "star", "delta"].includes(c.id))) {
    component.definitionId = "contactor.three-pole-no-nc";
    component.properties = { ...component.properties, coilVoltageV: 230, energized: false };
  }
  const main = document.components.find(c => c.id === "forward")!;
  main.reference = "KM1";
  const star = document.components.find(c => c.id === "star")!;
  const delta = document.components.find(c => c.id === "delta")!;
  document.components.push(
    { id: "overload", definitionId: "overload.thermal", reference: "F1", x: 480, y: 340, rotation: 0, properties: { settingA: 20, tripped: false, thermalEnabled: true, overloadFactor: 1, heatingTimeSeconds: 5, coolingTimeSeconds: 10, resetLevel: .5, reset: false } },
    { id: "control", definitionId: "supply.control", reference: "X3", x: 100, y: 100, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
    { id: "stop", definitionId: "pushbutton.stop-nc", reference: "S0", x: 100, y: 300, rotation: 0, properties: { pressed: false } },
    { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 300, y: 300, rotation: 0, properties: { pressed: false } },
    { id: "star-timer", definitionId: "iec.on-delay-timer.01", reference: "KT1", x: 480, y: 500, rotation: 0, properties: { coilVoltageV: 230, nominalVoltageV: 230, energized: false, elapsedSeconds: 0, delaySeconds: 5 } },
    { id: "transition-timer", definitionId: "iec.on-delay-timer.01", reference: "KT2", x: 700, y: 500, rotation: 0, properties: { coilVoltageV: 230, nominalVoltageV: 230, energized: false, elapsedSeconds: 0, delaySeconds: .2 } },
  );
  const wires = document.wires;
  for (const phase of ["l1", "l2", "l3"]) {
    const mainLoadWire = wires.find(w => w.from.componentId === "forward" && w.from.terminalId === `${phase}-out` && w.to.componentId === "motor");
    if (mainLoadWire) mainLoadWire.to = { componentId: "overload", terminalId: `${phase}-in` };
    wires.push({ id: `sd-overload-${phase}`, from: { componentId: "overload", terminalId: `t${phase.slice(1)}` }, to: { componentId: "motor", terminalId: ({ l1: "u1", l2: "v1", l3: "w1" } as const)[phase as "l1" | "l2" | "l3"] }, points: [] } as Wire);
  }
  const connect = (from: string, fromTerminal: string, to: string, toTerminal: string) => wires.push({ id: `sd-control-${wires.length + 1}`, from: { componentId: from, terminalId: fromTerminal }, to: { componentId: to, terminalId: toTerminal }, points: [] } as Wire);
  connect("control", "line", "stop", "21");
  connect("stop", "22", "overload", "aux-95");
  connect("overload", "aux-96", "start", "13");
  connect("start", "14", "forward", "a1");
  connect("overload", "aux-96", "forward", "aux-13");
  connect("forward", "aux-14", "forward", "a1");
  connect("control", "neutral", "forward", "a2");
  connect("forward", "aux-14", "star-timer", "a1");
  connect("control", "neutral", "star-timer", "a2");
  connect("forward", "aux-14", "star-timer", "15");
  connect("star-timer", "16", "delta", "aux-21");
  connect("delta", "aux-22", "star", "a1");
  connect("control", "neutral", "star", "a2");
  connect("star-timer", "18", "transition-timer", "a1");
  connect("control", "neutral", "transition-timer", "a2");
  connect("forward", "aux-14", "transition-timer", "15");
  connect("transition-timer", "18", "star", "aux-21");
  connect("star", "aux-22", "delta", "a1");
  connect("control", "neutral", "delta", "a2");
  return document;
}

export function createWiredStarDeltaTemplate(): ProjectTemplate {
  const document = createWiredStarDeltaCircuit();
  const step = (name: string, durationSeconds: number, changes: CircuitSequenceStep["changes"], exact: string): CircuitSequenceStep => ({ name, durationSeconds, changes, expectations: [{ reference: "M1", label: "Winding operating point", exact }] });
  const operatingSequence = [
    step("Close Q1", 0, [{ reference: "Q1", properties: { closed: true } }], "OPEN · 0.00 V/winding · 0.00 A line"),
    step("Press START; main and star contactors energize", .1, [{ reference: "S1", properties: { pressed: true } }], "STAR · 230.94 V/winding · 16.33 A line"),
    step("Release START; holding contact sustains star", 4.8, [{ reference: "S1", properties: { pressed: false } }], "STAR · 230.94 V/winding · 16.33 A line"),
    step("KT1 ends star; open transition begins", .1, [], "OPEN · 0.00 V/winding · 0.00 A line"),
    step("KT2 completes the 200 ms break interval and closes delta", .2, [], "DELTA · 400.00 V/winding · 48.99 A line"),
    step("Delta current trips the thermal overload and drops all coils", .6, [], "OPEN · 0.00 V/winding · 0.00 A line"),
    step("Allow the overload to cool below its reset level", 10, [], "OPEN · 0.00 V/winding · 0.00 A line"),
    step("Reset the overload without automatic restart", 0, [{ reference: "F1", properties: { reset: true } }], "OPEN · 0.00 V/winding · 0.00 A line"),
  ];
  return { id: document.id, name: document.name, category: "Motor Control", level: "Advanced", description: document.description, document, operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [
    { reference: "KM1", label: "Wired control coil", valueIncludes: "0 V · OFF" },
    { reference: "KM2", label: "Wired control coil", valueIncludes: "0 V · OFF" },
    { reference: "KM3", label: "Wired control coil", valueIncludes: "0 V · OFF" },
    { reference: "M1", label: "Winding operating point", valueIncludes: "OPEN" },
  ] };
}

