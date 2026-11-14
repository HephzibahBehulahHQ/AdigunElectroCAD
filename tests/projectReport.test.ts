import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createProjectReport, createProjectWideReport, reportCsv } from "../src/reports/projectReport";

describe("engineering project reports", () => {
  it("derives a BOM, wire list and terminal list from the DOL document", () => {
    const report = createProjectReport(createDolMotorStarter(), catalogById);

    expect(report.bom).toHaveLength(9);
    expect(report.wires).toHaveLength(20);
    expect(report.terminals).toHaveLength(44);
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
    { name: "Power · Sheet 1", document: createDolMotorStarter() },
    { name: "Control · Sheet 2", document: createDolMotorStarter() },
  ];
  const report = createProjectWideReport(sheets, catalogById);
  const contactor = report.bom.find((line) => line.definitionId === "contactor.three-pole");

  expect(report.bom).toHaveLength(9);
  expect(contactor).toMatchObject({ quantity: 2, references: ["Power · Sheet 1 · KM1", "Control · Sheet 2 · KM1"] });
  expect(report.wires).toHaveLength(40);
  expect(report.wires[0]).toMatchObject({ sheet: "Power · Sheet 1", netName: "L1" });
  expect(report.terminals).toHaveLength(88);
  expect(report.terminals[0].sheet).toBe("Power · Sheet 1");
  expect(reportCsv(report, "wires").split("\\n")[0]).toBe('"Sheet","Net","From","To"');
  expect(reportCsv(report, "terminals").split("\\n")[0]).toBe('"Sheet","Reference","Terminal","Kind","Direction"');
});
