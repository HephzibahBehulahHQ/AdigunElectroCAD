import { describe, expect, it } from "vitest";
import { catalogById, componentCatalog, componentLibraryCatalog, dolCatalog, genericComponentProfiles, genericThreePhaseMotor } from "../src/catalog/dolCatalog";
import { modeledCatalog } from "../src/catalog/modeledCatalog";
import { evaluateFunctionalModel, evaluateFunctionalSignal, hasFunctionalModel } from "../src/simulation/functionalModels";
import { functionalOutputTerminals } from "../src/electrical/signalContracts";

describe("IEC-oriented component catalog", () => {
  it("provides a distinct generic three-lead motor with unset nameplate ratings", () => {
    expect(componentLibraryCatalog).toContain(genericThreePhaseMotor);
    expect(catalogById.get(genericThreePhaseMotor.id)).toBe(genericThreePhaseMotor);
    expect(genericThreePhaseMotor.terminals.map(({ id }) => id)).toEqual(["u1", "v1", "w1", "pe"]);
    expect(genericThreePhaseMotor.propertiesSchema).toMatchObject({ nominalVoltageV: 0, ratedCurrentA: 0, ratedPowerKw: 0, nominalSpeedRpm: 0, ratedFrequencyHz: 0 });
    expect(genericThreePhaseMotor.documentation).toContain("default to 0 (unset)");
  });

  it("offers one clearly generic profile per modeled family and keeps sourced devices distinct", () => {
    expect(componentLibraryCatalog.length).toBeLessThan(200);
    expect(componentLibraryCatalog.map((definition) => definition.id)).not.toContain("iec.induction-motor.03");
    expect(componentLibraryCatalog.map((definition) => definition.id)).toContain("iec.induction-motor.41");
    expect(componentLibraryCatalog.map((definition) => definition.id)).toContain("iec.motor-starter.01");
    const motor = genericComponentProfiles.find((definition) => definition.id === "generic.iec.induction-motor")!;
    expect(motor.name).toBe("Generic three-phase motor · 6 leads");
    expect(motor.propertiesSchema).toMatchObject({ nominalVoltageV: 0, ratedCurrentA: 0, ratedPowerKw: 0, nominalSpeedRpm: 0, frequencyHz: 0, ratedFrequencyHz: 0, powerFactor: 0, efficiencyPercent: 0, lineVoltageV: 0, resistanceOhm: 0, reactanceOhm: 0, polePairs: 0 });
    expect(motor.terminals.map(({ id }) => id)).toEqual(["u1", "v1", "w1", "u2", "v2", "w2", "pe"]);
    expect(motor.simulationModelId).toBe("six-terminal-windings");
    expect(componentLibraryCatalog).toContain(motor);
    expect(motor.documentation).toContain("not a named manufacturer's device");
    expect(motor.documentation).toContain("default to 0 (unset)");
    expect(catalogById.get("iec.induction-motor.03")).toBeDefined();
    const unsourcedMotor = modeledCatalog.find((definition) => definition.id === "iec.induction-motor.03")!;
    expect(unsourcedMotor.documentation).not.toContain("Source-backed");
    expect(unsourcedMotor.documentation).not.toContain("Siemens SIMOTICS");
  });

  it("starts source-unverified generic device ratings and limits unset", () => {
    const unsetProperties = [
      "nominalVoltageV", "ratedVoltageV", "ratedCurrentA", "ratedPowerKw", "nominalSpeedRpm",
      "coilVoltageV", "breakingCapacityKa", "frequencyHz", "ratedFrequencyHz",
      "inputVoltageV", "outputVoltageV", "primaryVoltageV", "secondaryVoltageV",
      "maximumFrequencyHz", "sensingDistanceMm", "scaleMaximum", "conductorAreaMm2", "strokeMm",
    ];
    for (const profile of genericComponentProfiles) {
      for (const property of unsetProperties) {
        if (property in profile.propertiesSchema) expect(profile.propertiesSchema[property], `${profile.id}.${property}`).toBe(0);
      }
      expect(profile.documentation).toContain("default to 0 (unset)");
    }
    expect(genericComponentProfiles.find(({ id }) => id === "generic.iec.control-transformer")?.propertiesSchema).toMatchObject({ primaryVoltageV: 0, secondaryVoltageV: 0 });
    expect(genericComponentProfiles.find(({ id }) => id === "generic.iec.ac-supply")?.propertiesSchema.frequencyHz).toBe(0);
    expect(genericComponentProfiles.find(({ id }) => id === "generic.iec.proximity-sensor")?.propertiesSchema.sensingDistanceMm).toBe(0);
  });

  it("contains the required distribution of unique modeled entries", () => {
    expect(modeledCatalog).toHaveLength(491);
    expect(componentCatalog.length).toBeGreaterThanOrEqual(563);
    expect(new Set(componentCatalog.map((definition) => definition.id)).size).toBe(componentCatalog.length);
    expect(new Set(modeledCatalog.map((definition) => definition.name)).size).toBe(modeledCatalog.length);
    expect(modeledCatalog.find((definition) => definition.id === "iec.induction-motor.03")?.name).toBe("Induction motor · 110V/9A");
    const starDeltaMotor = modeledCatalog.find((definition) => definition.id === "iec.induction-motor.41")!;
    expect(starDeltaMotor.terminals.map(({ id }) => id)).toEqual(["u1", "v1", "w1", "u2", "v2", "w2", "pe"]);
    expect(starDeltaMotor.description).toContain("not Siemens equivalent-circuit data");
    expect(starDeltaMotor.standardsReferences).toContain("https://cache.industry.siemens.com/dl/files/362/32182362/att_1163295/v1/EN_1LE1_1FP1_1FP3_1PC1_1PC3_op_Instr_1123.pdf");
    expect(Object.fromEntries(Array.from(new Set(modeledCatalog.map((definition) => definition.category))).map((category) => [category, modeledCatalog.filter((definition) => definition.category === category).length]))).toMatchObject({
      "Power Supply": 33, "Circuit Breakers": 41, "Protection Devices": 35, "Contactors & Starters": 1, Relays: 45, "Switches & Pushbuttons": 35, Motors: 41, Transformers: 30, Sensors: 35, "PLC & I/O": 35, "Timers & Counters": 32, "Terminal Blocks": 35, "Measuring & Indication": 25, "Industrial Loads & Actuators": 35, "Drives & Power Electronics": 32, "Safety & Signalling": 1,
    });
  });

  it("keeps DOL models distinct while giving every modeled entry an executable engineering abstraction", () => {
    expect(dolCatalog).toHaveLength(8);
    for (const definition of modeledCatalog) {
      expect(definition.simulationSupport).not.toBe("symbol-only");
      expect(hasFunctionalModel(definition.simulationModelId)).toBe(true);
      expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toMatchObject({ label: expect.any(String), value: expect.any(String) });
      expect(definition.documentation).toContain("engineering abstraction");
      if (definition.id === "plc-digital-io") expect(definition.documentation).toContain("GT/GE/LT/LE/EQ/NE");
    }
  });

  it("uses the documented Pilz PNOZ X2.7P terminal and contact set", () => {
    const relay = modeledCatalog.find((definition) => definition.id === "iec.safety-relay.01")!;
    expect(relay.name).toBe("Pilz PNOZ X2.7P · 24V AC/DC (777305)");
    expect(relay.terminals.map((terminal) => terminal.id)).toEqual([
      "a1", "a2", "s11", "s52", "s21", "s22", "s12", "s34",
      "13", "14", "23", "24", "33", "34", "41", "42",
    ]);
    expect(relay.terminals.some((terminal) => terminal.id === "reset")).toBe(false);
    expect(relay.propertiesSchema.ratedCurrentA).toBeUndefined();
    expect(relay.standardsReferences.some((source) => source.includes("1004081-EN-24.pdf"))).toBe(true);
  });

  it("models the three-phase source with output-only phase terminals and protective earth", () => {
    const supply = modeledCatalog.find((definition) => definition.id === "iec.ac-supply.01")!;
    expect(supply.terminals.map((terminal) => terminal.id)).toEqual(["l1-out", "l2-out", "l3-out", "pe"]);
    expect(supply.terminals.slice(0, 3).every((terminal) => terminal.direction === "output")).toBe(true);
  });

  it("models VFD line, U/V/W, and protective-earth terminals", () => {
    const drive = modeledCatalog.find((definition) => definition.id === "iec.variable-frequency-drive.01")!;
    expect(drive.terminals.map((terminal) => terminal.id)).toEqual(["l1-in", "l2-in", "l3-in", "u1", "v1", "w1", "pe"]);
    expect(drive.terminals.slice(0, 3).every((terminal) => terminal.direction === "input")).toBe(true);
    expect(drive.terminals.slice(3, 6).every((terminal) => terminal.direction === "output")).toBe(true);
    expect(drive.terminals.some((terminal) => terminal.id === "a1" || terminal.id === "a2")).toBe(false);
  });

  it("models the panel-meter measurement lead as an input", () => {
    const meter = modeledCatalog.find((definition) => definition.id === "iec.panel-meter.01")!;
    expect(meter.terminals.map((terminal) => [terminal.id, terminal.label, terminal.direction])).toEqual([
      ["supply", "+24V", "input"],
      ["signal", "MEAS", "input"],
      ["common", "0V", "bidirectional"],
    ]);
  });

  it("matches selector contact IDs and resting state to NO/NC variants", () => {
    const no = modeledCatalog.find((definition) => definition.id === "iec.selector-switch.01")!;
    const nc = modeledCatalog.find((definition) => definition.id === "iec.selector-switch.02")!;
    expect(no.propertiesSchema.contactForm).toBe("NO");
    expect(no.propertiesSchema.closed).toBe(false);
    expect(no.propertiesSchema.positions).toBe(2);
    expect(no.terminals.map((terminal) => terminal.id)).toEqual(["13", "14"]);
    expect(nc.propertiesSchema.contactForm).toBe("NC");
    expect(nc.propertiesSchema.closed).toBe(true);
    expect(nc.propertiesSchema.positions).toBe(2);
    expect(nc.terminals.map((terminal) => terminal.id)).toEqual(["21", "22"]);
  });

  it("matches breaker pole count and contactor auxiliary count with real terminals", () => {
    const breaker3 = modeledCatalog.find((definition) => definition.id === "iec.circuit-breaker.01")!;
    const breaker4 = modeledCatalog.find((definition) => definition.id === "iec.circuit-breaker.04")!;
    expect(breaker3.propertiesSchema.poles).toBe(3);
    expect(breaker3.terminals.filter((terminal) => terminal.kind === "power")).toHaveLength(6);
    expect(breaker4.propertiesSchema.poles).toBe(4);
    expect(breaker4.terminals.filter((terminal) => terminal.kind === "power").map((terminal) => terminal.id)).toEqual(["l1-in", "l2-in", "l3-in", "l1-out", "l2-out", "l3-out", "n-in", "n-out"]);
    const starter = modeledCatalog.find((definition) => definition.id === "iec.motor-starter.01")!;
    expect(starter.name).toBe("Siemens SIRIUS 3RT2025-1BB40 · 17A/7.5kW");
    expect(starter.terminals.map((terminal) => terminal.id)).toEqual(["l1-in", "l2-in", "l3-in", "l1-out", "l2-out", "l3-out", "a1", "a2", "aux-13", "aux-14", "aux-21", "aux-22"]);
    expect(starter.propertiesSchema.coilVoltageV).toBe(24);
    expect(starter.propertiesSchema.coilDc).toBe(true);
    expect(starter.terminals.some((terminal) => terminal.id === "aux-21")).toBe(true);
    expect(starter.standardsReferences.some((source) => source.includes("3RT2025-1BB40"))).toBe(true);
  });

  it("matches relay changeover-contact counts with three-terminal common/NC/NO sets", () => {
    for (const [variant, count] of [[1, 1], [2, 2], [3, 3]] as const) {
      const relay = modeledCatalog.find((definition) => definition.id === `iec.interface-relay.${String(variant).padStart(2, "0")}`)!;
      expect(relay.propertiesSchema.changeoverContacts).toBe(count);
      expect(relay.terminals.filter((terminal) => /^[1-3][124]$/.test(terminal.id)).map((terminal) => terminal.id)).toEqual(
        Array.from({ length: count }, (_, index) => [`${index + 1}1`, `${index + 1}2`, `${index + 1}4`]).flat(),
      );
    }
  });

  it("provides terminal and standards metadata for every entry", () => {
    for (const definition of componentCatalog) {
      expect(definition.referencePrefix).not.toBe("");
      if (definition.simulationModelId === "none") {
        expect(definition.terminals).toEqual([]);
        expect(definition.simulationSupport).toBe("symbol-only");
        expect(evaluateFunctionalModel(definition.simulationModelId, definition.propertiesSchema)).toBeUndefined();
        continue;
      }
      expect(definition.terminals.length).toBeGreaterThan(0);
      expect(new Set(definition.terminals.map((terminal) => terminal.id)).size).toBe(definition.terminals.length);
      if (definition.simulationSupport === "symbol-only") {
        expect(definition.standardsReferences).toEqual([]);
        expect(definition.documentation).toContain("No voltage");
      } else expect(definition.standardsReferences.length).toBeGreaterThan(0);
    }
  });
});


