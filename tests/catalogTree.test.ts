import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogById } from "../src/catalog/dolCatalog";
import { CatalogTree } from "../src/components/CatalogTree";

it("marks real multi-terminal devices as draggable from the component library", () => {
  const definition = catalogById.get("iec.motor-starter.01")!;
  const markup = renderToStaticMarkup(createElement(CatalogTree, {
    definitions: [definition], selectedId: definition.id, searching: false, onSelect: () => {},
  }));
  expect(markup).toContain('draggable="true"');
  expect(markup).toContain("drag to place on the canvas");
});
