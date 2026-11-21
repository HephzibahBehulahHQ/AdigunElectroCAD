import { endpointKey, terminalAnchors } from "../src/cad/terminalAnchors";
import { orthogonalWirePath } from "../src/cad/wirePath";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { ProjectLibraryPanel } from "../src/components/ProjectLibraryPanel";
import { templateLibrary } from "../src/projects/templateLibrary";
import { SOURCE_BACKED_DOL_TEMPLATE_ID } from "../src/projects/sourcedDolTemplate";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

describe("Project Library full workbook entry", () => {
  it("offers the full ten-sheet feeder project from the source-backed DOL entry", () => {
    const selected = templateLibrary.find((template) => template.id === SOURCE_BACKED_DOL_TEMPLATE_ID)!;
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
    }));
    expect(markup).toContain("Open 10-sheet feeder workbook");
    expect(markup).toContain("Load into Free Sheet");
  });

  it("does not show the workbook action for unrelated single-sheet templates", () => {
    const selected = templateLibrary[0];
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
    }));
    expect(markup).not.toContain("Open 10-sheet feeder workbook");
  });
});


it("offers the four-sheet sequence only for the two-motor project", () => {
  const selected = templateLibrary.find((template) => template.id === "two-motor-sequence")!;
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
  }));
  expect(markup).toContain("Open 4-sheet two-motor project");
});

it("shows topology failures in project details", () => {
  const selected = structuredClone(templateLibrary[0]);
  selected.document.wires[0].from.componentId = "missing-source";
  const verification = verifyProjectTemplate(selected, catalogById);
  const markup = renderToStaticMarkup(createElement(ProjectLibraryPanel, {
    active: true, templates: templateLibrary, selected, verification,
    onSelect: () => {}, onLoad: () => {}, onOpenWorkbook: () => {},
    onOpenFourSheetWorkbook: () => {}, onOpenStarDeltaWorkbook: () => {},
    onOpenReversingWorkbook: () => {}, onOpenTwoMotorWorkbook: () => {},
  }));
  expect(markup).toContain("Verification needs review");
  expect(verification.topologyIssues.length).toBeGreaterThan(0);
  expect(markup).toContain(verification.topologyIssues[0].message);
});

it("previews the authored pilot lamp symbol and its routed return", () => {
  const selected = templateLibrary.find(({ id }) => id === "wired-pilot-indicator")!;
  const markup = renderToStaticMarkup(createElement(ProjectLibraryPanel, {
    active: true, templates: [selected], selected, verification: verifyProjectTemplate(selected, catalogById),
    onSelect: () => {}, onLoad: () => {}, onOpenWorkbook: () => {},
    onOpenFourSheetWorkbook: () => {}, onOpenStarDeltaWorkbook: () => {},
    onOpenReversingWorkbook: () => {}, onOpenTwoMotorWorkbook: () => {},
  }));
  const wire = selected.document.wires.find(({ id }) => id === "lamp-return")!;
  const anchors = new Map(terminalAnchors(selected.document).map((anchor) => [endpointKey(anchor.endpoint), anchor]));
  const from = anchors.get(endpointKey(wire.from))!;
  const to = anchors.get(endpointKey(wire.to))!;
  expect(markup).toContain("Indicator lamp off");
  expect(markup).toContain(`d="${orthogonalWirePath(from, to, wire.points, from.vertical, to.vertical)}"`);
});
