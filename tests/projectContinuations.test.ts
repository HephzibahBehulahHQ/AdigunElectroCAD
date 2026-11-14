import { expect, it } from "vitest";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { addFreeSchematicSheet, createStarterProject } from "../src/projects/starterProject";
import { createProjectContinuation, extendProjectContinuation, removeProjectContinuation, resolveProjectNet, updateProjectContinuation } from "../src/projects/projectContinuations";

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

function linkedProject() {
  const project = addFreeSchematicSheet(createStarterProject());
  const [source, destination] = project.sheets;
  const supply = source.document.components.find((component) => component.id === "supply")!;
  const breaker = { ...createDolMotorStarter().components.find((component) => component.id === "breaker")!, id: "destination-breaker", reference: "Q2" };
  destination.document.components.push(breaker);
  const result = createProjectContinuation(project,
    { sheetId: source.id, endpoint: { componentId: supply.id, terminalId: "l1" } },
    { sheetId: destination.id, endpoint: { componentId: breaker.id, terminalId: "l1-in" } });
  if (!result.ok) throw new Error(result.reason);
  return { project: result.project, source, destination, supply, breaker, continuation: result.continuation };
}

it("edits the continuation label and color without changing its connected net", () => {
  const { project, source, destination, supply, breaker, continuation } = linkedProject();
  const changed = updateProjectContinuation(project, continuation.id, { label: "PUMP-L1", conductorColor: "#1155cc" });
  expect(changed.continuations?.[0]).toMatchObject({ label: "PUMP-L1", conductorColor: "#1155cc", points: continuation.points });
  expect(resolveProjectNet(changed, { sheetId: source.id, endpoint: { componentId: supply.id, terminalId: "l1" } })).toContainEqual({
    sheetId: destination.id,
    endpoint: { componentId: breaker.id, terminalId: "l1-in" },
  });
  expect(updateProjectContinuation(changed, continuation.id, { label: " " })).toBe(changed);
  expect(updateProjectContinuation(changed, continuation.id, { conductorColor: "red" })).toBe(changed);
});

it("removes a continuation without deleting local devices or wires", () => {
  const { project, source, continuation } = linkedProject();
  const removed = removeProjectContinuation(project, continuation.id);
  expect(removed.continuations).toEqual([]);
  expect(removed.sheets).toEqual(project.sheets);
  expect(resolveProjectNet(removed, { sheetId: source.id, endpoint: { componentId: "supply", terminalId: "l1" } })).not.toContainEqual(
    expect.objectContaining({ sheetId: "sheet-free-1" }),
  );
});


it("extends a continuation to later sheets while preserving the original source reference", () => {
  const { project, source, supply, breaker, continuation } = linkedProject();
  const extended = addFreeSchematicSheet(project);
  const thirdSheet = extended.sheets.at(-1)!;
  const thirdBreaker = { ...breaker, id: "third-breaker", reference: "Q3", properties: { ...breaker.properties } };
  thirdSheet.document.components.push(thirdBreaker);
  const result = extendProjectContinuation(extended, continuation.id,
    { sheetId: thirdSheet.id, endpoint: { componentId: thirdBreaker.id, terminalId: "l1-in" } }, "D.7");

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.continuation.points).toEqual([
    { sheetId: source.id, gridReference: "A.1", role: "source", endpoint: { componentId: supply.id, terminalId: "l1" } },
    { sheetId: project.sheets[1].id, gridReference: "A.1", role: "continuation", endpoint: { componentId: breaker.id, terminalId: "l1-in" } },
    { sheetId: thirdSheet.id, gridReference: "D.7", role: "destination", endpoint: { componentId: thirdBreaker.id, terminalId: "l1-in" } },
  ]);
  const net = resolveProjectNet(result.project, { sheetId: source.id, endpoint: { componentId: supply.id, terminalId: "l1" } });
  expect(net).toContainEqual({ sheetId: project.sheets[1].id, endpoint: { componentId: breaker.id, terminalId: "l1-in" } });
  expect(net).toContainEqual({ sheetId: thirdSheet.id, endpoint: { componentId: thirdBreaker.id, terminalId: "l1-in" } });
});

it("rejects extending a continuation onto a sheet already in its path", () => {
  const { project, source, breaker, continuation } = linkedProject();
  expect(extendProjectContinuation(project, continuation.id,
    { sheetId: source.id, endpoint: { componentId: "supply", terminalId: "l1" } }).ok).toBe(false);
  expect(extendProjectContinuation(project, continuation.id,
    { sheetId: project.sheets[1].id, endpoint: { componentId: breaker.id, terminalId: "l1-in" } }).ok).toBe(false);
});


it("extends a continuation onto an unused sheet even when tabs were reordered before it", () => {
  const { project, supply, breaker, continuation } = linkedProject();
  const extended = addFreeSchematicSheet(project);
  const newSheet = extended.sheets.at(-1)!;
  const thirdBreaker = { ...breaker, id: "third-breaker", reference: "Q3", properties: { ...breaker.properties } };
  newSheet.document.components.push(thirdBreaker);
  const reordered = [...extended.sheets];
  const [moved] = reordered.splice(2, 1);
  reordered.splice(0, 0, moved);
  const reorderedProject = { ...extended, sheets: reordered };
  const result = extendProjectContinuation(reorderedProject, continuation.id,
    { sheetId: newSheet.id, endpoint: { componentId: thirdBreaker.id, terminalId: "l1-in" } }, "D.7");
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.continuation.points[0]).toMatchObject({ sheetId: project.sheets[0].id, endpoint: { componentId: supply.id, terminalId: "l1" } });
  expect(result.continuation.points.at(-1)).toMatchObject({ sheetId: newSheet.id, role: "destination" });
  expect(validateProjectContinuations(result.project)).toEqual([]);
});
