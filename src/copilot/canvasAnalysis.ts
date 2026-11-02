import type { CircuitDocument, ElectricalComponentDefinition, TerminalEndpoint, Wire } from "../types/electrical";
import { canConnectTerminals, validateCircuit } from "../electrical/topology";
import { terminalSignalUnits } from "../electrical/signalContracts";

export interface CopilotFinding {
  id: string;
  kind: "suggestion" | "question" | "problem";
  explanation: string;
  detail: string;
  connection?: { from: TerminalEndpoint; to: TerminalEndpoint };
}
const same = (a: TerminalEndpoint, b: TerminalEndpoint) => a.componentId === b.componentId && a.terminalId === b.terminalId;
const touches = (wire: Wire, endpoint: TerminalEndpoint) => same(wire.from, endpoint) || same(wire.to, endpoint);

export function describeCanvasChange(before: CircuitDocument | null, after: CircuitDocument): string {
  if (!before || before.id !== after.id) return `Observing ${after.name}.`;
  const changes: string[] = [];
  for (const component of after.components) {
    const previous = before.components.find((item) => item.id === component.id);
    if (!previous) changes.push(`Placed ${component.reference}`);
    else if (previous.x !== component.x || previous.y !== component.y) changes.push(`Moved ${component.reference} to ${component.x}, ${component.y}`);
    else if (previous.rotation !== component.rotation) changes.push(`Rotated ${component.reference} to ${component.rotation}°`);
    else if (JSON.stringify(previous.properties) !== JSON.stringify(component.properties) || previous.reference !== component.reference) changes.push(`Updated ${component.reference}`);
  }
  for (const component of before.components) if (!after.components.some((item) => item.id === component.id)) changes.push(`Deleted ${component.reference}`);
  for (const wire of after.wires) if (!before.wires.some((item) => item.id === wire.id && same(item.from, wire.from) && same(item.to, wire.to))) changes.push(`Connected ${wire.from.componentId}.${wire.from.terminalId} → ${wire.to.componentId}.${wire.to.terminalId}`);
  for (const wire of before.wires) if (!after.wires.some((item) => item.id === wire.id)) changes.push(`Removed wire ${wire.id}`);
  return changes.length ? changes.slice(0, 4).join(" · ") : "Sheet state updated.";
}

/** Local, evidence-based checks. Unclassified physical circuits are never declared safe or dead. */
export function analyzeCanvas(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, goal: string, unconnectedForMs: ReadonlyMap<string, number> = new Map()): CopilotFinding[] {
  const findings: CopilotFinding[] = validateCircuit(document, catalog).map((issue) => ({ id: `topology:${issue.code}:${issue.message}`, kind: "problem", explanation: issue.message, detail: "This is a terminal-topology finding from the current sheet, not a physical safety assessment." }));
  for (const component of document.components) {
    const definition = catalog.get(component.definitionId);
    if (!definition) continue;
    const model = definition.simulationModelId;
    const targets = model === "logic-gate-and" ? ["in-a", "in-b"] : model === "logic-output-coil" ? ["in"] : [];
    for (const terminalId of targets) {
      const to = { componentId: component.id, terminalId };
      const wires = document.wires.filter((wire) => touches(wire, to));
      const drivers = wires.map((wire) => same(wire.from, to) ? wire.to : wire.from).filter((endpoint) => {
        const source = document.components.find((item) => item.id === endpoint.componentId);
        return source && catalog.get(source.definitionId)?.terminals.some((terminal) => terminal.id === endpoint.terminalId && terminal.direction === "output");
      });
      if (drivers.length > 1) findings.push({ id: `drivers:${component.id}:${terminalId}`, kind: "problem", explanation: `${component.reference}.${terminalId} is connected to multiple output terminals.`, detail: "Choose the intended driver. The co-pilot will not delete wires or guess signal priority." });
      if (wires.length) continue;
      if (model === "logic-gate-and" && !document.wires.some((wire) => touches(wire, { componentId: component.id, terminalId: terminalId === "in-a" ? "in-b" : "in-a" }))) continue;
      const existingSources = new Set(document.wires.filter((wire) => wire.from.componentId === component.id || wire.to.componentId === component.id).flatMap((wire) => [wire.from.componentId, wire.to.componentId]));
      const candidates: TerminalEndpoint[] = [];
      for (const source of document.components) {
        const sourceDefinition = catalog.get(source.definitionId);
        if (!sourceDefinition || source.id === component.id || existingSources.has(source.id)) continue;
        for (const terminal of sourceDefinition.terminals) {
          const from = { componentId: source.id, terminalId: terminal.id };
          if (terminal.direction === "output" && terminalSignalUnits(sourceDefinition, terminal.id)?.includes("boolean") && !document.wires.some((wire) => touches(wire, from)) && canConnectTerminals(document, catalog, from, to).ok) candidates.push(from);
        }
      }
      const connection = candidates.length === 1 ? { from: candidates[0], to } : undefined;
      const source = connection && document.components.find((item) => item.id === connection.from.componentId)!;
      findings.push({ id: `input:${component.id}:${terminalId}`, kind: "suggestion", explanation: `${component.reference}.${terminalId} has no input wire.${source ? ` Connect ${source.reference}.${connection!.from.terminalId}?` : " Which signal should drive it?"}`, detail: "The missing wire is confirmed on this sheet. Unwired simulation inputs can still use manual parameters. A compatible unused output is offered only when exactly one candidate exists; this does not establish your intended circuit.", connection });
    }
    if (model === "catalog-on-delay-timer" && (unconnectedForMs.get(component.id) ?? 0) >= 20_000 && !document.wires.some((wire) => touches(wire, { componentId: component.id, terminalId: "18" }))) findings.push({ id: `timer:${component.id}`, kind: "suggestion", explanation: `${component.reference}'s timer output has no connected consumer. What should it control?`, detail: "The output has remained unconnected for at least 20 seconds of observation. Timing may still run using manual parameters; no load is connected to terminal 18." });
  }
  if (!goal.trim() && document.components.length && !document.wires.length) findings.push({ id: "project-goal", kind: "question", explanation: "What are you trying to build on this sheet?", detail: "There is no wired input-to-output chain yet. State the project goal so offers can be evaluated against it rather than guessing your intent." });
  return findings;
}

