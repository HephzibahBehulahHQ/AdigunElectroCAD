import { parseProjectJson } from "../src/projects/projectSerialization";
import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { addFreeSchematicSheet, createBlankProject } from "../src/projects/starterProject";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { assignProjectCableCore } from "../src/projects/projectContinuations";
import { cableScheduleTable, createProjectReport, createProjectWideReport, electricalValidationTable, reportCsv, simulationResultsTable, wireReportTable } from "../src/reports/projectReport";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { createFourSheetAnalogLevelWorkbook } from "../src/projects/fourSheetAnalogLevelWorkbook";

describe("engineering project reports", () => {
  it("reports editable overlaps from imported free sheets and clears them after repositioning", () => {
    const project = createBlankProject();
    const { document } = project.sheets[0];
    const source = createDolMotorStarter().components[0];
    document.components = [{ ...source, x: 220, y: 220 }, { ...source, id: "duplicate-position", reference: "X9", x: 220, y: 220 }];
    const imported = parseProjectJson(JSON.stringify(project));
    expect(createProjectWideReport(imported, catalogById).validation).toContainEqual({
      severity: "warning", code: "component-clearance-overlap", sheet: `${project.sheets[0].name} · Sheet 1`,
      message: "Drawing clearance overlaps between X1 and X9.",
    });
    imported.sheets[0].document.components[1].x = 540;
    expect(createProjectWideReport(imported, catalogById).validation.some(({ code }) => code === "component-clearance-overlap")).toBe(false);
  });
  it("scopes reported model results by sheet and retains faults in the project CSV", () => {
    const project = createFourSheetAnalogLevelWorkbook();
    project.continuations = [];
    const runs = executeProjectCircuitModels(project, catalogById);
    const plc = runs.find(({ modelId }) => modelId === "catalog-plc-digital-io")!;
    expect(plc.output.error).toContain("has no wire");
    const local = simulationResultsTable(runs, project.sheets, "stopped", plc.sheetId);
    const projectWide = simulationResultsTable(runs, project.sheets, "stopped");
    expect(local.rows).toHaveLength(runs.filter(({ sheetId }) => sheetId === plc.sheetId).length);
    expect(local.rows).toContainEqual(["stopped", plc.reference, plc.modelId, plc.output.label, plc.output.value, plc.output.error]);
    expect(projectWide.rows).toHaveLength(runs.length);
    expect(reportCsv({ ...createProjectWideReport(project, catalogById), simulation: projectWide }, "simulation")).toContain(plc.output.error!);
  });

  it("exports local topology findings and cross-sheet continuation findings with their scope", () => {
    const project = createMotorFeederWorkbook();
    expect(createProjectWideReport(project, catalogById).validation).toEqual([]);
    const sheetIndex = project.sheets.findIndex(({ document }) => document.wires.length > 0);
    const sheet = project.sheets[sheetIndex];
    const wire = sheet.document.wires[0];
    sheet.document.wires.push({ ...wire, id: "broken-wire", to: { ...wire.to, terminalId: "missing" } });
    project.continuations![0].points[0].gridReference = "WRONG1";
    const local = createProjectReport(sheet.document, catalogById);
    const workbook = createProjectWideReport(project, catalogById);
    expect(local.validation.some(({ message }) => message.includes("broken-wire"))).toBe(true);
    expect(electricalValidationTable(workbook).rows).toEqual(expect.arrayContaining([
      [expect.stringContaining(`Sheet ${sheetIndex + 1}`), "error", expect.any(String), expect.stringContaining("broken-wire")],
      ["Cross-sheet continuations", "error", "invalid-project-continuation", expect.stringContaining("WRONG1")],
    ]));
    expect(reportCsv(workbook, "validation")).toContain('"Cross-sheet continuations","error","invalid-project-continuation"');
  });

  it("uses user-defined terminal identities and labels in local and project-wide reports", () => {
    const project = createBlankProject();
    const document = project.sheets[0].document;
    document.components = [
      { id: "custom", reference: "U1", definitionId: "user.drawn-symbol", x: 160, y: 160, rotation: 0, properties: {},
        customTerminals: [{ id: "t3", label: "T3", kind: "control", direction: "output" }], terminalLabels: { t3: "RUN" } },
      { id: "peer", reference: "U2", definitionId: "user.drawn-symbol", x: 400, y: 160, rotation: 0, properties: { terminalLabel1: "OVERRIDE", terminalLabel2: "LEGACY" }, terminalLabels: { t1: "ENABLE" } },
    ];
    document.wires = [{ id: "run-wire", netName: "RUN_ENABLE", from: { componentId: "custom", terminalId: "t3" }, to: { componentId: "peer", terminalId: "t1" }, points: [] }];
    for (const report of [createProjectReport(document, catalogById), createProjectWideReport(project, catalogById)]) {
      expect(report.wires[0]).toMatchObject({ from: "U1.RUN", to: "U2.ENABLE" });
      expect(report.terminals.filter((terminal) => terminal.reference === "U1")).toEqual([
        expect.objectContaining({ terminal: "RUN", kind: "control", direction: "output" }),
      ]);
      expect(reportCsv(report, "wires")).toContain('"U1.RUN","U2.ENABLE"');
      expect(reportCsv(report, "terminals")).toContain('"U1","RUN","control","output"');
      expect(reportCsv(report, "terminals")).toContain('"U2","LEGACY"');
      expect(reportCsv(report, "terminals")).not.toContain("OVERRIDE");
    }
  });

  it("derives a BOM, wire list and terminal list from the DOL document", () => {
    const report = createProjectReport(createDolMotorStarter(), catalogById);

    expect(report.bom).toHaveLength(8);
    expect(report.wires).toHaveLength(20);
    expect(report.terminals).toHaveLength(40);
    expect(report.wires[0]).toMatchObject({ netName: "L1", from: "X1.L1", to: "Q1.1/L1" });
  });

  it("aggregates repeated component definitions into one BOM line", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    const report = createProjectReport(document, catalogById);
    const motor = report.bom.find((line) => line.definitionId === "motor.three-phase");

    expect(motor).toMatchObject({ quantity: 2, references: ["M1", "M2"] });
    expect(reportCsv(report, "bom")).toContain('"M1, M2"');
  });

  it("exports inherited and overridden wire drafting colors after project reload", () => {
    const project = createMotorFeederWorkbook();
    const sheet = project.sheets.find(({ document }) => document.wires.length >= 2)!;
    const document = sheet.document;
    const [inherited, overridden] = document.wires;
    document.draftingLayers = [{ id: "field-wiring", name: "Field wiring", draftingColor: "#1d567c" }];
    inherited.layerId = overridden.layerId = "field-wiring";
    overridden.draftingColor = "#d5242a";
    const loaded = parseProjectJson(JSON.stringify(project));
    const local = createProjectReport(loaded.sheets.find(({ id }) => id === sheet.id)!.document, catalogById);
    const workbook = createProjectWideReport(loaded, catalogById);
    for (const report of [local, workbook]) {
      expect(report.wires.find(({ id }) => id === inherited.id)?.draftingColor).toBe("#1d567c");
      expect(report.wires.find(({ id }) => id === overridden.id)?.draftingColor).toBe("#d5242a");
      expect(reportCsv(report, "wires")).toContain('"#1d567c"');
      expect(reportCsv(report, "wires")).toContain('"#d5242a"');
    }
  });

  it("serializes wire reports with a stable CSV header", () => {
    const report = createProjectReport(createDolMotorStarter(), catalogById);
    expect(reportCsv(report, "wires").split("\n")[0]).toBe('"Net","From","To","Drafting color"');
  });
});


