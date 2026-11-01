const standaloneStyles = `
  svg { font-family: Inter, Arial, sans-serif; }
  .sheet-bg { fill: #f7f9fc; }
  .drawing-title, .phase-label, .terminal-label { fill: #13233b; font-weight: 800; }
  .drawing-title { font-size: 14px; letter-spacing: .06em; }
  .phase-label, .terminal-label { font-size: 14px; }
  .wire { fill: none; stroke: #68788b; stroke-width: 4; }
  .wire.energized { stroke: #dc2e34; }
  .wire.neutral { stroke: #55799b; }
  .wire.manual-wire { stroke: #7c3aed; stroke-width: 3; stroke-dasharray: 7 4; }
  .phase-l1 { fill: #d5242a; stroke: #d5242a; }
  .phase-l2 { fill: #d39700; stroke: #d39700; }
  .phase-l3 { fill: #59708f; stroke: #59708f; }
  .contact-blade, .generic-symbol-mark { fill: none; stroke: #1d2d41; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .contact-blade.closed { stroke: #c71c2c; }
  .free-symbol, .coil, .overload { fill: #f7fbff; stroke: #24456b; stroke-width: 2; }
  .free-reference, .reference-label { fill: #102a43; font-size: 15px; font-weight: 900; }
  .free-kind, .device-label, .sheet-note { fill: #35506e; font-size: 12px; font-weight: 700; }
  .motor { fill: #d9e8f5; stroke: #2261cf; stroke-width: 5; }
  .generic-symbol-mark { stroke: #2272ad; stroke-width: 2.4; }
`;

export function prepareStandaloneSchematicSvg(markup: string): string {
  const openingTag = markup.match(/^<svg\b[^>]*>/);
  if (!openingTag) throw new Error("The drawing does not contain an SVG root.");
  const root = openingTag[0].includes("xmlns=") ? openingTag[0] : openingTag[0].replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return markup.replace(openingTag[0], `${root}<style type="text/css"><![CDATA[${standaloneStyles}]]></style>`);
}
