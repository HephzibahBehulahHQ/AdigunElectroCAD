import { catalogById } from "../catalog/dolCatalog";
import { validateCircuit } from "../electrical/topology";
import type { CircuitDocument, CircuitSheet, ElectricalProject, SchematicAnnotation, SchematicGraphic, SchematicGraphicPoint, TerminalEndpoint, Wire } from "../types/electrical";
import { MAX_PROJECT_SHEETS } from "./projectLimits";

export function parseProjectJson(text: string): ElectricalProject {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  const root = object(value, "The selected file must contain a project object.");
  const sheetsValue = array(root.sheets, "The project must contain at least one sheet.");
  if (sheetsValue.length === 0 || sheetsValue.length > MAX_PROJECT_SHEETS) throw new Error(`A project must contain between 1 and ${MAX_PROJECT_SHEETS} sheets.`);
  const project: ElectricalProject = {
    id: textValue(root.id, "project id", 96),
    name: textValue(root.name, "project name", 80),
    description: textValue(root.description, "project description", 400),
    revision: integer(root.revision, "project revision"),
    sheets: sheetsValue.map(parseSheet),
  };
  if (new Set(project.sheets.map((sheet) => sheet.id)).size !== project.sheets.length) throw new Error("Every sheet must have a unique sheet id.");
  return project;
}

function parseSheet(value: unknown, index: number): CircuitSheet {
  const sheet = object(value, `Sheet ${index + 1} is invalid.`);
  const kind = sheet.kind;
  if (kind !== "reference-dol" && kind !== "free-schematic") throw new Error(`Sheet ${index + 1} has an unsupported type.`);
  const document = parseDocument(sheet.document, index);
  if ((kind === "reference-dol") !== (document.id === "reference-dol-motor-starter")) throw new Error(`Sheet ${index + 1} type does not match its reference drawing model.`);
  if (kind === "reference-dol" && (document.graphics?.length ?? 0) > 0) throw new Error(`Sheet ${index + 1} user-drawn graphics are supported on free schematic sheets only.`);
  return { id: textValue(sheet.id, `sheet ${index + 1} id`, 96), name: textValue(sheet.name, `sheet ${index + 1} name`, 80), kind, document };
}

function parseDocument(value: unknown, sheetIndex: number): CircuitDocument {
  const document = object(value, `Sheet ${sheetIndex + 1} document is invalid.`);
  const componentsValue = array(document.components, `Sheet ${sheetIndex + 1} components are invalid.`);
  const wiresValue = array(document.wires, `Sheet ${sheetIndex + 1} wires are invalid.`);
  const annotationsValue = document.annotations === undefined ? [] : array(document.annotations, `Sheet ${sheetIndex + 1} annotations are invalid.`);
  const graphicsValue = document.graphics === undefined ? [] : array(document.graphics, `Sheet ${sheetIndex + 1} graphics are invalid.`);
  if (componentsValue.length > 2000 || wiresValue.length > 5000 || annotationsValue.length > 1000 || graphicsValue.length > 2000) throw new Error(`Sheet ${sheetIndex + 1} exceeds import limits.`);
  const parsed: CircuitDocument = {
    id: textValue(document.id, `sheet ${sheetIndex + 1} document id`, 96),
    name: textValue(document.name, `sheet ${sheetIndex + 1} document name`, 80),
    description: textValue(document.description, `sheet ${sheetIndex + 1} document description`, 400),
    revision: integer(document.revision, `sheet ${sheetIndex + 1} document revision`),
    components: componentsValue.map((component, componentIndex) => parseComponent(component, sheetIndex, componentIndex)),
    wires: wiresValue.map((wire, wireIndex) => parseWire(wire, sheetIndex, wireIndex)),
    ...(document.annotations === undefined ? {} : { annotations: annotationsValue.map((annotation, annotationIndex) => parseAnnotation(annotation, sheetIndex, annotationIndex)) }),
    ...(document.graphics === undefined ? {} : { graphics: graphicsValue.map((graphic, graphicIndex) => parseGraphic(graphic, sheetIndex, graphicIndex)) }),
  };
  if (parsed.annotations && new Set(parsed.annotations.map((annotation) => annotation.id)).size !== parsed.annotations.length) throw new Error(`Sheet ${sheetIndex + 1} annotations must have unique ids.`);
  if (parsed.graphics && new Set(parsed.graphics.map((graphic) => graphic.id)).size !== parsed.graphics.length) throw new Error(`Sheet ${sheetIndex + 1} graphics must have unique ids.`);
  const issues = validateCircuit(parsed, catalogById);
  if (issues.length) throw new Error(`Sheet ${sheetIndex + 1} has invalid terminal topology: ${issues[0].message}`);
  return parsed;
}

