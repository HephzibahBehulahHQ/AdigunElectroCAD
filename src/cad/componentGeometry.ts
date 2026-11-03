import type { ComponentInstance } from "../types/electrical";

/** Three-phase terminals run top to bottom; Boolean coil/position feedback stays at the sides. */
export function powerTerminalOffset(modelId: string, terminalId: string): { x: number; y: number } | undefined {
  if (!["catalog-ac-supply", "catalog-circuit-breaker", "catalog-motor-starter", "catalog-induction-motor", "thermal-overload-dol-v1"].includes(modelId)) return undefined;
  const phase = /^l([123])-(in|out)$/.exec(terminalId);
  if (phase) return { x: [-32, 0, 32][Number(phase[1]) - 1], y: phase[2] === "in" ? -27 : 27 };
  const motor = ["u1", "v1", "w1"].indexOf(terminalId);
  if (motor >= 0) return { x: [-32, 0, 32][motor], y: -27 };
  const overload = /^t([123])$/.exec(terminalId);
  if (overload) return { x: [-32, 0, 32][Number(overload[1]) - 1], y: 27 };
  if (terminalId === "a1" || terminalId === "a2") return { x: -47, y: terminalId === "a1" ? -12 : 12 };
  if (terminalId === "aux-closed" || terminalId === "aux-96" || terminalId === "pe") return { x: 47, y: 0 };
  if (terminalId === "aux-95") return { x: -47, y: 0 };
  return undefined;
}

/** Keep supported command wires outside the symbol body; COM is a distinct lower anchor. */
export function controlTerminalOffset(modelId: string, terminalId: string): { x: number; y: number } | undefined {
  if (modelId === "catalog-circuit-breaker" && terminalId === "aux-closed") return { x: 47, y: 0 };
  if (modelId === "catalog-on-delay-timer") {
    if (terminalId === "a1" || terminalId === "a2") return { x: -47, y: terminalId === "a1" ? -12 : 12 };
    if (terminalId === "18") return { x: 47, y: 0 };
    if (terminalId === "15") return { x: 0, y: 27 };
  }
  if (modelId === "catalog-plc-digital-io") {
    if (terminalId === "in-0" || terminalId === "in-1" || terminalId === "ai-0") return { x: -47, y: terminalId === "in-0" ? -18 : terminalId === "in-1" ? 0 : 18 };
    if (terminalId === "out-0") return { x: 47, y: 0 };
    if (terminalId === "a1" || terminalId === "a2") return { x: terminalId === "a1" ? -16 : 16, y: -27 };
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

export function componentLabelOffsets(rotation: ComponentInstance["rotation"]) {
  const reference = rotation === 90 || rotation === 270 ? 75 : 50;
  return { reference, kind: reference + 17 };
}

/** Include upright labels as well as the rotated symbol in placement clearance. */
export function componentFootprint(x: number, y: number, rotation: ComponentInstance["rotation"]) {
  const sideways = rotation === 90 || rotation === 270;
  const halfWidth = Math.max(sideways ? 35 : 55, 55) + 6;
  return { left: x - halfWidth, right: x + halfWidth, top: y - (sideways ? 55 : 35) - 6, bottom: y + componentLabelOffsets(rotation).kind + 8 };
}

export function componentFitsSheet(x: number, y: number, rotation: ComponentInstance["rotation"]): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const bounds = componentFootprint(x, y, rotation);
  return bounds.left >= 10 && bounds.right <= 1090 && bounds.top >= 90 && bounds.bottom <= 770;
}
