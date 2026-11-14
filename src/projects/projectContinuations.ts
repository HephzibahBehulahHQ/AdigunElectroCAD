import { catalogById } from "../catalog/dolCatalog";
import type { ElectricalProject, ProjectContinuation } from "../types/electrical";

/** Validate page order, real local terminals, and the retained source of every cross-sheet net. */
export function validateProjectContinuations(project: ElectricalProject): string[] {
  const issues: string[] = [];
  const sheetOrder = new Map(project.sheets.map((sheet, index) => [sheet.id, index]));
  const seenIds = new Set<string>();

  for (const continuation of project.continuations ?? []) {
    if (seenIds.has(continuation.id)) issues.push(`Duplicate project continuation id: ${continuation.id}`);
    seenIds.add(continuation.id);
    const points = continuation.points;
    if (points.length < 2) { issues.push(`Continuation ${continuation.label} must reach at least two sheets.`); continue; }
    const seenSheets = new Set<string>();
    let previousOrder = -1;
    let expectedKind: string | undefined;

    points.forEach((point, index) => {
      const expectedRole = index === 0 ? "source" : index === points.length - 1 ? "destination" : "continuation";
      if (point.role !== expectedRole) issues.push(`Continuation ${continuation.label} must mark point ${index + 1} as ${expectedRole}.`);
      if (!/^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/.test(point.gridReference)) issues.push(`Continuation ${continuation.label} has an invalid grid reference: ${point.gridReference}.`);
      if (seenSheets.has(point.sheetId)) issues.push(`Continuation ${continuation.label} has more than one point on sheet ${point.sheetId}.`);
      seenSheets.add(point.sheetId);
      const order = sheetOrder.get(point.sheetId);
      if (order === undefined) { issues.push(`Continuation ${continuation.label} references unknown sheet ${point.sheetId}.`); return; }
      if (order <= previousOrder) issues.push(`Continuation ${continuation.label} points must follow project sheet order.`);
      previousOrder = order;
      const sheet = project.sheets[order];
      const component = sheet.document.components.find((item) => item.id === point.endpoint.componentId);
      const definition = component && catalogById.get(component.definitionId);
      const terminal = (component?.customTerminals ?? definition?.terminals)?.find((item) => item.id === point.endpoint.terminalId);
      if (!component || !terminal) { issues.push(`Continuation ${continuation.label} references an unknown terminal on sheet ${point.sheetId}.`); return; }
      if (expectedKind && terminal.kind !== expectedKind) issues.push(`Continuation ${continuation.label} joins incompatible terminal kinds.`);
      expectedKind = terminal.kind;
    });
  }
  return issues;
}
