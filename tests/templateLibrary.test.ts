import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet } from "../src/projects/starterProject";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

describe("project template library", () => {
  it("contains 500 uniquely identified executable projects", () => {
    expect(templateLibrary).toHaveLength(500);
    expect(new Set(templateLibrary.map((template) => template.id)).size).toBe(500);
    expect(new Set(templateLibrary.map((template) => template.level)).size).toBe(5);
  });

  it("keeps every template within known terminal topology and its declared model outcomes", () => {
    for (const template of templateLibrary) {
      expect(template.document.components.length).toBeGreaterThanOrEqual(3);
      expect(validateCircuit(template.document, catalogById)).toEqual([]);
      expect(template.testSequence.length).toBeGreaterThanOrEqual(3);
      expect(template.expectedOutputs.length).toBeGreaterThanOrEqual(3);
      expect(verifyProjectTemplate(template, catalogById)).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
    }
  });

  it("loads a template into a free sheet without mutating the DOL reference sheet", () => {
    const project = addFreeSchematicSheet(createStarterProject());
    const loaded = loadTemplateIntoSheet(project, "sheet-free-1", templateLibrary[0]);

    expect(loaded.sheets[0].kind).toBe("reference-dol");
    expect(loaded.sheets[1].name).toBe(templateLibrary[0].name);
    expect(loaded.sheets[1].document.wires).toHaveLength(templateLibrary[0].document.wires.length);
  });
});

