import { createSourcedDolMotorStarter } from "./sourcedDolMotorStarter";
import type { ProjectTemplate } from "./templateLibrary";

export const SOURCE_BACKED_DOL_TEMPLATE_ID = "source-backed-dol-starter";

/** A loadable library entry for the existing, source-identified and terminal-wired Siemens DOL example. */
export function createSourcedDolTemplate(): ProjectTemplate {
  const document = createSourcedDolMotorStarter();
  document.components.find((component) => component.reference === "M1")!.properties.energized = false;
  const testSequence = [
    "Inspect the 400 V three-phase path through Q1, KM1 and F1 to M1.",
    "Trace STOP, overload and START wiring to the 24 V DC contactor coil.",
    "Use the verified component controls to check continuity and the stopped motor state.",
  ];
  return {
    id: SOURCE_BACKED_DOL_TEMPLATE_ID,
    name: "Siemens DOL starter · 7.5 kW",
    category: "Motor Control",
    level: "Intermediate",
    description: "Editable 400 V three-phase starter with a Siemens 5SY6332-7 breaker, 3RT2025-1BB40 contactor, 3RU2126-4AB0 overload, 1LE1003 motor, and 230 V AC / 24 V DC control supply. It has 9 identified devices and 22 terminal-to-terminal wires. Protection coordination and motor transients are not simulated.",
    testSequence,
    expectedOutputs: [
      { reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" },
      { reference: "Q1", label: "Breaker path", valueIncludes: "CLOSED · 3P / 32 A" },
      { reference: "KM1", label: "Starter contacts", valueIncludes: "OPEN" },
      { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" },
    ],
    document,
  };
}
