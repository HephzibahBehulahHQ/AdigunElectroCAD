import { describe, expect, it } from "vitest";
import { drawingFitsFrame, paddedDrawingBounds, prepareStandaloneSchematicSvg } from "../src/projects/schematicExport";

describe("schematic SVG export", () => {
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
    expect(svg).toContain('<path class="wire" d="M 0 0 H 10" />');
  });
});
