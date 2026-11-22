import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createHumidityDamperProject(): ProjectTemplate {
  const id = "humidity-ventilation-damper";
  const name = "Humidity ventilation · damper travel and proof";
  const description = "A wired humidistat opens the damper at 62% relative humidity and releases at 58%. The actuator moves at 10 percentage points per second. A comparator asserts a proof coil only above 50% travel. This example models control signals and actuator position.";
  const humidityStep = (name: string, humidityPercent: number, durationSeconds: number, position: string, proof: string): CircuitSequenceStep => ({
    name, durationSeconds, changes: [{ reference: "HU1", properties: { humidityPercent } }],
    expectations: [
      { reference: "DA1", label: "Damper position", exact: position },
      { reference: "K1", label: "Coil", exact: proof },
    ],
  });
  const invalidHumidity = "ERROR: Humidity and setpoint must be between 0 and 100 percent.";
  const invalidTravel = "ERROR: Damper travel time must be finite and positive.";
  const operatingSequence: CircuitSequenceStep[] = [
    humidityStep("Set HU1 to 55% for 1 s. Verify DA1 at 0% and proof OFF.", 55, 1, "0.0%", "OFF"),
    humidityStep("Set HU1 to 65% for 3 s. Verify gradual travel to 30% and proof OFF.", 65, 3, "30.0%", "OFF"),
    humidityStep("Hold HU1 at 65% for 2 s. At exactly 50%, proof stays OFF.", 65, 2, "50.0%", "OFF"),
    humidityStep("Set HU1 to 60% for 2 s. Retained demand moves DA1 to 70% and proof turns ON.", 60, 2, "70.0%", "ON"),
    {
      name: "Set HU1 humidity to 101% for 2 s. Verify a humidity fault and unavailable proof.",
      durationSeconds: 2,
      changes: [{ reference: "HU1", properties: { humidityPercent: 101 } }],
      expectations: [
        { reference: "HU1", label: "Humidistat", exact: invalidHumidity },
        { reference: "K1", label: "Signal fault", exact: invalidHumidity },
      ],
    },
    humidityStep("Restore HU1 to 60% for 1 s. DA1 resumes from 70%, reaches 80%, and proof returns.", 60, 1, "80.0%", "ON"),
    humidityStep("Lower HU1 to 55% for 3 s. DA1 returns to 50% and proof switches OFF.", 55, 3, "50.0%", "OFF"),
    humidityStep("Hold HU1 at 55% for 5 s. DA1 stops at 0% and proof remains OFF.", 55, 5, "0.0%", "OFF"),
    {
      name: "Set DA1 travel time to zero. Verify an actuator fault and unavailable proof.",
      durationSeconds: 1,
      changes: [{ reference: "DA1", properties: { travelSeconds: 0 } }],
      expectations: [
        { reference: "DA1", label: "Damper position", exact: invalidTravel },
        { reference: "K1", label: "Signal fault", exact: invalidTravel },
      ],
    },
  ];
  return {
    id, name, description, category: "Process Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "humidity", definitionId: "hvac.humidistat", reference: "HU1", x: 150, y: 320, rotation: 0, properties: { humidityPercent: 55, setpointPercent: 60, hysteresisPercent: 4 } },
        { id: "damper", definitionId: "hvac.damper", reference: "DA1", x: 380, y: 320, rotation: 0, properties: { positionPercent: 0, commandPercent: 0, travelSeconds: 10, requireWiredCommand: true } },
        { id: "proof", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 610, y: 320, rotation: 0, properties: { left: 0, right: 50 } },
        { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 840, y: 320, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "humidity-demand", netName: "OPEN_DEMAND", from: { componentId: "humidity", terminalId: "out" }, to: { componentId: "damper", terminalId: "in" }, points: [] },
        { id: "damper-feedback", netName: "POSITION_PERCENT", from: { componentId: "damper", terminalId: "out" }, to: { componentId: "proof", terminalId: "in-a" }, points: [] },
        { id: "damper-proof", netName: "OPEN_PROOF", from: { componentId: "proof", terminalId: "out" }, to: { componentId: "coil", terminalId: "in" }, points: [] },
      ],
    },
    expectedOutputs: [
      { reference: "HU1", label: "Humidistat", valueIncludes: "OFF" },
      { reference: "DA1", label: "Damper position", valueIncludes: "0.0%" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
  };
}
