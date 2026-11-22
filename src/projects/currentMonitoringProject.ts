import type { ProjectTemplate } from "./templateLibrary";

export function createCurrentMonitoringProject(): ProjectTemplate {
  const id = "ct-secondary-current-monitoring";
  const name = "CT metering and high-current indication";
  const description = "An ideal 100:5 current transformer feeds a panel meter and a high-current comparator. The indication operates above 80 A of entered primary current, equivalent to 4 A at the secondary. The project uses a manually entered primary current and models instrumentation signals.";
  const samples = [
    { name: "At 50 A primary, check 2.5 A secondary and indication OFF.", primaryA: 50, ratedPrimaryA: 100, secondary: 2.5, indication: "OFF" },
    { name: "At exactly 80 A primary, the indication stays OFF.", primaryA: 80, ratedPrimaryA: 100, secondary: 4, indication: "OFF" },
    { name: "At 100 A primary, the meter reads 5 A and the indication turns ON.", primaryA: 100, ratedPrimaryA: 100, secondary: 5, indication: "ON" },
    { name: "Set the primary rating to zero. Both wired destinations report the calibration fault.", primaryA: 100, ratedPrimaryA: 0, secondary: 0, indication: "OFF" },
    { name: "Restore the ratio and lower primary current to zero. Both outputs recover.", primaryA: 0, ratedPrimaryA: 100, secondary: 0, indication: "OFF" },
  ];
  const invalidRating = "ERROR: CT primary rating must be finite and positive.";
  const operatingSequence = samples.map(({ name, primaryA, ratedPrimaryA, secondary, indication }) => ({
    name,
    changes: [{ reference: "TA1", properties: { primaryA, ratedPrimaryA } }],
    expectations: ratedPrimaryA === 0 ? [
      { reference: "TA1", label: "CT secondary", exact: invalidRating },
      { reference: "P1", label: "Signal fault", exact: invalidRating },
      { reference: "K1", label: "Signal fault", exact: invalidRating },
    ] : [
      { reference: "TA1", label: "CT secondary", exact: secondary.toFixed(3) + " A" },
      { reference: "P1", label: "Current reading", exact: secondary + " / 5" },
      { reference: "K1", label: "Coil", exact: indication },
    ],
  }));
  return {
    id, name, description, category: "Analog Instrumentation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ct", definitionId: "sensor.current-transformer", reference: "TA1", x: 155, y: 350, rotation: 0, properties: { primaryA: 50, ratedPrimaryA: 100 } },
        { id: "meter", definitionId: "iec.panel-meter.01", reference: "P1", x: 510, y: 190, rotation: 0, properties: { measurementKind: "Current", measuredValue: 0, scaleMaximum: 5 } },
        { id: "limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 510, y: 435, rotation: 0, properties: { left: 0, right: 4 } },
        { id: "indicator", definitionId: "logic.output-coil", reference: "K1", x: 810, y: 435, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "meter-secondary", from: { componentId: "ct", terminalId: "signal" }, to: { componentId: "meter", terminalId: "signal" }, points: [{ x: 390, y: 350 }, { x: 390, y: 125 }, { x: 615, y: 125 }, { x: 615, y: 190 }], netName: "CT_SECONDARY_A" },
        { id: "high-current-secondary", from: { componentId: "ct", terminalId: "signal" }, to: { componentId: "limit", terminalId: "in-a" }, points: [], netName: "CT_SECONDARY_A" },
        { id: "high-current-indication", from: { componentId: "limit", terminalId: "out" }, to: { componentId: "indicator", terminalId: "in" }, points: [], netName: "CURRENT_HIGH" },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "TA1", label: "CT secondary", valueIncludes: "2.500 A" },
      { reference: "P1", label: "Current reading", valueIncludes: "2.5 / 5" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
