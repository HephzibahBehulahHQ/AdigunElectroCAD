interface Point { x: number; y: number; }
export function orthogonalWirePath(from: Point, to: Point, bends: readonly Point[] = [], fromVertical = false, toVertical = false): string {
  if (!bends.length) {
    const middle = Math.round((from.x + to.x) / 2);
    return `M ${from.x} ${from.y} H ${middle} V ${to.y} H ${to.x}`;
  }
  let path = `M ${from.x} ${from.y}`;
  bends.forEach((point, index) => { path += index === 0 && fromVertical ? ` V ${point.y} H ${point.x}` : ` H ${point.x} V ${point.y}`; });
  return path + (toVertical ? ` H ${to.x} V ${to.y}` : ` V ${to.y} H ${to.x}`);
}