export interface CopilotPacing { lastPublishedAt: number | null; dismissed: ReadonlySet<string>; }
export function nextCopilotFinding(findings: readonly CopilotFinding[], pacing: CopilotPacing, now: number, activity: { dragging: boolean; typing: boolean; lastInteractionAt: number }): CopilotFinding | undefined {
  if (!Number.isFinite(now) || activity.dragging || activity.typing || now - activity.lastInteractionAt < 2000 || (pacing.lastPublishedAt !== null && now - pacing.lastPublishedAt < 25_000)) return undefined;
  return findings.find((finding) => !pacing.dismissed.has(finding.id));
}

export interface CopilotPreview { before: string; after: CircuitDocument; explanation: string; }
export function previewCopilotConnection(document: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, finding: CopilotFinding): CopilotPreview {
  if (!finding.connection) throw new Error("This finding requires a question, not an automatic edit.");
  const { from, to } = finding.connection;
  const check = canConnectTerminals(document, catalog, from, to);
  if (!check.ok) throw new Error(check.reason);
  let index = 1;
  while (document.wires.some((wire) => wire.id === `copilot-wire-${index}`)) index++;
  const after = structuredClone(document);
  after.wires.push({ id: `copilot-wire-${index}`, from: { ...from }, to: { ...to }, points: [] });
  after.revision++;
  const issues = validateCircuit(after, catalog);
  if (issues.length) throw new Error(issues[0].message);
  return { before: JSON.stringify(document), after, explanation: finding.explanation };
}

/** Atomic preparation: failure returns the original object, with no mutation or persistence. */
export function acceptCopilotPreview(current: CircuitDocument, catalog: Map<string, ElectricalComponentDefinition>, preview: CopilotPreview): { ok: true; document: CircuitDocument } | { ok: false; document: CircuitDocument; error: string } {
  try {
    if (JSON.stringify(current) !== preview.before) throw new Error("The sheet changed. Review a fresh preview before accepting.");
    const after = structuredClone(preview.after);
    const issues = validateCircuit(after, catalog);
    if (issues.length) throw new Error(issues[0].message);
    if (after.id !== current.id || after.name !== current.name || after.description !== current.description || after.revision !== current.revision + 1 || JSON.stringify(after.components) !== JSON.stringify(current.components) || after.wires.length !== current.wires.length + 1 || JSON.stringify(after.wires.slice(0, -1)) !== JSON.stringify(current.wires)) throw new Error("The preview contains changes beyond one added wire.");
    return { ok: true, document: after };
  } catch (failure) { return { ok: false, document: current, error: failure instanceof Error ? failure.message : "Preview validation failed." }; }
}
