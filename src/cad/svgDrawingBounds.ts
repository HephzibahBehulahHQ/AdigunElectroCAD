import type { DrawingBounds } from "./drawingCamera";

/** Measure SVG nodes in drawing coordinates, including their local transforms. */
export function svgDrawingBounds(svg: SVGSVGElement, selector: string): DrawingBounds | null {
  const root = svg.getCTM();
  if (!root) return null;
  const inverse = root.inverse();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const node of svg.querySelectorAll<SVGGraphicsElement>(selector)) {
    if (node.closest('[data-export-exclude], [data-graphic-id="__preview__"]')) continue;
    const matrix = node.getCTM();
    if (!matrix) continue;
    const { x, y, width, height } = node.getBBox();
    if (!width && !height) continue;
    const transform = inverse.multiply(matrix);
    for (const point of [new DOMPoint(x, y), new DOMPoint(x + width, y), new DOMPoint(x, y + height), new DOMPoint(x + width, y + height)]) {
      const world = point.matrixTransform(transform);
      left = Math.min(left, world.x); top = Math.min(top, world.y);
      right = Math.max(right, world.x); bottom = Math.max(bottom, world.y);
    }
  }
  return Number.isFinite(left) ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}
