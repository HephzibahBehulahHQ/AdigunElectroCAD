import { useState } from "react";
import type { ElectricalComponentDefinition } from "../types/electrical";
import { ComponentSymbolPreview } from "./ComponentSymbolPreview";

export const CATALOG_CATEGORY_PAGE_SIZE = 40;

export function CatalogTree({ definitions, selectedId, searching, onSelect, onDragPreview }: {
  definitions: ElectricalComponentDefinition[];
  selectedId: string;
  searching: boolean;
  onSelect: (id: string) => void;
  onDragPreview?: (id: string) => void;
}) {
  const [pages, setPages] = useState<Record<string, number>>({});
  const categories = new Map<string, ElectricalComponentDefinition[]>();
  for (const definition of definitions) {
    const members = categories.get(definition.category);
    if (members) members.push(definition);
    else categories.set(definition.category, [definition]);
  }
  const selectedCategory = definitions.find((definition) => definition.id === selectedId)?.category;
  return <div className="catalog-list" aria-label="Component categories">
    {!definitions.length && <p className="catalog-empty">No components match this search.</p>}
    {Array.from(categories, ([category, members]) => {
      const size = CATALOG_CATEGORY_PAGE_SIZE;
      const pageCount = Math.ceil(members.length / size);
      const page = Math.min(pages[category] ?? 0, pageCount - 1);
      const changePage = (next: number) => setPages((current) => ({ ...current, [category]: next }));
      return <details className="catalog-category" key={category} open={searching || category === selectedCategory}>
        <summary><span>{category}</span><small>{members.length}</small></summary>
        {members.slice(page * size, (page + 1) * size).map((definition) => <button key={definition.id} draggable title="Drag onto the canvas to place at that position" className={definition.id === selectedId ? "catalog-item selected" : "catalog-item"} onClick={() => onSelect(definition.id)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-adigun-electrocad-component", definition.id); onDragPreview?.(definition.id); }} onDragEnd={() => onDragPreview?.("")} aria-label={`${definition.name}; drag to place on the canvas`} aria-pressed={definition.id === selectedId}>
          <ComponentSymbolPreview definition={definition} thumbnail />
          <span><strong>{definition.name}</strong><small>{definition.simulationSupport}</small></span>
        </button>)}
        {pageCount > 1 && <nav className="project-pagination" aria-label={`${category} component pages`}>
          <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)} aria-label={`Previous ${category} components`}>‹</button>
          <span>{page + 1} / {pageCount}</span>
          <button type="button" disabled={page + 1 === pageCount} onClick={() => changePage(page + 1)} aria-label={`Next ${category} components`}>›</button>
        </nav>}
      </details>;
    })}
  </div>;
}
