import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import type { ProjectTemplate } from "./templateLibrary";

export const SOURCE_BACKED_DOL_TEMPLATE_ID = "source-backed-dol-starter";

/** A loadable library entry for the existing, source-identified and terminal-wired Siemens DOL example. */
export function createSourcedDolTemplate(): ProjectTemplate {
  const document = { ...createSourcedDolMotorStarter(), id: SOURCE_BACKED_DOL_TEMPLATE_ID };
  // The library's free sheet uses the normal symbol clearance rules.
  const positions: Record<string, [number, number]> = {
    supply: [390, 140], breaker: [390, 265], contactor: [390, 390],
    overload: [390, 515], motor: [390, 650], control: [800, 140],
    "control-psu": [1010, 220], stop: [760, 480], start: [1020, 480],
  };
  for (const component of document.components) [component.x, component.y] = positions[component.id];
  const running = [
    { reference: "KM1", label: "Starter contacts", exact: "CLOSED · 24 V coil" },
    { reference: "M1", label: "Nominal motor point", exact: "1470 rpm / 7.5 kW" },
  ];
  const stopped = [
    { reference: "KM1", label: "Starter contacts", exact: "OPEN" },
    { reference: "M1", label: "Nominal motor point", exact: "STANDBY" },
  ];
  const operatingSequence: NonNullable<ProjectTemplate["operatingSequence"]> = [
    { name: "Press START", durationSeconds: 0.1, changes: [{ reference: "S1", properties: { pressed: true } }], expectations: running },
    { name: "Release START; holding contact retains coil", durationSeconds: 0.1, changes: [{ reference: "S1", properties: { pressed: false } }], expectations: running },
    { name: "Press STOP", durationSeconds: 0.1, changes: [{ reference: "S0", properties: { pressed: true } }], expectations: stopped },
    { name: "Release STOP; motor remains stopped", durationSeconds: 0.1, changes: [{ reference: "S0", properties: { pressed: false } }], expectations: stopped },
    { name: "Trip overload", durationSeconds: 0.1, changes: [{ reference: "F1", properties: { tripped: true } }], expectations: stopped },
    { name: "Reset overload; no automatic restart", durationSeconds: 0.1, changes: [{ reference: "F1", properties: { tripped: false } }], expectations: stopped },
  ];
  const testSequence = operatingSequence.map((step) => step.name);
  return {
    id: SOURCE_BACKED_DOL_TEMPLATE_ID,
    name: "Siemens DOL starter · 7.5 kW",
    category: "Motor Control",
    level: "Intermediate",
    description: "Editable 400 V three-phase starter with a Siemens 5SY6332-7 breaker, 3RT2025-1BB40 contactor, 3RU2126-4AB0 overload, 1LE1003 motor, and 230 V AC / 24 V DC control supply. It has 9 identified devices and 22 terminal-to-terminal wires. Protection coordination and motor transients are not simulated.",
    testSequence,
    operatingSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" },
      { reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED · 3P / 32 A" },
      { reference: "KM1", label: "Starter contacts", valueIncludes: "OPEN" },
      { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
    ],
    document,
  };
}

