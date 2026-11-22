import type { CircuitDocument, ElectricalComponentDefinition, TerminalEndpoint } from "../types/electrical";
import { functionalOutputTerminals, terminalSignalUnits } from "./signalContracts";

/** Multiple modeled signal outputs are unsupported on one wire net, even when values match. */
export function conflictingSignalDrivers(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): Array<{ endpoints: TerminalEndpoint[]; message: string }> {
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
  const drivers = new Map<string, Array<{ endpoint: TerminalEndpoint; label: string }>>();
  for (const component of document.components) {
    const definition = catalog.get(component.definitionId);
    if (!definition) continue;
    for (const output of functionalOutputTerminals(definition)) {
      if (!terminalSignalUnits(definition, output.id)?.length) continue;
      const endpoint = { componentId: component.id, terminalId: output.id };
      const node = key(endpoint);
      if (!parents.has(node)) continue;
      const net = root(node);
      const item = { endpoint, label: component.reference + "." + output.id };
      const group = drivers.get(net);
      if (group) group.push(item);
      else drivers.set(net, [item]);
    }
  }
  return [...drivers.values()].filter((items) => items.length > 1).map((items) => ({
    endpoints: items.map(({ endpoint }) => endpoint),
    message: "Multiple simulated signal outputs share one wire net: " + items.map(({ label }) => label).join(", ") + ". Use a logic block to combine signals.",
  }));
}

export function signalDriverConflicts(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>): string[] {
  return conflictingSignalDrivers(document, catalog).map(({ message }) => message);
}