it("aggregates BOM, wires, and terminals across sheets with sheet context", () => {
  const sheets = [
    { id: "power", name: "Power", document: createDolMotorStarter(), kind: "free-schematic" },
    { id: "control", name: "Control", document: createDolMotorStarter(), kind: "free-schematic" },
  ] as const;
  const report = createProjectWideReport({ sheets: [...sheets] }, catalogById);
  const contactor = report.bom.find((line) => line.definitionId === "contactor.three-pole");

  expect(report.bom).toHaveLength(8);
  expect(contactor).toMatchObject({ quantity: 2, references: ["Power · Sheet 1 · KM1", "Control · Sheet 2 · KM1"] });
  expect(report.wires).toHaveLength(40);
  expect(report.wires[0]).toMatchObject({ sheet: "Power · Sheet 1", netName: "L1" });
  expect(report.terminals).toHaveLength(80);
  expect(report.terminals[0].sheet).toBe("Power · Sheet 1");
  expect(reportCsv(report, "wires").split("\n")[0]).toBe('"Sheet","Net","From","To","Continuation ID","Cable ID","Core ID","Original source","Drafting color","Conductor color"');
  expect(reportCsv(report, "terminals").split("\n")[0]).toBe('"Sheet","Reference","Terminal","Kind","Direction"');
});

