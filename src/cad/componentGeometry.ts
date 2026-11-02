import type { ComponentInstance } from "../types/electrical";

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
