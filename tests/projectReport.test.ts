import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createProjectReport } from "../src/reports/projectReport";

describe("engineering project reports", () => {
  it("derives a BOM, wire list and terminal list from the DOL document", () => {
    const report = createProjectReport(createDolMotorStarter(), catalogById);

    expect(report.bom).toHaveLength(8);
    expect(report.wires).toHaveLength(20);
    expect(report.terminals).toHaveLength(38);
    expect(report.wires[0]).toMatchObject({ netName: "L1", from: "X1.L1", to: "Q1.1/L1" });
  });

  it("aggregates repeated component definitions into one BOM line", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    const report = createProjectReport(document, catalogById);
    const motor = report.bom.find((line) => line.definitionId === "motor.three-phase");

    expect(motor).toMatchObject({ quantity: 2, references: ["M1", "M2"] });
  });
});
