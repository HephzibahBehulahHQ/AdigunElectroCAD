import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createTwoMotorSequence(): CircuitDocument {
  const component = (id: string, definitionId: string, reference: string, x: number, y: number, properties: ComponentInstance["properties"]): ComponentInstance => ({ id, definitionId, reference, x, y, rotation: 0, properties });
  const components = [
    component("supply", "iec.ac-supply.01", "X1", 500, 140, { powerLayout: "vertical", outputEnabled: true, frequencyHz: 50, nominalVoltageV: 400 }),
    component("breaker", "iec.circuit-breaker.01", "Q1", 500, 260, { powerLayout: "vertical", closed: true, nominalVoltageV: 400, ratedCurrentA: 32, poles: 3 }),
    component("km1", "iec.motor-starter.01", "KM1", 300, 380, { powerLayout: "vertical", energized: false, nominalVoltageV: 400, ratedCurrentA: 17, ratedPowerKw: 7.5, coilVoltageV: 24, coilDc: true, auxiliaryNoContacts: 1, auxiliaryNcContacts: 1 }),
    component("km2", "iec.motor-starter.01", "KM2", 700, 380, { powerLayout: "vertical", energized: false, nominalVoltageV: 400, ratedCurrentA: 17, ratedPowerKw: 7.5, coilVoltageV: 24, coilDc: true, auxiliaryNoContacts: 1, auxiliaryNcContacts: 1 }),
    component("f1", "overload.thermal", "F1", 300, 500, { powerLayout: "vertical", tripped: false, settingA: 14.3, settingMinA: 11, settingMaxA: 16, tripClass: 10 }),
    component("f2", "overload.thermal", "F2", 700, 500, { powerLayout: "vertical", tripped: false, settingA: 14.3, settingMinA: 11, settingMaxA: 16, tripClass: 10 }),
    component("m1", "iec.induction-motor.01", "M1", 300, 660, { powerLayout: "vertical", energized: true, nominalVoltageV: 400, ratedCurrentA: 14.3, ratedPowerKw: 7.5, nominalSpeedRpm: 1470, frequencyHz: 50, powerFactor: 0.84, efficiencyPercent: 90.4, windingConnection: "Delta" }),
    component("m2", "iec.induction-motor.01", "M2", 700, 660, { powerLayout: "vertical", energized: true, nominalVoltageV: 400, ratedCurrentA: 14.3, ratedPowerKw: 7.5, nominalSpeedRpm: 1470, frequencyHz: 50, powerFactor: 0.84, efficiencyPercent: 90.4, windingConnection: "Delta" }),
    component("start", "logic.no-contact", "S1", 100, 140, { input: false }),
    component("stop", "logic.no-contact", "S0", 100, 300, { input: false }),
    component("plc", "iec.plc-digital-io.01", "PLC1", 100, 460, { program: "LDP I0; OR Q0; ANDN I1; OUT Q0" }),
    component("overloads", "logic.gate-and", "GF", 100, 640, { inputA: false, inputB: false }),
    component("master", "logic.gate-and", "GP", 500, 640, { inputA: false, inputB: false }),
    component("fault", "logic.gate-not", "GN", 960, 680, { inputA: false }),
    component("stop-or-fault", "logic.gate-or", "GS", 960, 540, { inputA: false, inputB: false }),
    component("run", "logic.gate-and", "GR", 960, 360, { inputA: false, inputB: false }),
    component("timer", "iec.on-delay-timer.01", "T1", 960, 200, { energized: false, delaySeconds: 3, elapsedSeconds: 0 }),
    component("second", "logic.gate-and", "G2", 740, 200, { inputA: false, inputB: false }),
  ];
  const wires: Wire[] = [];
  const connect = (from: string, output: string, to: string, input: string, points: Wire["points"] = []) => wires.push({ id: `two-motor-${wires.length + 1}`, from: { componentId: from, terminalId: output }, to: { componentId: to, terminalId: input }, points });
  for (let phase = 1; phase <= 3; phase++) {
    const x = 500 + [-32, 0, 32][phase - 1];
    connect("supply", `l${phase}-out`, "breaker", `l${phase}-in`, phase === 2 ? [{ x: x + 20, y: 177 }, { x: x + 20, y: 217 }, { x, y: 217 }] : [{ x, y: 217 }]);
    for (const [starter, overload, motor, center] of [["km1", "f1", "m1", 300], ["km2", "f2", "m2", 700]] as const) {
      const target = center + [-32, 0, 32][phase - 1], bus = 340 + (phase - 1) * 10;
      connect("breaker", `l${phase}-out`, starter, `l${phase}-in`, phase === 2 ? [{ x: x + 20, y: 297 }, { x: x + 20, y: 337 }, { x, y: 337 }, { x, y: bus }, { x: target, y: bus }] : [{ x, y: bus }, { x: target, y: bus }]);
      connect(starter, `l${phase}-out`, overload, `l${phase}-in`, phase === 2 ? [{ x: center + 20, y: 417 }, { x: center + 20, y: 457 }, { x: center, y: 457 }] : [{ x: target, y: 457 }]);
      connect(overload, `t${phase}`, motor, ["u1", "v1", "w1"][phase - 1], phase === 2 ? [{ x: center + 20, y: 537 }, { x: center + 20, y: 577 }, { x: center, y: 577 }] : [{ x: target, y: 577 }]);
    }
  }
  connect("start", "out", "plc", "in-0", [{ x: 180, y: 140 }, { x: 180, y: 240 }, { x: 20, y: 240 }, { x: 20, y: 442 }]);
  connect("f1", "aux-96", "overloads", "in-a", [{ x: 370, y: 500 }, { x: 370, y: 580 }, { x: 30, y: 580 }, { x: 30, y: 628 }]);
  connect("f2", "aux-96", "overloads", "in-b");
  connect("breaker", "aux-closed", "f1", "aux-95", [{ x: 600, y: 260 }, { x: 600, y: 480 }, { x: 370, y: 480 }]);
  connect("breaker", "aux-closed", "f2", "aux-95", [{ x: 600, y: 260 }, { x: 600, y: 480 }, { x: 770, y: 480 }]);
  connect("overloads", "out", "master", "in-a");
  connect("breaker", "aux-closed", "master", "in-b", [{ x: 590, y: 260 }, { x: 590, y: 620 }, { x: 430, y: 620 }, { x: 430, y: 652 }]);
  connect("master", "out", "fault", "in-a");
  connect("fault", "out", "stop-or-fault", "in-b", [{ x: 1030, y: 680 }, { x: 1030, y: 615 }, { x: 880, y: 615 }, { x: 880, y: 552 }]);
  connect("stop", "out", "stop-or-fault", "in-a");
  connect("stop-or-fault", "out", "plc", "in-1", [{ x: 1030, y: 540 }, { x: 1030, y: 760 }, { x: 10, y: 760 }, { x: 10, y: 460 }]);
  connect("plc", "out-0", "run", "in-a");
  connect("master", "out", "run", "in-b", [{ x: 570, y: 640 }, { x: 570, y: 580 }, { x: 850, y: 580 }, { x: 850, y: 372 }]);
  connect("run", "out", "km1", "a1");
  connect("run", "out", "timer", "a1", [{ x: 1030, y: 360 }, { x: 1030, y: 300 }, { x: 880, y: 300 }, { x: 880, y: 188 }]);
  connect("run", "out", "timer", "15", [{ x: 1020, y: 350 }, { x: 860, y: 350 }, { x: 860, y: 188 }]);
  connect("run", "out", "second", "in-b", [{ x: 1040, y: 360 }, { x: 1040, y: 280 }, { x: 680, y: 280 }, { x: 680, y: 212 }]);
  connect("timer", "18", "second", "in-a", [{ x: 1030, y: 200 }, { x: 1030, y: 100 }, { x: 670, y: 100 }, { x: 670, y: 188 }]);
  connect("second", "out", "km2", "a1", [{ x: 820, y: 200 }, { x: 820, y: 310 }, { x: 630, y: 310 }, { x: 630, y: 368 }]);
  return { id: "two-motor-sequence", name: "Two-motor staggered starter", description: "Two Siemens 7.5 kW DOL feeders use modeled SIRIUS contactors, 3RU thermal overload relays and an IEC three-pole source breaker. M1 starts on a fresh START edge; M2 follows after 3 seconds. The shared 32 A breaker and each 14.3 A overload are shown; branch short-circuit coordination, mechanical acceleration and thermal trip curves are outside this educational model.", revision: 2, components, wires };
}