function parseGraphic(value: unknown, sheetIndex: number, graphicIndex: number): SchematicGraphic {
  const graphic = object(value, `Sheet ${sheetIndex + 1} graphic ${graphicIndex + 1} is invalid.`);
  if (!["line", "rectangle", "ellipse", "polyline", "polygon"].includes(String(graphic.kind))) throw new Error("Graphic kind must be line, rectangle, ellipse, polyline or polygon.");
  const kind = graphic.kind as SchematicGraphic["kind"];
  let points: SchematicGraphicPoint[] | undefined;
  let x1: number; let y1: number; let x2: number; let y2: number;
  if (kind === "polyline" || kind === "polygon") {
    const pointsValue = array(graphic.points, "Graphic vertices are invalid.");
    if (pointsValue.length > 200) throw new Error("A graphic path may have at most 200 vertices.");
    points = pointsValue.map((item, index) => {
      const point = object(item, `Graphic vertex ${index + 1} is invalid.`);
      const x = finiteNumber(point.x, "graphic vertex x"); const y = finiteNumber(point.y, "graphic vertex y");
      if (x < 0 || x > 1100 || y < 0 || y > 780) throw new Error("Graphic coordinates must be inside the schematic sheet.");
      return { x, y };
    });
    if (kind === "polygon" && points.length > 1 && points[0].x === points.at(-1)?.x && points[0].y === points.at(-1)?.y) points.pop();
    const minimum = kind === "polygon" ? 3 : 2;
    if (points.length < minimum || points.some((point, index) => index > 0 && point.x === points![index - 1].x && point.y === points![index - 1].y)) throw new Error(`${kind} needs at least ${minimum} distinct consecutive vertices.`);
    const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
    x1 = Math.min(...xs); y1 = Math.min(...ys); x2 = Math.max(...xs); y2 = Math.max(...ys);
    const length = points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points![index].x, point.y - points![index].y), 0);
    const area = kind === "polygon" ? Math.abs(points.reduce((sum, point, index) => { const next = points![(index + 1) % points!.length]; return sum + point.x * next.y - next.x * point.y; }, 0)) / 2 : 0;
    if (length < 4 || (kind === "polygon" && area < 4)) throw new Error("Graphic path must span at least 4 units and polygons must enclose an area.");
  } else {
    x1 = finiteNumber(graphic.x1, "graphic x1"); y1 = finiteNumber(graphic.y1, "graphic y1");
    x2 = finiteNumber(graphic.x2, "graphic x2"); y2 = finiteNumber(graphic.y2, "graphic y2");
    if ([x1, x2].some((x) => x < 0 || x > 1100) || [y1, y2].some((y) => y < 0 || y > 780)) throw new Error("Graphic coordinates must be inside the schematic sheet.");
    if (kind === "line" ? Math.hypot(x2 - x1, y2 - y1) < 4 : Math.abs(x2 - x1) < 4 || Math.abs(y2 - y1) < 4) throw new Error("Graphic must span at least 4 units.");
  }
  const color = textValue(graphic.color, "graphic color", 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Graphic color must be a six-digit hex color.");
  if ((kind === "line" || kind === "polyline") && graphic.fillColor != null) throw new Error("Only rectangles, ellipses and polygons support a fill color.");
  const fillColor = graphic.fillColor === undefined ? undefined : graphic.fillColor === null ? null : textValue(graphic.fillColor, "graphic fill color", 7);
  if (typeof fillColor === "string" && !/^#[0-9a-f]{6}$/i.test(fillColor)) throw new Error("Graphic fill color must be a six-digit hex color.");
  const strokeWidth = finiteNumber(graphic.strokeWidth, "graphic stroke width");
  if (strokeWidth < 1 || strokeWidth > 12) throw new Error("Graphic stroke width must be between 1 and 12.");
  return { id: textValue(graphic.id, "graphic id", 120), name: textValue(graphic.name, "graphic name", 80), kind, x1, y1, x2, y2, ...(points ? { points } : {}), color, ...(graphic.fillColor === undefined ? {} : { fillColor }), strokeWidth };
}

function parseAnnotation(value: unknown, sheetIndex: number, annotationIndex: number): SchematicAnnotation {
  const annotation = object(value, `Sheet ${sheetIndex + 1} annotation ${annotationIndex + 1} is invalid.`);
  const x = finiteNumber(annotation.x, "annotation x");
  const y = finiteNumber(annotation.y, "annotation y");
  if (x < 0 || x > 1100 || y < 0 || y > 780) throw new Error("Annotation position must be inside the schematic sheet.");
  const color = textValue(annotation.color, "annotation color", 7);
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Annotation color must be a six-digit hex color.");
  const fontSize = annotation.fontSize === undefined ? undefined : finiteNumber(annotation.fontSize, "annotation text size");
  if (fontSize !== undefined && (fontSize < 8 || fontSize > 48)) throw new Error("Annotation text size must be between 8 and 48.");
  const rotation = annotation.rotation === undefined ? undefined : finiteNumber(annotation.rotation, "annotation rotation");
  if (rotation !== undefined && (rotation < 0 || rotation >= 360)) throw new Error("Annotation rotation must be between 0 and 359 degrees.");
  const textAnchor = annotation.textAnchor === undefined ? undefined : textValue(annotation.textAnchor, "annotation text alignment", 6);
  if (textAnchor !== undefined && !["start", "middle", "end"].includes(textAnchor)) throw new Error("Annotation text alignment must be left, center, or right.");
  const fontWeight = annotation.fontWeight === undefined ? undefined : finiteNumber(annotation.fontWeight, "annotation text weight");
  if (fontWeight !== undefined && ![400, 600, 700].includes(fontWeight)) throw new Error("Annotation text weight must be 400, 600, or 700.");
  const lineSpacing = annotation.lineSpacing === undefined ? undefined : finiteNumber(annotation.lineSpacing, "annotation line spacing");
  if (lineSpacing !== undefined && (lineSpacing < 1 || lineSpacing > 3)) throw new Error("Annotation line spacing must be between 1 and 3.");
  const fontStyle = annotation.fontStyle === undefined ? undefined : textValue(annotation.fontStyle, "annotation font style", 6);
  if (fontStyle !== undefined && fontStyle !== "normal" && fontStyle !== "italic") throw new Error("Annotation font style must be normal or italic.");
  const backgroundColor = annotation.backgroundColor === undefined ? undefined : textValue(annotation.backgroundColor, "annotation background color", 7);
  if (backgroundColor !== undefined && !/^#[0-9a-f]{6}$/i.test(backgroundColor)) throw new Error("Annotation background color must be a six-digit hex color.");
  const text = textValue(annotation.text, "annotation text", 500);
  const lines = text.split(/\r?\n/);
  if (lines.length > 8 || lines.some((line) => line.length > 160)) throw new Error("Annotation text must have at most 8 lines, with no line longer than 160 characters.");
  return { id: textValue(annotation.id, "annotation id", 120), text, x, y, color, ...(fontSize === undefined ? {} : { fontSize }), ...(rotation === undefined ? {} : { rotation }), ...(textAnchor === undefined ? {} : { textAnchor: textAnchor as SchematicAnnotation["textAnchor"] }), ...(fontWeight === undefined ? {} : { fontWeight: fontWeight as SchematicAnnotation["fontWeight"] }), ...(lineSpacing === undefined ? {} : { lineSpacing }), ...(fontStyle === undefined ? {} : { fontStyle: fontStyle as SchematicAnnotation["fontStyle"] }), ...(backgroundColor === undefined ? {} : { backgroundColor }) };
}

function parseComponent(value: unknown, sheetIndex: number, componentIndex: number) {
  const component = object(value, `Sheet ${sheetIndex + 1} component ${componentIndex + 1} is invalid.`);
  const definitionId = textValue(component.definitionId, "component definition", 120);
  if (!catalogById.has(definitionId)) throw new Error(`Component definition ${definitionId} is not in the installed catalog.`);
  const rotation = component.rotation;
  if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) throw new Error("Component rotation is invalid.");
  const size = component.size === undefined ? undefined : finiteNumber(component.size, "component size");
  if (size !== undefined && (size < .5 || size > 2)) throw new Error("Component size must be between 0.5 and 2.");
  const draftingColor = component.draftingColor === undefined ? undefined : textValue(component.draftingColor, "component drafting color", 7);
  if (draftingColor !== undefined && !/^#[0-9a-f]{6}$/i.test(draftingColor)) throw new Error("Component drafting color must be a six-digit hex color.");
  return {
    id: textValue(component.id, "component id", 120), definitionId, reference: textValue(component.reference, "component reference", 12),
    ...(component.displayName === undefined ? {} : { displayName: optionalText(component.displayName, "component display name", 80) }),
    x: finiteNumber(component.x, "component x"), y: finiteNumber(component.y, "component y"), rotation: rotation as 0 | 90 | 180 | 270, size, draftingColor,
    ...(component.terminalLabels === undefined ? {} : { terminalLabels: terminalLabelOverrides(component.terminalLabels, definitionId) }),
    properties: properties(component.properties),
      ...(component.customProperties === undefined ? {} : { customProperties: customProperties(component.customProperties) }),
  };
}

function parseWire(value: unknown, sheetIndex: number, wireIndex: number): Wire {
  const wire = object(value, `Sheet ${sheetIndex + 1} wire ${wireIndex + 1} is invalid.`);
  const points = array(wire.points, "Wire routing points are invalid.").map((point) => {
    const value = object(point, "Wire routing point is invalid.");
    return { x: finiteNumber(value.x, "wire point x"), y: finiteNumber(value.y, "wire point y") };
  });
  const draftingColor = wire.draftingColor === undefined ? undefined : textValue(wire.draftingColor, "wire drafting color", 7);
  if (draftingColor !== undefined && !/^#[0-9a-f]{6}$/i.test(draftingColor)) throw new Error("Wire drafting color must be a six-digit hex color.");
  return { id: textValue(wire.id, "wire id", 120), from: endpoint(wire.from, "wire source"), to: endpoint(wire.to, "wire target"), points, netName: optionalText(wire.netName, "wire net name", 80), draftingColor };
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

function customProperties(value: unknown): Record<string, string> {
  const input = object(value, "Custom component data is invalid.");
  const entries = Object.entries(input);
  if (entries.length > 20) throw new Error("A component may have at most 20 custom fields.");
  const result: Record<string, string> = {};
  for (const [rawKey, item] of entries) {
    const key = rawKey.trim();
    if (!key || key.length > 40 || ["__proto__", "constructor", "prototype"].includes(key.toLowerCase()) || typeof item !== "string" || item.length > 240) throw new Error("A custom component field is invalid.");
    if (Object.keys(result).some((existing) => existing.toLowerCase() === key.toLowerCase())) throw new Error("Custom component field names must be unique.");
    result[key] = item;
  }
  return result;
}

function terminalLabelOverrides(value: unknown, definitionId: string): Record<string, string> {
  const source = object(value, "Component terminal labels are invalid.");
  const terminals = new Set(catalogById.get(definitionId)?.terminals.map((terminal) => terminal.id) ?? []);
  const entries = Object.entries(source);
  if (entries.length > terminals.size) throw new Error("Component terminal labels exceed the catalog terminal count.");
  const result: Record<string, string> = {};
  for (const [terminalId, label] of entries) {
    if (!terminals.has(terminalId)) throw new Error(`Component terminal label ${terminalId} is not a catalog terminal.`);
    if (typeof label !== "string" || !label.trim() || label.length > 8) throw new Error("Component terminal labels must be non-empty and at most 8 characters.");
    result[terminalId] = label.trim();
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

