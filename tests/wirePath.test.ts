import { createWiredReversingCircuit } from "../src/projects/wiredReversingCircuit";
import { expect, it } from "vitest";
import { appendWireRoutePoint, insertWireRoutePointAt, orthogonalWirePath, orthogonalWireVertices, wireBranchAtPoint, wireBranchRoute } from "../src/cad/wirePath";
import { terminalAnchors } from "../src/components/Schematic";
import { createTwoMotorSequence } from "../src/projects/twoMotorSequence";
import { catalogById } from "../src/catalog/dolCatalog";

it("retains saved bend points and approaches vertical power terminals on their axis", () => {
  expect(orthogonalWirePath({x: 20, y: 30}, {x: 200, y: 250}, [{x: 40, y: 80}, {x: 170, y: 210}], true, true))
    .toBe("M 20 30 V 80 H 40 H 170 V 210 H 200 V 250");
  expect(orthogonalWirePath({x: 20, y: 30}, {x: 200, y: 250}))
    .toBe("M 20 30 H 110 V 250 H 200");
});

it("rotates and translates power anchors without changing saved wire topology", () => {
  const document = createTwoMotorSequence(), wires = JSON.stringify(document.wires);
  const anchor = () => terminalAnchors(document).find(a => a.endpoint.componentId === "km1" && a.endpoint.terminalId === "l1-in")!;
  expect(anchor()).toMatchObject({ x: 268, y: 353, power: true, vertical: true });
  document.components.find(c => c.id === "km1")!.rotation = 90;
  expect(anchor()).toMatchObject({ x: 327, y: 348, power: true, vertical: false });
  document.components.find(c => c.id === "km1")!.x += 20;
  expect(anchor()).toMatchObject({ x: 347, y: 348 });
  expect(JSON.stringify(document.wires)).toBe(wires);
});

it.each([createTwoMotorSequence, createWiredReversingCircuit])("keeps routes clear of component bodies and reference labels (%#)", (create) => {
  const document = create(), anchors = terminalAnchors(document);
  const conflicts: string[] = [];
  for (const wire of document.wires) {
    const find = (end: typeof wire.from) => anchors.find(a => a.endpoint.componentId === end.componentId && a.endpoint.terminalId === end.terminalId)!;
    const from = find(wire.from), to = find(wire.to);
    const tokens = orthogonalWirePath(from, to, wire.points, from.vertical, to.vertical).split(" ");
    let x = Number(tokens[1]), y = Number(tokens[2]);
    for (let i = 3; i < tokens.length; i += 2) {
      const nx = tokens[i] === "H" ? Number(tokens[i + 1]) : x;
      const ny = tokens[i] === "V" ? Number(tokens[i + 1]) : y;
      for (const c of document.components.filter(c => c.id !== wire.from.componentId && c.id !== wire.to.componentId)) {
        if ((y === ny && y > c.y - 27 && y < c.y + 27 && Math.max(x, nx) > c.x - 47 && Math.min(x, nx) < c.x + 47) ||
            (x === nx && x > c.x - 47 && x < c.x + 47 && Math.max(y, ny) > c.y - 27 && Math.min(y, ny) < c.y + 27)) conflicts.push(`${wire.from.componentId}->${wire.to.componentId} crosses ${c.reference}`);
      }
      for (const c of document.components) {
        const kind = catalogById.get(c.definitionId)!.referencePrefix;
        for (const [text, top, bottom, width] of [[c.reference, c.y + 37, c.y + 54, c.reference.length * 5], [kind, c.y + 57, c.y + 71, kind.length * 4]] as const) {
          if ((y === ny && y > top && y < bottom && Math.max(x, nx) > c.x - width && Math.min(x, nx) < c.x + width) ||
              (x === nx && x > c.x - width && x < c.x + width && Math.max(y, ny) > top && Math.min(y, ny) < bottom)) conflicts.push(`${wire.from.componentId}->${wire.to.componentId} crosses label ${text}`);
        }
      }
      x = nx; y = ny;
    }
  }
  expect([...new Set(conflicts)]).toEqual([]);
});

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

it("adds a route waypoint on the final rendered segment", () => {
  const from = { x: 100, y: 100 }; const to = { x: 500, y: 300 };
  const original = [{ x: 240, y: 100 }];
  const updated = appendWireRoutePoint(from, to, original);
  expect(updated).toHaveLength(2);
  expect(updated[1]).toEqual({ x: 370, y: 300 });
  expect(appendWireRoutePoint(from, from, [])).toEqual([]);
});

it("inserts a route waypoint where the user clicks an existing wire segment", () => {
  const from = { x: 100, y: 100 }; const to = { x: 500, y: 300 };
  const first = insertWireRoutePointAt(from, to, [], false, false, { x: 241, y: 103 });
  expect(first).toMatchObject({ point: { x: 240, y: 100 }, index: 0, points: [{ x: 240, y: 100 }] });
  const nested = insertWireRoutePointAt(from, to, [{ x: 240, y: 100 }], false, false, { x: 243, y: 180 });
  expect(nested).toMatchObject({ point: { x: 240, y: 180 }, index: 1 });
  expect(orthogonalWireVertices(from, to, nested!.points).some((point) => point.x === nested!.point.x && point.y === nested!.point.y)).toBe(true);
  expect(insertWireRoutePointAt(from, to, [], false, false, { x: 700, y: 700 })).toBeNull();
});
