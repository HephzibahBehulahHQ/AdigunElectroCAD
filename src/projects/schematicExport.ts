import { paperDimensions, printFrameBounds, type PrintLayout } from "../cad/printLayout";

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
  .wire.manual-wire.pneumatic-wire { stroke: #087e89; stroke-dasharray: 9 3 2 3; }
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
  .contact-blade.open-fault { stroke: #d84a3a; }
  .mechanical-link { fill: none; stroke: #667991; stroke-width: 2.5; stroke-dasharray: 7 6; }
  .free-symbol, .coil, .overload { fill: #f7fbff; stroke: #24456b; stroke-width: 2; }
  .free-reference, .reference-label { fill: #102a43; font-size: 15px; font-weight: 900; }
  .free-kind, .device-label, .sheet-note { fill: #35506e; font-size: 12px; font-weight: 700; }
  .motor { fill: #d9e8f5; stroke: #2261cf; stroke-width: 5; }
  .motor.running { fill: #c4f3d9; stroke: #158b59; }
  .motor-mark { fill: #2454c4; font-size: 37px; font-weight: 900; }
  .motor-phase { fill: #2454c4; font-size: 19px; font-weight: 800; }
  .coil.energized { fill: #c4f3d9; stroke: #158b59; }
  .coil-label { fill: #17324f; font-size: 13px; font-weight: 900; }
  .overload.tripped { fill: #fbd0cd; stroke: #d84a3a; }
  .generic-symbol-mark, .functional-symbol { stroke: var(--component-ink, #2272ad); stroke-width: 2.4; }
  .functional-symbol-text { stroke: none; fill: #17649c; font-size: 10px; font-weight: 900; }
  .terminal-pin { fill: #fff; stroke: #1e5f96; stroke-width: 2.5; }
  .free-terminal-label { fill: #13233b; font-size: 10px; font-weight: 800; paint-order: stroke; stroke: #f4f8fc; stroke-width: 3px; stroke-linejoin: round; }
  .wire-junction { fill: #7c3aed; }
  .project-continuation-marker rect { fill: #f8fbff; stroke-width: 1.5; }
  .project-continuation-marker text { font: 700 10px ui-monospace, Consolas, monospace; paint-order: stroke; stroke: #f8fbff; stroke-width: 2px; stroke-linejoin: round; }
`;

type DrawingBounds = { x: number; y: number; width: number; height: number };

export function paddedDrawingBounds(bounds: DrawingBounds, padding = 24): DrawingBounds {
  const x = Math.floor(bounds.x - padding), y = Math.floor(bounds.y - padding);
  return { x, y, width: Math.ceil(bounds.x + bounds.width + padding) - x, height: Math.ceil(bounds.y + bounds.height + padding) - y };
}

export function drawingFitsFrame(bounds: DrawingBounds, frame: DrawingBounds): boolean {
  return bounds.x >= frame.x && bounds.y >= frame.y && bounds.x + bounds.width <= frame.x + frame.width && bounds.y + bounds.height <= frame.y + frame.height;
}

export function snapshotSchematicSvg(drawing: SVGSVGElement, scope: "drawing" | "frame" = "drawing", layout?: PrintLayout): { svg: SVGSVGElement; clipsContent: boolean } {
  const copy = drawing.cloneNode(true) as SVGSVGElement;
  const editingAids = [
    "[data-export-exclude]", ".selection-boundary", ".selection-marquee", ".terminal-anchors",
    ".wire-branch-hit-target", ".wire-route-hit-target", ".wire-route-handle",
    "[data-resize-handle]", "[data-vertex-handle]", "[data-graphic-id=__preview__]",
  ];
  copy.querySelectorAll(editingAids.join(", ")).forEach((node) => node.remove());
  copy.querySelectorAll(".selected, .selected-wire").forEach((node) => node.classList.remove("selected", "selected-wire"));
  copy.querySelectorAll("[data-export-grid-spacing]").forEach(pattern => {
    const spacing = pattern.getAttribute("data-export-grid-spacing")!;
    pattern.setAttribute("width", spacing);
    pattern.setAttribute("height", spacing);
    pattern.querySelector("path")?.setAttribute("d", `M ${spacing} 0 L 0 0 0 ${spacing}`);
    pattern.removeAttribute("data-export-grid-spacing");
  });
  copy.removeAttribute("style");
  const frame = layout ? printFrameBounds(layout) : { x: 0, y: 0, width: 1100, height: 780 };
  const printOverlay = copy.querySelector("[data-print-frame]");
  if (scope === "frame") printOverlay?.setAttribute("visibility", "visible");
  else printOverlay?.remove();
  let bounds = scope === "frame" ? frame : { x: 0, y: 0, width: 1100, height: 780 };
  let clipsContent = false;
  const content = copy.querySelector<SVGGElement>("[data-drawing-content]");
  if (content?.childElementCount) {
    // Use a fixed CSS scale so browser text measurements cannot vary with the camera.
    copy.setAttribute("viewBox", "0 0 1100 780");
    copy.setAttribute("style", "position: fixed; visibility: hidden; pointer-events: none; width: 1100px; height: 780px; min-width: 0; min-height: 0");
    drawing.parentElement?.append(copy);
    try {
      const measured = content.getBBox();
      if (measured.width > 0 || measured.height > 0) {
        clipsContent = !drawingFitsFrame(paddedDrawingBounds(measured, 6), frame);
        if (scope === "drawing") bounds = paddedDrawingBounds(measured);
      }
    } finally {
      copy.remove();
      copy.removeAttribute("style");
    }
  }
  const { x, y, width, height } = bounds;
  copy.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  copy.querySelectorAll("[data-viewport-fill]").forEach((node) => {
    for (const [name, value] of Object.entries(bounds)) node.setAttribute(name, String(value));
    node.removeAttribute("data-viewport-fill");
  });
  const physical = scope === "frame" && layout ? paperDimensions(layout) : undefined;
  copy.setAttribute("width", physical ? `${physical.width}mm` : String(width));
  copy.setAttribute("height", physical ? `${physical.height}mm` : String(height));
  return { svg: copy, clipsContent };
}

export function prepareStandaloneSchematicSvg(markup: string): string {
  const openingTag = markup.match(/^<svg\b[^>]*>/);
  if (!openingTag) throw new Error("The drawing does not contain an SVG root.");
  const root = openingTag[0].includes("xmlns=") ? openingTag[0] : openingTag[0].replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return markup.replace(openingTag[0], `${root}<style type="text/css"><![CDATA[${standaloneStyles}]]></style>`);
}
