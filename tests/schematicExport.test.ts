import { describe, expect, it } from "vitest";
import { drawingFitsFrame, paddedDrawingBounds, prepareStandaloneSchematicSvg } from "../src/projects/schematicExport";
import { schematicPrintHtml, workbookPrintHtml } from "../src/projects/schematicPrint";
import { defaultPrintLayout } from "../src/cad/printLayout";

describe("schematic SVG export", () => {
  it("preserves workbook page order and mixed physical print sizes", () => {
    const html = workbookPrintHtml([
      { svg: '<svg data-sheet="power"></svg>', layout: { ...defaultPrintLayout, format: "A3" } },
      { svg: '<svg data-sheet="control"></svg>', layout: { ...defaultPrintLayout, orientation: "portrait" } },
      { svg: '<svg data-sheet="legacy"></svg>' },
    ]);
    expect(html).toContain("@page sheet0 { size: 420mm 297mm; margin: 0; }");
    expect(html).toContain("@page sheet1 { size: 210mm 297mm; margin: 0; }");
    expect(html).toContain("@page sheet2 { size:");
    expect(html).toContain("section + section { break-before: page; }");
    expect(html.match(/data-sheet="\w+"/g)).toEqual(['data-sheet="power"', 'data-sheet="control"', 'data-sheet="legacy"']);
  });

  it("prints unframed physical drawings using the captured millimetre dimensions", () => {
    const svg = '<svg viewBox="-25 0 780 440"></svg>';
    const physicalSize = { width: 780, height: 440 };
    expect(schematicPrintHtml(svg, undefined, physicalSize)).toContain("@page { size: 780mm 440mm;");
    expect(workbookPrintHtml([{ svg, physicalSize }])).toContain("@page sheet0 { size: 780mm 440mm;");
  });

  it("includes signed drawing coordinates and detects clipping against the old frame", () => {
    const content = { x: -180.5, y: -120.25, width: 1360, height: 920 };
    expect(paddedDrawingBounds(content)).toEqual({ x: -205, y: -145, width: 1409, height: 969 });
    const frame = { x: 0, y: 0, width: 1100, height: 780 };
    expect(drawingFitsFrame(content, frame)).toBe(false);
    expect(drawingFitsFrame({ x: 20, y: 30, width: 300, height: 200 }, frame)).toBe(true);
  });
  it("adds standalone namespace and drawing styles without changing SVG content", () => {
    const svg = prepareStandaloneSchematicSvg('<svg viewBox="0 0 10 10"><path class="wire" d="M 0 0 H 10" /></svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(".wire");
    expect(svg).toContain(".functional-symbol-text { stroke: none;");
    expect(svg).toContain(".free-terminal-label");
    expect(svg).toContain(".project-continuation-marker text");
    expect(svg).toContain(".wire.manual-wire.power-wire { stroke: #991b1b; stroke-width: 2.4; stroke-dasharray: none; }");
    expect(svg).toContain(".wire.pe-wire { stroke: #167a52; }");
    expect(svg).toContain(".mechanical-link { fill: none; stroke: #667991;");
    expect(svg).toContain(".overload.tripped { fill: #fbd0cd; stroke: #d84a3a; }");
    expect(svg).toContain(".motor-mark { fill: #2454c4; font-size: 37px;");
    expect(svg).toContain('<path class="wire" d="M 0 0 H 10" />');
  });
});
