import type { ProjectTemplate } from "./templateLibrary";

/** User-loadable IEC-oriented sensor/PLC/actuator example; ratings remain unset. */
export function createPlcSensorActuatorProject(): ProjectTemplate {
  const document: ProjectTemplate["document"] = {
    id: "plc-proximity-solenoid-hold",
    name: "PLC proximity sensor and solenoid control",
    revision: 1,
    description: "A three-wire proximity sensor feeds PLC I0. The PLC holds Q0 until the I1 stop input is active; Q0 drives a two-terminal solenoid model. Generic device ratings remain unset.",
    components: [
      { id: "sensor", definitionId: "generic.iec.proximity-sensor", reference: "B1", x: 160, y: 300, rotation: 0, properties: { detected: false } },
      { id: "plc", definitionId: "generic.iec.plc-digital-io", reference: "PLC1", x: 480, y: 300, rotation: 0, properties: { inputA: false, inputB: false, output: false, program: "LD I0; OR Q0; ANDN I1; OUT Q0" } },
      { id: "actuator", definitionId: "generic.iec.solenoid-actuator", reference: "Y1", x: 800, y: 300, rotation: 0, properties: { energized: false, returnSpring: true } },
    ],
    wires: [
      { id: "sensor-i0", from: { componentId: "sensor", terminalId: "signal" }, to: { componentId: "plc", terminalId: "in-0" }, points: [], netName: "SENSOR_I0" },
      { id: "sensor-com", from: { componentId: "sensor", terminalId: "common" }, to: { componentId: "plc", terminalId: "common" }, points: [], netName: "SENSOR_COM" },
      { id: "plc-q0", from: { componentId: "plc", terminalId: "out-0" }, to: { componentId: "actuator", terminalId: "a1" }, points: [], netName: "Q0" },
    ],
  };
  const operatingSequence = [
    { name: "Clear sensor", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: false } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 OFF · Q0 OFF" }, { reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
    { name: "Detect workpiece", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: true } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 ON · I1 OFF · Q0 ON" }, { reference: "Y1", label: "Actuator position", exact: "EXTENDED · stroke unset" }] },
    { name: "Retain Q0 after sensor clears", durationSeconds: 0.1, changes: [{ reference: "B1", properties: { detected: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "EXTENDED · stroke unset" }] },
    { name: "Activate stop input I1", durationSeconds: 0.1, changes: [{ reference: "PLC1", properties: { inputB: true } }], expectations: [{ reference: "PLC1", label: "I/O state", exact: "I0 OFF · I1 ON · Q0 OFF" }, { reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
    { name: "Release stop without restart", durationSeconds: 0.1, changes: [{ reference: "PLC1", properties: { inputB: false } }], expectations: [{ reference: "Y1", label: "Actuator position", exact: "RETRACTED" }] },
  ];
  return {
    id: document.id,
    name: document.name,
    category: "PLC & Automation",
    level: "Intermediate",
    description: "Three wired generic IEC-oriented devices: a 3-wire proximity sensor to PLC I0, PLC COM, then Q0 to a solenoid model. The scanned program seals in on I0 and stops on I1. Supply wiring is not modeled; ratings and actuator stroke are unset.",
    document,
    testSequence: operatingSequence.map(({ name }) => name),
    expectedOutputs: [
      { reference: "B1", label: "Sensor output", valueIncludes: "OFF" },
      { reference: "PLC1", label: "I/O state", valueIncludes: "Q0 OFF" },
      { reference: "Y1", label: "Actuator position", valueIncludes: "RETRACTED" },
    ],
    operatingSequence,
  };
}
