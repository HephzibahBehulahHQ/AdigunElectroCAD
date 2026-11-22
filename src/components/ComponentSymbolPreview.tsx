import { terminalAnchors } from "../cad/terminalAnchors";
import { componentFootprint, instanceFootprint } from "../cad/componentGeometry";
import type { ComponentInstance, ElectricalComponentDefinition } from "../types/electrical";
import { FunctionalSymbol, hasDedicatedFunctionalSymbol } from "./functionalSymbols";
import { GenericSymbol, PlacedSymbol, SixTerminalWindings } from "./Schematic";

export function ComponentSymbolPreview({ definition, instance, thumbnail = false }: {
  definition: ElectricalComponentDefinition;
  thumbnail?: boolean;
  instance?: ComponentInstance;
}) {
  if (instance) {
    const component = { ...instance, x: 0, y: 0, reference: "" };
    const { left, right, top, bottom } = instanceFootprint(component);
    const anchors = terminalAnchors({ id: "custom-preview", name: "", description: "", revision: 1, components: [component], wires: [] });
    return <svg className={thumbnail ? "component-symbol-thumbnail" : "component-symbol-preview"}
      viewBox={[left - 4, top - 4, right - left + 8, bottom - top + 8].join(" ")}
      role={thumbnail ? undefined : "img"} aria-hidden={thumbnail || undefined} aria-label={thumbnail ? undefined : definition.name + " schematic symbol"}>
      <PlacedSymbol component={component} draftingStyle={component} selectedComponentId="" onSelect={() => {}} terminalAnchorsForComponent={anchors} />
    </svg>;
  }
  const { left, right, top, bottom } = componentFootprint(0, 0, 0, definition.id);
  const anchors = thumbnail ? [] : terminalAnchors({
    id: "catalog-preview", name: definition.name, description: "", revision: 1, wires: [],
    components: [{ id: "preview", definitionId: definition.id, reference: definition.referencePrefix, x: 0, y: 0, rotation: 0, properties: definition.propertiesSchema }],
  });
  const minX = Math.min(left, ...anchors.map(({ x }) => x - 15));
  const maxX = Math.max(right, ...anchors.map(({ x }) => x + 15));
  const minY = Math.min(top, ...anchors.map(({ y }) => y - 12));
  const maxY = Math.max(bottom - 35, ...anchors.map(({ y }) => y + 16));
  return <svg
    className={thumbnail ? "component-symbol-thumbnail" : "component-symbol-preview"}
    viewBox={`${minX - 4} ${minY - 4} ${maxX - minX + 8} ${maxY - minY + 8}`}
    role={thumbnail ? undefined : "img"}
    aria-hidden={thumbnail || undefined}
    aria-label={thumbnail ? undefined : `${definition.name} schematic symbol`}
  >
    {definition.simulationModelId === "six-terminal-windings" ? <SixTerminalWindings x={0} y={0} productName={definition.name} />
      : hasDedicatedFunctionalSymbol(definition.symbolId) ? <FunctionalSymbol x={0} y={0} symbolId={definition.symbolId} properties={definition.propertiesSchema} componentName={definition.name} />
      : <GenericSymbol x={0} y={0} symbolId={definition.symbolId} />}
    {anchors.map(({ endpoint, x, y, vertical }) => {
      const label = definition.terminals.find(({ id }) => id === endpoint.terminalId)?.label;
      return <text key={endpoint.terminalId} className="free-terminal-label"
        x={x + (vertical || x === 0 ? 0 : x < 0 ? -4 : 4)} y={y + (y < 0 ? -4 : 10)}
        textAnchor={vertical || x === 0 ? "middle" : x < 0 ? "end" : "start"}
        textLength={vertical && label && label.length > 3 ? 18 : undefined}
        lengthAdjust={vertical && label && label.length > 3 ? "spacingAndGlyphs" : undefined}>{label}</text>;
    })}
  </svg>;
}
