import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { createEntityLayer, lockedDraftingEditReason, moveDraftingLayer, resolveDraftingStyle, updateDraftingLayer, updateEntityDrafting } from "../src/cad/draftingLayers";
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

it("hides layer geometry and terminal targets while retaining wire topology through save and Undo", () => {
  const project = createBlankProject();
  const [sheet] = project.sheets;
  const document = createAnalogLevelProject().document;
  const layerId = "plc-signals";
  const component = document.components.find(({ id }) => id === "adc")!;
  const wire = document.wires.find(({ id }) => id === "adc-raw")!;
  document.draftingLayers = [{ id: layerId, name: "PLC signals" }];
  component.layerId = wire.layerId = layerId;
  const before = replaceSheetDocument(project, sheet.id, document);
  const result = updateDraftingLayer(document, layerId, { hidden: true });
  if (!result.ok) throw Error(result.reason);
  const after = replaceSheetDocument(before, sheet.id, result.document);
  const restored = parseProjectJson(JSON.stringify(after)).sheets[0].document;
  expect(restored.draftingLayers?.[0].hidden).toBe(true);
  expect(restored.wires).toEqual(document.wires);
  const render = (drawing: typeof restored) => renderToStaticMarkup(createElement(Schematic, {
    document: drawing, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(),
    wireMode: true, wireStart: null, onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  const hidden = render(restored);
  expect(hidden).not.toContain('data-wire-terminal="adc.');
  expect(hidden).not.toContain('>ADC1</text>');
  expect(hidden.match(/class="wire manual-wire/g)).toHaveLength(document.wires.length - 1);
  const undone = undoProject(recordProjectEdit({ undo: [], redo: [] }, before), after).project;
  expect(render(undone.sheets[0].document)).toContain('data-wire-terminal="adc.');
});

it("rejects locked component and wire mutations atomically and unlocks after reload", () => {
  const project = createBlankProject();
  const document = createAnalogLevelProject().document;
  project.sheets[0].document = document;
  const layerId = "locked-controls";
  document.draftingLayers = [{ id: layerId, name: "Controls", locked: true }];
  const component = document.components.find(({ id }) => id === "adc")!;
  const wire = document.wires.find(({ id }) => id === "adc-raw")!;
  component.layerId = wire.layerId = layerId;
  for (const next of [
    { ...document, components: document.components.map((entity) => entity === component ? { ...entity, x: entity.x + 20 } : entity) },
    { ...document, wires: document.wires.filter((entity) => entity !== wire) },
    { ...document, wires: document.wires.map((entity) => entity === wire ? { ...entity, points: [{ x: 350, y: 220 }] } : entity) },
    { ...document, components: [...document.components, { ...component, id: "duplicate" }] },
  ]) expect(lockedDraftingEditReason(document, next)).toBe("Layer Controls is locked.");
  const restored = parseProjectJson(JSON.stringify(project)).sheets[0].document;
  expect(restored.draftingLayers?.[0].locked).toBe(true);
  expect(lockedDraftingEditReason(restored, structuredClone(restored))).toBeUndefined();
  const unlocked = updateDraftingLayer(restored, layerId, { locked: false });
  if (!unlocked.ok) throw Error(unlocked.reason);
  expect(lockedDraftingEditReason(restored, unlocked.document)).toBeUndefined();
  expect(lockedDraftingEditReason(unlocked.document, { ...unlocked.document, wires: [] })).toBeUndefined();
});

it("persists explicit layer order without changing topology or older canvas stacking", () => {
  const project = createBlankProject();
  const [sheet] = project.sheets;
  const document = createAnalogLevelProject().document;
  const adc = document.components.find(({ id }) => id === "adc")!;
  const plc = document.components.find(({ id }) => id === "plc")!;
  document.draftingLayers = [{ id: "adc-layer", name: "ADC" }, { id: "plc-layer", name: "PLC" }];
  adc.layerId = "adc-layer";
  plc.layerId = "plc-layer";
  document.wires[0].layerId = "adc-layer";
  document.wires[1].layerId = "plc-layer";
  const before = replaceSheetDocument(project, sheet.id, document);
  const render = (drawing: typeof document) => renderToStaticMarkup(createElement(Schematic, {
    document: drawing, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(),
    wireMode: false, wireStart: null, onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
  }));
  const orderedBefore = render(document);
  expect(orderedBefore.indexOf('data-wire-terminal="adc.')).toBeLessThan(orderedBefore.indexOf('data-wire-terminal="plc.'));
  const moved = moveDraftingLayer(document, "adc-layer", 1);
  if (!moved.ok) throw Error(moved.reason);
  const after = replaceSheetDocument(before, sheet.id, moved.document);
  const restored = parseProjectJson(JSON.stringify(after)).sheets[0].document;
  expect(restored.useDraftingLayerOrder).toBe(true);
  const orderedAfter = render(restored);
  expect(orderedAfter.indexOf('data-wire-terminal="plc.')).toBeLessThan(orderedAfter.indexOf('data-wire-terminal="adc.'));
  expect(orderedAfter.indexOf('aria-label="Select wire ' + document.wires[1].netName)).toBeLessThan(orderedAfter.indexOf('aria-label="Select wire ' + document.wires[0].netName));
  expect(restored.wires).toEqual(document.wires);
  expect(undoProject(recordProjectEdit({ undo: [], redo: [] }, before), after).project).toBe(before);
});
