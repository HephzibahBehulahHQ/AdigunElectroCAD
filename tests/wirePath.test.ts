import { expect, it } from "vitest";
import { orthogonalWireVertices, wireBranchAtPoint, wireBranchRoute } from "../src/cad/wirePath";

it("finds a branch position on a rendered orthogonal wire and builds its route prefix", () => {
  const from = { x: 100, y: 100 }; const to = { x: 500, y: 300 };
  const bends = [{ x: 240, y: 100 }, { x: 240, y: 220 }];
  const vertices = orthogonalWireVertices(from, to, bends, false, true);
  const click = { x: 240, y: 170 };
  const branch = wireBranchAtPoint(from, to, bends, false, true, click);
  expect(branch).not.toBeNull();
  const route = wireBranchRoute(from, to, bends, false, true, branch!.source, branch!.position);
  expect(route?.point).toEqual(click);
  expect(route?.points.at(-1)).toEqual(click);
  expect(vertices.some((vertex, index) => {
    const next = vertices[index + 1];
    return Boolean(next && vertex.x === next.x && click.x === vertex.x && click.y >= Math.min(vertex.y, next.y) && click.y <= Math.max(vertex.y, next.y));
  })).toBe(true);
});

it("reprojects a saved junction fraction when a wire endpoint moves", () => {
  const first = wireBranchRoute({ x: 100, y: 100 }, { x: 500, y: 300 }, [], false, false, "from", .5);
  const moved = wireBranchRoute({ x: 100, y: 100 }, { x: 700, y: 300 }, [], false, false, "from", .5);
  expect(first).not.toBeNull(); expect(moved).not.toBeNull();
  expect(moved!.point).not.toEqual(first!.point);
});
