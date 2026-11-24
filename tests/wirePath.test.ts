import { automaticWireBends, findAutomaticWireBends, newWireRoute, resolveBranchWireRoute, wireRouteObstacles, wireRouteObstructions } from "../src/cad/automaticWireRoute";
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

it("stores a route along the terminal axes when creating a new diagonal wire", () => {
  const from = { endpoint: { componentId: "source", terminalId: "1" }, x: 20, y: 30, vertical: true };
  const to = { endpoint: { componentId: "load", terminalId: "1" }, x: 200, y: 250, vertical: true };
  expect(newWireRoute(from, to, [])?.storedPoints).toEqual([{ x: 20, y: 140 }, { x: 200, y: 140 }]);
  expect(newWireRoute(from, { ...to, vertical: false }, [])?.points).toEqual([{ x: 20, y: 250 }]);
  expect(newWireRoute({ ...from, vertical: false }, to, [])?.points).toEqual([{ x: 200, y: 30 }]);
  expect(automaticWireBends(from, to, [])).toEqual([]);
});

it("rotates and translates power anchors without changing saved wire topology", () => {
  const document = createTwoMotorSequence(), wires = JSON.stringify(document.wires);
  const anchor = () => terminalAnchors(document).find(a => a.endpoint.componentId === "km1" && a.endpoint.terminalId === "l1-in")!;
  expect(anchor()).toMatchObject({ x: 276, y: 353, power: true, vertical: true });
  document.components.find(c => c.id === "km1")!.rotation = 90;
  expect(anchor()).toMatchObject({ x: 327, y: 356, power: true, vertical: false });
  document.components.find(c => c.id === "km1")!.x += 20;
  expect(anchor()).toMatchObject({ x: 347, y: 356 });
  expect(JSON.stringify(document.wires)).toBe(wires);
});

