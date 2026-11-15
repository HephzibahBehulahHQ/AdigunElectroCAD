import type { ElectricalComponentDefinition } from "../types/electrical";

export function CatalogTree({ definitions, selectedId, searching, onSelect }: {
  definitions: ElectricalComponentDefinition[];
  selectedId: string;
  searching: boolean;
  onSelect: (id: string) => void;
}) {
  const categories = [...new Set(definitions.map((definition) => definition.category))];
  const selectedCategory = definitions.find((definition) => definition.id === selectedId)?.category;
  return <div className="catalog-list" aria-label="Component categories">
    {!definitions.length && <p className="catalog-empty">No components match this search.</p>}
    {categories.map((category) => {
      const members = definitions.filter((definition) => definition.category === category);
      return <details className="catalog-category" key={category} open={searching || category === selectedCategory}>
        <summary><span>{category}</span><small>{members.length}</small></summary>
        {members.map((definition) => <button key={definition.id} draggable title="Drag onto the canvas to place at that position" className={definition.id === selectedId ? "catalog-item selected" : "catalog-item"} onClick={() => onSelect(definition.id)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-adigun-electrocad-component", definition.id); }} aria-label={`${definition.name}; drag to place on the canvas`} aria-pressed={definition.id === selectedId}>
          <span className="symbol-glyph" aria-hidden="true">{definition.symbolId.includes("motor") ? "Ⓜ" : definition.symbolId.includes("contactor") ? "⌇" : definition.symbolId.includes("pushbutton") ? "○" : "▣"}</span>
          <span><strong>{definition.name}</strong><small>{definition.simulationSupport}</small></span>
        </button>)}
      </details>;
    })}
  </div>;
}
