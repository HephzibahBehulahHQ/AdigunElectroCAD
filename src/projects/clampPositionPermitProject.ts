import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createClampPositionPermitProject(): ProjectTemplate {
  const id = "pneumatic-clamp-position-permit";
  const name = "Pneumatic clamp position permissive";
  const description = "A clamp request energizes a spring-return valve. The work output requires both the request and more than 90% cylinder travel. Removing position feedback inhibits the work output while the clamp remains commanded. The model uses idealized constant-rate motion and position signals.";
  const feedback = { from: { componentId: "clamp", terminalId: "out" }, to: { componentId: "position-limit", terminalId: "in-a" } };
  const samples = [
    { name: "Begin with the clamp retracted.", request: false, seconds: .1, position: "0.0%", permit: "OFF" },
    { name: "Request clamping and verify inhibition in mid-travel.", request: true, seconds: 2, position: "50.0%", permit: "OFF" },
    { name: "Reach full extension and verify the work permit.", request: true, seconds: 2, position: "100.0%", permit: "ON" },
    { name: "Disconnect position feedback. Disable work while the clamp stays extended.", request: true, connected: false, seconds: .1, position: "100.0%", permit: "OFF" },
    { name: "Restore feedback and verify the work permit returns.", request: true, connected: true, seconds: .1, position: "100.0%", permit: "ON" },
    { name: "Release the clamp request. Work stops while cylinder position is still above 90%.", request: false, seconds: .2, position: "95.0%", permit: "OFF" },
    { name: "Complete spring return.", request: false, seconds: 3.8, position: "0.0%", permit: "OFF" },
  ];
  const operatingSequence = samples.map(({ name, request, seconds, position, permit, connected }): CircuitSequenceStep => ({
    name,
    durationSeconds: seconds,
    changes: [{ reference: "S1", properties: { input: request } }],
    wireChanges: connected === undefined ? undefined : [{ ...feedback, connected }],
    expectations: [
      { reference: "CY1", label: "Cylinder position", exact: position },
      { reference: "K1", label: "Coil", exact: permit },
    ],
  }));
  return {
    id, name, description, category: "Pneumatic Control", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "request", definitionId: "logic.no-contact", reference: "S1", x: 125, y: 200, rotation: 0, properties: { input: false } },
        { id: "valve", definitionId: "pneumatic.valve-3-2", reference: "YV1", x: 300, y: 500, rotation: 0, properties: { energized: false } },
        { id: "clamp", definitionId: "pneumatic.cylinder-single", reference: "CY1", x: 475, y: 500, rotation: 0, properties: { positionPercent: 0, direction: "hold", elapsedSeconds: 0, travelSeconds: 4 } },
        { id: "position-limit", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 650, y: 500, rotation: 0, properties: { left: 0, right: 90 } },
        { id: "work-gate", definitionId: "logic.gate-and", reference: "G1", x: 825, y: 200, rotation: 0, properties: { inputA: false, inputB: false } },
        { id: "work-permit", definitionId: "logic.output-coil", reference: "K1", x: 1005, y: 200, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "clamp-request", netName: "CLAMP_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "valve", terminalId: "in" }, points: [] },
        { id: "valve-motion", netName: "CLAMP_MOTION", from: { componentId: "valve", terminalId: "out" }, to: { componentId: "clamp", terminalId: "motion" }, points: [] },
        { id: "position-feedback", netName: "CLAMP_POSITION", ...feedback, points: [] },
        { id: "clamp-request-gate", netName: "CLAMP_REQUEST", from: { componentId: "request", terminalId: "out" }, to: { componentId: "work-gate", terminalId: "in-a" }, points: [] },
        { id: "position-proved", netName: "CLAMP_PROVED", from: { componentId: "position-limit", terminalId: "out" }, to: { componentId: "work-gate", terminalId: "in-b" }, points: [] },
        { id: "work-permit", netName: "WORK_PERMIT", from: { componentId: "work-gate", terminalId: "out" }, to: { componentId: "work-permit", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "CY1", label: "Cylinder position", valueIncludes: "0.0%" },
      { reference: "YV1", label: "Valve motion command", valueIncludes: "retract" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