export function createTwoMotorTemplate(): ProjectTemplate {
  const step = (name: string, durationSeconds: number, changes: CircuitSequenceStep["changes"], m1: boolean, m2: boolean): CircuitSequenceStep => ({ name, durationSeconds, changes, expectations: [
    { reference: "M1", label: "Nominal motor point", exact: m1 ? "1470 rpm / 7.5 kW" : "STANDBY" },
    { reference: "M2", label: "Nominal motor point", exact: m2 ? "1470 rpm / 7.5 kW" : "STANDBY" },
  ] });
  const operatingSequence = [
    step("Fresh START starts M1", .1, [{ reference: "S1", properties: { input: true } }], true, false),
    step("Release START before second-motor delay", 2.9, [{ reference: "S1", properties: { input: false } }], true, false),
    step("M2 follows after three seconds", .1, [], true, true),
    step("STOP drops both motors", .1, [{ reference: "S0", properties: { input: true } }], false, false),
    step("Releasing STOP does not restart", 4, [{ reference: "S0", properties: { input: false } }], false, false),
    step("Restart requires a fresh START", .1, [{ reference: "S1", properties: { input: true } }], true, false),
    step("Breaker opens while START held", .1, [{ reference: "Q1", properties: { closed: false } }], false, false),
    step("Breaker restoration cannot restart held START", 4, [{ reference: "Q1", properties: { closed: true } }], false, false),
    step("Release START to re-arm edge", .1, [{ reference: "S1", properties: { input: false } }], false, false),
    step("Press START again", .1, [{ reference: "S1", properties: { input: true } }], true, false),
    step("Either overload stops the shared sequence", .1, [{ reference: "F2", properties: { tripped: true } }], false, false),
    step("Overload reset cannot restart held START", 4, [{ reference: "F2", properties: { tripped: false } }], false, false),
  ];
  return { id: "two-motor-sequence", name: "Two-motor staggered starter", category: "Motor Control", level: "Advanced", description: "Two modeled Siemens 7.5 kW feeders: press START to run M1, then M2 starts after 3 seconds. STOP, Q1 opening or either 14.3 A overload removes the shared run permit. Branch short-circuit coordination is not simulated.", document: createTwoMotorSequence(), operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [{ reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" }, { reference: "M2", label: "Nominal motor point", valueIncludes: "STANDBY" }, { reference: "T1", label: "Timer contact", valueIncludes: "0.0 / 3.0 s" }] };
}
