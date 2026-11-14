import type { ComponentInstance } from "../types/electrical";

/** Three-phase terminals run top to bottom; Boolean coil/position feedback stays at the sides. */
export function powerTerminalOffset(modelId: string, terminalId: string, poles = 3): { x: number; y: number } | undefined {
  if (!["catalog-ac-supply", "catalog-circuit-breaker", "catalog-fuse-switch", "breaker-3p-v1", "catalog-motor-starter", "catalog-induction-motor", "three-phase-source-v1", "induction-motor-educational-v1", "thermal-overload-dol-v1", "contactor-dol-v1"].includes(modelId)) return undefined;
  if (modelId === "three-phase-source-v1") {
    const sourcePhase = /^l([123])$/.exec(terminalId);
    if (sourcePhase) return { x: [-24, 0, 24][Number(sourcePhase[1]) - 1], y: -35 };
    if (terminalId === "pe") return { x: 47, y: 0 };
  }
  const phase = /^l([123])-(in|out)$/.exec(terminalId);
  if (phase) return { x: modelId === "catalog-circuit-breaker" && poles === 4 ? [-36, -12, 12][Number(phase[1]) - 1] : [-32, 0, 32][Number(phase[1]) - 1], y: phase[2] === "in" ? -27 : 27 };
  const neutral = modelId === "catalog-circuit-breaker" && /^n-(in|out)$/.exec(terminalId);
  if (neutral) return { x: 36, y: terminalId === "n-in" ? -27 : 27 };
  const auxiliary = modelId === "catalog-motor-starter" ? /^aux-([1-4])([34])$/.exec(terminalId) : null;
  if (auxiliary) return { x: 47, y: -30 + ((Number(auxiliary[1]) - 1) * 2 + (auxiliary[2] === "4" ? 1 : 0)) * 8 };
  const motor = ["u1", "v1", "w1"].indexOf(terminalId);
  if (motor >= 0) return { x: [-24, 0, 24][motor], y: modelId === "induction-motor-educational-v1" ? -35 : -27 };
  if (modelId === "induction-motor-educational-v1" && terminalId === "pe") return { x: 47, y: 0 };
  const overload = /^t([123])$/.exec(terminalId);
  if (overload) return { x: [-32, 0, 32][Number(overload[1]) - 1], y: 27 };
  if (terminalId === "a1" || terminalId === "a2") return { x: -47, y: terminalId === "a1" ? -12 : 12 };
  if (modelId === "contactor-dol-v1" && ["aux-13", "aux-14"].includes(terminalId)) return { x: 47, y: terminalId === "aux-13" ? -12 : 12 };
  if (modelId === "contactor-dol-v1" && ["aux-21", "aux-22"].includes(terminalId)) return { x: 47, y: terminalId === "aux-21" ? -24 : 24 };
  if (terminalId === "aux-closed" || terminalId === "aux-96" || terminalId === "pe") return { x: 47, y: 0 };
  if (terminalId === "aux-95") return { x: -47, y: 0 };
  return undefined;
}

