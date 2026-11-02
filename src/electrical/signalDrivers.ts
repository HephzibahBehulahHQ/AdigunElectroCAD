import type { CircuitDocument, ElectricalComponentDefinition, TerminalEndpoint } from "../types/electrical";
import { functionalOutputTerminal, terminalSignalUnits } from "./signalContracts";

/** Multiple modeled signal outputs are unsupported on one wire net, even when values match. */
export function signalDriverConflicts(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): string[] {
  const parents = new Map<string, string>();
  const key = (endpoint: TerminalEndpoint) => JSON.stringify([endpoint.componentId, endpoint.terminalId]);
  const root = (node: string): string => {
    if (!parents.has(node)) parents.set(node, node);
    let result = node;
    while (parents.get(result) !== result) result = parents.get(result)!;
    let current = node;
    while (parents.get(current) !== result) { const next = parents.get(current)!; parents.set(current, result); current = next; }
    return result;
  };
  for (const wire of document.wires) parents.set(root(key(wire.from)), root(key(wire.to)));
  const drivers = new Map<string, string[]>();
  for (const component of document.components) {
    const definition = catalog.get(component.definitionId);
    if (!definition) continue;
    const output = functionalOutputTerminal(definition);
    if (!output || !terminalSignalUnits(definition, output.id)?.length) continue;
    const node = key({ componentId: component.id, terminalId: output.id });
    if (!parents.has(node)) continue;
    const net = root(node);
    drivers.set(net, [...(drivers.get(net) ?? []), `${component.reference}.${output.id}`]);
  }
  return [...drivers.values()].filter((items) => items.length > 1).map((items) => `Multiple simulated signal outputs share one wire net: ${items.join(", ")}. Use a logic block to combine signals.`);
}
