import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { advanceCircuitClock } from "../src/simulation/circuitClock";
import { templateFixtures } from "../src/projects/templateLibrary";

describe("placed functional component execution", () => {
  it("routes each wired interface-relay pole to NC or NO according to coil state", () => {
    const document = createDolMotorStarter();
    const poles = [1, 2, 3];
    document.components = [
      ...poles.map((pole) => ({ id: `source-${pole}`, definitionId: "logic.no-contact", reference: `S${pole}`, x: 100, y: pole * 100, rotation: 0 as const, properties: { input: true } })),
      { id: "relay", definitionId: "iec.interface-relay.03", reference: "K1", x: 300, y: 100, rotation: 0, properties: { energized: false, changeoverContacts: 3 } },
      ...poles.flatMap((pole) => [
        { id: `nc-${pole}`, definitionId: "logic.output-coil", reference: `Q${pole}`, x: 500, y: pole * 100, rotation: 0 as const, properties: { input: false } },
        { id: `no-${pole}`, definitionId: "logic.output-coil", reference: `R${pole}`, x: 700, y: pole * 100, rotation: 0 as const, properties: { input: false } },
      ]),
    ];
    document.wires = poles.flatMap((pole) => [
      { id: `common-${pole}`, from: { componentId: `source-${pole}`, terminalId: "out" }, to: { componentId: "relay", terminalId: `${pole}1` }, points: [], netName: `POLE${pole}` },
      { id: `nc-contact-${pole}`, from: { componentId: "relay", terminalId: `${pole}2` }, to: { componentId: `nc-${pole}`, terminalId: "in" }, points: [], netName: `NC${pole}` },
      { id: `no-contact-${pole}`, from: { componentId: "relay", terminalId: `${pole}4` }, to: { componentId: `no-${pole}`, terminalId: "in" }, points: [], netName: `NO${pole}` },
    ]);
    const input = (id: string) => executeCircuitModels(document, catalogById).find((run) => run.componentId === id)!.evaluatedProperties.input;
    for (const pole of poles) {
      expect(input(`nc-${pole}`)).toBe(true);
      expect(input(`no-${pole}`)).toBe(false);
    }
    document.components.find((component) => component.id === "relay")!.properties.energized = true;
    for (const pole of poles) {
      expect(input(`nc-${pole}`)).toBe(false);
      expect(input(`no-${pole}`)).toBe(true);
    }
  });

  it("routes the overload NC and NO trip contacts only when their common terminals are fed", () => {
    const document = createDolMotorStarter();
    document.components = [
      { id: "source", definitionId: "logic.no-contact", reference: "S0", x: 100, y: 100, rotation: 0, properties: { input: true } },
      { id: "overload", definitionId: "overload.thermal", reference: "F1", x: 300, y: 100, rotation: 0, properties: { tripped: false } },
      { id: "nc-load", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: false } },
      { id: "no-load", definitionId: "logic.output-coil", reference: "K2", x: 500, y: 300, rotation: 0, properties: { input: false } },
    ];
    document.wires = [
      { id: "feed-95", from: { componentId: "source", terminalId: "out" }, to: { componentId: "overload", terminalId: "aux-95" }, points: [], netName: "CONTROL" },
      { id: "feed-97", from: { componentId: "source", terminalId: "out" }, to: { componentId: "overload", terminalId: "aux-97" }, points: [], netName: "CONTROL" },
      { id: "trip-nc", from: { componentId: "overload", terminalId: "aux-96" }, to: { componentId: "nc-load", terminalId: "in" }, points: [], netName: "TRIP-NC" },
      { id: "trip-no", from: { componentId: "overload", terminalId: "aux-98" }, to: { componentId: "no-load", terminalId: "in" }, points: [], netName: "TRIP-NO" },
    ];
    const input = (id: string) => executeCircuitModels(document, catalogById).find((run) => run.componentId === id)!.evaluatedProperties.input;
    expect(input("nc-load")).toBe(true);
    expect(input("no-load")).toBe(false);
    document.components[1].properties.tripped = true;
    expect(input("nc-load")).toBe(false);
    expect(input("no-load")).toBe(true);
  });

  it("routes powered control through the motor starter NO and NC auxiliary contacts", () => {
    const document = createDolMotorStarter();
    document.components = [
      { id: "source", definitionId: "logic.no-contact", reference: "S0", x: 100, y: 100, rotation: 0, properties: { input: true } },
      { id: "starter", definitionId: "iec.motor-starter.01", reference: "KM1", x: 300, y: 100, rotation: 0, properties: { energized: false } },
      { id: "no-load", definitionId: "logic.output-coil", reference: "Q1", x: 500, y: 100, rotation: 0, properties: { input: false } },
      { id: "nc-load", definitionId: "logic.output-coil", reference: "Q2", x: 500, y: 300, rotation: 0, properties: { input: false } },
    ];
    document.wires = [
      { id: "feed-no", from: { componentId: "source", terminalId: "out" }, to: { componentId: "starter", terminalId: "aux-13" }, points: [], netName: "NO-FEED" },
      { id: "feed-nc", from: { componentId: "source", terminalId: "out" }, to: { componentId: "starter", terminalId: "aux-21" }, points: [], netName: "NC-FEED" },
      { id: "no-output", from: { componentId: "starter", terminalId: "aux-14" }, to: { componentId: "no-load", terminalId: "in" }, points: [], netName: "NO-OUTPUT" },
      { id: "nc-output", from: { componentId: "starter", terminalId: "aux-22" }, to: { componentId: "nc-load", terminalId: "in" }, points: [], netName: "NC-OUTPUT" },
    ];
    const loadInput = (id: string) => executeCircuitModels(document, catalogById).find((run) => run.componentId === id)!.evaluatedProperties.input;
    expect(loadInput("no-load")).toBe(false);
    expect(loadInput("nc-load")).toBe(true);
    document.components[1].properties.energized = true;
    expect(loadInput("no-load")).toBe(true);
    expect(loadInput("nc-load")).toBe(false);
  });

  it("conducts wired signals through selector contacts only while the contact is closed", () => {
    const document = createDolMotorStarter();
    document.components = [
      { id: "source", definitionId: "logic.no-contact", reference: "S0", x: 100, y: 100, rotation: 0, properties: { input: true } },
      { id: "selector", definitionId: "iec.selector-switch.01", reference: "S1", x: 300, y: 100, rotation: 0, properties: { closed: false, contactForm: "NO", positions: 2, inputSignal: false } },
      { id: "coil", definitionId: "logic.output-coil", reference: "K1", x: 500, y: 100, rotation: 0, properties: { input: false } },
    ];
    document.wires = [
      { id: "selector-in", from: { componentId: "source", terminalId: "out" }, to: { componentId: "selector", terminalId: "13" }, points: [], netName: "CONTROL" },
      { id: "selector-out", from: { componentId: "selector", terminalId: "14" }, to: { componentId: "coil", terminalId: "in" }, points: [], netName: "CONTROL" },
    ];
    const coilInput = () => executeCircuitModels(document, catalogById).find((run) => run.componentId === "coil")!.evaluatedProperties.input;
    expect(coilInput()).toBe(false);
    document.components[1].properties.closed = true;
    expect(coilInput()).toBe(true);
    document.components[1].properties.closed = false;
    expect(coilInput()).toBe(false);
  });


  it("uses the wired coil command before tracing motor power", () => {
    const document = structuredClone(templateFixtures[0].document);
    document.components.push({ id: "coil-command", definitionId: "logic.no-contact", reference: "S2", x: 100, y: 600, rotation: 0, properties: { input: false } });
    document.wires.push({ id: "coil-control", from: { componentId: "coil-command", terminalId: "out" }, to: { componentId: document.components[2].id, terminalId: "a1" }, points: [], netName: "COIL" });
    const motor = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "M1")!.output.value;
    expect(motor()).toBe("STANDBY");
    document.components.at(-1)!.properties.input = true;
    expect(motor()).toContain("rpm");
  });
  it("propagates a signal through more than twelve reverse-ordered blocks", () => {
    const document = createDolMotorStarter();
    const chain = Array.from({ length: 24 }, (_, index) => ({ id: `chain-${index}`, reference: `K${index}`, definitionId: "logic.no-contact", x: index * 100, y: 100, rotation: 0 as const, properties: { input: index === 0 } }));
    document.components.push(...chain.reverse());
    for (let index = 0; index < 23; index++) document.wires.push({ id: `chain-wire-${index}`, from: { componentId: `chain-${index}`, terminalId: "out" }, to: { componentId: `chain-${index + 1}`, terminalId: "in" }, points: [], netName: "CHAIN" });
    const run = executeCircuitModels(document, catalogById).find((item) => item.componentId === "chain-23");
    expect(run?.output.value).toBe("ON");
  });
  it("drops the wired actuator when either safety channel opens", () => {
    let document = structuredClone(templateFixtures[4].document);
    document = advanceCircuitClock(document, catalogById, 0.1);
    document.components[0].properties.reset = true;
    document = advanceCircuitClock(document, catalogById, 0.1);
    document.components[2].properties.returnSpring = true;
    const actuator = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toContain("EXTENDED");
    for (const channel of ["channelAClosed", "channelBClosed"]) {
      document.components[0].properties[channel] = false;
      expect(actuator()).toBe("RETRACTED");
      document.components[0].properties[channel] = true;
    }
    document.components[1].properties.continuityClosed = false;
    expect(actuator()).toBe("RETRACTED");
  });
  it("holds a wired relay and actuator off until the timer expires", () => {
    const document = structuredClone(templateFixtures[3].document);
    const timer = document.components[0];
    timer.properties.delaySeconds = 2;
    timer.properties.elapsedSeconds = 1;
    document.components[2].properties.returnSpring = true;
    const actuator = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toBe("RETRACTED");
    timer.properties.elapsedSeconds = 2;
    expect(actuator()).toContain("EXTENDED");
    timer.properties.energized = false;
    expect(actuator()).toBe("RETRACTED");
  });
  it("propagates sensor inputs and PLC output commands through catalog wires", () => {
    const document = structuredClone(templateFixtures[2].document);
    document.components[0].properties.detected = false;
    document.components[1].properties.output = false;
    document.components[2].properties.returnSpring = true;
    const runs = executeCircuitModels(document, catalogById);
    expect(runs.find((run) => run.reference === "PLC1")?.output.value).toContain("I0 OFF");
    expect(runs.find((run) => run.reference === "Y1")?.output.value).toBe("RETRACTED");
  });
  it("passes a wired numeric sensor signal into a panel meter reading", () => {
    const document = createDolMotorStarter();
    document.components = [
      { id: "load-cell", definitionId: "sensor.load-cell", reference: "B1", x: 100, y: 100, rotation: 0, properties: { forceN: 1000, capacityN: 1000 } },
      { id: "meter", definitionId: "iec.panel-meter.01", reference: "P1", x: 300, y: 100, rotation: 0, properties: { measurementKind: "Voltage", measuredValue: 0, scaleMaximum: 10 } },
    ];
    document.wires = [{ id: "measurement", from: { componentId: "load-cell", terminalId: "signal" }, to: { componentId: "meter", terminalId: "signal" }, points: [], netName: "MEAS" }];
    const meter = executeCircuitModels(document, catalogById).find((run) => run.reference === "P1")!;
    expect(meter.output.label).toBe("Voltage reading");
    expect(Number(meter.evaluatedProperties.measuredValue)).toBeGreaterThan(0);
  });

  it("scales motor speed with drive frequency and stops at zero command", () => {
    const document = structuredClone(templateFixtures[1].document);
    document.components[3].properties.nominalSpeedRpm = 1500;
    const drive = document.components[2];
    const speed = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "M1")!.output.value;
    drive.properties.commandHz = 25;
    expect(speed()).toMatch(/^750 rpm/);
    drive.properties.commandHz = 50;
    expect(speed()).toMatch(/^1500 rpm/);
    drive.properties.commandHz = 0;
    expect(speed()).toBe("STANDBY");
    drive.properties.commandHz = 25;
    drive.properties.enabled = false;
    expect(speed()).toBe("STANDBY");
  });
  it("removes motor power when the source or starter is switched off", () => {
    const document = structuredClone(templateFixtures[0].document);
    const motor = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "M1")!.output.value;
    document.components[0].properties.outputEnabled = false;
    expect(motor()).toBe("STANDBY");
    document.components[0].properties.outputEnabled = true;
    document.components[2].properties.energized = false;
    expect(motor()).toBe("STANDBY");
    document.components[2].properties.energized = true;
    expect(motor()).toContain("rpm");
  });
  it("rejects a motor supplied with phases from independent sources", () => {
    const document = structuredClone(templateFixtures[0].document);
    const source = { ...structuredClone(document.components[0]), id: "independent-source", reference: "X2" };
    document.components.push(source);
    document.wires[0].from.componentId = source.id;
    expect(executeCircuitModels(document, catalogById).find((run) => run.reference === "M1")?.output.value).toBe("STANDBY");
  });
  it("does not run a motor whose three terminals receive the same phase", () => {
    const document = structuredClone(templateFixtures[0].document);
    for (const wire of document.wires.filter((wire) => wire.to.componentId === document.components[3].id)) wire.from.terminalId = "l1-out";
    const motor = executeCircuitModels(document, catalogById).find((run) => run.reference === "M1");
    expect(motor?.output.value).toBe("STANDBY");
  });
  it("removes motor power when its breaker opens or a phase wire is removed", () => {
    const document = structuredClone(templateFixtures[0].document);
    const motor = () => executeCircuitModels(document, catalogById).find((run) => run.reference === "M1")!.output.value;
    expect(motor()).toContain("rpm");
    const breaker = document.components.find((component) => component.reference === "Q1")!;
    breaker.properties.closed = false;
    expect(motor()).toBe("STANDBY");
    breaker.properties.closed = true;
    expect(motor()).toContain("rpm");
    document.wires.pop();
    expect(motor()).toBe("STANDBY");
  });
  it("evaluates a placed parameterized IEC catalog record through its declared abstraction", () => {
    const document = createDolMotorStarter();
    document.components.push({ id: "breaker-iec", definitionId: "iec.circuit-breaker.01", reference: "Q2", x: 900, y: 180, rotation: 0, properties: { nominalVoltageV: 24, ratedCurrentA: 4.1, poles: 3, closed: true, breakingCapacityKa: 7 } });
    document.components.push({ id: "timer-iec", definitionId: "iec.on-delay-timer.01", reference: "KT2", x: 900, y: 260, rotation: 0, properties: { nominalVoltageV: 24, ratedCurrentA: 4.1, energized: true, elapsedSeconds: 1, delaySeconds: 0.5 } });

    expect(executeCircuitModels(document, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: "Q2", output: { label: "Breaker path", value: "CLOSED · 3P / 4.1 A" } }),
      expect.objectContaining({ reference: "KT2", output: { label: "Timer contact", value: "CLOSED" } }),
    ]));
  });

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
      expect.objectContaining({ reference: "ADC1", output: { label: "Signal fault", error: "Signal unit ohm is not accepted at ADC1.in.", value: "ERROR: Signal unit ohm is not accepted at ADC1.in." } }),
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
      expect.objectContaining({ reference: "MTH1", output: { label: "Signal fault", error: "Mixed signal units milliamp/millivolt at MTH1.", value: "ERROR: Mixed signal units milliamp/millivolt at MTH1." } }),
    ]));
  });
});
