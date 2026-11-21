import { CatalogTree, CATALOG_CATEGORY_PAGE_SIZE } from "../src/components/CatalogTree";
import { indexComponentCatalog } from "../src/catalog/catalogSearch";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { componentCatalog, componentLibraryCatalog } from "../src/catalog/dolCatalog";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { FunctionalSymbol } from "../src/components/functionalSymbols";
import type { CircuitDocument } from "../src/types/electrical";

it("audits rendering and terminal identity across selectable and stored definitions", () => {
  const selectable = new Set(componentLibraryCatalog.map(({ id }) => id));
  const rows = new Map<string, { records: number; selectable: number; dedicatedMarkup: number; anchorMatch: number }>();
  const fallback: string[] = [];
  const badAnchors: string[] = [];
  for (const definition of componentCatalog) {
    const row = rows.get(definition.category) ?? { records: 0, selectable: 0, dedicatedMarkup: 0, anchorMatch: 0 };
    rows.set(definition.category, row);
    row.records++;
    if (selectable.has(definition.id)) row.selectable++;
    const markup = renderToStaticMarkup(createElement(FunctionalSymbol, {
      symbolId: definition.symbolId, componentName: definition.name,
      properties: definition.propertiesSchema, x: 0, y: 0,
    }));
    if ((markup && !markup.includes("data-symbol-fallback")) || definition.simulationModelId === "six-terminal-windings" || definition.id === "user.drawn-symbol") row.dedicatedMarkup++;
    else fallback.push(definition.id);
    const document: CircuitDocument = {
      id: "catalog-audit", name: "Catalog audit", description: "", revision: 1, wires: [],
      components: [{ id: "audit", definitionId: definition.id, reference: "X", x: 0, y: 0, rotation: 0, properties: definition.propertiesSchema }],
    };
    const anchors = terminalAnchors(document);
    const terminalIds = definition.terminals.map(({ id }) => id);
    if (new Set(terminalIds).size === terminalIds.length &&
      anchors.map(({ endpoint }) => endpoint.terminalId).join(",") === terminalIds.join(",") &&
      anchors.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)) &&
      new Set(anchors.map(({ x, y }) => `${x},${y}`)).size === anchors.length) row.anchorMatch++;
    else badAnchors.push(definition.id);
  }
  if (process.env.ADIGUN_CATALOG_AUDIT === "1") {
    console.table(Object.fromEntries(rows));
    console.log({ records: componentCatalog.length, selectable: selectable.size, fallback, badAnchors });
  }
  expect(new Set(componentCatalog.map(({ id }) => id)).size).toBe(componentCatalog.length);
  expect(fallback).toEqual([]);
  expect(badAnchors).toEqual([]);
});

it("searches 100,000 synthetic records and bounds the rendered category page", () => {
  const model = componentLibraryCatalog.find(({ id }) => id === "iec.motor-starter.01")!;
  const synthetic = Array.from({ length: 100_000 }, (_, n) => ({
    ...model, id: `synthetic-${n}`, name: `Synthetic contactor ${n}`, documentation: `Synthetic order CAT-${n}-END`,
  }));
  const start = performance.now();
  const search = indexComponentCatalog(synthetic);
  const indexed = performance.now();
  expect(search("cat-99999-end").map(({ id }) => id)).toEqual(["synthetic-99999"]);
  const end = performance.now();
  const markup = renderToStaticMarkup(createElement(CatalogTree, { definitions: search(""), selectedId: "synthetic-0", searching: false, onSelect: () => {} }));
  expect((markup.match(/draggable="true"/g) ?? []).length).toBe(CATALOG_CATEGORY_PAGE_SIZE);
  expect(markup).toContain("1 / 2500");
  expect(indexComponentCatalog(componentLibraryCatalog)("3RT2025-1BB40").some(({ id }) => id === model.id)).toBe(true);
  if (process.env.ADIGUN_CATALOG_AUDIT === "1") console.log({ indexMs: Math.round(indexed - start), exactQueryMs: Math.round(end - indexed), pageRenderMs: Math.round(performance.now() - end) });
});
