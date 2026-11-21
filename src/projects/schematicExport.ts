const standaloneStyles = `
  svg { font-family: Inter, Arial, sans-serif; }
  .sheet-bg { fill: #f7f9fc; }
  .drawing-title, .phase-label, .terminal-label { fill: #13233b; font-weight: 800; }
  .drawing-title { font-size: 14px; letter-spacing: .06em; }
  .phase-label, .terminal-label { font-size: 14px; }
  .wire { fill: none; stroke: #68788b; stroke-width: 4; }
  .wire.energized { stroke: #dc2e34; }
  .wire.fault { stroke: #d84a3a; stroke-dasharray: 8 5; }
  .wire.neutral { stroke: #55799b; }
  .wire.manual-wire { stroke: #7c3aed; stroke-width: 3; stroke-dasharray: 7 4; }
  .wire.manual-wire.power-wire { stroke: #991b1b; stroke-width: 2.4; stroke-dasharray: none; }
  .phase-l1 { fill: #d5242a; stroke: #d5242a; }
  .phase-l2 { fill: #d39700; stroke: #d39700; }
  .phase-l3 { fill: #59708f; stroke: #59708f; }
  .wire.phase-l1 { stroke: #d5242a; }
  .wire.phase-l2 { stroke: #d39700; }
  .wire.phase-l3 { stroke: #59708f; }
  .phase-label.pe { fill: #167a52; }
  .wire.pe-wire { stroke: #167a52; }
  .contact-blade, .generic-symbol-mark { fill: none; stroke: #1d2d41; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .contact-blade.closed { stroke: #c71c2c; }
  .free-symbol, .coil, .overload { fill: #f7fbff; stroke: #24456b; stroke-width: 2; }
  .free-reference, .reference-label { fill: #102a43; font-size: 15px; font-weight: 900; }
  .free-kind, .device-label, .sheet-note { fill: #35506e; font-size: 12px; font-weight: 700; }
  .motor { fill: #d9e8f5; stroke: #2261cf; stroke-width: 5; }
  .generic-symbol-mark, .functional-symbol { stroke: var(--component-ink, #2272ad); stroke-width: 2.4; }
  .functional-symbol-text { stroke: none; fill: #17649c; font-size: 10px; font-weight: 900; }
  .terminal-pin { fill: #fff; stroke: #1e5f96; stroke-width: 2.5; }
  .free-terminal-label { fill: #13233b; font-size: 10px; font-weight: 800; paint-order: stroke; stroke: #f4f8fc; stroke-width: 3px; stroke-linejoin: round; }
  .wire-junction { fill: #7c3aed; }
  .project-continuation-marker rect { fill: #f8fbff; stroke-width: 1.5; }
  .project-continuation-marker text { font: 700 10px Inter, Arial, sans-serif; paint-order: stroke; stroke: #f8fbff; stroke-width: 2px; stroke-linejoin: round; }
`;

export function snapshotSchematicSvg(drawing: SVGSVGElement): SVGSVGElement {
  const copy = drawing.cloneNode(true) as SVGSVGElement;
  const editingAids = [
    "[data-export-exclude]", ".selection-boundary", ".selection-marquee", ".terminal-anchors",
    ".wire-branch-hit-target", ".wire-route-hit-target", ".wire-route-handle",
    "[data-resize-handle]", "[data-vertex-handle]", "[data-graphic-id=__preview__]",
  ];
  copy.querySelectorAll(editingAids.join(", ")).forEach((node) => node.remove());
  copy.removeAttribute("style");
  const { width, height } = drawing.viewBox.baseVal;
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  return copy;
}

export function prepareStandaloneSchematicSvg(markup: string): string {
  const openingTag = markup.match(/^<svg\b[^>]*>/);
  if (!openingTag) throw new Error("The drawing does not contain an SVG root.");
  const root = openingTag[0].includes("xmlns=") ? openingTag[0] : openingTag[0].replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return markup.replace(openingTag[0], `${root}<style type="text/css"><![CDATA[${standaloneStyles}]]></style>`);
}
