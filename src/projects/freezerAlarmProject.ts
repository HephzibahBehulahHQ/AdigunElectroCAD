import type { CircuitSequenceStep } from "./templateVerification";
import type { ProjectTemplate } from "./templateLibrary";

export function createFreezerAlarmProject(): ProjectTemplate {
  const id = "cold-room-freeze-alarm";
  const name = "Cold-room freeze alarm with maintenance inhibit";
  const description = "A low-temperature thermostat and a maintenance permit drive a freeze alarm. The alarm enters at 2 °C and clears at 4 °C. Opening the permit silences the alarm without resetting temperature demand. Temperature is an editable input.";
  const step = (name: string, changes: CircuitSequenceStep["changes"], demand: boolean, alarm = demand): CircuitSequenceStep => ({
    name, changes, durationSeconds: 0.1,
    expectations: [
      { reference: "TH1", label: "Thermostat", exact: demand ? "ON" : "OFF" },
      { reference: "G1", label: "AND output", exact: alarm ? "ON" : "OFF" },
      { reference: "K1", label: "Coil", exact: alarm ? "ON" : "OFF" },
    ],
  });
  const temperature = (temperatureC: number) => [{ reference: "TH1", properties: { temperatureC } }];
  const permit = (input: boolean) => [{ reference: "S1", properties: { input } }];
  const operatingSequence = [
    step("Start with the room above the clear point", [], false),
    step("Cool to 2 °C and activate the alarm", temperature(2), true),
    step("Warm to 3 °C and retain the alarm", temperature(3), true),
    step("Open the maintenance permit to silence the alarm", permit(false), true, false),
    step("Restore the permit and recover the retained alarm", permit(true), true),
    step("Warm to 4 °C and clear the alarm", temperature(4), false),
    step("Return to 3 °C without restarting the alarm", temperature(3), false),
  ];
  return {
    id, name, description, category: "HVAC", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "thermostat", definitionId: "hvac.thermostat", reference: "TH1", x: 180, y: 245, rotation: 0, properties: { temperatureC: 5, setpointC: 3, hysteresisC: 2, previous: false, enabled: true } },
        { id: "permit", definitionId: "logic.no-contact", reference: "S1", x: 180, y: 465, rotation: 0, properties: { input: true } },
        { id: "gate", definitionId: "logic.gate-and", reference: "G1", x: 490, y: 355, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "K1", x: 790, y: 355, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "low-temperature", from: { componentId: "thermostat", terminalId: "out" }, to: { componentId: "gate", terminalId: "in-a" }, points: [], netName: "FREEZE_DEMAND" },
        { id: "maintenance-permit", from: { componentId: "permit", terminalId: "out" }, to: { componentId: "gate", terminalId: "in-b" }, points: [], netName: "ALARM_PERMIT" },
        { id: "alarm-command", from: { componentId: "gate", terminalId: "out" }, to: { componentId: "alarm", terminalId: "in" }, points: [], netName: "FREEZE_ALARM" },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: operatingSequence[0].expectations.map(({ reference, label, exact }) => ({ reference, label, valueIncludes: exact! })),
  };
}
