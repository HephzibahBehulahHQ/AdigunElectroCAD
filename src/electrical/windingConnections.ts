import type { CircuitDocument, TerminalEndpoint } from "../types/electrical";
export type WindingConnection = "star" | "delta" | "open" | "invalid";
type ContactPair = [TerminalEndpoint, TerminalEndpoint];
const key = (endpoint: TerminalEndpoint) => `${endpoint.componentId}:${endpoint.terminalId}`;

/** Classify six-terminal connections from wires and explicitly closed contacts. */
export function windingConnection(document: CircuitDocument, motorId: string, closedContacts: ContactPair[] = []): WindingConnection {
  const parent = new Map<string, string>();
  const root = (node: string): string => {
    const ancestor = parent.get(node);
    if (!ancestor) { parent.set(node, node); return node; }
    if (ancestor === node) return node;
    const result = root(ancestor); parent.set(node, result); return result;
  };
  const join = (left: TerminalEndpoint, right: TerminalEndpoint) => parent.set(root(key(left)), root(key(right)));
  for (const wire of document.wires) join(wire.from, wire.to);
  for (const [left, right] of closedContacts) join(left, right);
  const [u1, v1, w1, u2, v2, w2] = ["u1", "v1", "w1", "u2", "v2", "w2"].map((terminalId) => root(key({ componentId: motorId, terminalId })));
  if (new Set([u1, v1, w1]).size !== 3) return "invalid";
  if (u2 === v2 && v2 === w2) return [u1, v1, w1].includes(u2) ? "invalid" : "star";
  if (u2 === w1 && v2 === u1 && w2 === v1) return "delta";
  if (new Set([u1, v1, w1, u2, v2, w2]).size === 6) return "open";
  return "invalid";
}
