import { catalogById } from "../catalog/dolCatalog";
import { validateCircuit } from "../electrical/topology";
import { createProjectRuntimeDocument } from "../simulation/projectCircuitModels";
import type { CircuitDocument, ElectricalProject, TerminalDefinition } from "../types/electrical";
import { findTerminalContinuation, validateProjectContinuations } from "./projectContinuations";
import { replaceSheetDocument } from "./starterProject";

export function editCustomTerminalContract(
  project: ElectricalProject, sheetId: string, componentId: string, terminalId: string,
  patch: Partial<Pick<TerminalDefinition, "kind" | "direction">>,
): { document: CircuitDocument; reason?: undefined } | { reason: string; document?: undefined } {
  const document = project.sheets.find((sheet) => sheet.id === sheetId)?.document;
  const component = document?.components.find((item) => item.id === componentId);
  if (!document || !component) return { reason: "Select an existing component terminal." };
  const terminals = component.customTerminals ?? catalogById.get(component.definitionId)?.terminals ?? [];
  const terminal = terminals.find((item) => item.id === terminalId);
  if (!terminal) return { reason: "Select an existing component terminal." };
  const updated = { ...terminal, ...patch };
  if (updated.kind === terminal.kind && updated.direction === terminal.direction) return { document };
  const next = { ...document, revision: document.revision + 1, components: document.components.map((item) => item === component
    ? { ...item, customTerminals: terminals.map((entry) => entry === terminal ? updated : entry) } : item) };

  const continuation = findTerminalContinuation(project, { sheetId, endpoint: { componentId, terminalId } });
  const nextProject = replaceSheetDocument(project, sheetId, next);
  const errors = (state: ElectricalProject, sheet: CircuitDocument) => [
    ...validateCircuit(createProjectRuntimeDocument(state), catalogById).filter((issue) => issue.severity === "error").map((issue) => issue.message),
    ...validateCircuit(sheet, catalogById).filter((issue) => issue.severity === "error").map((issue) => issue.message),
    ...(continuation ? validateProjectContinuations(state) : []),
  ];
  const existing = new Set(errors(project, document));
  const conflict = errors(nextProject, next).find((issue) => !existing.has(issue));
  return conflict ? { reason: `Terminal change blocked${continuation ? ` on continuation ${continuation.label}` : ""}. ${conflict}` } : { document: next };
}
