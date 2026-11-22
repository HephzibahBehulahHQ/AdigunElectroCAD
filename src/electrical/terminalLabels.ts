import type { ComponentInstance } from "../types/electrical";

export function displayTerminalLabel(properties: ComponentInstance["properties"], index: number, fallback: string): string {
  const label = properties[`terminalLabel${index + 1}`];
  return typeof label === "string" && label.trim() ? label.slice(0, 8) : fallback;
}