it("reports every continuation hop with its current cable core, adjacent terminals and original source", () => {
  const workbook = createMotorFeederWorkbook();
  const edited = assignProjectCableCore(workbook, "feed-m2-l1", { cableId: 'Panel "A", W2', coreId: "Phase A" });
  if (!edited.ok) throw new Error(edited.reason);
  const project = edited.project;
  const [source, junction, destination, ...remaining] = project.sheets;
  project.sheets = [junction, source, destination, ...remaining];
  const continuation = project.continuations!.find((item) => item.id === "feed-m2-l1")!;
  const [start, middle, end] = continuation.points;
  const sourceComponent = source.document.components.find(({ id }) => id === start.endpoint.componentId)!;
  const terminalIndex = catalogById.get(sourceComponent.definitionId)!.terminals.findIndex(({ id }) => id === start.endpoint.terminalId);
  sourceComponent.properties["terminalLabel" + (terminalIndex + 1)] = "FEED-L1";
  const report = createProjectWideReport(project, catalogById);
  const hops = report.wires.filter((line) => line.continuation?.id === continuation.id);
  const originalSource = `${source.name} · Sheet 2 · ${start.gridReference} · X1.FEED-L1`;
  expect(report.wires.filter((line) => line.continuation)).toHaveLength(39);
  expect(hops).toHaveLength(2);
  expect(hops[0].from).toBe(originalSource);
  expect(hops[0].to).toBe(`${junction.name} · Sheet 1 · ${middle.gridReference} · XW2-L1.J`);
  expect(hops[1].from).toBe(hops[0].to);
  expect(hops[1].to).toContain(`${destination.name} · Sheet 3 · ${end.gridReference} · Q2.`);
  expect(hops[1].continuation).toEqual({ id: continuation.id, cableCore: continuation.cableCore, originalSource });
  expect(wireReportTable(report).rows).toContainEqual([
    `${junction.name} · Sheet 1`, continuation.label, hops[1].from, hops[1].to,
    continuation.id, 'Panel "A", W2', "Phase A", originalSource, "", continuation.conductorColor,
  ]);
  expect(reportCsv(report, "wires")).toContain('"feed-m2-l1","Panel ""A"", W2","Phase A"');
  const schedule = cableScheduleTable(report);
  expect(schedule.rows.filter((row) => row.at(-1) === continuation.id)).toEqual([
    ['Panel "A", W2', "Phase A", continuation.label, continuation.conductorColor, originalSource, hops[1].to, continuation.id],
  ]);
  expect(reportCsv(report, "cables")).toContain('"Panel ""A"", W2","Phase A"');

  const cleared = assignProjectCableCore(project, continuation.id, null);
  if (!cleared.ok) throw new Error(cleared.reason);
  const csv = reportCsv(createProjectWideReport(cleared.project, catalogById), "wires");
  expect(csv).toContain('"feed-m2-l1","",""');
  expect(csv).not.toContain('Panel ""A"", W2');
  expect(reportCsv(createProjectWideReport(cleared.project, catalogById), "cables")).not.toContain(continuation.id);
});

it("reports an obstructed saved automatic wire and clears the warning after repair", () => {
  const project = createBlankProject();
  const document = project.sheets[0].document;
  document.components = [
    { id: "feed", reference: "S1", definitionId: "logic.no-contact", x: 120, y: 350, rotation: 0, properties: {} },
    { id: "load", reference: "K1", definitionId: "logic.output-coil", x: 980, y: 350, rotation: 0, properties: {} },
    { id: "blocker", reference: "U1", definitionId: "user.drawn-symbol", x: 500, y: 350, rotation: 0, properties: {},
      customSymbolGraphics: [{ id: "drawing", name: "Tall enclosure", kind: "line", x1: 0, y1: -360, x2: 0, y2: 440, color: "#000000", strokeWidth: 1 }] },
  ];
  document.wires = [{ id: "w", netName: "ENABLE", from: { componentId: "feed", terminalId: "out" }, to: { componentId: "load", terminalId: "in" }, points: [] }];
  const report = () => createProjectWideReport(project, catalogById);
  expect(report().validation).toContainEqual(expect.objectContaining({
    severity: "warning", code: "blocked-automatic-wire-route", message: expect.stringContaining("ENABLE"),
  }));
  expect(reportCsv(report(), "validation")).toContain("U1");
  document.components.pop();
  expect(report().validation).toEqual([]);
});

it("reports a blocked branch leg and clears the warning when its obstacle moves", () => {
  const project = createBlankProject();
  const document = project.sheets[0].document;
  document.components = [
    { id: "feed", reference: "S1", definitionId: "logic.no-contact", x: 120, y: 350, rotation: 0, properties: {} },
    { id: "first", reference: "K1", definitionId: "logic.output-coil", x: 380, y: 350, rotation: 0, properties: {} },
    { id: "second", reference: "K2", definitionId: "logic.output-coil", x: 980, y: 420, rotation: 0, properties: {} },
    { id: "blocker", reference: "U1", definitionId: "user.drawn-symbol", x: 600, y: 350, rotation: 0, properties: {},
      customSymbolGraphics: [{ id: "drawing", name: "Tall enclosure", kind: "line", x1: 0, y1: -360, x2: 0, y2: 440, color: "#000000", strokeWidth: 1 }] },
  ];
  const source = { componentId: "feed", terminalId: "out" };
  document.wires = [
    { id: "parent", from: source, to: { componentId: "first", terminalId: "in" }, points: [] },
    { id: "branch", netName: "ENABLE", from: source, to: { componentId: "second", terminalId: "in" }, points: [], branchOfWireId: "parent", branchSource: "from", branchPosition: .5 },
  ];
  const warnings = () => createProjectWideReport(project, catalogById).validation.filter(({ code }) => code === "blocked-branch-wire-route");
  expect(warnings()).toEqual([expect.objectContaining({ severity: "warning", message: expect.stringMatching(/ENABLE.*U1/) })]);
  document.components[3].x = 1070;
  expect(warnings()).toEqual([]);
  expect(document.wires[1].branchOfWireId).toBe("parent");
});

