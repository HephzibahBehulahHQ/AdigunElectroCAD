import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createSourcedDolTemplate } from "../src/projects/sourcedDolTemplate";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

it("opens the linked Siemens starter drawing and runs the complete start, stop and overload sequence", () => {
  const file = new URL("../public/examples/siemens-dol-starter-panel.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  const [breaker, contactor, overload, circuit] = project.sheets;
  for (const [panel, componentId, widths, height] of [
    [breaker, "breaker", [54, 76], 90],
    [contactor, "contactor", [45, 107], 85],
    [overload, "overload", [45, 85], 85],
  ] as const) {
    expect(panel.document.drawingGrid?.units).toBe("mm");
    const views = panel.document.graphics!;
    expect(views.map(view => view.x2 - view.x1)).toEqual(widths);
    for (const view of views) {
      expect(view.y2 - view.y1).toBe(height);
      expect(view.deviceLink).toEqual({ sheetId: circuit.id, componentId });
    }
  }
  expect(circuit.document.wires).toHaveLength(22);
  expect(verifyProjectTemplate({ ...createSourcedDolTemplate(), document: circuit.document }, catalogById))
    .toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
});
