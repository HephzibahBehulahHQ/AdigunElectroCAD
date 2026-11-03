import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet } from "../src/projects/starterProject";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyCircuitSequence, verifyProjectTemplate } from "../src/projects/templateVerification";

describe("project template library", () => {
  it("rejects a dedicated analog project with reversed threshold logic", () => {
    const template = structuredClone(templateLibrary[499]);
    expect(template.category).toBe("Analog Instrumentation");
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.document.components.find((component) => component.reference === "PLC1")!.properties.program = "LT AI0 13824; OUT Q0";
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it.each(["LD I0; OUT Q0", "LD I0; OR Q0; OUT Q0"])("rejects PLC templates that lose holding or STOP behavior: %s", (program) => {
    const template = structuredClone(templateLibrary[2]);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.document.components[1].properties.program = program;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it("advances real timer runtime in recorded operating steps without changing the design", () => {
    const template = structuredClone(templateLibrary[3]);
    const before = JSON.stringify(template.document);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    expect(JSON.stringify(template.document)).toBe(before);
    template.operatingSequence![1].durationSeconds = 0.5;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
    for (const durationSeconds of [-1, NaN, Infinity]) {
      expect(verifyCircuitSequence(template.document, [{ name: "Invalid duration", durationSeconds, changes: [], expectations: [{ reference: "KT1", label: "Timer contact", exact: "CLOSED" }] }], catalogById)[0].failures).toContain("Invalid step duration");
    }
  });
  it("fails invalid numeric expectations, unknown changes, and unchecked steps", () => {
    const document = templateLibrary[0].document;
    const expectation = { reference: "M1", label: "Nominal motor point", numeric: 1450 };
    const results = verifyCircuitSequence(document, [
      { name: "NaN target", changes: [], expectations: [{ ...expectation, numeric: NaN }] },
      { name: "Infinite tolerance", changes: [], expectations: [{ ...expectation, tolerance: Infinity }] },
      { name: "Negative tolerance", changes: [], expectations: [{ ...expectation, tolerance: -1 }] },
      { name: "Unknown component", changes: [{ reference: "MISSING", properties: {} }], expectations: [{ ...expectation, numeric: 9999 }] },
      { name: "No check", changes: [], expectations: [] },
    ], catalogById);
    expect(results.every((result) => !result.passed)).toBe(true);
  });
  it("enforces recorded operating steps for motor-feeder variants", () => {
    const template = structuredClone(templateLibrary[0]);
    expect(template.operatingSequence).toHaveLength(4);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.operatingSequence![1].expectations[0].numeric = 9999;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it("executes a motor switching sequence with exact stopped and numeric running checks", () => {
    const document = templateLibrary[0].document;
    const before = JSON.stringify(document);
    const label = "Nominal motor point";
    const steps = verifyCircuitSequence(document, [
      { name: "Breaker open", changes: [{ reference: "Q1", properties: { closed: false } }], expectations: [{ reference: "M1", label, exact: "STANDBY" }] },
      { name: "Run", changes: [{ reference: "Q1", properties: { closed: true } }, { reference: "M1", properties: { nominalSpeedRpm: 1450 } }], expectations: [{ reference: "M1", label, numeric: 1450 }] },
      { name: "Stop", changes: [{ reference: "KM1", properties: { energized: false } }], expectations: [{ reference: "M1", label, exact: "STANDBY" }] },
    ], catalogById);
    expect(steps.map((step) => step.passed)).toEqual([true, true, true]);
    expect(JSON.stringify(document)).toBe(before);
  });
  it("contains the existing 500 entries, two pneumatic projects and a two-motor sequence", () => {
    expect(templateLibrary).toHaveLength(503);
    expect(new Set(templateLibrary.map((template) => template.id)).size).toBe(503);
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