it("reports unresolved and pending panel footprints by sheet", () => {
  const project = addFreeSchematicSheet(createBlankProject());
  const [source, panel] = project.sheets;
  const device = createDolMotorStarter().components[0];
  source.document.components = [device];
  panel.document.graphics = [{ id: "footprint", name: "Device front", kind: "rectangle", x1: 100, y1: 100, x2: 145, y2: 185,
    color: "#19324f", strokeWidth: 1, deviceLink: { sheetId: source.id, componentId: device.id } }];
  const issues = () => createProjectWideReport(project, catalogById).validation.filter(issue =>
    issue.code === "unresolved-panel-device" || issue.code === "panel-footprint-review");
  expect(issues()).toEqual([]);
  panel.document.graphics[0].footprintReviewRequired = true;
  source.document.components = [];
  expect(issues()).toEqual([{ severity: "warning", code: "unresolved-panel-device", sheet: panel.name + " · Sheet 2",
    message: "Device front links to a missing schematic device. Relink it in the graphic Properties." }]);
  source.document.components = [{ ...device, reference: "X2" }];
  expect(issues()).toEqual([{ severity: "warning", code: "panel-footprint-review", sheet: panel.name + " · Sheet 2",
    message: "Device front needs footprint review for X2. Verify the outline dimensions and mounting features in the graphic Properties." }]);
  delete panel.document.graphics[0].footprintReviewRequired;
  expect(issues()).toEqual([]);
});

it("flags overlapping equipment outlines on millimetre sheets and allows shared edges", () => {
  const { document } = createBlankProject().sheets[0];
  document.drawingGrid = { units: "mm", displaySpacing: 10, snapSpacing: 1, snapEnabled: true };
  const outline = { kind: "rectangle" as const, x1: 0, y1: 0, x2: 50, y2: 50, color: "#19324f", strokeWidth: 1,
    deviceLink: { sheetId: "schematic", componentId: "q1" } };
  document.graphics = [
    { ...outline, id: "g1", name: "Breaker" },
    { ...outline, id: "g2", name: "Contactor", x1: 45, x2: 95 },
  ];
  const warnings = () => createProjectReport(document, catalogById).validation.filter(issue => issue.code === "panel-outline-overlap");
  expect(warnings()).toMatchObject([{ message: "Linked panel outlines overlap: Breaker and Contactor." }]);
  document.graphics[1].x1 = 50;
  expect(warnings()).toEqual([]);
  document.graphics[1].x1 = 45;
  delete document.graphics[1].deviceLink;
  expect(warnings()).toEqual([]);
});

it("reports entry inside a documented mounting clearance without requiring an outline overlap", () => {
  const project = addFreeSchematicSheet(createBlankProject());
  const [source, panel] = project.sheets;
  source.document.components = ["KM1", "KM2"].map((reference, index) => ({
    id: reference, reference, definitionId: "iec.motor-starter.01", x: 200 + index * 200, y: 200, rotation: 0 as const, properties: {},
  }));
  panel.document.drawingGrid = { units: "mm", displaySpacing: 10, snapSpacing: 1, snapEnabled: true };
  const graphic = { kind: "rectangle" as const, x1: 0, y1: 0, x2: 45, y2: 85, color: "#19324f", strokeWidth: 1 };
  panel.document.graphics = [
    { ...graphic, id: "front", name: "KM1 front", deviceLink: { sheetId: source.id, componentId: "KM1" } },
    { ...graphic, id: "other", name: "KM2 front", y1: 90, y2: 175, deviceLink: { sheetId: source.id, componentId: "KM2" } },
  ];
  const warnings = () => createProjectWideReport(project, catalogById).validation;
  expect(warnings()).not.toContainEqual(expect.objectContaining({ code: "panel-outline-overlap" }));
  expect(warnings()).toContainEqual(expect.objectContaining({ code: "panel-installation-clearance", message: "KM2 front enters the documented mounting clearance for KM1 front." }));
  panel.document.graphics[1].y1 += 5;
  panel.document.graphics[1].y2 += 5;
  expect(warnings()).not.toContainEqual(expect.objectContaining({ code: "panel-installation-clearance" }));
});
