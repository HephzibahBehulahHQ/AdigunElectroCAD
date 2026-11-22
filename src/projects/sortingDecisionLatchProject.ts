import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createSortingDecisionLatchProject(): ProjectTemplate {
  const id = "plc-sorting-decision-latch";
  const name = "Sorting station part decision latch";
  const description = "At the rising edge of the presence sensor, the PLC samples the pass classification. It holds that decision until the part clears and energizes one of two wired route commands. An open classification wire makes the next part take the reject route. This example models decision signals.";
  const classificationSignal = { componentId: "classification", terminalId: "out" };
  const classificationInput = { componentId: "plc", terminalId: "in-1" };
  const cases = [
    { name: "No part at the station.", present: false, qualified: false, pass: "OFF", reject: "OFF" },
    { name: "Qualified part arrives. Select the pass route.", present: true, qualified: true, pass: "ON", reject: "OFF" },
    { name: "Open the classification wire while the part is present. Preserve the pass decision.", present: true, qualified: true, connected: false, pass: "ON", reject: "OFF" },
    { name: "The first part clears. Both commands drop.", present: false, qualified: true, pass: "OFF", reject: "OFF" },
    { name: "Another part arrives with classification disconnected. Select reject.", present: true, qualified: true, pass: "OFF", reject: "ON" },
    { name: "Reconnect classification mid-part. Keep the reject route selected.", present: true, qualified: true, connected: true, pass: "OFF", reject: "ON" },
    { name: "The rejected part clears.", present: false, qualified: true, pass: "OFF", reject: "OFF" },
    { name: "A fresh qualified part arrives. Verify the pass route returns.", present: true, qualified: true, pass: "ON", reject: "OFF" },
  ];
  const operatingSequence = cases.map(({ name, present, qualified, connected, pass, reject }): CircuitSequenceStep => ({
    name,
    durationSeconds: .2,
    changes: [{ reference: "B1", properties: { detected: present } }, { reference: "S1", properties: { input: qualified } }],
    wireChanges: connected === undefined ? undefined : [{ from: classificationSignal, to: classificationInput, connected }],
    expectations: [
      { reference: "K1", label: "Coil", exact: pass },
      { reference: "K2", label: "Coil", exact: reject },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "presence", definitionId: "generic.iec.proximity-sensor", reference: "B1", x: 165, y: 220, rotation: 0, properties: { detected: false } },
        { id: "classification", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 500, rotation: 0, properties: { input: false } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: "LDN I0; RESET M0; LDP I0; AND I1; SET M0; LD I0; AND M0; OUT Q0; LD I0; ANDN M0; OUT Q1",
        } },
        { id: "pass-command", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "reject-command", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "presence-i0", netName: "PART_PRESENT", from: { componentId: "presence", terminalId: "signal" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "presence-common", netName: "SENSOR_COM", from: { componentId: "presence", terminalId: "common" }, to: { componentId: "plc", terminalId: "common" }, points: [] },
        { id: "classification-i1", netName: "PART_QUALIFIED", from: classificationSignal, to: classificationInput, points: [] },
        { id: "pass-q0", netName: "PASS_ROUTE", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "pass-command", terminalId: "in" }, points: [] },
        { id: "reject-q1", netName: "REJECT_ROUTE", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "reject-command", terminalId: "in" }, points: [] },
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
