import { describe, expect, it } from "vitest";
import { componentCatalog, dolCatalog } from "../src/catalog/dolCatalog";
import { modeledCatalog } from "../src/catalog/modeledCatalog";
import { evaluateFunctionalModel, hasFunctionalModel } from "../src/simulation/functionalModels";

describe("IEC-oriented component catalog", () => {
  it("contains the required distribution of unique modeled entries", () => {
    expect(modeledCatalog).toHaveLength(563);
    expect(componentCatalog.length).toBeGreaterThanOrEqual(638);
    expect(new Set(componentCatalog.map((definition) => definition.id)).size).toBe(componentCatalog.length);
    expect(new Set(modeledCatalog.map((definition) => definition.name)).size).toBe(modeledCatalog.length);
    expect(Object.fromEntries(Array.from(new Set(modeledCatalog.map((definition) => definition.category))).map((category) => [category, modeledCatalog.filter((definition) => definition.category === category).length]))).toMatchObject({
      "Power Supply": 32, "Circuit Breakers": 40, "Protection Devices": 35, "Contactors & Starters": 45, Relays: 45, "Switches & Pushbuttons": 35, Motors: 40, Transformers: 30, Sensors: 35, "PLC & I/O": 35, "Timers & Counters": 32, "Terminal Blocks": 35, "Measuring & Indication": 25, "Industrial Loads & Actuators": 35, "Drives & Power Electronics": 32, "Safety & Signalling": 32,
    });
  });

  it("keeps DOL models distinct while giving every modeled entry an executable engineering abstraction", () => {
    expect(dolCatalog).toHaveLength(8);
    for (const definition of modeledCatalog) {
      expect(definition.simulationSupport).not.toBe("symbol-only");
      expect(hasFunctionalModel(definition.simulationModelId)).toBe(true);
      expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toMatchObject({ label: expect.any(String), value: expect.any(String) });
      expect(definition.documentation).toContain("engineering abstraction");
    }
  });

  it("provides terminal and standards metadata for every entry", () => {
    for (const definition of componentCatalog) {
      expect(definition.referencePrefix).not.toBe("");
      expect(definition.terminals.length).toBeGreaterThan(0);
      expect(new Set(definition.terminals.map((terminal) => terminal.id)).size).toBe(definition.terminals.length);
      expect(definition.standardsReferences.length).toBeGreaterThan(0);
    }
  });
});

