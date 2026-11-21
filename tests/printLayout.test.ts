import { expect, it } from "vitest";
import { defaultPrintLayout, paperDimensions, printFrameBounds, validPrintLayout } from "../src/cad/printLayout";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createBlankProject } from "../src/projects/starterProject";
import { schematicPrintHtml } from "../src/projects/schematicPrint";

it("uses physical paper sizes with independent drawing origin and scale", () => {
  expect(paperDimensions(defaultPrintLayout)).toEqual({ width: 297, height: 210 });
  expect(paperDimensions({ ...defaultPrintLayout, format: "A0", orientation: "portrait" })).toEqual({ width: 841, height: 1189 });
  const custom = { ...defaultPrintLayout, format: "custom" as const, customWidthMm: 250, customHeightMm: 160, x: -400, y: -250, unitsPerMm: 2 };
  expect(printFrameBounds(custom)).toEqual({ x: -400, y: -250, width: 500, height: 320 });
  expect(validPrintLayout({ ...custom, marginMm: 80 })).toBe(false);
});

it("sets matching physical page and SVG sizes for browser PDF printing", () => {
  const svg = '<svg viewBox="-100 0 1680 1188"><text>Motor feeder</text></svg>';
  const html = schematicPrintHtml(svg, { ...defaultPrintLayout, format: "A3" });
  expect(html).toContain("@page { size: 420mm 297mm; margin: 0; }");
  expect(html).toContain("width: 420mm; height: 297mm;");
  expect(html).toContain(svg);
});

it("reopens a saved layout and accepts older sheets without it", () => {
  const project = createBlankProject();
  const saved = { ...defaultPrintLayout, x: -185.5, y: -67, visible: false, title: "Panel distribution" };
  expect(parseProjectJson(JSON.stringify(project)).sheets[0].document.printLayout).toBeUndefined();
  project.sheets[0].document.printLayout = saved;
  expect(parseProjectJson(JSON.stringify(project)).sheets[0].document.printLayout).toEqual(saved);
  project.sheets[0].document.printLayout.unitsPerMm = 0;
  expect(() => parseProjectJson(JSON.stringify(project))).toThrow("Invalid print layout dimensions, margin or scale");
});
