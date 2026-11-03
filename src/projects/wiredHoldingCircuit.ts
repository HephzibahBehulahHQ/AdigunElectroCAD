import { createDolMotorStarter } from "./dolMotorStarter";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createWiredHoldingTemplate(): ProjectTemplate {
  const document = createDolMotorStarter();
  document.id = "wired-holding-control";
  document.name = "Wired START/STOP holding starter";
  document.description = "Isolated 230 V ideal control source, actual return and holding wires, manual overload contact and three-phase motor feed. Nominal coil voltage only; no pickup curve or thermal integration.";
  const positions: Record<string, [number, number]> = { supply: [320, 140], breaker: [320, 260], contactor: [320, 380], overload: [320, 520], motor: [320, 680], control: [100, 140], stop: [600, 180], start: [800, 180] };
  for (const c of document.components) {
    [c.x, c.y] = positions[c.id];
    if (["supply", "breaker", "contactor", "overload", "motor"].includes(c.id)) c.properties.powerLayout = "vertical";
    if (c.id === "supply") { c.definitionId = "iec.ac-supply.05"; Object.assign(c.properties, { outputEnabled: true, nominalVoltageV: 400, frequencyHz: 50 }); }
    if (c.id === "breaker") { c.definitionId = "iec.circuit-breaker.05"; c.properties.closed = true; }
    if (c.id === "motor") { c.definitionId = "iec.induction-motor.05"; Object.assign(c.properties, { energized: true, nominalVoltageV: 400, ratedCurrentA: 14.1, nominalSpeedRpm: 1440, ratedPowerKw: 7.5, ratedFrequencyHz: 50 }); }
  }
  for (const w of document.wires) {
    if (w.from.componentId === "supply" && /^l[123]$/.test(w.from.terminalId)) w.from.terminalId += "-out";
    const paths: Record<string, Array<{ x: number; y: number }>> = {
      w2: [{ x: 340, y: 177 }, { x: 340, y: 217 }, { x: 320, y: 217 }],
      w5: [{ x: 340, y: 297 }, { x: 340, y: 337 }, { x: 320, y: 337 }],
      w8: [{ x: 340, y: 417 }, { x: 340, y: 477 }, { x: 320, y: 477 }],
      w11: [{ x: 340, y: 557 }, { x: 340, y: 617 }, { x: 320, y: 617 }],
      w13: [{ x: 400, y: 140 }, { x: 400, y: 680 }],
      w14: [{ x: 147, y: 100 }, { x: 553, y: 100 }],
      w15: [{ x: 680, y: 180 }, { x: 680, y: 610 }, { x: 240, y: 610 }, { x: 240, y: 520 }],
      w16: [{ x: 720, y: 520 }, { x: 720, y: 180 }],
      w17: [{ x: 920, y: 180 }, { x: 920, y: 340 }, { x: 250, y: 340 }, { x: 250, y: 368 }],
      w18: [{ x: 180, y: 152 }, { x: 180, y: 760 }, { x: 240, y: 760 }, { x: 240, y: 392 }],
      w19: [{ x: 430, y: 520 }, { x: 430, y: 368 }],
      w20: [{ x: 450, y: 392 }, { x: 450, y: 470 }, { x: 220, y: 470 }, { x: 220, y: 368 }],
    };
    if (paths[w.id]) w.points = paths[w.id];
  }
  const step = (name: string, changes: CircuitSequenceStep["changes"], on: boolean): CircuitSequenceStep => ({ name, durationSeconds: .1, changes, expectations: [{ reference: "M1", label: "Nominal motor point", exact: on ? "1440 rpm / 7.5 kW" : "STANDBY" }] });
  const operatingSequence = [
    step("Press START", [{ reference: "S1", properties: { pressed: true } }], true),
    step("Release START; wired auxiliary holds", [{ reference: "S1", properties: { pressed: false } }], true),
    step("Press STOP", [{ reference: "S0", properties: { pressed: true } }], false),
    step("Release STOP; no automatic restart", [{ reference: "S0", properties: { pressed: false } }], false),
    step("Press START again", [{ reference: "S1", properties: { pressed: true } }], true),
    step("Release START again", [{ reference: "S1", properties: { pressed: false } }], true),
    step("Trip overload", [{ reference: "F1", properties: { tripped: true } }], false),
    step("Reset overload; no automatic restart", [{ reference: "F1", properties: { tripped: false } }], false),
  ];
  return { id: document.id, name: document.name, description: document.description, category: "Motor Control", level: "Intermediate", document, operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [{ reference: "KM1", label: "Wired control coil", valueIncludes: "0 V · OFF" }, { reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" }] };
}