describe("source-backed Siemens overload relay", () => {
  it("exposes the correct three-pole, NC-trip, and NO-trip terminals", () => {
    const overload = dolCatalog.find((definition) => definition.id === "overload.thermal")!;
    expect(overload.name).toContain("3RU2126-4AB0");
    expect(overload.terminals.map((terminal) => terminal.id)).toEqual([
      "l1-in", "l2-in", "l3-in", "t1", "t2", "t3", "aux-95", "aux-96", "aux-97", "aux-98",
    ]);
    expect(overload.propertiesSchema).toMatchObject({ settingMinA: 11, settingMaxA: 16, tripClass: 10 });
    expect(overload.standardsReferences.some((source) => source.includes("3RU2126-4AB0"))).toBe(true);
    expect(functionalOutputTerminals(overload).map((terminal) => terminal.id)).toEqual(["aux-96", "aux-98"]);
    expect(evaluateFunctionalSignal(overload.simulationModelId, { tripped: false }, "aux-96")).toBeUndefined();
    const healthy = { tripped: false, aux95Input: true, aux97Input: true };
    expect(evaluateFunctionalSignal(overload.simulationModelId, healthy, "aux-96")?.value).toBe(true);
    expect(evaluateFunctionalSignal(overload.simulationModelId, healthy, "aux-98")?.value).toBe(false);
    const tripped = { ...healthy, tripped: true };
    expect(evaluateFunctionalSignal(overload.simulationModelId, tripped, "aux-96")?.value).toBe(false);
    expect(evaluateFunctionalSignal(overload.simulationModelId, tripped, "aux-98")?.value).toBe(true);
  });
});

describe("source-backed Siemens SIMOTICS motor", () => {
  it("uses the identified 400 V delta nameplate data and wireable U1/V1/W1 plus PE", () => {
    const motor = modeledCatalog.find((definition) => definition.id === "iec.induction-motor.01")!;
    expect(motor.name).toBe("Siemens SIMOTICS GP · 7.5kW/14.3A");
    expect(motor.terminals.map((terminal) => terminal.id)).toEqual(["u1", "v1", "w1", "pe"]);
    expect(motor.propertiesSchema).toMatchObject({ nominalVoltageV: 400, ratedCurrentA: 14.3, ratedPowerKw: 7.5, nominalSpeedRpm: 1470, frequencyHz: 50, windingConnection: "Delta" });
    expect(motor.standardsReferences.some((source) => source.includes("1LE1003-1CB23-4AA4"))).toBe(true);
  });
});

