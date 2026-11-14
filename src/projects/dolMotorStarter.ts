import type { CircuitDocument } from "../types/electrical";

export const createDolMotorStarter = (): CircuitDocument => ({
  id: "siemens-dol-motor-starter",
  name: "DOL Motor Starter — 7.5 kW",
  description: "Editable, terminal-wired DOL starter using Siemens 5SY6332-7 breaker, 3RT2025-1BB40 contactor, 3RU2126-4AB0 overload, 1LE1003 motor and 6EP1332-5BA10 24 V DC control supply. The 230 V control feed and 400 V three-phase source are educational supply abstractions; protection coordination and motor transients are not simulated.",
  revision: 2,
  components: [
    { id: "supply", definitionId: "iec.ac-supply.01", reference: "X1", x: 390, y: 100, rotation: 0, properties: { nominalVoltageV: 400, frequencyHz: 50, outputEnabled: true } },
    { id: "breaker", definitionId: "iec.motor-protective-breaker.01", reference: "Q1", x: 390, y: 220, rotation: 0, properties: { nominalVoltageV: 400, ratedCurrentA: 32, poles: 3, curve: "C", breakingCapacityKa: 6, closed: true } },
    { id: "contactor", definitionId: "iec.motor-starter.01", reference: "KM1", x: 390, y: 340, rotation: 0, properties: { nominalVoltageV: 400, ratedCurrentA: 17, ratedPowerKw: 7.5, coilVoltageV: 24, coilDc: true, energized: false, auxiliaryNoContacts: 1, auxiliaryNcContacts: 1 } },
    { id: "overload", definitionId: "overload.thermal", reference: "F1", x: 390, y: 460, rotation: 0, properties: { settingA: 14.3, settingMinA: 11, settingMaxA: 16, tripClass: 10, tripped: false, thermalEnabled: false } },
    { id: "motor", definitionId: "iec.induction-motor.01", reference: "M1", x: 390, y: 600, rotation: 0, properties: { nominalVoltageV: 400, ratedCurrentA: 14.3, ratedPowerKw: 7.5, nominalSpeedRpm: 1470, frequencyHz: 50, powerFactor: 0.84, efficiencyPercent: 90.4, windingConnection: "Delta", energized: false } },
    { id: "control", definitionId: "supply.control", reference: "X2", x: 800, y: 120, rotation: 0, properties: { voltageV: 230, frequencyHz: 50 } },
    { id: "control-psu", definitionId: "iec.dc-control-supply.01", reference: "T1", x: 1010, y: 220, rotation: 0, properties: { inputVoltageV: 230, nominalVoltageV: 24, ratedCurrentA: 4, outputEnabled: true } },
    { id: "stop", definitionId: "pushbutton.stop-nc", reference: "S0", x: 760, y: 480, rotation: 0, properties: { pressed: false } },
    { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 1030, y: 480, rotation: 0, properties: { pressed: false } },
  ],
  wires: [
    wire("w1", "supply", "l1-out", "breaker", "l1-in", "L1"),
    wire("w2", "supply", "l2-out", "breaker", "l2-in", "L2"),
    wire("w3", "supply", "l3-out", "breaker", "l3-in", "L3"),
    wire("w4", "breaker", "l1-out", "contactor", "l1-in", "L1_SW"),
    wire("w5", "breaker", "l2-out", "contactor", "l2-in", "L2_SW"),
    wire("w6", "breaker", "l3-out", "contactor", "l3-in", "L3_SW"),
    wire("w7", "contactor", "l1-out", "overload", "l1-in", "L1_M"),
    wire("w8", "contactor", "l2-out", "overload", "l2-in", "L2_M"),
    wire("w9", "contactor", "l3-out", "overload", "l3-in", "L3_M"),
    wire("w10", "overload", "t1", "motor", "u1", "U1"),
    wire("w11", "overload", "t2", "motor", "v1", "V1"),
    wire("w12", "overload", "t3", "motor", "w1", "W1"),
    wire("w13", "supply", "pe", "motor", "pe", "PE"),
    wire("w14", "control", "line", "control-psu", "line-in", "230V_L"),
    wire("w15", "control", "neutral", "control-psu", "neutral-in", "230V_N"),
    wire("w16", "control-psu", "plus-out", "stop", "21", "24V+"),
    wire("w17", "stop", "22", "overload", "aux-95", "STOP_OK"),
    wire("w18", "overload", "aux-96", "start", "13", "OL_OK"),
    wire("w19", "overload", "aux-96", "contactor", "aux-13", "HOLD_FEED"),
    wire("w20", "start", "14", "contactor", "a1", "COIL_START"),
    wire("w21", "contactor", "aux-14", "contactor", "a1", "COIL_HOLD"),
    wire("w22", "contactor", "a2", "control-psu", "zero-out", "0V"),
  ],
});

function wire(id: string, fromComponentId: string, fromTerminalId: string, toComponentId: string, toTerminalId: string, netName: string) {
  return { id, from: { componentId: fromComponentId, terminalId: fromTerminalId }, to: { componentId: toComponentId, terminalId: toTerminalId }, points: [], netName };
}
