import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createPneumaticStrokeWatchdogProject(): ProjectTemplate {
  const id = "pneumatic-stroke-watchdog";
  const name = "Pneumatic extension stroke watchdog";
  const description = "A spring-return cylinder must prove extension above 90% before a three-second PLC timer expires. A timeout latches an alarm and suppresses the proved output until the command is released. The cylinder follows the wired valve command. Motion uses an idealized constant travel rate.";
  const samples = [
    { name: "Begin with the cylinder retracted.", request: false, seconds: .1, travel: 2, position: "0.0%", alarm: "OFF", proved: "OFF" },
    { name: "Request extension. At one second, proof is still off.", request: true, seconds: 1, travel: 2, position: "50.0%", alarm: "OFF", proved: "OFF" },
    { name: "Reach full extension before timeout.", request: true, seconds: 1, travel: 2, position: "100.0%", alarm: "OFF", proved: "OFF" },
    { name: "Scan the completed stroke and verify the proved output.", request: true, seconds: .1, travel: 2, position: "100.0%", alarm: "OFF", proved: "ON" },
    { name: "Release the command and retract.", request: false, seconds: 2, travel: 2, position: "0.0%", alarm: "OFF", proved: "OFF" },
    { name: "Set an eight-second stroke. At three seconds, verify timeout and no proof.", request: true, seconds: 3, travel: 8, position: "37.5%", alarm: "ON", proved: "OFF" },
    { name: "Reach full extension late. The alarm stays latched and proof stays off.", request: true, seconds: 5, travel: 8, position: "100.0%", alarm: "ON", proved: "OFF" },
    { name: "Release the command to clear the alarm and retract.", request: false, seconds: 2, travel: 2, position: "0.0%", alarm: "OFF", proved: "OFF" },
    { name: "Restore the normal stroke and request extension again.", request: true, seconds: 2, travel: 2, position: "100.0%", alarm: "OFF", proved: "OFF" },
    { name: "Verify proof returns on the next scan.", request: true, seconds: .1, travel: 2, position: "100.0%", alarm: "OFF", proved: "ON" },
  ];
  const operatingSequence = samples.map(({ name, request, seconds, travel, position, alarm, proved }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: request } }, { reference: "CY1", properties: { travelSeconds: travel } }],
    expectations: [
      { reference: "CY1", label: "Cylinder position", exact: position },
      { reference: "K1", label: "Coil", exact: alarm },
      { reference: "K2", label: "Coil", exact: proved },
    ],
  }));
  return {
    id, name, description, category: "Pneumatic Control", level: "Advanced",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "request", definitionId: "logic.no-contact", reference: "S1", x: 125, y: 210, rotation: 0, properties: { input: false } },
        { id: "valve", definitionId: "pneumatic.valve-3-2", reference: "YV1", x: 290, y: 510, rotation: 0, properties: { energized: false } },
        { id: "cylinder", definitionId: "pneumatic.cylinder-single", reference: "CY1", x: 465, y: 510, rotation: 0, properties: { positionPercent: 0, direction: "hold", elapsedSeconds: 0, travelSeconds: 2 } },
        { id: "limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 640, y: 510, rotation: 0, properties: { left: 0, right: 90 } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 795, y: 340, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LD I0; ANDN I1; TON T0 3; LD T0; SET M0; LDN I0; RESET M0; LD M0; OUT Q0; LD I0; AND I1; ANDN M0; OUT Q1",
        } },
        { id: "alarm", definitionId: "logic.output-coil", reference: "K1", x: 1000, y: 210, rotation: 0, properties: { input: false } },
        { id: "proved", definitionId: "logic.output-coil", reference: "K2", x: 1000, y: 510, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "command-valve", netName: "EXTEND_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "valve", terminalId: "in" }, points: [] },
        { id: "actuator-motion", netName: "VALVE_MOTION", from: { componentId: "valve", terminalId: "out" }, to: { componentId: "cylinder", terminalId: "motion" }, points: [] },
        { id: "stroke-position", netName: "STROKE_POSITION", from: { componentId: "cylinder", terminalId: "out" }, to: { componentId: "limit", terminalId: "in-a" }, points: [] },
        { id: "command-i0", netName: "EXTEND_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "proof-i1", netName: "EXTENSION_PROOF", from: { componentId: "limit", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-1" }, points: [] },
        { id: "alarm-q0", netName: "STROKE_TIMEOUT", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "alarm", terminalId: "in" }, points: [] },
        { id: "proved-q1", netName: "STROKE_PROVED", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "proved", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "CY1", label: "Cylinder position", valueIncludes: "0.0%" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
