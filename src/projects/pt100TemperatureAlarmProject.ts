import { pt100ResistanceOhm } from "../simulation/controlLogic";
import type { ProjectTemplate } from "./templateLibrary";

export function createPt100TemperatureAlarmProject(): ProjectTemplate {
  return {
    id: "pt100-temperature-window-alarm",
    name: "PT100 temperature window alarm",
    category: "Analog Instrumentation",
    level: "Advanced",
    description: "A nominal PT100 signal feeds independent low and high resistance comparators, each driving its own alarm coil. The 0 °C and 100 °C limits are editable comparator setpoints expressed in ohms.",
    document: {
      id: "pt100-temperature-window-alarm",
      name: "PT100 temperature window alarm",
      description: "Nominal PT100 resistance drives two Boolean alarm paths. This signal model does not simulate probe excitation, lead resistance, or an actuator supply.",
      revision: 1,
      components: [
        { id: "sensor", definitionId: "sensor.pt100", reference: "B1", x: 160, y: 340, rotation: 0, properties: { temperatureC: 20 } },
        { id: "low-limit", definitionId: "logic.comparator-less-than", reference: "CMP1", x: 420, y: 180, rotation: 0, properties: { left: 100, right: pt100ResistanceOhm(0) } },
        { id: "high-limit", definitionId: "logic.comparator-greater-than", reference: "CMP2", x: 420, y: 500, rotation: 0, properties: { left: 100, right: pt100ResistanceOhm(100) } },
        { id: "low-alarm", definitionId: "logic.output-coil", reference: "Q1", x: 720, y: 180, rotation: 0, properties: { input: false } },
        { id: "high-alarm", definitionId: "logic.output-coil", reference: "Q2", x: 720, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "sense-low", from: { componentId: "sensor", terminalId: "signal" }, to: { componentId: "low-limit", terminalId: "in-a" }, netName: "RTD_OHM", points: [] },
        { id: "sense-high", from: { componentId: "sensor", terminalId: "signal" }, to: { componentId: "high-limit", terminalId: "in-a" }, netName: "RTD_OHM", points: [] },
        { id: "alarm-low", from: { componentId: "low-limit", terminalId: "out" }, to: { componentId: "low-alarm", terminalId: "in" }, netName: "LOW_TEMP", points: [] },
        { id: "alarm-high", from: { componentId: "high-limit", terminalId: "out" }, to: { componentId: "high-alarm", terminalId: "in" }, netName: "HIGH_TEMP", points: [] },
      ],
    },
    testSequence: [
      "At 20 °C, both alarm coils are OFF.",
      "Change B1 to −10 °C. Q1 is ON and Q2 remains OFF.",
      "Change B1 to 110 °C. Q2 is ON and Q1 turns OFF.",
      "At exactly 0 °C or 100 °C, both alarms are OFF. Returning to 20 °C clears either alarm.",
    ],
    expectedOutputs: [
      { reference: "B1", label: "PT100 resistance", valueIncludes: "107.79 Ω" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
      { reference: "Q2", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: [
      { name: "Low temperature", temperatureC: -10, low: "ON", high: "OFF" },
      { name: "Lower boundary", temperatureC: 0, low: "OFF", high: "OFF" },
      { name: "Upper boundary", temperatureC: 100, low: "OFF", high: "OFF" },
      { name: "High temperature", temperatureC: 110, low: "OFF", high: "ON" },
      { name: "Return to normal", temperatureC: 20, low: "OFF", high: "OFF" },
    ].map(({ name, temperatureC, low, high }) => ({
      name,
      changes: [{ reference: "B1", properties: { temperatureC } }],
      expectations: [{ reference: "Q1", label: "Coil", exact: low }, { reference: "Q2", label: "Coil", exact: high }],
    })),
  };
}
