import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";
import { evaluateWiredControl } from "../src/simulation/wiredControl";

it("reopens the dimensioned Finder relay drawing and transfers the 24 V pilots", () => {
  const file = new URL("../public/examples/finder-3851-changeover-panel.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [panel, circuit] = project.sheets;
  expect(panel.document.drawingGrid?.units).toBe("mm");
  const outlines = panel.document.graphics!;
  expect(outlines).toHaveLength(2);
  [6.2, 75.6].forEach((width, index) => {
    const outline = outlines[index];
    expect(outline.x2 - outline.x1).toBeCloseTo(width);
    expect(outline.y2 - outline.y1).toBeCloseTo(87.8);
    expect(outline.deviceLink).toEqual({ sheetId: circuit.id, componentId: "relay" });
  });
  const states = (pressed: boolean) => {
    const components = circuit.document.components.map(component => component.id === "command"
      ? { ...component, properties: { ...component.properties, pressed } }
      : component);
    const result = evaluateWiredControl({ ...circuit.document, components }, catalogById);
    return ["relay", "picked-up", "dropped-out"].map(id => result.get(id)?.energized);
  };
  expect(states(false)).toEqual([false, false, true]);
  expect(states(true)).toEqual([true, true, false]);
});
