import { directionalValve52, type Direction } from "./industrialDevices";
type Properties = Readonly<Record<string, string | number | boolean>>;

function numeric(p: Properties, key: string, fallback: number): number {
  const value = p[key] === undefined ? fallback : p[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RangeError(`Pneumatic ${key} must be finite.`);
  return value;
}
function direction(value: unknown): Direction {
  if (value !== "extend" && value !== "retract" && value !== "hold") throw new RangeError("Pneumatic command must be extend, retract or hold.");
  return value;
}
export function valve52Direction(p: Properties): "extend" | "retract" {
  if (p.extendCoil === true && p.retractCoil === true) throw new Error("Both valve coils are energized; switching dominance is not modeled.");
  const previous = direction(p.runtimeSpool ?? p.initialPosition ?? "retract");
  if (previous === "hold") throw new Error("A 5/2 spool has two positions; choose extend or retract initially.");
  return directionalValve52(p.extendCoil === true, p.retractCoil === true, previous) as "extend" | "retract";
}
export function cylinderDirection(p: Properties, single: boolean): Direction {
  if (p.runtimeMotionBound === true && p.runtimeDirectBound === true) throw new Error("Choose a valve-motion input or direct command inputs, not both.");
  if (p.runtimeMotionBound === true) return direction(p.motionCommand);
  if (p.runtimeDirectBound === true) {
    if (single) return p.extendCommand === true ? "extend" : "retract";
    if (p.extendCommand === true && p.retractCommand === true) throw new Error("Both cylinder direction commands are active.");
    return p.extendCommand === true ? "extend" : p.retractCommand === true ? "retract" : "hold";
  }
  return direction(p.direction ?? (single ? "retract" : "hold"));
}
function travelSeconds(p: Properties): number {
  const travel = numeric(p, "travelSeconds", 4);
  if (travel < .001) throw new RangeError("Cylinder full travel must be at least 0.001 seconds.");
  return travel;
}
function move(position: number, command: Direction, elapsed: number, travel: number): number {
  return Math.round(Math.max(0, Math.min(100, position + (command === "extend" ? 1 : command === "retract" ? -1 : 0) * elapsed / travel * 100)) * 1e9) / 1e9;
}
export function cylinderPositionPercent(p: Properties, single: boolean): number {
  const travel = travelSeconds(p), command = cylinderDirection(p, single);
  const position = numeric(p, "runtimePositionPercent", numeric(p, "positionPercent", 50));
  if (position < 0 || position > 100) throw new RangeError("Cylinder position must be within 0–100 percent.");
  if (p.runtimePositionPercent !== undefined) return position;
  const preset = numeric(p, "elapsedSeconds", 0);
  if (preset < 0) throw new RangeError("Cylinder initial elapsed time cannot be negative.");
  return move(position, command, preset, travel);
}
export function advanceCylinder(p: Properties, single: boolean, elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new RangeError("Cylinder time step must be finite and non-negative.");
  return move(cylinderPositionPercent(p, single), cylinderDirection(p, single), elapsedSeconds, travelSeconds(p));
}
