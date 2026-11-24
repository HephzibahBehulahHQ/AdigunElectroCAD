import { moveComponentsByOffset } from "../src/cad/documentOps";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { newWireRoute } from "../src/cad/automaticWireRoute";
import { orthogonalWireVertices } from "../src/cad/wirePath";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { windingConnection } from "../src/electrical/windingConnections";
import { encodeProject, parseProjectJson } from "../src/projects/projectSerialization";

it("reopens both six-lead circuits and derives the connection from the terminal pairs", () => {
  const file = new URL("../public/examples/siemens-six-lead-winding-connections.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  expect(parseProjectJson(JSON.stringify(encodeProject(project)))).toEqual(project);
  for (const [index, connection] of ["star", "delta"].entries()) {
    const {document} = project.sheets[index];
    expect(windingConnection(document, "motor")).toBe(connection);
    const broken = { ...document, wires: document.wires.slice(0, -1) };
    expect(windingConnection(broken, "motor")).toBe("invalid");
    const disconnected = { ...document, wires: document.wires.slice(0, -3) };
    expect(windingConnection(disconnected, "motor")).toBe("open");
  }
});


it("keeps an explicitly routed motor wire on the same terminals after moving and reopening the motor", () => {
  const file = new URL("../public/examples/siemens-six-lead-winding-connections.json", import.meta.url);
  const project = parseProjectJson(readFileSync(file, "utf8"));
  const [star] = project.sheets;
  const document = { ...star.document, components: star.document.components.map(component =>
    component.id === "supply" ? { ...component, x: component.x - 130 } : component) };
  const wire = document.wires.find(wire => wire.id === "L1")!;
  const locate = (drawing: typeof document, side: "from" | "to") => terminalAnchors(drawing).find(({ endpoint }) =>
    endpoint.componentId === wire[side].componentId && endpoint.terminalId === wire[side].terminalId)!;
  const source = locate(document, "from");
  const destination = locate(document, "to");
  const route = newWireRoute(source, destination, [])!;
  expect(route.storedPoints).toHaveLength(2);
  document.wires = document.wires.map(item => item === wire ? { ...wire, points: route.storedPoints } : item);
  const moved = moveComponentsByOffset(document, ["motor"], 20, 20);
  expect(moved.ok).toBe(true);
  const reopened = parseProjectJson(JSON.stringify(encodeProject({ ...project, sheets: [{ ...star, document: moved.document }] }))).sheets[0].document;
  const saved = reopened.wires.find(item => item.id === wire.id)!;
  expect(saved).toMatchObject({ from: wire.from, to: wire.to, points: route.storedPoints });
  const movedDestination = locate(reopened, "to");
  expect(movedDestination).toMatchObject({ x: destination.x + 20, y: destination.y + 20 });
  const vertices = orthogonalWireVertices(source, movedDestination, saved.points, source.vertical, movedDestination.vertical);
  expect(vertices[0]).toMatchObject({ x: source.x, y: source.y });
  expect(vertices.at(-1)).toMatchObject({ x: movedDestination.x, y: movedDestination.y });
});
