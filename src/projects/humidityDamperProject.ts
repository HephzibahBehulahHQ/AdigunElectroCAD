import type { ProjectTemplate } from "./templateLibrary";

export function createHumidityDamperProject(): ProjectTemplate {
  const id = "humidity-ventilation-damper";
  const name = "Humidity ventilation · damper travel and proof";
  const description = "A wired humidistat opens the damper at 62% relative humidity and releases at 58%. The actuator moves at 10 percentage points per second. A comparator asserts a proof coil only above 50% travel. This example models control signals and actuator position.";
  const steps = [
    { name: "Below demand", humidity: 55, seconds: 1, position: 0, proof: "OFF" },
    { name: "Demand opens the damper gradually", humidity: 65, seconds: 3, position: 30, proof: "OFF" },
    { name: "Exact proof threshold remains off", humidity: 65, seconds: 2, position: 50, proof: "OFF" },
    { name: "Demand persists inside the deadband", humidity: 60, seconds: 2, position: 70, proof: "ON" },
    { name: "Release closes the damper and drops proof", humidity: 55, seconds: 3, position: 40, proof: "OFF" },
    { name: "Travel stops at fully closed", humidity: 55, seconds: 5, position: 0, proof: "OFF" },
  ];
  const invalidTravel = "ERROR: Damper travel time must be finite and positive.";
  return {
    id, name, description, category: "Process Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "humidity", definitionId: "hvac.humidistat", reference: "HU1", x: 150, y: 320, rotation: 0, properties: { humidityPercent: 55, setpointPercent: 60, hysteresisPercent: 4 } },
        { id: "damper", definitionId: "hvac.damper", reference: "DA1", x: 380, y: 320, rotation: 0, properties: { positionPercent: 0, commandPercent: 0, travelSeconds: 10 } },
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
    testSequence: [...steps.map(({ name, humidity, seconds, position, proof }) => `${name}. Set HU1 to ${humidity}% for ${seconds} s. Expect DA1 at ${position}% and K1 ${proof}.`),
      "Set DA1 travel time to zero. Expect a damper fault and unavailable proof signal."],
    operatingSequence: [...steps.map(({ name, humidity, seconds, position, proof }) => ({
      name, durationSeconds: seconds, changes: [{ reference: "HU1", properties: { humidityPercent: humidity } }],
      expectations: [{ reference: "DA1", label: "Damper position", exact: `${position.toFixed(1)}%` }, { reference: "K1", label: "Coil", exact: proof }],
    })), {
      name: "Invalid travel time inhibits position proof", durationSeconds: 1,
      changes: [{ reference: "DA1", properties: { travelSeconds: 0 } }],
      expectations: [{ reference: "DA1", label: "Damper position", exact: invalidTravel }, { reference: "K1", label: "Signal fault", exact: invalidTravel }],
    }],
  };
}
