import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createDehumidifierLockoutProject(): ProjectTemplate {
  const id = "dehumidifier-cold-lockout";
  const name = "Dehumidifier low-temperature lockout";
  const description = "A wired humidistat calls for dehumidification at 62% RH and releases at 58%. A separate thermostat inhibits the command at 8 °C and clears at 10 °C. The PLC indicates demand blocked by low temperature on a second output. This example models control signals and hysteresis.";
  const fault = "ERROR: Humidity and setpoint must be between 0 and 100 percent.";
  const cases = [
    { name: "Begin in a warm, dry room.", humidityPercent: 55, temperatureC: 12, run: "OFF", blocked: "OFF" },
    { name: "Raise humidity to 62%. Start dehumidification.", humidityPercent: 62, temperatureC: 12, run: "ON", blocked: "OFF" },
    { name: "Cool to 8 °C. Inhibit dehumidification and indicate blocked demand.", humidityPercent: 62, temperatureC: 8, run: "OFF", blocked: "ON" },
    { name: "Warm to 9 °C and lower humidity to 60%. Both retained states hold.", humidityPercent: 60, temperatureC: 9, run: "OFF", blocked: "ON" },
    { name: "Warm to 10 °C. Resume the retained humidity demand.", humidityPercent: 60, temperatureC: 10, run: "ON", blocked: "OFF" },
    { name: "Dry to 58%. Release humidity demand.", humidityPercent: 58, temperatureC: 10, run: "OFF", blocked: "OFF" },
    { name: "Cool again with no humidity demand. The blocked-demand output stays off.", humidityPercent: 60, temperatureC: 8, run: "OFF", blocked: "OFF" },
    { name: "Raise humidity while cold. Indicate blocked demand without starting.", humidityPercent: 65, temperatureC: 8, run: "OFF", blocked: "ON" },
    { name: "Enter an invalid humidity reading. Both outputs report a signal fault.", humidityPercent: 101, temperatureC: 8, run: fault, blocked: fault },
    { name: "Restore valid humidity and warm the room. Resume dehumidification.", humidityPercent: 65, temperatureC: 10, run: "ON", blocked: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, humidityPercent, temperatureC, run, blocked }): CircuitSequenceStep => ({
    name,
    durationSeconds: .2,
    changes: [{ reference: "HU1", properties: { humidityPercent } }, { reference: "TH1", properties: { temperatureC } }],
    expectations: [
      { reference: "K1", label: run === fault ? "Signal fault" : "Coil", exact: run },
      { reference: "K2", label: blocked === fault ? "Signal fault" : "Coil", exact: blocked },
    ],
  }));
  return {
    id, name, description, category: "HVAC", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "humidity", definitionId: "hvac.humidistat", reference: "HU1", x: 165, y: 220, rotation: 0, properties: { humidityPercent: 55, setpointPercent: 60, hysteresisPercent: 4, previous: false, enabled: true } },
        { id: "temperature", definitionId: "hvac.thermostat", reference: "TH1", x: 165, y: 500, rotation: 0, properties: { temperatureC: 12, setpointC: 9, hysteresisC: 2, previous: false, enabled: true } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LD I0; ANDN I1; OUT Q0; LD I0; AND I1; OUT Q1",
        } },
        { id: "dehumidify", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "blocked", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "humidity-i0", netName: "HUMIDITY_DEMAND", from: { componentId: "humidity", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "temperature-i1", netName: "LOW_TEMPERATURE", from: { componentId: "temperature", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-1" }, points: [] },
        { id: "dehumidify-q0", netName: "DEHUMIDIFY_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "dehumidify", terminalId: "in" }, points: [] },
        { id: "blocked-q1", netName: "HUMIDITY_DEMAND_BLOCKED", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "blocked", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 OFF · Q1 OFF" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
