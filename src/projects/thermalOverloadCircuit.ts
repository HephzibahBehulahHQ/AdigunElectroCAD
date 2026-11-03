import { createWiredHoldingTemplate } from "./wiredHoldingCircuit";
import type { ProjectTemplate } from "./templateLibrary";

export function createThermalOverloadTemplate(): ProjectTemplate {
  const template = createWiredHoldingTemplate();
  const id = "current-driven-thermal-overload";
  const name = "Current-driven thermal overload";
  const description = "A 14.1 A nominal motor feeds a 7.05 A educational relay: cold trip in 2.88 s, retained heat, 20 s cooling constant and manual cool reset. Deliberately low setting demonstrates overload; no certified trip curve or motor transient model.";
  Object.assign(template.document, { id, name, description });
  Object.assign(template.document.components.find(c => c.id === "overload")!.properties, { thermalEnabled: true, settingA: 7.05, overloadFactor: 1, heatingTimeSeconds: 10, coolingTimeSeconds: 20, resetLevel: .5, reset: false });
  const operatingSequence = [
    { name: "Press START", durationSeconds: .1, changes: [{ reference: "S1", properties: { pressed: true } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "1440 rpm / 7.5 kW" }] },
    { name: "Release START and run to the current-driven trip", durationSeconds: 3, changes: [{ reference: "S1", properties: { pressed: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
    { name: "Hot reset is rejected; held reset does not auto-reset while cooling", durationSeconds: 20, changes: [{ reference: "F1", properties: { reset: true } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
    { name: "Release reset", durationSeconds: 0, changes: [{ reference: "F1", properties: { reset: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
    { name: "Fresh cool reset does not restart the motor", durationSeconds: 0, changes: [{ reference: "F1", properties: { reset: true } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
    { name: "Restart with retained heat", durationSeconds: .1, changes: [{ reference: "S1", properties: { pressed: true } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "1440 rpm / 7.5 kW" }] },
    { name: "Warm overload trips sooner", durationSeconds: 2.5, changes: [{ reference: "S1", properties: { pressed: false } }], expectations: [{ reference: "M1", label: "Nominal motor point", exact: "STANDBY" }] },
  ];
  return { ...template, id, name, description, level: "Advanced", operatingSequence, testSequence: operatingSequence.map(s => s.name), expectedOutputs: [{ reference: "X1", label: "Nominal supply", valueIncludes: "400 V / 50 Hz" }, { reference: "F1", label: "Thermal overload", valueIncludes: "0.00 A · 0.0% heat · READY" }, { reference: "M1", label: "Nominal motor point", valueIncludes: "STANDBY" }] };
}
