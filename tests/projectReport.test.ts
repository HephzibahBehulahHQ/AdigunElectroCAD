import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createBlankProject } from "../src/projects/starterProject";
import { createMotorFeederWorkbook } from "../src/projects/motorFeederWorkbook";
import { assignProjectCableCore } from "../src/projects/projectContinuations";
import { cableScheduleTable, createProjectReport, createProjectWideReport, electricalValidationTable, reportCsv, simulationResultsTable, wireReportTable } from "../src/reports/projectReport";
import { executeProjectCircuitModels } from "../src/simulation/projectCircuitModels";
import { createFourSheetAnalogLevelWorkbook } from "../src/projects/fourSheetAnalogLevelWorkbook";

describe("engineering project reports", () => {
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

  it("serializes wire reports with a stable CSV header", () => {
    const report = createProjectReport(createDolMotorStarter(), catalogById);
    expect(reportCsv(report, "wires").split("\n")[0]).toBe('"Net","From","To"');
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
  expect(reportCsv(report, "wires").split("\n")[0]).toBe('"Sheet","Net","From","To","Continuation ID","Cable ID","Core ID","Original source"');
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
    continuation.id, 'Panel "A", W2', "Phase A", originalSource,
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
