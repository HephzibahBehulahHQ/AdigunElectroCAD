import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";

it("reopens the millimetre panel hardware example without electrical terminals", () => {
  const file = new URL("../public/examples/rittal-ax-panel-hardware.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [cabinet, cutPlan] = project.sheets;
  for (const { document } of project.sheets) {
    expect(document.drawingGrid?.units).toBe("mm");
    expect(document.wires).toEqual([]);
    expect(terminalAnchors(document)).toEqual([]);
    expect(document.components).toHaveLength(2);
    for (const component of document.components) {
      expect(catalogById.get(component.definitionId)?.terminals).toEqual([]);
    }
  }
  expect(cabinet.document.components.map(({ properties }) => [properties.widthMm, properties.heightMm, properties.depthMm]))
    .toEqual([[380, 300, 210], [330, 275, 2]]);
  const [rail, trunking] = cutPlan.document.components;
  expect(rail.properties).toMatchObject({ widthMm: 35, cutLengthMm: 220 });
  expect(trunking.properties).toMatchObject({ widthMm: 100, lengthMm: 220 });
});
