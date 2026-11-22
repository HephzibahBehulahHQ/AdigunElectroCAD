import { instanceFootprint } from "./componentGeometry";
import { orthogonalWireVertices } from "./wirePath";
import type { TerminalAnchor } from "./terminalAnchors";
import type { ComponentInstance, SchematicGraphicPoint } from "../types/electrical";

type Obstacle = ReturnType<typeof instanceFootprint> & { componentId: string };

export function wireRouteObstacles(components: readonly ComponentInstance[]): Obstacle[] {
  return components.map((component) => ({ ...instanceFootprint(component), componentId: component.id }));
}

function routeIsClear(vertices: readonly SchematicGraphicPoint[], obstacles: readonly Obstacle[]): boolean {
  return vertices.slice(1).every((end, index) => {
    const start = vertices[index];
    return obstacles.every(({ left, right, top, bottom }) =>
      Math.max(start.x, end.x) < left || Math.min(start.x, end.x) > right ||
      Math.max(start.y, end.y) < top || Math.min(start.y, end.y) > bottom);
  });
}

/** Preserve the standard center route when clear. Search nearby orthogonal corridors when it is blocked. */
export function automaticWireBends(from: TerminalAnchor, to: TerminalAnchor, obstacles: readonly Obstacle[]): SchematicGraphicPoint[] {
  const otherSymbols = obstacles.filter(({ componentId }) => componentId !== from.endpoint.componentId && componentId !== to.endpoint.componentId);
  const vertices = (bends: SchematicGraphicPoint[]) => orthogonalWireVertices(from, to, bends, from.vertical, to.vertical);
  if (routeIsClear(vertices([]), otherSymbols)) return [];
  const candidates: SchematicGraphicPoint[][] = [];
  const corridors = (coordinates: number[], minimum: number, maximum: number, center: number) =>
    [...new Set(coordinates)].filter((value) => value >= minimum && value <= maximum)
      .sort((left, right) => Math.abs(left - center) - Math.abs(right - center) || left - right).slice(0, 20);
  const xs = corridors([8, 1092, ...otherSymbols.flatMap(({ left, right }) => [left - 6, right + 6])], 8, 1092, (from.x + to.x) / 2);
  const ys = corridors([88, 772, ...otherSymbols.flatMap(({ top, bottom }) => [top - 6, bottom + 6])], 8, 772, (from.y + to.y) / 2);
  for (const x of xs) candidates.push([{ x, y: from.y }, { x, y: to.y }]);
  for (const y of ys) candidates.push([{ x: from.x, y }, { x: to.x, y }]);
  let best: SchematicGraphicPoint[] = [];
  let bestCost = Infinity;
  for (const candidate of candidates) {
    const route = vertices(candidate);
    if (!routeIsClear(route, otherSymbols)) continue;
    const length = route.slice(1).reduce((sum, point, index) => sum + Math.abs(point.x - route[index].x) + Math.abs(point.y - route[index].y), 0);
    const cost = length + route.length * 4;
    if (cost < bestCost) { best = candidate; bestCost = cost; }
  }
  return best;
}
