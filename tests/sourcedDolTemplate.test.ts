import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { templateLibrary } from "../src/projects/templateLibrary";
import { SOURCE_BACKED_DOL_TEMPLATE_ID } from "../src/projects/sourcedDolTemplate";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet } from "../src/projects/starterProject";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

describe("source-backed DOL project library entry", () => {
  it("exposes the verified Siemens starter with its actual device terminals and 22 wires", () => {
    const template = templateLibrary.find((item) => item.id === SOURCE_BACKED_DOL_TEMPLATE_ID)!;
    expect(template.name).toBe("Siemens DOL starter · 7.5 kW");
    expect(template.document.components).toHaveLength(9);
    expect(template.document.wires).toHaveLength(22);
    expect(validateCircuit(template.document, catalogById)).toEqual([]);
    expect(verifyProjectTemplate(template, catalogById)).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
    expect(template.document.components.map(({ reference, definitionId }) => [reference, definitionId])).toEqual([
      ["X1", "iec.ac-supply.01"], ["Q1", "iec.industrial-miniature-breaker.01"],
      ["KM1", "iec.motor-starter.01"], ["F1", "overload.thermal"],
      ["M1", "iec.induction-motor.01"], ["X2", "supply.control"],
      ["T1", "iec.dc-control-supply.01"], ["S0", "pushbutton.stop-nc"],
      ["S1", "pushbutton.start-no"],
    ]);
  });

  it("loads all identified devices and wire endpoints into a free sheet", () => {
    const template = templateLibrary.find((item) => item.id === SOURCE_BACKED_DOL_TEMPLATE_ID)!;
    const project = addFreeSchematicSheet(createStarterProject());
    const loaded = loadTemplateIntoSheet(project, "sheet-free-1", template);
    expect(loaded.sheets[0].document.components).toHaveLength(9);
    expect(loaded.sheets[1].document.components).toHaveLength(9);
    expect(loaded.sheets[1].document.wires).toHaveLength(22);
    expect(validateCircuit(loaded.sheets[1].document, catalogById)).toEqual([]);
    expect(project.sheets[1].document.components).toEqual([]);
  });
});
