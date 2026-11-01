import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { executeCircuitModels } from "../src/simulation/circuitModels";

describe("placed functional component execution", () => {
  it("evaluates functional catalog instances from the schematic document", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "level-1", definitionId: "sensor.level-4-20", reference: "B1", x: 900, y: 180, rotation: 0, properties: { levelPercent: 25 } });
    document.components.push({ id: "adc-1", definitionId: "signal.adc", reference: "ADC1", x: 900, y: 230, rotation: 0, properties: { milliamp: 12 } });
    document.components.push({ id: "gate-1", definitionId: "logic.gate-and", reference: "LG1", x: 900, y: 280, rotation: 0, properties: { inputA: true, inputB: true } });
    document.wires.push({ id: "level-to-adc", from: { componentId: "level-1", terminalId: "signal" }, to: { componentId: "adc-1", terminalId: "in" }, points: [], netName: "LEVEL_4_20" });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "B1", output: { label: "Level signal", value: "8.00 mA" } }),
      expect.objectContaining({ reference: "ADC1", output: { label: "PLC raw value", value: "6912" } }),
      expect.objectContaining({ reference: "LG1", output: { label: "AND output", value: "ON" } }),
    ]));
  });
});
