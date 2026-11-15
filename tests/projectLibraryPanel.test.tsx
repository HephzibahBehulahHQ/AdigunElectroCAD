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
    }));
    expect(markup).toContain("Open 10-sheet feeder workbook");
    expect(markup).toContain("Load into free sheet");
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
    }));
    expect(markup).not.toContain("Open 10-sheet feeder workbook");
  });
});

