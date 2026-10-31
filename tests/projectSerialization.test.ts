import { describe, expect, it } from "vitest";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createStarterProject } from "../src/projects/starterProject";

describe("project JSON import validation", () => {
  it("round-trips a valid starter project", () => {
    const original = createStarterProject();
    const imported = parseProjectJson(JSON.stringify(original));

    expect(imported.name).toBe(original.name);
    expect(imported.sheets[0].document.wires).toHaveLength(20);
  });

  it("rejects unknown device definitions", () => {
    const input = JSON.parse(JSON.stringify(createStarterProject()));
    input.sheets[0].document.components[0].definitionId = "unknown.device";

    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("not in the installed catalog");
  });

  it("rejects overlong component references before they can affect drawing labels", () => {
    const input = JSON.parse(JSON.stringify(createStarterProject()));
    input.sheets[0].document.components[0].reference = "R".repeat(25);

    expect(() => parseProjectJson(JSON.stringify(input))).toThrow("component reference");
  });
});
