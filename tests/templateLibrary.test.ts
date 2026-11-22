import { createProjectReport } from "../src/reports/projectReport";
import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { addFreeSchematicSheet, createStarterProject, loadTemplateIntoSheet, replaceSheetDocument } from "../src/projects/starterProject";
import { templateFixtures, templateLibrary } from "../src/projects/templateLibrary";
import { verifyCircuitSequence, verifyProjectTemplate } from "../src/projects/templateVerification";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Schematic } from "../src/components/Schematic";
import { initialDolState } from "../src/simulation/dolSimulator";
import { parseProjectJson } from "../src/projects/projectSerialization";
import { createFourSheetAnalogLevelWorkbook } from "../src/projects/fourSheetAnalogLevelWorkbook";
import { canPlaceComponent, createManualWire, moveComponentsByOffset, moveComponentToGrid, removeWire } from "../src/cad/documentOps";
import { terminalAnchors } from "../src/cad/terminalAnchors";
import { executeCircuitModels } from "../src/simulation/circuitModels";

describe("project template library", () => {
  it("runs ventilation wire faults and recovery without editing the template", () => {
    const template = templateLibrary.find(({ id }) => id === "humidity-ventilation-damper")!;
    const before = structuredClone(template.document);
    const sequence = template.operatingSequence!;
    const steps = verifyCircuitSequence(template.document, sequence, catalogById);
    expect(steps.every(({ passed }) => passed)).toBe(true);
    expect(template.document).toEqual(before);
    const faultStep = sequence.find(({ wireChanges }) => wireChanges?.[0].connected === false)!;
    const [unknown] = verifyCircuitSequence(template.document, [{ ...faultStep, wireChanges: [{ ...faultStep.wireChanges![0], from: { componentId: "typo", terminalId: "out" } }] }], catalogById);
    expect(unknown.failures).toContain("Unknown wire typo.out to damper.in");
  });

  it("detects a removed link anywhere from the CT to the PLC interlock", () => {
    const template = templateLibrary.find(({ id }) => id === "ct-current-loop-plc-interlock")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it("requires every wire for the CT metering and indication checks", () => {
    const template = templateLibrary.find(({ id }) => id === "ct-secondary-current-monitoring")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it("requires every wire for the weigh-station acceptance sequence", () => {
    const template = templateLibrary.find(({ id }) => id === "weigh-station-acceptance-window")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it("requires every wire for the cold-room alarm sequence", () => {
    const template = templateLibrary.find(({ id }) => id === "cold-room-freeze-alarm")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it("rejects a dedicated analog project with reversed threshold logic", () => {
    const template = structuredClone(templateLibrary.find((item) => item.id === "analog-level-plc-threshold")!);
    expect(template.category).toBe("Analog Instrumentation");
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.document.components.find((component) => component.reference === "PLC1")!.properties.program = "LT AI0 13824; OUT Q0";
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it("requires both channel wires, the reset wire, and the enable wire in the reset example", () => {
    const template = templateLibrary.find(({ id }) => id === "wired-dual-channel-reset")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it("requires every wire in the vibration alarm and disagreement circuit", () => {
    const template = templateLibrary.find(({ id }) => id === "dual-vibration-voting")!;
    for (const wire of template.document.wires) {
      const document = removeWire(template.document, wire.id);
      expect(verifyProjectTemplate({ ...template, document }, catalogById).passed, wire.id).toBe(false);
    }
  });
  it.each(["inlet-frequency", "outlet-frequency", "flow-difference", "flow-alarm"])("detects the missing %s in flow balance verification", (wireId) => {
    const template = templateLibrary.find(({ id }) => id === "pulse-flow-balance-alarm")!;
    const document = removeWire(template.document, wireId);
    expect(verifyProjectTemplate({ ...template, document }, catalogById).passed).toBe(false);
  });
  it.each(["loop-current", "loop-counts", "loop-verdict"])("fails loopback verification when %s is open", (wireId) => {
    const template = templateLibrary.find(({ id }) => id === "analog-output-loopback")!;
    const document = removeWire(template.document, wireId);
    expect(verifyProjectTemplate({ ...template, document }, catalogById).passed).toBe(false);
  });
  it.each(["probe-emf", "high-alarm"])("detects a missing %s in the Type K alarm", (wireId) => {
    const template = templateLibrary.find(({ id }) => id === "type-k-terminal-emf-alarm")!;
    const document = removeWire(template.document, wireId);
    expect(verifyProjectTemplate({ ...template, document }, catalogById).passed).toBe(false);
  });
  it.each(["LD I0; OUT Q0", "LD I0; OR Q0; OUT Q0"])("rejects PLC templates that lose holding or STOP behavior: %s", (program) => {
    const template = structuredClone(templateFixtures[2]);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.document.components[1].properties.program = program;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it("advances real timer runtime in recorded operating steps without changing the design", () => {
    const template = structuredClone(templateFixtures[3]);
    const before = JSON.stringify(template.document);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    expect(JSON.stringify(template.document)).toBe(before);
    template.operatingSequence![1].durationSeconds = 0.5;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
    for (const durationSeconds of [-1, NaN, Infinity]) {
      expect(verifyCircuitSequence(template.document, [{ name: "Invalid duration", durationSeconds, changes: [], expectations: [{ reference: "KT1", label: "Timer contact", exact: "CLOSED" }] }], catalogById)[0].failures).toContain("Invalid step duration");
    }
  });
  it("fails invalid numeric expectations, unknown changes, and unchecked steps", () => {
    const document = templateFixtures[0].document;
    const expectation = { reference: "M1", label: "Nominal motor point", numeric: 1450 };
    const results = verifyCircuitSequence(document, [
      { name: "NaN target", changes: [], expectations: [{ ...expectation, numeric: NaN }] },
      { name: "Infinite tolerance", changes: [], expectations: [{ ...expectation, tolerance: Infinity }] },
      { name: "Negative tolerance", changes: [], expectations: [{ ...expectation, tolerance: -1 }] },
      { name: "Unknown component", changes: [{ reference: "MISSING", properties: {} }], expectations: [{ ...expectation, numeric: 9999 }] },
      { name: "No check", changes: [], expectations: [] },
    ], catalogById);
    expect(results.every((result) => !result.passed)).toBe(true);
  });
  it("requires baseline checks and a recorded sequence before marking an example verified", () => {
    const template = templateLibrary[0];
    expect(verifyProjectTemplate({ ...template, expectedOutputs: [], operatingSequence: [] }, catalogById)).toMatchObject({
      passed: false,
      failedExpectations: ["Project has no baseline output checks", "Project has no checked operating sequence"],
    });
  });

  it("rejects an unasserted fault even when the recorded output still matches", () => {
    const template = structuredClone(templateLibrary.find(({ id }) => id === "type-k-terminal-emf-alarm")!);
    const probe = template.document.components.find(({ id }) => id === "probe")!;
    probe.properties.temperatureC = 2000;
    const expectations = [{ reference: "Q1", label: "Coil", exact: "OFF" }];
    const [step] = verifyCircuitSequence(template.document, [{ name: "Unchecked probe failure", changes: [], expectations }], catalogById);
    expect(step.failures).toEqual(expect.arrayContaining([expect.stringContaining("Unexpected fault at B1")]));
    expect(verifyProjectTemplate(template, catalogById).failedExpectations).toEqual(
      expect.arrayContaining([expect.stringContaining("Unexpected baseline fault at B1")]),
    );
  });
  it("fails active-sheet verification when an edited route crosses another symbol", () => {
    const template = structuredClone(templateLibrary.find(({ id }) => id === "plc-test-bench-source-selector")!);
    const wire = template.document.wires.find(({ id }) => id === "source-a-q0")!;
    const blocker = template.document.components.find(({ id }) => id === "source-b")!;
    wire.points = [{ x: blocker.x, y: blocker.y }];
    const result = verifyProjectTemplate(template, catalogById);
    expect(result.topologyIssues).toEqual([]);
    expect(result.sequenceResults.every(({ passed }) => passed)).toBe(true);
    expect(result.passed).toBe(false);
    const warning = createProjectReport(template.document, catalogById).validation.find(({ code }) => code === "blocked-manual-wire-route");
    expect(warning?.message).toMatch(/SOURCE_A_COMMAND crosses K2/);
    expect(result.failedExpectations).toContain(warning?.message);
    wire.points = [];
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
  });
  it("enforces recorded operating steps for motor-feeder variants", () => {
    const template = structuredClone(templateFixtures[0]);
    expect(template.operatingSequence).toHaveLength(4);
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(true);
    template.operatingSequence![1].expectations[0].numeric = 9999;
    expect(verifyProjectTemplate(template, catalogById).passed).toBe(false);
  });
  it("executes a motor switching sequence with exact stopped and numeric running checks", () => {
    const document = templateFixtures[0].document;
    const before = JSON.stringify(document);
    const label = "Nominal motor point";
    const steps = verifyCircuitSequence(document, [
      { name: "Breaker open", changes: [{ reference: "Q1", properties: { closed: false } }], expectations: [{ reference: "M1", label, exact: "STANDBY" }] },
      { name: "Run", changes: [{ reference: "Q1", properties: { closed: true } }, { reference: "M1", properties: { nominalSpeedRpm: 1450 } }], expectations: [{ reference: "M1", label, numeric: 1450 }] },
      { name: "Stop", changes: [{ reference: "KM1", properties: { energized: false } }], expectations: [{ reference: "M1", label, exact: "STANDBY" }] },
    ], catalogById);
    expect(steps.map((step) => step.passed)).toEqual([true, true, true]);
    expect(JSON.stringify(document)).toBe(before);
  });
  it("contains the existing entries and a source-backed Siemens DOL starter", () => {
    expect(templateLibrary).toHaveLength(39);
    expect(new Set(templateLibrary.map((template) => template.id)).size).toBe(templateLibrary.length);
    expect(templateLibrary.every((template) => !/^template-\d+$/.test(template.id))).toBe(true);
  });

  it("builds a wireable variable-speed drive feeder through U/V/W and PE", () => {
    const template = templateFixtures.find((item) => item.name.startsWith("Variable-speed drive feeder"))!;
    const drive = template.document.components.find((component) => component.reference === "U1")!;
    expect(drive.definitionId).toBe("iec.variable-frequency-drive.02");
    expect(validateCircuit(template.document, catalogById)).toEqual([]);
    const driveEndpoints = template.document.wires.flatMap((wire) => [wire.from, wire.to]).filter((endpoint) => endpoint.componentId === drive.id);
    expect(driveEndpoints.map((endpoint) => endpoint.terminalId)).toEqual(expect.arrayContaining(["l1-in", "l2-in", "l3-in", "u1", "v1", "w1", "pe"]));
  });

  it.each(templateLibrary)("validates topology and model outcomes for $id", (template) => {
      expect(template.document.components.length).toBeGreaterThanOrEqual(3);
      expect(validateCircuit(template.document, catalogById)).toEqual([]);
      expect(template.testSequence.length).toBeGreaterThanOrEqual(3);
      expect(template.expectedOutputs.length).toBeGreaterThanOrEqual(3);
      expect(verifyProjectTemplate(template, catalogById)).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
  });

  it.each(templateLibrary)("loads, saves, renders, and reruns $id through the editable sheet", (template) => {
    const blank = addFreeSchematicSheet(createStarterProject());
    const sheetId = blank.sheets.at(-1)!.id;
    const loaded = loadTemplateIntoSheet(blank, sheetId, template);
    const document = parseProjectJson(JSON.stringify(loaded)).sheets.find((sheet) => sheet.id === sheetId)!.document;
    expect(document.components.map(({ id }) => id)).toEqual(template.document.components.map(({ id }) => id));
    expect(document.wires.map(({ from, to }) => ({ from, to }))).toEqual(template.document.wires.map(({ from, to }) => ({ from, to })));
    expect(verifyProjectTemplate({ ...template, document }, catalogById).passed).toBe(true);
    const svg = renderToStaticMarkup(createElement(Schematic, {
      document, selectedComponentId: "", selectedWireId: "", simulation: initialDolState(), wireMode: false, wireStart: null,
      onSelect: () => {}, onWireSelect: () => {}, onTerminalSelect: () => {},
    }));
    expect(svg).toContain("<svg");
    expect(terminalAnchors(document).length).toBeGreaterThan(0);
  });

  it.each(templateLibrary)("moves, rewires, and reloads $id with its recorded results intact", (template) => {
    const project = addFreeSchematicSheet(createStarterProject());
    const sheetId = project.sheets.at(-1)!.id;
    const loaded = loadTemplateIntoSheet(project, sheetId, template);
    const document = loaded.sheets.find((sheet) => sheet.id === sheetId)!.document;
    const blocked = document.components.filter(({ id, x, y }) => !canPlaceComponent(document.components, id, x, y));
    expect(blocked.map(({ reference }) => reference)).toEqual([]);
    const wire = document.wires.find((candidate) =>
      !candidate.branchOfWireId && !document.wires.some((child) => child.branchOfWireId === candidate.id),
    )!;
    expect(wire).toBeDefined();
    const offsets = [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]];
    const moved = offsets.map(([dx, dy]) => moveComponentsByOffset(document, [wire.from.componentId], dx, dy))
      .find((result) => result.ok && result.document !== document);
    expect(moved).toBeDefined();
    const sourceAnchor = (circuit: typeof document) => terminalAnchors(circuit).find(({ endpoint }) =>
      endpoint.componentId === wire.from.componentId && endpoint.terminalId === wire.from.terminalId,
    );
    expect(sourceAnchor(document)).toBeDefined();
    expect(sourceAnchor(moved!.document)).not.toEqual(sourceAnchor(document));
    expect(moved!.document.wires).toBe(document.wires);

    const disconnected = removeWire(moved!.document, wire.id);
    expect(disconnected.wires).toHaveLength(document.wires.length - 1);
    expect(canConnectTerminals(disconnected, catalogById, wire.from, wire.to).ok).toBe(true);
    const replacement = { ...createManualWire(disconnected, wire.from, wire.to), netName: wire.netName, draftingColor: "#d5242a" };
    const edited = { ...disconnected, revision: disconnected.revision + 1, wires: [...disconnected.wires, replacement] };
    const reloaded = parseProjectJson(JSON.stringify(replaceSheetDocument(loaded, sheetId, edited)));
    const restored = reloaded.sheets.find((sheet) => sheet.id === sheetId)!.document;
    expect(restored).toEqual(edited);
    expect(verifyProjectTemplate({ ...template, document: restored }, catalogById).passed).toBe(true);
  });

  it("drops links belonging to a replaced sheet without changing the rest of the workbook", () => {
    const project = createFourSheetAnalogLevelWorkbook();
    const sheetId = project.sheets[0].id;
    const before = JSON.stringify(project);
    const replaced = loadTemplateIntoSheet(project, sheetId, templateLibrary[0]);
    expect(replaced.continuations).toHaveLength(project.continuations.length - 1);
    expect(replaced.continuations?.every((net) => net.points.every((point) => point.sheetId !== sheetId))).toBe(true);
    expect(replaced.sheets.slice(1)).toEqual(project.sheets.slice(1));
    expect(() => parseProjectJson(JSON.stringify(replaced))).not.toThrow();
    expect(JSON.stringify(project)).toBe(before);
  });

  it("moves and rewires the PT100 high alarm and restores its outcome after reload", () => {
    const template = templateLibrary.find((item) => item.id === "pt100-temperature-window-alarm")!;
    const blank = addFreeSchematicSheet(createStarterProject());
    const loaded = loadTemplateIntoSheet(blank, blank.sheets[1].id, template);
    const sheet = loaded.sheets[1];
    const moved = moveComponentToGrid(sheet.document, "high-alarm", 840, 540);
    if (!moved.ok) throw new Error(moved.reason);
    const original = moved.document.wires.find((wire) => wire.id === "alarm-high")!;
    const broken = removeWire(moved.document, original.id);
    const restoredWire = createManualWire(broken, original.from, original.to);
    const hot = (document: typeof broken) => executeCircuitModels({
      ...document, components: document.components.map((item) => item.id === "sensor" ? { ...item, properties: { temperatureC: 110 } } : item),
    }, catalogById).find((item) => item.reference === "Q2")?.output.value;
    expect(hot(broken)).toBe("OFF");
    const rewired = { ...broken, wires: [...broken.wires, restoredWire] };
    const document = parseProjectJson(JSON.stringify({ ...loaded, sheets: [loaded.sheets[0], { ...sheet, document: rewired }] })).sheets[1].document;
    expect(document.components.find((item) => item.id === "high-alarm")).toMatchObject({ x: 840, y: 540 });
    expect(hot(document)).toBe("ON");
  });

  it("loads a template into a free sheet without mutating the DOL reference sheet", () => {
    const project = addFreeSchematicSheet(createStarterProject());
    const loaded = loadTemplateIntoSheet(project, "sheet-free-1", templateLibrary[0]);

    expect(loaded.sheets[0].kind).toBe("reference-dol");
    expect(loaded.sheets[1].name).toBe(templateLibrary[0].name);
    expect(loaded.sheets[1].document.wires).toHaveLength(templateLibrary[0].document.wires.length);
  });
});

