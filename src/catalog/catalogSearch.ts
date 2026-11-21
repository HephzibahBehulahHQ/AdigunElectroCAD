import type { ElectricalComponentDefinition } from "../types/electrical";

export function indexComponentCatalog(definitions: readonly ElectricalComponentDefinition[]) {
  const entries = definitions.map((definition) => ({
    definition,
    text: [definition.id, definition.name, definition.category, definition.referencePrefix, definition.description, definition.documentation].join(" ").toLowerCase(),
  }));
  return (query: string): ElectricalComponentDefinition[] => {
    const text = query.trim().toLowerCase();
    return text ? entries.filter((entry) => entry.text.includes(text)).map(({ definition }) => definition) : [...definitions];
  };
}
