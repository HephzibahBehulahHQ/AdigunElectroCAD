import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { FunctionalSymbol } from "../src/components/functionalSymbols";
import { terminalAnchors } from "../src/components/Schematic";
import { canConnectTerminals } from "../src/electrical/topology";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createStarterProject } from "../src/projects/starterProject";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { executeCircuitModels } from "../src/simulation/circuitModels";

it("adds three user-owned indicators without assigning branches or simulated behavior", () => {
  const document = createDolMotorStarter();
  const lamps = document.components.filter((component) => component.definitionId === "user.indicator-lamp");
  expect(lamps.map((lamp) => lamp.reference)).toEqual(["H1", "H2", "H3"]);
  expect(document.wires.some((wire) => [wire.from, wire.to].some((endpoint) => endpoint.componentId.startsWith("lamp-")))).toBe(false);
  expect(executeCircuitModels(document, catalogById).some((run) => run.componentId.startsWith("lamp-"))).toBe(false);
  for (const lamp of lamps) {
    const terminals = terminalAnchors(document).filter((anchor) => anchor.endpoint.componentId === lamp.id);
    expect(terminals.map((anchor) => [anchor.endpoint.terminalId, anchor.x - lamp.x, anchor.y - lamp.y])).toEqual([["t1", -32, -13], ["t2", 32, -13]]);
  }
  expect(canConnectTerminals(document, catalogById, { componentId: "lamp-h1", terminalId: "t1" }, { componentId: "lamp-h2", terminalId: "t2" }).ok).toBe(true);
});

it("renders the chosen color and per-instance terminal display labels", () => {
  const markup = renderToStaticMarkup(createElement(FunctionalSymbol, {
    symbolId: "user-indicator-lamp", x: 100, y: 100,
    properties: { color: "#14b8a6", terminalLabel1: "READY", terminalLabel2: "RETURN" },
  }));
  expect(markup).toContain('fill="#14b8a6"');
  expect(markup).toContain(">READY</text>");
  expect(markup).toContain(">RETURN</text>");
});

it("round-trips user-selected indicator color, indication and terminal labels", () => {
  const project = createStarterProject();
  const lamp = project.sheets[0].document.components.find((component) => component.id === "lamp-h1")!;
  lamp.properties = { ...lamp.properties, color: "#ff00aa", indication: "Machine ready", terminalLabel1: "L+", terminalLabel2: "N" };
  const restored = parseProjectJson(JSON.stringify(project));
  expect(restored.sheets[0].document.components.find((component) => component.id === "lamp-h1")?.properties).toMatchObject({
    color: "#ff00aa", indication: "Machine ready", terminalLabel1: "L+", terminalLabel2: "N",
  });
});

