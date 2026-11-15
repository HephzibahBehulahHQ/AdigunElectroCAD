import type { CircuitDocument, TerminalDefinition } from "../types/electrical";
import { modeledCatalog } from "../catalog/modeledCatalog";

const topologyProperties = new Set(["poles", "changeoverContacts", "contactForm", "channelCount"]);

/** Return the actual catalog topology choices for an editable generic field. */
export function genericTopologyChoices(definitionId: string, property: string): Array<string | number> | undefined {
  const familyId = /^generic\.iec\.(.+)$/.exec(definitionId)?.[1];
  if (!familyId || !topologyProperties.has(property)) return undefined;
  if (familyId === "plc-digital-io") return property === "channelCount" ? [4] : undefined;

  const values = new Set<string | number>();
  for (const definition of modeledCatalog) {
    if (!definition.id.startsWith(`iec.${familyId}.`)) continue;
    const value = definition.propertiesSchema[property];
    if (typeof value === "string" || typeof value === "number") values.add(value);
  }
  return values.size ? [...values] : undefined;
}

/**
 * Resolve editable generic topology fields to an existing terminal set.
 * Undefined means the edited field does not change topology; null means the
 * requested topology is unavailable for this generic profile.
 */
export function genericTopologyTerminalsForChange(
  definitionId: string,
  property: string,
  value: string | number | boolean,
): TerminalDefinition[] | null | undefined {
  const familyId = /^generic\.iec\.(.+)$/.exec(definitionId)?.[1];
  if (!familyId || !topologyProperties.has(property)) return undefined;

  // This model implements exactly two inputs and two outputs, plus common.
  if (familyId === "plc-digital-io") {
    if (property !== "channelCount") return undefined;
    if (value !== 4) return null;
  }

  const variant = modeledCatalog.find((definition) =>
    definition.id.startsWith(`iec.${familyId}.`) && definition.propertiesSchema[property] === value,
  );
  return variant?.terminals ?? null;
}

function sameTerminals(left: TerminalDefinition[], right: TerminalDefinition[]): boolean {
  return left.length === right.length && left.every((terminal, index) => {
    const other = right[index];
    return terminal.id === other.id && terminal.label === other.label && terminal.kind === other.kind && terminal.direction === other.direction;
  });
}

/** Apply a generic profile's new terminal set and discard wires on removed pins. */
export function applyGenericTopologyTerminals(
  document: CircuitDocument,
  componentId: string,
  baseTerminals: TerminalDefinition[],
  nextTerminals: TerminalDefinition[],
): { document: CircuitDocument; removedWireCount: number } {
  const validIds = new Set(nextTerminals.map((terminal) => terminal.id));
  const wires = document.wires.filter((wire) =>
    !((wire.from.componentId === componentId && !validIds.has(wire.from.terminalId))
      || (wire.to.componentId === componentId && !validIds.has(wire.to.terminalId))),
  );
  const components = document.components.map((component) => {
    if (component.id !== componentId) return component;
    const next = { ...component };
    if (sameTerminals(baseTerminals, nextTerminals)) delete next.customTerminals;
    else next.customTerminals = nextTerminals;
    return next;
  });
  return {
    document: { ...document, components, wires },
    removedWireCount: document.wires.length - wires.length,
  };
}
