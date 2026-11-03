import type { CircuitDocument, ComponentInstance, Wire } from "../types/electrical";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createTwoMotorSequence(): CircuitDocument {
  const component = (id: string, definitionId: string, reference: string, x: number, y: number, properties: ComponentInstance["properties"]): ComponentInstance => ({ id, definitionId, reference, x, y, rotation: 0, properties });
  const components = [
    component("supply", "iec.ac-supply.01", "X1", 500, 140, { powerLayout: "vertical", outputEnabled: true, frequencyHz: 50, nominalVoltageV: 400 }),
    component("breaker", "iec.circuit-breaker.01", "Q1", 500, 260, { powerLayout: "vertical", closed: true, nominalVoltageV: 400, ratedCurrentA: 32, poles: 3 }),
    component("km1", "iec.motor-starter.01", "KM1", 300, 380, { powerLayout: "vertical", energized: false, nominalVoltageV: 400, ratedCurrentA: 18, coilVoltageV: 24 }),
    component("km2", "iec.motor-starter.01", "KM2", 700, 380, { powerLayout: "vertical", energized: false, nominalVoltageV: 400, ratedCurrentA: 18, coilVoltageV: 24 }),
    component("f1", "overload.thermal", "F1", 300, 500, { powerLayout: "vertical", tripped: false, settingA: 15.2 }),
    component("f2", "overload.thermal", "F2", 700, 500, { powerLayout: "vertical", tripped: false, settingA: 15.2 }),
    component("m1", "iec.induction-motor.01", "M1", 300, 660, { powerLayout: "vertical", energized: true, nominalVoltageV: 400, ratedCurrentA: 15.2, ratedPowerKw: 7.5, nominalSpeedRpm: 1440 }),
    component("m2", "iec.induction-motor.01", "M2", 700, 660, { powerLayout: "vertical", energized: true, nominalVoltageV: 400, ratedCurrentA: 15.2, ratedPowerKw: 7.5, nominalSpeedRpm: 1440 }),
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
  connect("f2", "aux-96", "overloads", "in-b", [{ x: 770, y: 500 }, { x: 770, y: 600 }, { x: 20, y: 600 }, { x: 20, y: 652 }]);
  connect("overloads", "out", "master", "in-a", [{ x: 180, y: 640 }, { x: 180, y: 620 }, { x: 430, y: 620 }, { x: 430, y: 628 }]);
  connect("breaker", "aux-closed", "master", "in-b", [{ x: 590, y: 260 }, { x: 590, y: 620 }, { x: 430, y: 620 }, { x: 430, y: 652 }]);
  connect("master", "out", "fault", "in-a", [{ x: 570, y: 640 }, { x: 570, y: 620 }, { x: 880, y: 620 }, { x: 880, y: 680 }]);
  connect("fault", "out", "stop-or-fault", "in-b", [{ x: 1030, y: 680 }, { x: 1030, y: 615 }, { x: 880, y: 615 }, { x: 880, y: 552 }]);
  connect("stop", "out", "stop-or-fault", "in-a", [{ x: 180, y: 300 }, { x: 180, y: 340 }, { x: 880, y: 340 }, { x: 880, y: 528 }]);
  connect("stop-or-fault", "out", "plc", "in-1", [{ x: 1030, y: 540 }, { x: 1030, y: 760 }, { x: 10, y: 760 }, { x: 10, y: 460 }]);
  connect("plc", "out-0", "run", "in-a", [{ x: 180, y: 460 }, { x: 180, y: 333 }, { x: 880, y: 333 }, { x: 880, y: 348 }]);
  connect("master", "out", "run", "in-b", [{ x: 570, y: 640 }, { x: 570, y: 580 }, { x: 850, y: 580 }, { x: 850, y: 372 }]);
  connect("run", "out", "km1", "a1", [{ x: 1050, y: 360 }, { x: 1050, y: 460 }, { x: 230, y: 460 }, { x: 230, y: 368 }]);
  connect("run", "out", "timer", "a1", [{ x: 1030, y: 360 }, { x: 1030, y: 300 }, { x: 880, y: 300 }, { x: 880, y: 188 }]);
  connect("run", "out", "second", "in-b", [{ x: 1040, y: 360 }, { x: 1040, y: 280 }, { x: 680, y: 280 }, { x: 680, y: 212 }]);
  connect("timer", "18", "second", "in-a", [{ x: 1030, y: 200 }, { x: 1030, y: 100 }, { x: 670, y: 100 }, { x: 670, y: 188 }]);
  connect("second", "out", "km2", "a1", [{ x: 820, y: 200 }, { x: 820, y: 310 }, { x: 630, y: 310 }, { x: 630, y: 368 }]);
  return { id: "two-motor-sequence", name: "Two-motor staggered starter", description: "Two actual three-phase branches, NC overload permits, breaker-state feedback, fresh-edge START and a 3-second second-motor delay. Boolean control and nominal motor models; no thermal trip curve or mechanical acceleration calculation.", revision: 1, components, wires };
}

export function createTwoMotorTemplate(): ProjectTemplate {
  const step = (name: string, durationSeconds: number, changes: CircuitSequenceStep["changes"], m1: boolean, m2: boolean): CircuitSequenceStep => ({ name, durationSeconds, changes, expectations: [
    { reference: "M1", label: "Nominal motor point", exact: m1 ? "1440 rpm / 7.5 kW" : "STANDBY" },
    { reference: "M2", label: "Nominal motor point", exact: m2 ? "1440 rpm / 7.5 kW" : "STANDBY" },
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
  return { id: "two-motor-sequence", name: "Two-motor staggered starter", category: "Motor Control", level: "Advanced", description: "M1 starts on a fresh START edge; M2 follows after 3 seconds. STOP, Q1 opening or either overload removes the shared run permit. Restoration requires a released and newly pressed START.", document: createTwoMotorSequence(), operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [{ reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" }, { reference: "M2", label: "Nominal motor point", valueIncludes: "STANDBY" }, { reference: "T1", label: "Timer contact", valueIncludes: "0.0 / 3.0 s" }] };
}
