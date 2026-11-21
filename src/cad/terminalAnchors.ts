import type { CircuitDocument, TerminalEndpoint } from "../types/electrical";
import { catalogById } from "../catalog/dolCatalog";
import { controlTerminalOffset, powerTerminalOffset } from "./componentGeometry";

export const endpointKey = (endpoint: TerminalEndpoint) => `${endpoint.componentId}.${endpoint.terminalId}`;

export interface TerminalAnchor {
  endpoint: TerminalEndpoint;
  x: number;
  y: number;
  power?: boolean;
  vertical?: boolean;
}

export const staticComponentIds = new Set(["supply", "breaker", "contactor", "overload", "motor", "control", "stop", "start"]);
export function terminalAnchors(document: CircuitDocument): TerminalAnchor[] {
  const anchors: TerminalAnchor[] = document.id === "reference-dol-motor-starter" ? [
    anchor("supply", "l1", 165, 100), anchor("supply", "l2", 255, 100), anchor("supply", "l3", 345, 100), anchor("supply", "pe", 445, 100),
    anchor("breaker", "l1-in", 165, 146), anchor("breaker", "l2-in", 255, 146), anchor("breaker", "l3-in", 345, 146), anchor("breaker", "l1-out", 165, 252), anchor("breaker", "l2-out", 255, 252), anchor("breaker", "l3-out", 345, 252),
    anchor("contactor", "l1-in", 165, 252), anchor("contactor", "l2-in", 255, 252), anchor("contactor", "l3-in", 345, 252), anchor("contactor", "l1-out", 165, 303), anchor("contactor", "l2-out", 255, 303), anchor("contactor", "l3-out", 345, 303), anchor("contactor", "a1", 780, 730), anchor("contactor", "a2", 834, 730), anchor("contactor", "aux-13", 375, 665), anchor("contactor", "aux-14", 610, 665),
    anchor("overload", "l1-in", 165, 370), anchor("overload", "l2-in", 255, 370), anchor("overload", "l3-in", 345, 370), anchor("overload", "t1", 165, 449), anchor("overload", "t2", 255, 449), anchor("overload", "t3", 345, 449), anchor("overload", "aux-95", 310, 730), anchor("overload", "aux-96", 375, 730),
    anchor("motor", "u1", 165, 516), anchor("motor", "v1", 255, 516), anchor("motor", "w1", 345, 516), anchor("motor", "pe", 445, 540),
    anchor("control", "line", 130, 730), anchor("control", "neutral", 130, 765), anchor("stop", "21", 170, 730), anchor("stop", "22", 280, 730), anchor("start", "13", 440, 730), anchor("start", "14", 548, 730),
  ] : [];
  for (const component of document.components.filter((item) => document.id !== "reference-dol-motor-starter" || !staticComponentIds.has(item.id))) {
    const definition = catalogById.get(component.definitionId);
    if (!definition) continue;
    (component.customTerminals ?? definition?.terminals ?? []).forEach((terminal, index) => {
      const sixTerminal = definition.id === "motor.six-terminal" || definition.simulationModelId === "six-terminal-windings";
      const x = sixTerminal ? index < 6 ? [-30, 0, 30][index % 3] : -47 : index % 2 ? 47 : -47;
      const y = sixTerminal ? index < 3 ? -42 : index < 6 ? 42 : 0 : -18 + Math.floor(index / 2) * 12;
      const power = powerTerminalOffset(definition.simulationModelId, terminal.id, Number(component.properties.poles) || 3);
      const control = power ?? controlTerminalOffset(definition.simulationModelId, terminal.id);
      const size = component.size ?? 1;
      const terminalOffset = component.customTerminalOffsets?.[terminal.id] ?? control ?? { x, y };
      const offset = rotateOffset(terminalOffset.x * size, terminalOffset.y * size, component.rotation);
      anchors.push({ ...anchor(component.id, terminal.id, component.x + offset.x, component.y + offset.y), power: terminal.kind === "power", vertical: Boolean(power && terminal.kind === "power" && component.rotation % 180 === 0) });
    });
  }
  return anchors;
}

function rotateOffset(x: number, y: number, rotation: 0 | 90 | 180 | 270): { x: number; y: number } {
  if (rotation === 90) return { x: -y, y: x };
  if (rotation === 180) return { x: -x, y: -y };
  if (rotation === 270) return { x: y, y: -x };
  return { x, y };
}

function anchor(componentId: string, terminalId: string, x: number, y: number): TerminalAnchor {
  return { endpoint: { componentId, terminalId }, x, y };
}


export function terminalGridReference(document: CircuitDocument, endpoint: TerminalEndpoint): string {
  const anchorPoint = terminalAnchors(document).find((item) => item.endpoint.componentId === endpoint.componentId && item.endpoint.terminalId === endpoint.terminalId);
  if (!anchorPoint) return "A1";
  let columnIndex = Math.max(0, Math.round(anchorPoint.x / 20));
  let column = "";
  while (columnIndex >= 0) {
    column = String.fromCharCode(65 + columnIndex % 26) + column;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return `${column}${Math.floor(anchorPoint.y / 20) + 1}`;
}
