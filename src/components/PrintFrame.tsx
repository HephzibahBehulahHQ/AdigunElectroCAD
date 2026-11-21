import { printFrameBounds, type PrintLayout } from "../cad/printLayout";

export function PrintFrame({ layout }: { layout: PrintLayout }) {
  const { x, y, width, height } = printFrameBounds(layout);
  const margin = layout.marginMm * layout.unitsPerMm;
  const innerWidth = width - margin * 2, innerHeight = height - margin * 2;
  const titleWidth = Math.min(innerWidth, 85 * layout.unitsPerMm);
  const titleHeight = Math.min(innerHeight, 10 * layout.unitsPerMm);
  const titleX = x + width - margin - titleWidth, titleY = y + height - margin - titleHeight;
  return <g data-print-frame="" visibility={layout.visible ? "visible" : "hidden"} pointerEvents="none" aria-label="Print frame">
    <rect x={x} y={y} width={width} height={height} fill="none" stroke="#334e68" strokeWidth={.25 * layout.unitsPerMm} />
    {margin > 0 && <rect x={x + margin} y={y + margin} width={innerWidth} height={innerHeight} fill="none" stroke="#627d98" strokeWidth={.18 * layout.unitsPerMm} />}
    {layout.title && <g>
      <rect x={titleX} y={titleY} width={titleWidth} height={titleHeight} fill="#f7f9fc" stroke="#334e68" strokeWidth={.18 * layout.unitsPerMm} />
      <text x={titleX + titleWidth / 2} y={titleY + titleHeight * .65} textAnchor="middle" fill="#102a43" fontSize={Math.min(titleHeight * .45, 3 * layout.unitsPerMm)}
        textLength={layout.title.length > 34 ? titleWidth * .94 : undefined} lengthAdjust="spacingAndGlyphs">{layout.title}</text>
    </g>}
  </g>;
}
