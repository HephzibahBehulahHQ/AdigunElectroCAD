type MenuAncestor = Pick<Element, "parentElement" | "tagName">;

export function resolveTopLevelMenu(target: MenuAncestor | null, menuRow: MenuAncestor): HTMLDetailsElement | null {
  let candidate = target;
  while (candidate && candidate.parentElement !== menuRow) candidate = candidate.parentElement;
  return candidate?.tagName === "DETAILS" ? candidate as HTMLDetailsElement : null;
}

export function shouldCloseMenuOnPointerLeave(isProjectsMenu: boolean, menuRowHovered: boolean, projectsPinned: boolean): boolean {
  return !menuRowHovered && (!isProjectsMenu || !projectsPinned);
}

