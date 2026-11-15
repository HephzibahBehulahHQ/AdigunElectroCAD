import { expect, it } from "vitest";
import { resolveTopLevelMenu, shouldCloseMenuOnPointerLeave } from "../src/app/topLevelMenu";

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

it("keeps clicked Projects open after the pointer leaves the menu row", () => {
  expect(shouldCloseMenuOnPointerLeave(true, false, true)).toBe(false);
  expect(shouldCloseMenuOnPointerLeave(true, true, true)).toBe(false);
});

it("continues closing hover-only and other menus after the pointer leaves", () => {
  expect(shouldCloseMenuOnPointerLeave(true, false, false)).toBe(true);
  expect(shouldCloseMenuOnPointerLeave(false, false, true)).toBe(true);
  expect(shouldCloseMenuOnPointerLeave(false, true, false)).toBe(false);
});

