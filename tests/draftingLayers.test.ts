import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { createEntityLayer, resolveDraftingStyle, updateDraftingLayer, updateEntityDrafting } from "../src/cad/draftingLayers";
import { Schematic } from "../src/components/Schematic";
import { initialDolState } from "../src/simulation/dolSimulator";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";
import { createBlankProject, replaceSheetDocument } from "../src/projects/starterProject";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { prepareStandaloneSchematicSvg } from "../src/projects/schematicExport";
import { recordProjectEdit, undoProject } from "../src/cad/projectHistory";

it("creates a shared component and wire layer and preserves styles, endpoints and Undo on reload", () => {
  const [sheet] = createBlankProject().sheets;
  const original = createAnalogLevelProject().document;
  const component = { kind: "components", id: "adc" } as const;
  const wire = { kind: "wires", id: "adc-raw" } as const;
  const created = createEntityLayer(original, component, "PLC signals");
  if (!created.ok) throw new Error(created.reason);
  const id = created.document.draftingLayers![0].id;
  const assigned = updateEntityDrafting(created.document, wire, { layerId: id });
  if (!assigned.ok) throw new Error(assigned.reason);
  const styled = updateDraftingLayer(assigned.document, id, { draftingColor: "#205884", lineWeight: 4, lineType: "dashed" });
  if (!styled.ok) throw new Error(styled.reason);
  const overridden = updateEntityDrafting(styled.document, wire, { lineWeight: 2.75, lineType: "solid" });
  if (!overridden.ok) throw new Error(overridden.reason);
  const project = { ...createBlankProject(), sheets: [{ ...sheet, document: overridden.document }] };
  const restored = parseProjectJson(JSON.stringify(project)).sheets[0].document;
  expect(restored.draftingLayers).toEqual([{ id, name: "PLC signals", draftingColor: "#205884", lineWeight: 4, lineType: "dashed" }]);
  expect(resolveDraftingStyle(restored.components.find((item) => item.id === component.id)!, restored.draftingLayers)).toMatchObject({ draftingColor: "#205884", lineWeight: 4, lineType: "dashed" });
  expect(resolveDraftingStyle(restored.wires.find((item) => item.id === wire.id)!, restored.draftingLayers)).toMatchObject({ draftingColor: "#205884", lineWeight: 2.75, lineType: "solid" });
  expect(restored.wires.map(({ from, to, points }) => ({ from, to, points }))).toEqual(original.wires.map(({ from, to, points }) => ({ from, to, points })));

  const markup = renderToStaticMarkup(createElement(Schematic, {
    document: restored, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(),
    wireMode: false, wireStart: null, onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  expect(markup).toContain('data-component-lineweight="4"');
  expect(markup).toContain("stroke:#205884;stroke-width:2.75;stroke-dasharray:none");
  const exported = prepareStandaloneSchematicSvg(markup.slice(markup.indexOf("<svg"), markup.lastIndexOf("</svg>") + 6));
  expect(exported).toContain("stroke-width: var(--component-lineweight)");
  const before = replaceSheetDocument(project, sheet.id, styled.document);
  expect(undoProject(recordProjectEdit({ undo: [], redo: [] }, before), project).project).toBe(before);
});

it("rejects unknown layers, duplicate names and invalid stroke data", () => {
  const project = createBlankProject();
  project.sheets[0].document = createAnalogLevelProject().document;
  const document = project.sheets[0].document;
  const target = { kind: "components", id: "adc" } as const;
  const result = createEntityLayer(document, target, "Signals");
  if (!result.ok) throw new Error(result.reason);
  expect(createEntityLayer(result.document, target, " signals ")).toMatchObject({ ok: false });
  expect(updateEntityDrafting(result.document, target, { layerId: "missing" })).toMatchObject({ ok: false });
  expect(updateEntityDrafting(result.document, target, { lineWeight: 0 })).toMatchObject({ ok: false });
  document.components[0].layerId = "missing";
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("unknown drafting layer");
  delete document.components[0].layerId;
  document.wires[0].lineWeight = 13;
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("lineweight");
});
