import type { ComponentInstance } from "../types/electrical";

/** Keep supported command wires outside the symbol body; COM is a distinct lower anchor. */
export function controlTerminalOffset(modelId: string, terminalId: string): { x: number; y: number } | undefined {
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
