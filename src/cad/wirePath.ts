interface Point { x: number; y: number; }
export type WireBranchSource = "from" | "to";

export function orthogonalWireVertices(from: Point, to: Point, bends: readonly Point[] = [], fromVertical = false, toVertical = false): Point[] {
  const vertices = [from];
  const append = (point: Point) => {
    const last = vertices[vertices.length - 1];
    if (last.x !== point.x || last.y !== point.y) vertices.push(point);
  };
  if (!bends.length) {
    const middle = Math.round((from.x + to.x) / 2);
    append({ x: middle, y: from.y }); append({ x: middle, y: to.y }); append(to);
    return vertices;
  }
  let current = from;
  bends.forEach((point, index) => {
    append(index === 0 && fromVertical ? { x: current.x, y: point.y } : { x: point.x, y: current.y });
    append(point); current = point;
  });
  append(toVertical ? { x: to.x, y: current.y } : { x: current.x, y: to.y }); append(to);
  return vertices;
}

export function appendWireRoutePoint(from: Point, to: Point, bends: readonly Point[] = [], fromVertical = false, toVertical = false): Point[] {
  const vertices = orthogonalWireVertices(from, to, bends, fromVertical, toVertical);
  if (vertices.length < 2) return [...bends];
  const end = vertices.at(-1)!; const start = vertices.at(-2)!;
  const point = { x: Math.round((start.x + end.x) / 2), y: Math.round((start.y + end.y) / 2) };
  if (bends.some((bend) => bend.x === point.x && bend.y === point.y)) return [...bends];
  return [...bends, point];
}

export function wireBranchAtPoint(from: Point, to: Point, bends: readonly Point[], fromVertical: boolean, toVertical: boolean, point: Point, tolerance = 18): { source: WireBranchSource; position: number } | null {
  const candidates = [
    { source: "from" as const, vertices: orthogonalWireVertices(from, to, bends, fromVertical, toVertical) },
    { source: "to" as const, vertices: orthogonalWireVertices(to, from, [...bends].reverse(), toVertical, fromVertical) },
  ];
  let best: { source: WireBranchSource; position: number; distance: number } | null = null;
  for (const candidate of candidates) {
    const lengths = candidate.vertices.slice(1).map((end, index) => Math.abs(end.x - candidate.vertices[index].x) + Math.abs(end.y - candidate.vertices[index].y));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    if (!total) continue;
    let traversed = 0;
    for (let index = 0; index < lengths.length; index++) {
      const start = candidate.vertices[index]; const end = candidate.vertices[index + 1]; const length = lengths[index];
      if (!length) continue;
      const horizontal = start.y === end.y;
      const coordinate = horizontal ? Math.max(Math.min(point.x, Math.max(start.x, end.x)), Math.min(start.x, end.x)) : Math.max(Math.min(point.y, Math.max(start.y, end.y)), Math.min(start.y, end.y));
      const junction = horizontal ? { x: coordinate, y: start.y } : { x: start.x, y: coordinate };
      const distance = Math.hypot(point.x - junction.x, point.y - junction.y);
      const position = (traversed + (horizontal ? Math.abs(junction.x - start.x) : Math.abs(junction.y - start.y))) / total;
      if (!best || distance < best.distance) best = { source: candidate.source, position, distance };
      traversed += length;
    }
  }
  return best && best.distance <= tolerance && best.position >= .02 && best.position <= .98 ? { source: best.source, position: best.position } : null;
}

export function wireBranchRoute(from: Point, to: Point, bends: readonly Point[], fromVertical: boolean, toVertical: boolean, source: WireBranchSource, position: number): { point: Point; points: Point[] } | null {
  const start = source === "from" ? from : to; const end = source === "from" ? to : from;
  const routeBends = source === "from" ? bends : [...bends].reverse();
  const startVertical = source === "from" ? fromVertical : toVertical; const endVertical = source === "from" ? toVertical : fromVertical;
  const vertices = orthogonalWireVertices(start, end, routeBends, startVertical, endVertical);
  const lengths = vertices.slice(1).map((point, index) => Math.abs(point.x - vertices[index].x) + Math.abs(point.y - vertices[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!total || !Number.isFinite(position) || position <= 0 || position >= 1) return null;
  let remaining = total * position;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]; const fromPoint = vertices[index]; const toPoint = vertices[index + 1];
    if (remaining <= length || index === lengths.length - 1) {
      const distance = Math.max(0, Math.min(length, remaining));
      const point = fromPoint.x === toPoint.x ? { x: fromPoint.x, y: fromPoint.y + Math.sign(toPoint.y - fromPoint.y) * distance } : { x: fromPoint.x + Math.sign(toPoint.x - fromPoint.x) * distance, y: fromPoint.y };
      return { point, points: [...vertices.slice(1, index + 1), point] };
    }
    remaining -= length;
  }
  return null;
}

export function orthogonalWirePath(from: Point, to: Point, bends: readonly Point[] = [], fromVertical = false, toVertical = false): string {
  if (!bends.length) {
    const middle = Math.round((from.x + to.x) / 2);
    return `M ${from.x} ${from.y} H ${middle} V ${to.y} H ${to.x}`;
  }
  let path = `M ${from.x} ${from.y}`;
  bends.forEach((point, index) => { path += index === 0 && fromVertical ? ` V ${point.y} H ${point.x}` : ` H ${point.x} V ${point.y}`; });
  return path + (toVertical ? ` H ${to.x} V ${to.y}` : ` V ${to.y} H ${to.x}`);
}
