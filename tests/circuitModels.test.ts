import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { executeCircuitModels } from "../src/simulation/circuitModels";

describe("placed functional component execution", () => {
  it("evaluates functional catalog instances from the schematic document", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "level-1", definitionId: "sensor.level-4-20", reference: "B1", x: 900, y: 180, rotation: 0, properties: { levelPercent: 50 } });
    document.components.push({ id: "gate-1", definitionId: "logic.gate-and", reference: "LG1", x: 900, y: 280, rotation: 0, properties: { inputA: true, inputB: true } });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "B1", output: { label: "Level signal", value: "12.00 mA" } }),
      expect.objectContaining({ reference: "LG1", output: { label: "AND output", value: "ON" } }),
    ]));
  });
});
