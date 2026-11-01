import { catalogById } from "../catalog/dolCatalog";
import { validateCircuit } from "../electrical/topology";
import type { CircuitDocument, CircuitSheet, ElectricalProject, TerminalEndpoint, Wire } from "../types/electrical";

export function parseProjectJson(text: string): ElectricalProject {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  const root = object(value, "The selected file must contain a project object.");
  const sheetsValue = array(root.sheets, "The project must contain at least one sheet.");
  if (sheetsValue.length === 0 || sheetsValue.length > 100) throw new Error("A project must contain between 1 and 100 sheets.");
  const project: ElectricalProject = {
    id: textValue(root.id, "project id", 96),
    name: textValue(root.name, "project name", 80),
    description: textValue(root.description, "project description", 400),
    revision: integer(root.revision, "project revision"),
    sheets: sheetsValue.map(parseSheet),
  };
  return project;
}

function parseSheet(value: unknown, index: number): CircuitSheet {
  const sheet = object(value, `Sheet ${index + 1} is invalid.`);
  const kind = sheet.kind;
  if (kind !== "reference-dol" && kind !== "free-schematic") throw new Error(`Sheet ${index + 1} has an unsupported type.`);
  const document = parseDocument(sheet.document, index);
  return { id: textValue(sheet.id, `sheet ${index + 1} id`, 96), name: textValue(sheet.name, `sheet ${index + 1} name`, 80), kind, document };
}

function parseDocument(value: unknown, sheetIndex: number): CircuitDocument {
  const document = object(value, `Sheet ${sheetIndex + 1} document is invalid.`);
  const componentsValue = array(document.components, `Sheet ${sheetIndex + 1} components are invalid.`);
  const wiresValue = array(document.wires, `Sheet ${sheetIndex + 1} wires are invalid.`);
  if (componentsValue.length > 2000 || wiresValue.length > 5000) throw new Error(`Sheet ${sheetIndex + 1} exceeds import limits.`);
  const parsed: CircuitDocument = {
    id: textValue(document.id, `sheet ${sheetIndex + 1} document id`, 96),
    name: textValue(document.name, `sheet ${sheetIndex + 1} document name`, 80),
    description: textValue(document.description, `sheet ${sheetIndex + 1} document description`, 400),
    revision: integer(document.revision, `sheet ${sheetIndex + 1} document revision`),
    components: componentsValue.map((component, componentIndex) => parseComponent(component, sheetIndex, componentIndex)),
    wires: wiresValue.map((wire, wireIndex) => parseWire(wire, sheetIndex, wireIndex)),
  };
  const issues = validateCircuit(parsed, catalogById);
  if (issues.length) throw new Error(`Sheet ${sheetIndex + 1} has invalid terminal topology: ${issues[0].message}`);
  return parsed;
}

function parseComponent(value: unknown, sheetIndex: number, componentIndex: number) {
  const component = object(value, `Sheet ${sheetIndex + 1} component ${componentIndex + 1} is invalid.`);
  const definitionId = textValue(component.definitionId, "component definition", 120);
  if (!catalogById.has(definitionId)) throw new Error(`Component definition ${definitionId} is not in the installed catalog.`);
  const rotation = component.rotation;
  if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) throw new Error("Component rotation is invalid.");
  return {
    id: textValue(component.id, "component id", 120), definitionId, reference: textValue(component.reference, "component reference", 12),
    x: finiteNumber(component.x, "component x"), y: finiteNumber(component.y, "component y"), rotation: rotation as 0 | 90 | 180 | 270,
    properties: properties(component.properties),
  };
}

function parseWire(value: unknown, sheetIndex: number, wireIndex: number): Wire {
  const wire = object(value, `Sheet ${sheetIndex + 1} wire ${wireIndex + 1} is invalid.`);
  const points = array(wire.points, "Wire routing points are invalid.").map((point) => {
    const value = object(point, "Wire routing point is invalid.");
    return { x: finiteNumber(value.x, "wire point x"), y: finiteNumber(value.y, "wire point y") };
  });
  return { id: textValue(wire.id, "wire id", 120), from: endpoint(wire.from, "wire source"), to: endpoint(wire.to, "wire target"), points, netName: optionalText(wire.netName, "wire net name", 80) };
}

function endpoint(value: unknown, label: string): TerminalEndpoint {
  const endpoint = object(value, `${label} is invalid.`);
  return { componentId: textValue(endpoint.componentId, `${label} component`, 120), terminalId: textValue(endpoint.terminalId, `${label} terminal`, 80) };
}

function properties(value: unknown): Record<string, string | number | boolean> {
  const input = object(value, "Component properties are invalid.");
  const entries = Object.entries(input);
  if (entries.length > 40) throw new Error("A component has too many properties.");
  const result: Record<string, string | number | boolean> = {};
  for (const [key, item] of entries) {
    if (key.length > 64 || !["string", "number", "boolean"].includes(typeof item) || (typeof item === "number" && !Number.isFinite(item))) throw new Error("A component property is invalid.");
    result[key] = item as string | number | boolean;
  }
  return result;
}

function object(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function array(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}

function textValue(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new Error(`The ${label} must be a non-empty string of at most ${maxLength} characters.`);
  return value.trim();
}

function optionalText(value: unknown, label: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return textValue(value, label, maxLength);
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`The ${label} must be a finite number.`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`The ${label} must be a non-negative integer.`);
  return value;
}