/** Keep supported command wires outside the symbol body; COM is a distinct lower anchor. */
export function controlTerminalOffset(modelId: string, terminalId: string): { x: number; y: number } | undefined {
  if (modelId === "user-indicator-symbol" || modelId === "user-drawn-symbol") {
    if (terminalId === "t1") return { x: -32, y: -13 };
    if (terminalId === "t2") return { x: 32, y: -13 };
    const pin = /^t([3-8])$/.exec(terminalId);
    if (pin) {
      const index = Number(pin[1]) - 3;
      return { x: index % 2 ? 32 : -32, y: index < 2 ? -25 : index < 4 ? -1 : 11 };
    }
  }
  if (modelId === "control-supply-v1") return { x: 47, y: terminalId === "line" ? -12 : 12 };
  if (modelId === "pushbutton-start-v1" || modelId === "pushbutton-stop-v1") return { x: ["13", "21"].includes(terminalId) ? -47 : 47, y: 0 };
  if (modelId === "catalog-circuit-breaker" && terminalId === "aux-closed") return { x: 47, y: 0 };
  if (modelId === "catalog-interface-relay") {
    if (terminalId === "a1" || terminalId === "a2") return { x: -47, y: terminalId === "a1" ? -12 : 12 };
    const contact = /^([1-3])([124])$/.exec(terminalId);
    if (contact) {
      const column = [-30, 0, 30][Number(contact[1]) - 1];
      const terminal = contact[2];
      return { x: column + (terminal === "2" ? -8 : terminal === "4" ? 8 : 0), y: terminal === "1" ? -27 : 27 };
    }
  }
  if (modelId === "catalog-control-transformer") {
    if (terminalId === "p1") return { x: -47, y: -12 };
    if (terminalId === "p2") return { x: -47, y: 12 };
    if (terminalId === "s1") return { x: 47, y: -12 };
    if (terminalId === "s2") return { x: 47, y: 12 };
  }
  if (modelId === "catalog-on-delay-timer") {
    if (terminalId === "a1" || terminalId === "a2") return { x: -47, y: terminalId === "a1" ? -12 : 12 };
    if (terminalId === "16") return { x: 47, y: -12 };
    if (terminalId === "18") return { x: 47, y: 12 };
    if (terminalId === "15") return { x: 0, y: 27 };
  }
  if (modelId === "catalog-plc-digital-io") {
    if (terminalId === "in-0") return { x: -47, y: -22 };
    if (terminalId === "in-1") return { x: -47, y: -7 };
    if (terminalId === "ai-0") return { x: -47, y: 8 };
    if (terminalId === "ai-1") return { x: -47, y: 23 };
    if (terminalId === "out-0") return { x: 47, y: -12 };
    if (terminalId === "out-1") return { x: 47, y: 7 };
    if (terminalId === "common") return { x: 47, y: 25 };
  }
  const logic = modelId.startsWith("logic-");
  const cylinder = modelId === "pneumatic-cylinder-single" || modelId === "pneumatic-cylinder-double";
  const valve = modelId === "pneumatic-valve-5-2" || modelId === "pneumatic-valve-3-2";
  if (!logic && !cylinder && !valve) return undefined;
  if (terminalId === "common") return { x: 0, y: 27 };
  if (terminalId === "out") return { x: 47, y: 0 };
  if (terminalId === "motion") return { x: -47, y: modelId.endsWith("double") ? 18 : 14 };
  if (terminalId === "in") return { x: -47, y: cylinder ? -14 : 0 };
  if (terminalId === "in-a") return { x: -47, y: modelId.endsWith("double") ? -18 : -12 };
  if (terminalId === "in-b") return { x: -47, y: modelId.endsWith("double") ? 0 : 12 };
  return undefined;
}

export function componentLabelOffsets(rotation: ComponentInstance["rotation"], definitionId?: string) {
  const reference = rotation === 90 || rotation === 270 ? 75 : 50;
  if (definitionId === "motor.six-terminal") return { reference: reference + 28, kind: reference + 45 };
  return { reference, kind: reference + 17 };
}

/** Include upright labels as well as the rotated symbol in placement clearance. */
export function componentFootprint(x: number, y: number, rotation: ComponentInstance["rotation"], definitionId?: string, size = 1) {
  const sideways = rotation === 90 || rotation === 270;
  const halfWidth = (Math.max(sideways ? 35 : 55, 55) + 6) * size;
  const terminalExtension = (definitionId === "motor.six-terminal" ? 16 : 0) * size;
  return { left: x - halfWidth, right: x + halfWidth, top: y - (sideways ? 55 : 35) * size - 6 - terminalExtension, bottom: y + componentLabelOffsets(rotation, definitionId).kind * size + 8 };
}

export function componentFitsSheet(x: number, y: number, rotation: ComponentInstance["rotation"], definitionId?: string, size = 1): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size < .5 || size > 2) return false;
  const bounds = componentFootprint(x, y, rotation, definitionId, size);
  return bounds.left >= 10 && bounds.right <= 1090 && bounds.top >= 90 && bounds.bottom <= 770;
}


