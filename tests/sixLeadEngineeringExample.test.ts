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
