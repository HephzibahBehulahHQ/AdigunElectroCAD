import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";
import { evaluateWiredControl } from "../src/simulation/wiredControl";

it("reopens the linked SM 1223 example with distinct connector endpoints and a working field pilot", () => {
  const file = new URL("../public/examples/siemens-sm1223-input-wiring.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [panel, circuit] = project.sheets;
  expect(panel.document.drawingGrid?.units).toBe("mm");
  const outlines = panel.document.graphics!;
  expect(outlines.map(({ x1, x2, y1, y2 }) => [x2 - x1, y2 - y1])).toEqual([[45, 100], [75, 100]]);
  for (const outline of outlines) expect(outline.deviceLink).toEqual({ sheetId: circuit.id, componentId: "io" });
  const document = circuit.document;
  expect(document.wires.filter(wire => wire.to.componentId === "io").map(wire => wire.to.terminalId))
    .toEqual(["x10-1", "x10-2", "x10-3", "x10-4"]);
  expect(evaluateWiredControl(document, catalogById).get("lamp")?.energized).toBe(false);
  const components = document.components.map(component => component.id === "command"
    ? { ...component, properties: { ...component.properties, pressed: true } }
    : component);
  expect(evaluateWiredControl({ ...document, components }, catalogById).get("lamp"))
    .toMatchObject({ energized: true, voltageV: 24 });
});