it.each([createTwoMotorSequence, createWiredReversingCircuit])("keeps routes clear of component bodies and reference labels (%#)", (create) => {
  const document = create(), anchors = terminalAnchors(document);
  const obstacles = wireRouteObstacles(document.components);
  const conflicts: string[] = [];
  for (const wire of document.wires) {
    const find = (end: typeof wire.from) => anchors.find(a => a.endpoint.componentId === end.componentId && a.endpoint.terminalId === end.terminalId)!;
    const from = find(wire.from), to = find(wire.to);
    const points = wire.points.length ? wire.points : automaticWireBends(from, to, obstacles);
    const tokens = orthogonalWirePath(from, to, points, from.vertical, to.vertical).split(" ");
    let x = Number(tokens[1]), y = Number(tokens[2]);
    for (let i = 3; i < tokens.length; i += 2) {
      const nx = tokens[i] === "H" ? Number(tokens[i + 1]) : x;
      const ny = tokens[i] === "V" ? Number(tokens[i + 1]) : y;
      for (const c of document.components.filter(c => c.id !== wire.from.componentId && c.id !== wire.to.componentId)) {
        if ((y === ny && y > c.y - 27 && y < c.y + 27 && Math.max(x, nx) > c.x - 47 && Math.min(x, nx) < c.x + 47) ||
            (x === nx && x > c.x - 47 && x < c.x + 47 && Math.max(y, ny) > c.y - 27 && Math.min(y, ny) < c.y + 27)) conflicts.push(`${wire.id} ${wire.from.componentId}->${wire.to.componentId} crosses ${c.reference}`);
      }
      for (const c of document.components) {
        const kind = catalogById.get(c.definitionId)!.referencePrefix;
        for (const [text, top, bottom, width] of [[c.reference, c.y + 37, c.y + 54, c.reference.length * 5], [kind, c.y + 57, c.y + 71, kind.length * 4]] as const) {
          if ((y === ny && y > top && y < bottom && Math.max(x, nx) > c.x - width && Math.min(x, nx) < c.x + width) ||
              (x === nx && x > c.x - width && x < c.x + width && Math.max(y, ny) > top && Math.min(y, ny) < bottom)) conflicts.push(`${wire.id} ${wire.from.componentId}->${wire.to.componentId} crosses label ${text} at ${c.reference} on ${x},${y}->${nx},${ny}`);
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

it("finds a multi-corridor path around staggered obstacles", () => {
  const from = { x: 100, y: 400, endpoint: { componentId: "source", terminalId: "out" } };
  const to = { x: 900, y: 400, endpoint: { componentId: "load", terminalId: "in" } };
  const obstacles = [
    { componentId: "lower", left: 250, right: 380, top: 280, bottom: 772 },
    { componentId: "upper", left: 600, right: 720, top: 0, bottom: 520 },
  ];
  const bends = automaticWireBends(from, to, obstacles);
  expect(bends.length).toBeGreaterThan(2);
  const route = orthogonalWireVertices(from, to, bends);
  expect(route).toContainEqual(expect.objectContaining({ y: 274 }));
  expect(route).toContainEqual(expect.objectContaining({ y: 526 }));
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1], b = route[index];
    expect(a.x === b.x || a.y === b.y).toBe(true);
    for (const box of obstacles) {
      expect(Math.max(a.x, b.x) < box.left || Math.min(a.x, b.x) > box.right ||
        Math.max(a.y, b.y) < box.top || Math.min(a.y, b.y) > box.bottom).toBe(true);
    }
  }
});

it("distinguishes a clear direct connection from a blocked automatic route", () => {
  const from = { x: 100, y: 400, endpoint: { componentId: "source", terminalId: "out" } };
  const to = { x: 900, y: 400, endpoint: { componentId: "load", terminalId: "in" } };
  const barrier = { componentId: "barrier", left: 400, right: 600, top: 0, bottom: 780 };
  expect(findAutomaticWireBends(from, to, [])).toEqual([]);
  expect(findAutomaticWireBends(from, to, [barrier])).toBeNull();
  expect(automaticWireBends(from, to, [barrier])).toEqual([]);
});

it("keeps target-side branch taps on the actual parent route", () => {
  const from = { x: 100, y: 100 };
  const to = { x: 500, y: 300 };
  const bends = [{ x: 240, y: 220 }];
  const tap = { x: 440, y: 300 };
  const branch = wireBranchAtPoint(from, to, bends, false, false, tap);
  expect(branch).toEqual({ source: "from", position: .9 });
  expect(wireBranchRoute(from, to, bends, false, false, "to", .1)?.point).toEqual(tap);
  expect(wireBranchAtPoint(from, to, bends, false, false, { x: 440, y: 220 })).toBeNull();
});

it("keeps a branch attached while routing its outgoing leg around a symbol", () => {
  const source = { endpoint: { componentId: "source", terminalId: "out" }, x: 100, y: 200 };
  const target = { endpoint: { componentId: "target", terminalId: "in" }, x: 600, y: 450 };
  const parentTarget = { x: 500, y: 200 };
  const obstacles = [{ componentId: "unrelated", left: 400, right: 510, top: 270, bottom: 390 }];

  for (const offset of [0, 30]) {
    const from = { ...source, x: source.x + offset };
    const to = { ...target, y: target.y + offset };
    const junction = wireBranchRoute(from, parentTarget, [], false, false, "from", .5)!;
    const tap = { ...junction.point, endpoint: from.endpoint };
    expect(wireRouteObstructions(tap, to, [], obstacles)).toEqual(["unrelated"]);

    const parent = { id: "parent", from: from.endpoint, to: { componentId: "parent-load", terminalId: "in" }, points: [] };
    const branch = { id: "branch", from: from.endpoint, to: to.endpoint, points: [], branchOfWireId: parent.id, branchSource: "from" as const, branchPosition: .5 };
    const anchors = new Map([["source.out", from], ["target.in", to], ["parent-load.in", { ...parentTarget, endpoint: parent.to }]]);
    const route = resolveBranchWireRoute(branch, [parent, branch], anchors, obstacles, (wire) => wire.points)!;
    expect(route.blockedBy).toEqual([]);
    const points = route.points;
    const vertices = orthogonalWireVertices(from, to, points);
    expect(points.slice(0, junction.points.length)).toEqual(junction.points);
    expect(vertices).toContainEqual(junction.point);
    expect(vertices.at(-1)).toEqual(to);
    expect(wireRouteObstructions(from, to, points, obstacles)).toEqual([]);
  }
});
