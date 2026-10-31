import type { CircuitDocument } from "../types/electrical";

export const createDolMotorStarter = (): CircuitDocument => ({
  id: "reference-dol-motor-starter",
  name: "DOL Motor Starter — 7.5 kW",
  description: "Editable power and control circuit for a simplified three-phase DOL motor starter.",
  revision: 1,
  components: [
    { id: "supply", definitionId: "supply.three-phase", reference: "X1", x: 125, y: 110, rotation: 0, properties: {} },
    { id: "breaker", definitionId: "breaker.three-pole", reference: "Q1", x: 280, y: 175, rotation: 0, properties: {} },
    { id: "contactor", definitionId: "contactor.three-pole", reference: "KM1", x: 470, y: 295, rotation: 0, properties: {} },
    { id: "overload", definitionId: "overload.thermal", reference: "F1", x: 660, y: 415, rotation: 0, properties: {} },
    { id: "motor", definitionId: "motor.three-phase", reference: "M1", x: 850, y: 530, rotation: 0, properties: {} },
    { id: "control", definitionId: "supply.control", reference: "X2", x: 125, y: 655, rotation: 0, properties: {} },
    { id: "stop", definitionId: "pushbutton.stop-nc", reference: "S0", x: 295, y: 655, rotation: 0, properties: {} },
    { id: "start", definitionId: "pushbutton.start-no", reference: "S1", x: 490, y: 655, rotation: 0, properties: {} }
  ],
  wires: [
    wire("w1", "supply", "l1", "breaker", "l1-in", "L1"), wire("w2", "supply", "l2", "breaker", "l2-in", "L2"), wire("w3", "supply", "l3", "breaker", "l3-in", "L3"),
    wire("w4", "breaker", "l1-out", "contactor", "l1-in", "L1_SW"), wire("w5", "breaker", "l2-out", "contactor", "l2-in", "L2_SW"), wire("w6", "breaker", "l3-out", "contactor", "l3-in", "L3_SW"),
    wire("w7", "contactor", "l1-out", "overload", "l1-in", "L1_M"), wire("w8", "contactor", "l2-out", "overload", "l2-in", "L2_M"), wire("w9", "contactor", "l3-out", "overload", "l3-in", "L3_M"),
    wire("w10", "overload", "t1", "motor", "u1", "U1"), wire("w11", "overload", "t2", "motor", "v1", "V1"), wire("w12", "overload", "t3", "motor", "w1", "W1"), wire("w13", "supply", "pe", "motor", "pe", "PE"),
    wire("w14", "control", "line", "stop", "21", "CTRL_L"), wire("w15", "stop", "22", "overload", "aux-95", "CTRL_STOP"), wire("w16", "overload", "aux-96", "start", "13", "CTRL_OK"), wire("w17", "start", "14", "contactor", "a1", "COIL"), wire("w18", "control", "neutral", "contactor", "a2", "CTRL_N"), wire("w19", "overload", "aux-96", "contactor", "aux-13", "HOLD_IN"), wire("w20", "contactor", "aux-14", "contactor", "a1", "HOLD_OUT")
  ]
});

function wire(id: string, fromComponentId: string, fromTerminalId: string, toComponentId: string, toTerminalId: string, netName: string) {
  return { id, from: { componentId: fromComponentId, terminalId: fromTerminalId }, to: { componentId: toComponentId, terminalId: toTerminalId }, points: [], netName };
}
