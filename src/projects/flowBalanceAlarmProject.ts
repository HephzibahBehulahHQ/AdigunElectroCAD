import type { ProjectTemplate } from "./templateLibrary";

export function createFlowBalanceAlarmProject(): ProjectTemplate {
  const id = "pulse-flow-balance-alarm";
  const name = "Pulse flow balance · flow loss alarm";
  const description = "Two equally calibrated pulse flow sensors feed a subtractor. A comparator energizes the alarm when inlet frequency exceeds outlet frequency by more than 5 Hz. The configured 60 pulses/L calibration makes this a 5 L/min imbalance threshold. The project models indicated flow and does not establish the cause of an imbalance.";
  const steps = [
    { name: "Balanced flow", outlet: 30, difference: 0, coil: "OFF" },
    { name: "Exactly at the threshold", outlet: 25, difference: 5, coil: "OFF" },
    { name: "Flow loss alarm", outlet: 24, difference: 6, coil: "ON" },
    { name: "Outlet exceeds inlet", outlet: 36, difference: -6, coil: "OFF" },
    { name: "Return to balance", outlet: 30, difference: 0, coil: "OFF" },
  ];
  return {
    id, name, description, category: "Analog Instrumentation", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "inlet", definitionId: "sensor.flow-pulse", reference: "B1", x: 160, y: 240, rotation: 0, properties: { flowLpm: 30, pulsesPerLitre: 60 } },
        { id: "outlet", definitionId: "sensor.flow-pulse", reference: "B2", x: 160, y: 480, rotation: 0, properties: { flowLpm: 30, pulsesPerLitre: 60 } },
        { id: "difference", definitionId: "logic.math-subtract", reference: "MTH1", x: 420, y: 360, rotation: 0, properties: { left: 0, right: 0 } },
        { id: "limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 650, y: 360, rotation: 0, properties: { left: 0, right: 5 } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "Q1", x: 880, y: 360, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "inlet-frequency", from: { componentId: "inlet", terminalId: "signal" }, to: { componentId: "difference", terminalId: "in-a" }, netName: "INLET_HZ", points: [] },
        { id: "outlet-frequency", from: { componentId: "outlet", terminalId: "signal" }, to: { componentId: "difference", terminalId: "in-b" }, netName: "OUTLET_HZ", points: [] },
        { id: "flow-difference", from: { componentId: "difference", terminalId: "out" }, to: { componentId: "limit", terminalId: "in-a" }, netName: "DIFFERENCE", points: [] },
        { id: "flow-alarm", from: { componentId: "limit", terminalId: "out" }, to: { componentId: "alarm", terminalId: "in" }, netName: "LOSS_ALARM", points: [] },
      ],
    },
    testSequence: steps.map(({ name, outlet, difference, coil }) =>
      `${name}. With B1 at 30 L/min, set B2 to ${outlet} L/min. Expect a ${difference} Hz difference and Q1 ${coil}.`,
    ),
    expectedOutputs: [
      { reference: "B1", label: "Pulse output", valueIncludes: "30.00 Hz" },
      { reference: "B2", label: "Pulse output", valueIncludes: "30.00 Hz" },
      { reference: "Q1", label: "Coil", valueIncludes: "OFF" },
    ],
    operatingSequence: steps.map(({ name, outlet, difference, coil }) => ({
      name, changes: [{ reference: "B2", properties: { flowLpm: outlet } }],
      expectations: [
        { reference: "B2", label: "Pulse output", exact: `${outlet.toFixed(2)} Hz` },
        { reference: "MTH1", label: "Math output", exact: String(difference) },
        { reference: "Q1", label: "Coil", exact: coil },
      ],
    })),
  };
}
