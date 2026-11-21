import type { ProjectTemplate } from "./templateLibrary";

export function createTypeKThermocoupleAlarmProject(): ProjectTemplate {
  const id = "type-k-terminal-emf-alarm";
  const name = "Type K terminal EMF alarm";
  const description = "A Type K measuring junction drives a high-EMF alarm through an editable 20.6 mV setpoint. Change the reference junction to see how it affects the alarm. The project models terminal EMF and a Boolean alarm command.";
  const operatingSequence = [
    { name: "Normal reading at 100 °C with a 0 °C reference", temperatureC: 100, referenceJunctionC: 0, emf: "4.096 mV", alarm: "OFF" },
    { name: "At 500 °C with a 0 °C reference, exceed the 20.6 mV setpoint", temperatureC: 500, referenceJunctionC: 0, emf: "20.644 mV", alarm: "ON" },
    { name: "Warm the reference junction to 100 °C with the measuring junction still at 500 °C", temperatureC: 500, referenceJunctionC: 100, emf: "16.548 mV", alarm: "OFF" },
    { name: "Return the reference junction to 0 °C and recover the alarm", temperatureC: 500, referenceJunctionC: 0, emf: "20.644 mV", alarm: "ON" },
    { name: "Cool the measuring junction to 100 °C to clear the alarm", temperatureC: 100, referenceJunctionC: 0, emf: "4.096 mV", alarm: "OFF" },
  ].map(({ name, temperatureC, referenceJunctionC, emf, alarm }) => ({
    name,
    changes: [{ reference: "B1", properties: { temperatureC, referenceJunctionC } }],
    expectations: [
      { reference: "B1", label: "Type K terminal EMF", exact: emf },
      { reference: "Q1", label: "Coil", exact: alarm },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "probe", definitionId: "sensor.thermocouple", reference: "B1", x: 180, y: 360, rotation: 0, properties: { temperatureC: 100, referenceJunctionC: 0 } },
        { id: "limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 480, y: 360, rotation: 0, properties: { left: 0, right: 20.6 } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "Q1", x: 780, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "probe-emf", from: { componentId: "probe", terminalId: "signal" }, to: { componentId: "limit", terminalId: "in-a" }, netName: "TYPE_K_MV", points: [] },
        { id: "high-alarm", from: { componentId: "limit", terminalId: "out" }, to: { componentId: "alarm", terminalId: "in" }, netName: "HIGH_EMF", points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "Type K terminal EMF", valueIncludes: "4.096 mV" },
      { reference: "CMP1", label: "Comparator", valueIncludes: "OFF" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
