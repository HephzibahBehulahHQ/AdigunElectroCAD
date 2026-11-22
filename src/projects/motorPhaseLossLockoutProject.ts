import { createWiredHoldingTemplate } from "./wiredHoldingCircuit";
import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createMotorPhaseLossLockoutProject(): ProjectTemplate {
  const template = createWiredHoldingTemplate();
  const id = "motor-phase-loss-lockout";
  const name = "Motor phase-loss lockout and reset";
  const description = "A broken W1 feeder connection invalidates the balanced current model, latches the overload relay and drops the wired holding contactor. Restoring the connection alone leaves the motor stopped until reset and a fresh START.";
  const document = { ...template.document, id, name, description };
  const overload = document.components.find(({ id }) => id === "overload")!;
  Object.assign(overload.properties, {
    thermalEnabled: true, settingA: 16, overloadFactor: 1, heatingTimeSeconds: 10,
    coolingTimeSeconds: 20, resetLevel: .5, reset: false,
  });
  const { from, to } = document.wires.find(({ id }) => id === "w12")!;
  const motor = (running: boolean) => ({ reference: "M1", label: "Nominal motor point", exact: running ? "1440 rpm / 7.5 kW" : "STANDBY" });
  const fault = { reference: "F1", label: "Signal fault", exact: "ERROR: M1 does not have three distinct phases from one supply; unbalanced winding current is unavailable." };
  const step = (name: string, changes: CircuitSequenceStep["changes"], running: boolean): CircuitSequenceStep => ({
    name, durationSeconds: .1, changes, expectations: [motor(running)],
  });
  const operatingSequence: CircuitSequenceStep[] = [
    step("Press START with all three phases present.", [{ reference: "S1", properties: { pressed: true } }], true),
    step("Release START. The holding contact keeps the motor running.", [{ reference: "S1", properties: { pressed: false } }], true),
    {
      ...step("Open the W1 feeder wire. The current-model fault trips F1 and releases KM1.", [], false),
      wireChanges: [{ from, to, connected: false }],
      expectations: [motor(false), fault, { reference: "KM1", label: "Wired control coil", exact: "0 V · OFF" }],
    },
    {
      ...step("Restore W1. The relay stays latched and the motor stays stopped.", [], false),
      wireChanges: [{ from, to, connected: true }],
      expectations: [motor(false), fault],
    },
    step("Issue a fresh RESET with the motor stopped. The fault clears with no restart.", [{ reference: "F1", properties: { reset: true } }], false),
    step("Release RESET and press START. The repaired feeder runs again.", [{ reference: "F1", properties: { reset: false } }, { reference: "S1", properties: { pressed: true } }], true),
  ];
  return {
    ...template, id, name, description, document, level: "Advanced",
    operatingSequence, testSequence: operatingSequence.map(({ name }) => name),
  };
}
