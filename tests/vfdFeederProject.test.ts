import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { ProjectLibraryPanel } from "../src/components/ProjectLibraryPanel";
import { validateCircuit } from "../src/electrical/topology";
import { createFourSheetVfdFeederWorkbook } from "../src/projects/fourSheetVfdFeederWorkbook";
import { createVfdFeederProject } from "../src/projects/vfdFeederProject";
import { resolveProjectNet, validateProjectContinuations } from "../src/projects/projectContinuations";
import { templateLibrary } from "../src/projects/templateLibrary";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

it("registers an executable VFD feeder with real terminals and explicitly bounded generic assumptions", () => {
  const template = templateLibrary.find((item) => item.id === "vfd-motor-feeder")!;
  expect(template).toEqual(createVfdFeederProject());
  expect(validateCircuit(template.document, catalogById)).toEqual([]);
  expect(verifyProjectTemplate(template, catalogById)).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
  expect(template.document.components.map((item) => item.definitionId)).toEqual([
    "generic.iec.ac-supply", "generic.iec.circuit-breaker", "generic.iec.variable-frequency-drive", "generic.iec.three-phase-motor",
  ]);
  expect(template.document.wires).toHaveLength(11);
  expect(template.document.components.find((item) => item.reference === "M1")?.properties).toMatchObject({ nominalSpeedRpm: 1500, ratedFrequencyHz: 50 });
  expect(template.operatingSequence?.map((step) => step.name)).toEqual(["Enable drive at 25 Hz", "Raise command to 50 Hz", "Disable drive"]);
});

it("keeps phase and PE continuation identities linked across four workbook sheets", () => {
  const workbook = createFourSheetVfdFeederWorkbook();
  expect(workbook.sheets.map((sheet) => sheet.document.components[0].reference)).toEqual(["X1", "Q1", "U1", "M1"]);
  expect(validateProjectContinuations(workbook)).toEqual([]);
  expect(workbook.continuations?.map((item) => item.label)).toEqual(["L1", "L2", "L3", "L1_VFD", "L2_VFD", "L3_VFD", "U1_MOTOR", "V1_MOTOR", "W1_MOTOR", "PE"]);
  expect(workbook.continuations?.find((item) => item.label === "PE")?.points.map((point) => point.role)).toEqual(["source", "continuation", "destination"]);
  expect(resolveProjectNet(workbook, { sheetId: "vfd-supply", endpoint: { componentId: "supply", terminalId: "pe" } })).toHaveLength(3);
});

it("offers the four-sheet workbook from the selected VFD project entry", () => {
  const selected = templateLibrary.find((item) => item.id === "vfd-motor-feeder")!;
  const markup = renderToStaticMarkup(createElement(ProjectLibraryPanel, {
    active: true,
    templates: templateLibrary,
    selected,
    verification: verifyProjectTemplate(selected, catalogById),
    onSelect: () => {},
    onLoad: () => {},
    onOpenWorkbook: () => {},
    onOpenFourSheetWorkbook: () => {},
    onOpenStarDeltaWorkbook: () => {},
    onOpenReversingWorkbook: () => {},
    onOpenTwoMotorWorkbook: () => {},
    onOpenVfdWorkbook: () => {},
  }));
  expect(markup).toContain("Open 4-sheet VFD feeder");
  expect(markup).toContain("Load into Free Sheet");
});

