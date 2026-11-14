import { expect, it } from "vitest";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";
import { createProjectContinuation, resolveProjectNet } from "../src/projects/projectContinuations";

it("creates a real cross-sheet continuation and exposes both endpoints in the project net graph", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const [source, destination] = project.sheets;
  const supply = source.document.components.find((component) => component.id === "supply")!;
  const feeder = createDolMotorStarter();
  const breaker = { ...feeder.components.find((component) => component.id === "breaker")!, id: "destination-breaker", reference: "Q2" };
  const control = { ...feeder.components.find((component) => component.id === "control")!, id: "destination-control", reference: "X2" };
  destination.document.components.push(breaker, control);

  const result = createProjectContinuation(
    project,
    { sheetId: source.id, endpoint: { componentId: supply.id, terminalId: "l1" } },
    { sheetId: destination.id, endpoint: { componentId: breaker.id, terminalId: "l1-in" } },
    "G.12",
    "C.4",
  );

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.continuation).toMatchObject({
    label: "L1",
    conductorColor: "#c42626",
    points: [
      { sheetId: source.id, gridReference: "G.12", role: "source" },
      { sheetId: destination.id, gridReference: "C.4", role: "destination" },
    ],
  });
  expect(resolveProjectNet(result.project, { sheetId: source.id, endpoint: { componentId: supply.id, terminalId: "l1" } })).toContainEqual({
    sheetId: destination.id,
    endpoint: { componentId: breaker.id, terminalId: "l1-in" },
  });
});

it("rejects same-sheet, missing-terminal, and incompatible-kind continuation attempts", () => {
  const project = addFreeSchematicSheet(createStarterProject());
  const [source, destination] = project.sheets;
  const control = { ...createDolMotorStarter().components.find((component) => component.id === "control")!, id: "destination-control", reference: "X2" };
  destination.document.components.push(control);
  const result = createProjectContinuation(
    project,
    { sheetId: source.id, endpoint: { componentId: "supply", terminalId: "l1" } },
    { sheetId: source.id, endpoint: { componentId: "breaker", terminalId: "l1-in" } },
  );
  expect(result).toMatchObject({ ok: false, reason: "A sheet continuation must connect two different sheets." });

  const missing = createProjectContinuation(
    project,
    { sheetId: source.id, endpoint: { componentId: "supply", terminalId: "missing" } },
    { sheetId: destination.id, endpoint: { componentId: "breaker", terminalId: "l1-in" } },
  );
  expect(missing.ok).toBe(false);

  const incompatible = createProjectContinuation(
    project,
    { sheetId: source.id, endpoint: { componentId: "supply", terminalId: "l1" } },
    { sheetId: destination.id, endpoint: { componentId: "destination-control", terminalId: "line" } },
  );
  expect(incompatible.ok).toBe(false);
});
