import { describe, expect, it } from "vitest";
import { addFreeSchematicSheet, createStarterProject, replaceSheetDocument } from "../src/projects/starterProject";

describe("multi-sheet starter project", () => {
  it("adds an independent free schematic sheet", () => {
    const project = createStarterProject();
    const next = addFreeSchematicSheet(project);

    expect(project.sheets).toHaveLength(1);
    expect(next.sheets).toHaveLength(2);
    expect(next.sheets[1]).toMatchObject({ kind: "free-schematic", name: "Free schematic 1" });
    expect(next.sheets[1].document).toMatchObject({ components: [], wires: [] });
    expect(next.sheets[0].document.components).toHaveLength(8);
  });

  it("updates only the selected sheet document", () => {
    const project = addFreeSchematicSheet(createStarterProject());
    const sheet = project.sheets[1];
    const next = replaceSheetDocument(project, sheet.id, { ...sheet.document, name: "Control extension", revision: 2 });

    expect(next.sheets[1].document.name).toBe("Control extension");
    expect(next.sheets[0].document.name).toBe("DOL Motor Starter — 7.5 kW");
  });
});
