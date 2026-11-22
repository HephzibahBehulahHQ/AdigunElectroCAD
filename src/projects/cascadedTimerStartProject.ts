import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createCascadedTimerStartProject(): ProjectTemplate {
  const id = "dc-cascaded-timer-start";
  const name = "Cascaded timer staged start";
  const description = "A 24 V DC supply powers two on-delay timers. The first timed contact lights the first stage pilot and feeds the second coil. The second stage lights only after its own delay. Interrupting the second coil return leaves the first stage running and resets the second delay.";
  const secondReturn = { from: { componentId: "second-timer", terminalId: "a2" }, to: { componentId: "dc", terminalId: "zero-out" } };
  const cases = [
    { name: "Start with the command released. Both stages are off.", pressed: false, seconds: .1, first: false, second: false },
    { name: "Hold START for half a second. Neither stage is ready.", pressed: true, seconds: .5, first: false, second: false },
    { name: "At one second the first stage lights and enables the second timer.", pressed: true, seconds: .5, first: true, second: false },
    { name: "One second into the second delay, only stage one is lit.", pressed: true, seconds: 1, first: true, second: false },
    { name: "At two seconds into the second delay, both stages are lit.", pressed: true, seconds: 1, first: true, second: true },
    { name: "Open the second coil return. Stage one stays lit.", pressed: true, seconds: .1, connected: false, first: true, second: false },
    { name: "Reconnect the return. Stage two remains off during its fresh delay.", pressed: true, seconds: 1, connected: true, first: true, second: false },
    { name: "Complete the fresh second delay.", pressed: true, seconds: 1, first: true, second: true },
    { name: "Release START and reset both stages.", pressed: false, seconds: .1, first: false, second: false },
  ];
  const operatingSequence = cases.map(({ name, pressed, seconds, first, second, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { pressed } }],
    wireChanges: connected === undefined ? undefined : [{ ...secondReturn, connected }],
    expectations: [
      { reference: "H1", label: "Indicator lamp", exact: first ? "LIT · 24 V DC" : "OFF" },
      { reference: "H2", label: "Indicator lamp", exact: second ? "LIT · 24 V DC" : "OFF" },
    ],
  }));
  return {
    id, name, description, category: "Control & Signalling", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "ac", definitionId: "supply.control", reference: "X1", x: 115, y: 350, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
        { id: "dc", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 290, y: 350, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
        { id: "command", definitionId: "pushbutton.start-no", reference: "S1", x: 470, y: 170, rotation: 0, properties: { pressed: false } },
        { id: "first-timer", definitionId: "iec.on-delay-timer.01", reference: "KT1", x: 525, y: 345, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, energized: false, delaySeconds: 1, elapsedSeconds: 0 } },
        { id: "second-timer", definitionId: "iec.on-delay-timer.01", reference: "KT2", x: 745, y: 515, rotation: 0, properties: { coilVoltageV: 24, coilDc: true, energized: false, delaySeconds: 2, elapsedSeconds: 0 } },
        { id: "first-pilot", definitionId: "user.indicator-lamp", reference: "H1", x: 935, y: 210, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#a16207", indication: "Stage one" } },
        { id: "second-pilot", definitionId: "user.indicator-lamp", reference: "H2", x: 935, y: 515, rotation: 0, properties: { ratedVoltageV: 24, dc: true, color: "#15803d", indication: "Stage two" } },
      ],
      wires: [
        { id: "line", netName: "L", from: { componentId: "ac", terminalId: "line" }, to: { componentId: "dc", terminalId: "line-in" }, points: [] },
        { id: "neutral", netName: "N", from: { componentId: "ac", terminalId: "neutral" }, to: { componentId: "dc", terminalId: "neutral-in" }, points: [] },
        { id: "start-feed", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "command", terminalId: "13" }, points: [] },
        { id: "first-coil", netName: "STAGE_REQUEST", from: { componentId: "command", terminalId: "14" }, to: { componentId: "first-timer", terminalId: "a1" }, points: [] },
        { id: "first-return", netName: "DC_RETURN", from: { componentId: "first-timer", terminalId: "a2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
        { id: "first-common", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "first-timer", terminalId: "15" }, points: [] },
        { id: "first-pilot-feed", netName: "STAGE_ONE", from: { componentId: "first-timer", terminalId: "18" }, to: { componentId: "first-pilot", terminalId: "t1" }, points: [] },
        { id: "second-coil", netName: "STAGE_ONE", from: { componentId: "first-timer", terminalId: "18" }, to: { componentId: "second-timer", terminalId: "a1" }, points: [] },
        { id: "second-return", netName: "DC_RETURN", ...secondReturn, points: [] },
        { id: "second-common", netName: "DC_PLUS", from: { componentId: "dc", terminalId: "plus-out" }, to: { componentId: "second-timer", terminalId: "15" }, points: [] },
        { id: "second-pilot-feed", netName: "STAGE_TWO", from: { componentId: "second-timer", terminalId: "18" }, to: { componentId: "second-pilot", terminalId: "t1" }, points: [] },
        { id: "first-pilot-return", netName: "DC_RETURN", from: { componentId: "first-pilot", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
        { id: "second-pilot-return", netName: "DC_RETURN", from: { componentId: "second-pilot", terminalId: "t2" }, to: { componentId: "dc", terminalId: "zero-out" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "KT1", label: "Timer contact", valueIncludes: "0.0 / 1.0 s" },
      { reference: "H1", label: "Indicator lamp", valueIncludes: "OFF" },
      { reference: "H2", label: "Indicator lamp", valueIncludes: "OFF" },
    ],
  };
}
