import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";

it("round-trips the M12 mating-end and side envelopes linked to the wired connector", () => {
  const file = new URL("../public/examples/phoenix-m12-housing-and-pinout.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  const [housing, schematic] = project.sheets;
  const [front, side] = housing.document.graphics!;
  expect(housing.document.drawingGrid?.units).toBe("mm");
  expect([front.kind, front.x2 - front.x1, front.y2 - front.y1]).toEqual(["ellipse", 20, 20]);
  expect([side.kind, side.x2 - side.x1, side.y2 - side.y1]).toEqual(["rectangle", 60, 20]);
  expect(side.x1).toBeGreaterThan(front.x2);
  expect(schematic.document.components.find(component => component.id === "m12")?.definitionId)
    .toBe("phoenix-contact.sacc.1662256");
  for (const outline of [front, side]) {
    expect(outline.deviceLink).toEqual({ sheetId: schematic.id, componentId: "m12" });
  }
  expect(schematic.document.wires).toMatchObject([{
    from: { componentId: "m12", terminalId: "5" },
    to: { componentId: "lamp", terminalId: "t1" },
  }]);
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
});
