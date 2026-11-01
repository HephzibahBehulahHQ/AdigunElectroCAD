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

  it("propagates a boolean control signal through a contact, gate and coil", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "contact-1", definitionId: "logic.no-contact", reference: "K1", x: 900, y: 180, rotation: 0, properties: { input: true } });
    document.components.push({ id: "gate-1", definitionId: "logic.gate-and", reference: "LG1", x: 900, y: 280, rotation: 0, properties: { inputA: false, inputB: true } });
    document.components.push({ id: "coil-1", definitionId: "logic.output-coil", reference: "Q1", x: 900, y: 380, rotation: 0, properties: { input: false } });
    document.wires.push({ id: "contact-to-gate", from: { componentId: "contact-1", terminalId: "out" }, to: { componentId: "gate-1", terminalId: "in-a" }, points: [], netName: "CONTROL_A" });
    document.wires.push({ id: "gate-to-coil", from: { componentId: "gate-1", terminalId: "out" }, to: { componentId: "coil-1", terminalId: "in" }, points: [], netName: "COIL_Q1" });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "LG1", output: { label: "AND output", value: "ON" } }),
      expect.objectContaining({ reference: "Q1", output: { label: "Coil", value: "ON" } }),
    ]));
  });

  it("propagates matching instrumentation units into PLC comparison blocks", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "pt100-hot", definitionId: "sensor.pt100", reference: "B1", x: 900, y: 180, rotation: 0, properties: { temperatureC: 100 } });
    document.components.push({ id: "pt100-cool", definitionId: "sensor.pt100", reference: "B2", x: 900, y: 260, rotation: 0, properties: { temperatureC: 20 } });
    document.components.push({ id: "temperature-compare", definitionId: "logic.comparator-greater-than", reference: "CMP1", x: 900, y: 340, rotation: 0, properties: { left: 0, right: 0 } });
    document.wires.push({ id: "hot-signal", from: { componentId: "pt100-hot", terminalId: "signal" }, to: { componentId: "temperature-compare", terminalId: "in-a" }, points: [], netName: "RTD_HOT" });
    document.wires.push({ id: "cool-signal", from: { componentId: "pt100-cool", terminalId: "signal" }, to: { componentId: "temperature-compare", terminalId: "in-b" }, points: [], netName: "RTD_COOL" });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "CMP1", output: { label: "Comparator", value: "ON" } }),
    ]));
  });

  it("rejects an incompatible sensor unit at an ADC input", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "pt100-1", definitionId: "sensor.pt100", reference: "B1", x: 900, y: 180, rotation: 0, properties: { temperatureC: 100 } });
    document.components.push({ id: "adc-1", definitionId: "signal.adc", reference: "ADC1", x: 900, y: 260, rotation: 0, properties: { milliamp: 4 } });
    document.wires.push({ id: "invalid-rtd-to-adc", from: { componentId: "pt100-1", terminalId: "signal" }, to: { componentId: "adc-1", terminalId: "in" }, points: [], netName: "RTD_NOT_4_20" });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "ADC1", output: { label: "PLC raw value", value: "0" } }),
    ]));
  });

  it("retains a received unit when its value matches the block default", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "level-1", definitionId: "sensor.level-4-20", reference: "B1", x: 900, y: 180, rotation: 0, properties: { levelPercent: 0 } });
    document.components.push({ id: "thermo-1", definitionId: "sensor.thermocouple", reference: "B2", x: 900, y: 260, rotation: 0, properties: { temperatureC: 100 } });
    document.components.push({ id: "math-1", definitionId: "logic.math-add", reference: "MTH1", x: 900, y: 340, rotation: 0, properties: { left: 4, right: 0 } });
    document.wires.push({ id: "level-to-math", from: { componentId: "level-1", terminalId: "signal" }, to: { componentId: "math-1", terminalId: "in-a" }, points: [], netName: "LEVEL_DEFAULT" });
    document.wires.push({ id: "thermo-to-math", from: { componentId: "thermo-1", terminalId: "signal" }, to: { componentId: "math-1", terminalId: "in-b" }, points: [], netName: "THERMO_INCOMPATIBLE" });
    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "MTH1", output: { label: "Math output", value: "4" } }),
    ]));
  });
});
