import { expect, it } from "vitest";
import { resolveTopLevelMenu } from "../src/app/topLevelMenu";

type MockNode = { tagName: string; parentElement: MockNode | null };
const node = (tagName: string, parentElement: MockNode | null = null): MockNode => ({ tagName, parentElement });

it("keeps a top-level menu when the pointer enters nested project disclosures", () => {
  const menuRow = node("NAV");
  const projects = node("DETAILS", menuRow);
  const popover = node("DIV", projects);
  const projectInformation = node("DETAILS", popover);
  const summary = node("SUMMARY", projectInformation);

  expect(resolveTopLevelMenu(summary as unknown as Element, menuRow as unknown as HTMLElement)).toBe(projects);
});

it("resolves sibling top-level menus independently", () => {
  const menuRow = node("NAV");
  const projects = node("DETAILS", menuRow);
  const electrical = node("DETAILS", menuRow);
  const electricalButton = node("BUTTON", electrical);

  expect(resolveTopLevelMenu(electricalButton as unknown as Element, menuRow as unknown as HTMLElement)).toBe(electrical);
  expect(projects.parentElement).toBe(menuRow);
});

