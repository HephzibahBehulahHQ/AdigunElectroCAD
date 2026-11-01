import { describe, expect, it } from "vitest";
import { prepareStandaloneSchematicSvg } from "../src/projects/schematicExport";

describe("schematic SVG export", () => {
  it("adds standalone namespace and drawing styles without changing SVG content", () => {
    const svg = prepareStandaloneSchematicSvg('<svg viewBox="0 0 10 10"><path class="wire" d="M 0 0 H 10" /></svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(".wire");
    expect(svg).toContain('<path class="wire" d="M 0 0 H 10" />');
  });
});
