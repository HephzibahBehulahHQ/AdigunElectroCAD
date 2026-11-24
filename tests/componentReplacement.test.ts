import { expect, it } from "vitest";
import { terminalGridReference } from "../src/cad/terminalAnchors";
import { replaceCatalogComponent } from "../src/projects/componentReplacement";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { addFreeSchematicSheet, createBlankProject } from "../src/projects/starterProject";

it("requires an explicit, unique map for local wires and cross-sheet terminal references", () => {
  const project = addFreeSchematicSheet(createBlankProject());
  const [sheet, other] = project.sheets;
  const connector = { id: "connector", definitionId: "phoenix-contact.sacc.1662256", reference: "X1", x: 500, y: 300, rotation: 0 as const, properties: {} };
  const lamp = { id: "lamp", definitionId: "user.indicator-lamp", reference: "H1", x: 800, y: 300, rotation: 0 as const, properties: {} };
  sheet.document.components = [connector, lamp];
  other.document.components = [{ ...lamp, id: "remote" }];
  const points = [{ x: 650, y: 300 }];
  sheet.document.wires = [{ id: "w1", from: { componentId: connector.id, terminalId: "5" }, to: { componentId: lamp.id, terminalId: "t1" }, points, netName: "Local" }];
  const source = { componentId: connector.id, terminalId: "1" };
  const destination = { componentId: "remote", terminalId: "t1" };
  project.continuations = [{ id: "net", label: "Remote", conductorColor: "#123456", points: [
    { sheetId: sheet.id, endpoint: source, role: "source", gridReference: terminalGridReference(sheet.document, source) },
    { sheetId: other.id, endpoint: destination, role: "destination", gridReference: terminalGridReference(other.document, destination) },
  ] }];
  const replace = (pairs: [string, string][]) => replaceCatalogComponent(project, sheet.id, connector.id, "phoenix-contact.pttb.3210567", new Map(pairs));
  expect(replace([["5", "upper-left"]])).toMatchObject({ project, reason: "Choose a compatible destination for 1." });
  expect(replace([["5", "upper-left"], ["1", "upper-left"]])).toMatchObject({ project, reason: "Use a distinct destination for each connected terminal." });
  const replaced = replace([["5", "upper-left"], ["1", "lower-right"]]);
  expect(replaced.reason).toBeUndefined();
  const reopened = parseProjectJson(JSON.stringify(replaced.project));
  expect(reopened.sheets[0].document.wires[0]).toMatchObject({ id: "w1", points, from: { componentId: connector.id, terminalId: "upper-left" } });
  expect(reopened.continuations?.[0].points[0].endpoint).toEqual({ componentId: connector.id, terminalId: "lower-right" });
});
