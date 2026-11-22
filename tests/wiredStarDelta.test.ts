import { expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
import { createWiredStarDeltaCircuit, createWiredStarDeltaTemplate } from "../src/projects/wiredStarDeltaCircuit";
import { advanceCircuitClock, resetCircuitClock, setCircuitBooleanInput } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";
import { evaluateWiredControl } from "../src/simulation/wiredControl";
import { verifyProjectTemplate } from "../src/projects/templateVerification";

const motor = (document: ReturnType<typeof createWiredStarDeltaCircuit>) => executeCircuitModels(document, catalogById).find(run => run.reference === "M1")!.output.value;

it("runs the wired star, open-transition, delta, overload and reset sequence", () => {
  const template = createWiredStarDeltaTemplate();
  expect(template.document.components.find(component => component.id === "overload")?.properties.thermalEnabled).toBe(true);
  expect(template.operatingSequence?.map(step => step.name)).toContain("Delta current trips the thermal overload and drops all coils");
  const result = verifyProjectTemplate(template, catalogById);
  expect(validateCircuit(createWiredStarDeltaCircuit(), catalogById)).toEqual([]);
  expect(result).toMatchObject({ passed: true, topologyIssues: [], failedExpectations: [] });
  const document = createWiredStarDeltaCircuit();
  const byId = new Map(document.components.map(component => [component.id, component]));
  for (const id of ["forward", "star", "delta"]) expect(byId.get(id)).toMatchObject({ definitionId: "iec.motor-starter.01", properties: { coilVoltageV: 24, coilDc: true, ratedCurrentA: 17, ratedPowerKw: 7.5 } });
  expect(byId.get("control-psu")).toMatchObject({ definitionId: "iec.dc-control-supply.01", properties: { inputVoltageV: 230, nominalVoltageV: 24 } });
  expect(byId.get("overload")?.properties).toMatchObject({ settingA: 14.3, settingMinA: 11, settingMaxA: 16, tripClass: 10 });
  expect(document.wires).toContainEqual(expect.objectContaining({ from: { componentId: "control", terminalId: "line" }, to: { componentId: "control-psu", terminalId: "line-in" } }));
  expect(document.wires).toContainEqual(expect.objectContaining({ from: { componentId: "control-psu", terminalId: "plus-out" }, to: { componentId: "stop", terminalId: "21" } }));
});

it("inhibits source-backed coils when the SITOP AC input is disconnected", () => {
  const document = createWiredStarDeltaCircuit();
  document.wires = document.wires.filter(wire => !(wire.from.componentId === "control" && wire.to.componentId === "control-psu"));
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  expect(evaluateWiredControl(runtime, catalogById).get("forward")).toMatchObject({ energized: false, voltageV: 0, error: expect.stringContaining("no connected 230 V AC input") });
});

it("rejects a DC supply connected to a coil configured for AC", () => {
  const document = createWiredStarDeltaCircuit();
  document.components.find(component => component.id === "forward")!.properties.coilDc = false;
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  expect(evaluateWiredControl(runtime, catalogById).get("forward")).toMatchObject({ energized: false, voltageV: 0, error: expect.stringContaining("supply type (AC/DC)") });
});

it("requires the star contactor NC auxiliary path before delta can energize", () => {
  const document = createWiredStarDeltaCircuit();
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  runtime = advanceCircuitClock(runtime, catalogById, 5.1);
  runtime = advanceCircuitClock(runtime, catalogById, .2);
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(true);
  runtime.wires = runtime.wires.filter(wire => !(wire.from.componentId === "star" && wire.from.terminalId === "aux-22" && wire.to.componentId === "delta" && wire.to.terminalId === "a1"));
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(false);
  expect(motor(runtime)).toContain("OPEN");
});

it("uses the 200 ms transition timer to keep both branch contactors open", () => {
  const document = createWiredStarDeltaCircuit();
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  runtime = advanceCircuitClock(runtime, catalogById, 4.9);
  runtime = advanceCircuitClock(runtime, catalogById, .1);
  expect(evaluateWiredControl(runtime, catalogById).get("star")?.energized).toBe(false);
  expect(evaluateWiredControl(runtime, catalogById).get("delta")?.energized).toBe(false);
  expect(motor(runtime)).toContain("OPEN");
});


it("routes the configured induction-motor line current through F1 and trips on delta current", () => {
  const document = createWiredStarDeltaCircuit();
  const motorComponent = document.components.find(component => component.id === "motor")!;
  Object.assign(motorComponent.properties, { equivalentCircuitEnabled: true, statorResistanceOhm: 0.8, statorReactanceOhm: 1.2, rotorResistanceOhm: 0.6, rotorReactanceOhm: 0.9, magnetizingReactanceOhm: 24, frequencyHz: 50, polePairs: 2, slip: 0.08 });
  const overload = document.components.find(component => component.id === "overload")!;
  Object.assign(overload.properties, { settingA: 50, overloadFactor: 1, heatingTimeSeconds: 5, coolingTimeSeconds: 10, resetLevel: 0.5 });
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", false);
  const starMotor = executeCircuitModels(runtime, catalogById).find(run => run.reference === "M1")!;
  const starRelay = executeCircuitModels(runtime, catalogById).find(run => run.reference === "F1")!;
  const starCurrentA = Number(starMotor.evaluatedProperties.runtimeMotorLineCurrentA);
  expect(starCurrentA).toBeGreaterThan(0);
  expect(starCurrentA).toBeLessThan(50);
  expect(starRelay.evaluatedProperties.runtimeLoadCurrentA).toBeCloseTo(starCurrentA);
  expect(starMotor.output.value).toContain(`${starCurrentA.toFixed(2)} A line`);
  runtime = advanceCircuitClock(runtime, catalogById, 5.1);
  runtime = advanceCircuitClock(runtime, catalogById, 0.2);
  const deltaMotor = executeCircuitModels(runtime, catalogById).find(run => run.reference === "M1")!;
  const deltaRelay = executeCircuitModels(runtime, catalogById).find(run => run.reference === "F1")!;
  const deltaCurrentA = Number(deltaMotor.evaluatedProperties.runtimeMotorLineCurrentA);
  expect(deltaCurrentA / starCurrentA).toBeCloseTo(3);
  expect(deltaRelay.evaluatedProperties.runtimeLoadCurrentA).toBeCloseTo(deltaCurrentA);
  expect(deltaMotor.output.value).toContain(`${deltaCurrentA.toFixed(2)} A line`);
  expect(deltaMotor.output.value).toContain("N·m");
  runtime = advanceCircuitClock(runtime, catalogById, 4);
  expect(runtime.components.find(component => component.id === "overload")?.properties.runtimeThermalTripped).toBe(true);
  expect(evaluateWiredControl(runtime, catalogById).get("forward")?.energized).toBe(false);
  expect(motor(runtime)).toContain("OPEN");
});

it("integrates editable inertia and load torque through wired motor current and coasts when de-energized", () => {
  const document = createWiredStarDeltaCircuit();
  const motorComponent = document.components.find(component => component.id === "motor")!;
  Object.assign(motorComponent.properties, {
    equivalentCircuitEnabled: true, mechanicalTransientEnabled: true,
    statorResistanceOhm: 0.8, statorReactanceOhm: 1.2, rotorResistanceOhm: 0.6,
    rotorReactanceOhm: 0.9, magnetizingReactanceOhm: 24, frequencyHz: 50, polePairs: 2,
    rotorInertiaKgM2: 1, loadTorqueNm: 1, initialRotorSpeedRpm: 0,
  });
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const runningMotor = executeCircuitModels(runtime, catalogById).find(run => run.reference === "M1")!;
  const runningSpeed = Number(runningMotor.evaluatedProperties.runtimeRotorSpeedRpm);
  expect(runningSpeed).toBeGreaterThan(0);
  expect(runningSpeed).toBeLessThan(1500);
  expect(runningMotor.output.value).toContain("rpm");
  expect(runningMotor.output.value).toContain("slip");
  expect(Number(executeCircuitModels(runtime, catalogById).find(run => run.reference === "F1")!.evaluatedProperties.runtimeLoadCurrentA)).toBeCloseTo(Number(runningMotor.evaluatedProperties.runtimeMotorLineCurrentA));

  const closeToTrip = { ...runtime, components: runtime.components.map((component) => component.id === "overload"
    ? { ...component, properties: { ...component.properties, thermalEnabled: true, settingA: 1, overloadFactor: 1, heatingTimeSeconds: 1, runtimeThermalLevel: 0.99 } }
    : component) };
  const tripped = advanceCircuitClock(closeToTrip, catalogById, 0.1);
  const trippedRuns = executeCircuitModels(tripped, catalogById);
  const trippedMotor = trippedRuns.find(run => run.reference === "M1")!;
  expect(trippedRuns.find(run => run.reference === "F1")?.evaluatedProperties).toMatchObject({ runtimeThermalTripped: true, runtimeLoadCurrentA: 0 });
  expect(trippedMotor.evaluatedProperties.lineVoltageV).toBe(0);
  expect(Number(trippedMotor.evaluatedProperties.runtimeRotorSpeedRpm)).toBeLessThan(runningSpeed);
  expect(trippedMotor.output.value).toContain("COASTING");

  runtime = setCircuitBooleanInput(runtime, catalogById, "breaker", "closed", false);
  expect(runtime.components.find(component => component.id === "breaker")!.properties.closed).toBe(false);
  expect(Number(executeCircuitModels(runtime, catalogById).find(run => run.reference === "M1")!.evaluatedProperties.lineVoltageV)).toBe(0);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const coastedSpeed = Number(runtime.components.find(component => component.id === "motor")!.properties.runtimeRotorSpeedRpm);
  expect(coastedSpeed).toBeLessThan(runningSpeed);
  expect(coastedSpeed).toBeGreaterThanOrEqual(0);
  const coastingOutput = motor(runtime);
  expect(coastingOutput).toContain(`${coastedSpeed.toFixed(1)} rpm · COASTING`);
  expect(coastingOutput).not.toContain("slip");

  const reset = resetCircuitClock(runtime, catalogById);
  const resetMotor = reset.components.find(component => component.id === "motor")!;
  expect(resetMotor.properties.runtimeRotorSpeedRpm).toBeUndefined();
  expect(resetMotor.properties.runtimeMotorModelError).toBeUndefined();
  expect(motor(reset)).toContain("0.0 rpm");
});

it("reports invalid enabled motor parameters through the overload fault path", () => {
  const document = createWiredStarDeltaCircuit();
  const motorComponent = document.components.find(component => component.id === "motor")!;
  Object.assign(motorComponent.properties, { equivalentCircuitEnabled: true, statorResistanceOhm: 0, slip: 0.08 });
  let runtime = setCircuitBooleanInput(document, catalogById, "breaker", "closed", true);
  runtime = setCircuitBooleanInput(runtime, catalogById, "start", "pressed", true);
  runtime = advanceCircuitClock(runtime, catalogById, 0.1);
  const runs = executeCircuitModels(runtime, catalogById);
  expect(runs.find(run => run.reference === "F1")?.evaluatedProperties.runtimeThermalError).toContain("Invalid nominal load current");
  expect(runs.find(run => run.reference === "F1")?.evaluatedProperties.runtimeThermalTripped).toBe(true);
});

