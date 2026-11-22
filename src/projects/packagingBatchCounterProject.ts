import type { ProjectTemplate } from "./templateLibrary";
import type { CircuitSequenceStep } from "./templateVerification";

export function createPackagingBatchCounterProject(): ProjectTemplate {
  const id = "plc-packaging-batch-counter";
  const name = "Packaging station three-part batch counter";
  const description = "A wired proximity sensor supplies sampled rising edges. The PLC counts three separate detections using retained bits, then drops the feed command and energizes batch complete. A wired reset clears the count and inhibits feed while held. The example models PLC signals and sampled detections.";
  const cases = [
    { name: "Start an empty batch.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect part one.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Hold the sensor high across scans. The count must remain at one.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Clear the sensor after part one.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect part two.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Clear the sensor after part two.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect part three. Stop feed and mark the batch complete.", detected: true, reset: false, feed: "OFF", complete: "ON" },
    { name: "Hold reset with the sensor still high. Clear the batch and inhibit feed.", detected: true, reset: true, feed: "OFF", complete: "OFF" },
    { name: "Release reset while the sensor remains high.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Clear the previously held sensor.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect the first fresh part of the next batch.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Clear the sensor before the next part.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect the second fresh part. Feed must remain on.", detected: true, reset: false, feed: "ON", complete: "OFF" },
    { name: "Clear the sensor before the final part.", detected: false, reset: false, feed: "ON", complete: "OFF" },
    { name: "Detect the third fresh part. Complete the second batch.", detected: true, reset: false, feed: "OFF", complete: "ON" },
  ];
  const operatingSequence = cases.map(({ name, detected, reset, feed, complete }): CircuitSequenceStep => ({
    name,
    durationSeconds: .3,
    changes: [{ reference: "B1", properties: { detected } }, { reference: "S1", properties: { input: reset } }],
    expectations: [
      { reference: "K1", label: "Coil", exact: feed },
      { reference: "K2", label: "Coil", exact: complete },
    ],
  }));
  return {
    id, name, description, category: "PLC & Automation", level: "Intermediate",
    document: {
      id, name, description, revision: 1,
      components: [
        { id: "part-sensor", definitionId: "generic.iec.proximity-sensor", reference: "B1", x: 165, y: 220, rotation: 0, properties: { detected: false } },
        { id: "reset", definitionId: "logic.no-contact", reference: "S1", x: 165, y: 500, rotation: 0, properties: { input: false } },
        { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 520, y: 360, rotation: 0, properties: {
          inputA: false, inputB: false, output: false, output1: false,
          program: [
            "LDP I0; AND M1; SET M2", "LDP I0; AND M0; SET M1", "LDP I0; SET M0",
            "LD I1; RESET M0; RESET M1; RESET M2", "LDN I1; ANDN M2; OUT Q0", "LD M2; OUT Q1",
          ].join("; "),
        } },
        { id: "feed-command", definitionId: "logic.output-coil", reference: "K1", x: 870, y: 220, rotation: 0, properties: { input: false } },
        { id: "batch-complete", definitionId: "logic.output-coil", reference: "K2", x: 870, y: 500, rotation: 0, properties: { input: false } },
      ],
      wires: [
        { id: "part-i0", netName: "PART_DETECTED", from: { componentId: "part-sensor", terminalId: "signal" }, to: { componentId: "plc", terminalId: "in-0" }, points: [] },
        { id: "sensor-common", netName: "SENSOR_COM", from: { componentId: "part-sensor", terminalId: "common" }, to: { componentId: "plc", terminalId: "common" }, points: [] },
        { id: "reset-i1", netName: "BATCH_RESET", from: { componentId: "reset", terminalId: "out" }, to: { componentId: "plc", terminalId: "in-1" }, points: [] },
        { id: "feed-q0", netName: "FEED_COMMAND", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "feed-command", terminalId: "in" }, points: [] },
        { id: "complete-q1", netName: "BATCH_COMPLETE", from: { componentId: "plc", terminalId: "out-1" }, to: { componentId: "batch-complete", terminalId: "in" }, points: [] },
      ],
    },
    testSequence: operatingSequence.map(({ name }) => name),
    operatingSequence,
    expectedOutputs: [
      { reference: "B1", label: "Sensor output", valueIncludes: "OFF" },
      { reference: "K1", label: "Coil", valueIncludes: "OFF" },
      { reference: "K2", label: "Coil", valueIncludes: "OFF" },
    ],
  };
}
