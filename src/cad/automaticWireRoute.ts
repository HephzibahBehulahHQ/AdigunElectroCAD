import { instanceFootprint } from "./componentGeometry";
import { orthogonalWireVertices, wireBranchRoute } from "./wirePath";
import { endpointKey, type TerminalAnchor } from "./terminalAnchors";
import type { ComponentInstance, SchematicGraphicPoint, Wire } from "../types/electrical";

type Obstacle = ReturnType<typeof instanceFootprint> & { componentId: string };

export function wireRouteObstacles(components: readonly ComponentInstance[], millimetres = false): Obstacle[] {
  return components.map((component) => ({ ...instanceFootprint(component, millimetres), componentId: component.id }));
}

function segmentIsClear(start: SchematicGraphicPoint, end: SchematicGraphicPoint, obstacles: readonly Obstacle[]): boolean {
  return obstacles.every(({ left, right, top, bottom }) =>
    Math.max(start.x, end.x) < left || Math.min(start.x, end.x) > right ||
    Math.max(start.y, end.y) < top || Math.min(start.y, end.y) > bottom);
}

function routeIsClear(vertices: readonly SchematicGraphicPoint[], obstacles: readonly Obstacle[]): boolean {
  return vertices.slice(1).every((end, index) => segmentIsClear(vertices[index], end, obstacles));
}

function searchCorridorGrid(from: SchematicGraphicPoint, to: SchematicGraphicPoint, xs: number[], ys: number[], obstacles: readonly Obstacle[]): SchematicGraphicPoint[] | null {
  const columns = [...new Set([...xs, from.x, to.x])].sort((a, b) => a - b);
  const rows = [...new Set([...ys, from.y, to.y])].sort((a, b) => a - b);
  const width = columns.length;
  const node = (point: SchematicGraphicPoint) => rows.indexOf(point.y) * width + columns.indexOf(point.x);
  const pointAt = (id: number) => ({ x: columns[id % width], y: rows[Math.floor(id / width)] });
  const start = node(from), target = node(to);
  const parents = new Map([[start, start]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current === target) {
      const path = [pointAt(target)];
      for (let id = target; id !== start;) {
        id = parents.get(id)!;
        path.push(pointAt(id));
      }
      path.reverse();
      return path.slice(1, -1).filter((point, index) => {
        const before = path[index], after = path[index + 2];
        return (before.x !== point.x || point.x !== after.x) &&
          (before.y !== point.y || point.y !== after.y);
      });
    }
    const row = Math.floor(current / width), column = current % width;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextColumn = column + dx, nextRow = row + dy;
      if (nextColumn < 0 || nextColumn >= width || nextRow < 0 || nextRow >= rows.length) continue;
      const next = nextRow * width + nextColumn;
      if (parents.has(next) || !segmentIsClear(pointAt(current), pointAt(next), obstacles)) continue;
      parents.set(next, current);
      queue.push(next);
    }
  }
  return null;
}

export function wireRouteObstructions(from: TerminalAnchor, to: TerminalAnchor, bends: readonly SchematicGraphicPoint[], obstacles: readonly Obstacle[]): string[] {
  const vertices = orthogonalWireVertices(from, to, bends, from.vertical, to.vertical);
  return obstacles.filter((obstacle) => obstacle.componentId !== from.endpoint.componentId &&
    obstacle.componentId !== to.endpoint.componentId && !routeIsClear(vertices, [obstacle]))
    .map(({ componentId }) => componentId);
}

/** Preserve the standard center route when clear. Search nearby orthogonal corridors when it is blocked. */
export function findAutomaticWireBends(from: TerminalAnchor, to: TerminalAnchor, obstacles: readonly Obstacle[]): SchematicGraphicPoint[] | null {
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
  return best.length ? best : searchCorridorGrid(from, to, xs, ys, otherSymbols);
}

/** Keep previously saved wires visible if the geometry no longer permits an automatic route. */
export function automaticWireBends(from: TerminalAnchor, to: TerminalAnchor, obstacles: readonly Obstacle[]): SchematicGraphicPoint[] {
  return findAutomaticWireBends(from, to, obstacles) ?? [];
}

/** Preserve the parent prefix and route only the outgoing leg from its junction. */
function automaticBranchWireRoute(
  from: TerminalAnchor,
  to: TerminalAnchor,
  junction: { point: SchematicGraphicPoint; points: SchematicGraphicPoint[] },
  obstacles: readonly Obstacle[],
): BranchWireRoute {
  const tap = { ...junction.point, endpoint: from.endpoint };
  const bends = findAutomaticWireBends(tap, to, obstacles);
  const leg = orthogonalWireVertices(tap, to, bends ?? [], false, to.vertical);
  return {
    point: junction.point,
    points: [...junction.points, ...leg.slice(1, -1)],
    blockedBy: bends === null ? wireRouteObstructions(tap, to, [], obstacles) : [],
  };
}
interface BranchWireRoute {
  point: SchematicGraphicPoint;
  points: SchematicGraphicPoint[];
  blockedBy: string[];
}

export function resolveBranchWireRoute(
  wire: Wire,
  wires: readonly Wire[],
  anchors: ReadonlyMap<string, TerminalAnchor>,
  obstacles: readonly Obstacle[],
  routePoints: (wire: Wire) => readonly SchematicGraphicPoint[],
  seen = new Set<string>(),
): BranchWireRoute | null {
  if (!wire.branchOfWireId || !wire.branchSource || wire.branchPosition === undefined || seen.has(wire.id)) return null;
  const parent = wires.find(({ id }) => id === wire.branchOfWireId);
  if (!parent) return null;
  const from = anchors.get(endpointKey(parent.from));
  const to = anchors.get(endpointKey(parent.to));
  const source = anchors.get(endpointKey(wire.from));
  const target = anchors.get(endpointKey(wire.to));
  if (!from || !to || !source || !target) return null;
  const parentBranch = resolveBranchWireRoute(parent, wires, anchors, obstacles, routePoints, new Set([...seen, wire.id]));
  const junction = wireBranchRoute(from, to, parentBranch?.points ?? routePoints(parent), from.vertical ?? false, to.vertical ?? false, wire.branchSource, wire.branchPosition);
  return junction && automaticBranchWireRoute(source, target, junction, obstacles);
}