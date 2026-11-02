import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { acceptCopilotPreview, analyzeCanvas, describeCanvasChange, nextCopilotFinding, previewCopilotConnection } from "../src/copilot/canvasAnalysis";
import type { CircuitDocument, ComponentInstance } from "../src/types/electrical";

const component = (id: string, definitionId: string): ComponentInstance => ({ id, definitionId, reference: id.toUpperCase(), x: 140, y: 200, rotation: 0, properties: {} });
const sheet = (components: ComponentInstance[]): CircuitDocument => ({ id: "copilot-test", name: "Test", description: "Analyzer checks", revision: 1, components, wires: [] });

it("detects an unwired coil and offers the only compatible unused signal output", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("k1", "logic.output-coil")]);
  const finding = analyzeCanvas(document, catalogById, "Switch a coil").find((item) => item.id === "input:k1:in")!;
  expect(finding.connection).toEqual({ from: { componentId: "s1", terminalId: "out" }, to: { componentId: "k1", terminalId: "in" } });
  expect(finding.detail).toContain("manual parameters");
  expect(JSON.stringify(finding)).not.toMatch(/never turn on|unsafe|no power/);
});

it("offers the second switch for an AND gate's missing input, excluding the first switch", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("s2", "logic.nc-contact"), component("and1", "logic.gate-and")]);
  document.wires.push({ id: "w1", from: { componentId: "s1", terminalId: "out" }, to: { componentId: "and1", terminalId: "in-a" }, points: [] });
  const finding = analyzeCanvas(document, catalogById, "AND two switches").find((item) => item.id === "input:and1:in-b")!;
  expect(finding.connection?.from.componentId).toBe("s2");
  const preview = previewCopilotConnection(document, catalogById, finding);
  expect(preview.after.wires).toHaveLength(2);
  expect(document.wires).toHaveLength(1);
  expect(acceptCopilotPreview(document, catalogById, preview)).toMatchObject({ ok: true, document: { revision: 2 } });
});

it("asks for the goal on an unwired sheet and stops asking after an answer", () => {
  const document = sheet([component("s1", "logic.no-contact")]);
  expect(analyzeCanvas(document, catalogById, "").some((item) => item.id === "project-goal")).toBe(true);
  expect(analyzeCanvas(document, catalogById, "Start/stop control").some((item) => item.id === "project-goal")).toBe(false);
});

it("does not guess a driver when more than one compatible candidate exists", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("s2", "logic.nc-contact"), component("k1", "logic.output-coil")]);
  expect(analyzeCanvas(document, catalogById, "").find((item) => item.id === "input:k1:in")?.connection).toBeUndefined();
});

it("does not offer a missing input once its wire exists", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("k1", "logic.output-coil")]);
  document.wires.push({ id: "w1", from: { componentId: "s1", terminalId: "out" }, to: { componentId: "k1", terminalId: "in" }, points: [] });
  expect(analyzeCanvas(document, catalogById, "").find((item) => item.id === "input:k1:in")).toBeUndefined();
});

it("retains the original sheet when a preview is stale or fails validation", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("k1", "logic.output-coil")]);
  const finding = analyzeCanvas(document, catalogById, "").find((item) => item.connection)!;
  const preview = previewCopilotConnection(document, catalogById, finding);
  const original = JSON.stringify(document);
  const changed = { ...document, revision: 2 };
  const stale = acceptCopilotPreview(changed, catalogById, preview);
  expect(stale.ok).toBe(false); expect(stale.document).toBe(changed);
  preview.after.wires[0].to.terminalId = "unknown";
  const invalid = acceptCopilotPreview(document, catalogById, preview);
  expect(invalid.ok).toBe(false); expect(invalid.document).toBe(document);
  expect(JSON.stringify(document)).toBe(original);
});

it("rejects a preview containing unrelated component edits", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("k1", "logic.output-coil")]);
  const preview = previewCopilotConnection(document, catalogById, analyzeCanvas(document, catalogById, "").find((item) => item.connection)!);
  preview.after.components[0].x += 20;
  expect(acceptCopilotPreview(document, catalogById, preview)).toMatchObject({ ok: false, document });
});

it("suppresses proactive offers during drag, typing and the two-second quiet period", () => {
  const findings = analyzeCanvas(sheet([component("s1", "logic.no-contact")]), catalogById, "");
  const pacing = { lastPublishedAt: null, dismissed: new Set<string>() };
  expect(nextCopilotFinding(findings, pacing, 10_000, { dragging: true, typing: false, lastInteractionAt: 0 })).toBeUndefined();
  expect(nextCopilotFinding(findings, pacing, 10_000, { dragging: false, typing: true, lastInteractionAt: 0 })).toBeUndefined();
  expect(nextCopilotFinding(findings, pacing, 10_000, { dragging: false, typing: false, lastInteractionAt: 9000 })).toBeUndefined();
});

it("respects 25-second pacing and does not immediately repeat a dismissed finding", () => {
  const findings = analyzeCanvas(sheet([component("s1", "logic.no-contact")]), catalogById, "");
  const idle = { dragging: false, typing: false, lastInteractionAt: 0 };
  expect(nextCopilotFinding(findings, { lastPublishedAt: 0, dismissed: new Set() }, 24_999, idle)).toBeUndefined();
  const next = nextCopilotFinding(findings, { lastPublishedAt: 0, dismissed: new Set() }, 25_000, idle)!;
  expect(next.id).toBe("project-goal");
  expect(nextCopilotFinding(findings, { lastPublishedAt: 0, dismissed: new Set([next.id]) }, 50_000, idle)).toBeUndefined();
});

it("reports actual placement, movement, wiring and deletion changes", () => {
  const before = sheet([component("s1", "logic.no-contact")]);
  const after = structuredClone(before);
  after.components[0].x = 180;
  after.components.push(component("k1", "logic.output-coil"));
  after.wires.push({ id: "w1", from: { componentId: "s1", terminalId: "out" }, to: { componentId: "k1", terminalId: "in" }, points: [] });
  expect(describeCanvasChange(before, after)).toContain("Moved S1 to 180, 200");
  expect(describeCanvasChange(before, after)).toContain("Placed K1");
  expect(describeCanvasChange(before, after)).toContain("Connected s1.out → k1.in");
  expect(describeCanvasChange(after, before)).toContain("Deleted K1");
  expect(describeCanvasChange(after, before)).toContain("Removed wire w1");
});

it("warns about actual multiple drivers and avoids claiming physical power safety", () => {
  const document = sheet([component("s1", "logic.no-contact"), component("s2", "logic.nc-contact"), component("k1", "logic.output-coil")]);
  document.wires = ["s1", "s2"].map((id) => ({ id, from: { componentId: id, terminalId: "out" }, to: { componentId: "k1", terminalId: "in" }, points: [] }));
  expect(analyzeCanvas(document, catalogById, "").find((item) => item.id === "drivers:k1:in")?.kind).toBe("problem");
});
