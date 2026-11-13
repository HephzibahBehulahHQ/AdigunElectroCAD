import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";
import { createAnalogLevelProject } from "../src/projects/analogLevelProject";

describe("circuit topology validation", () => {
  it.each([["level", "signal", "plc", "ai-0"], ["level", "signal", "plc", "in-0"], ["adc", "out", "plc", "in-0"]])("rejects incompatible signal wiring %s.%s to %s.%s", (source, sourceTerminal, target, targetTerminal) => {
    const document = createAnalogLevelProject().document;
    document.wires = [];
    const from = { componentId: source, terminalId: sourceTerminal };
    const to = { componentId: target, terminalId: targetTerminal };
    expect(canConnectTerminals(document, catalogById, from, to)).toMatchObject({ ok: false, reason: expect.stringContaining("Incompatible simulated signals") });
    document.wires.push({ id: "bad-signal", from, to, points: [] });
    expect(validateCircuit(document, catalogById)).toContainEqual(expect.objectContaining({ code: "incompatible-signal-unit" }));
  });
  it("accepts the converter stages of the analog PLC example", () => {
    const document = createAnalogLevelProject().document;
    expect(validateCircuit(document, catalogById)).toEqual([]);
    for (const wire of [...document.wires]) {
      document.wires = document.wires.filter((item) => item.id !== wire.id);
      expect(canConnectTerminals(document, catalogById, wire.from, wire.to)).toEqual({ ok: true });
    }
  });
  it("accepts the DOL reference project terminal wiring", () => {
    expect(validateCircuit(createDolMotorStarter(), catalogById)).toEqual([]);
  });

  it("rejects a wire endpoint that does not exist on its component", () => {
    const project = createDolMotorStarter();
    project.wires[0] = { ...project.wires[0], from: { componentId: "supply", terminalId: "not-a-terminal" } };
    expect(validateCircuit(project, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "error", code: "unknown-terminal" }),
    ]));
  });

  it("rejects imported topology with same-direction or duplicate connections", () => {
    const project = createDolMotorStarter();
    project.wires.push({ id: "bad-direction", from: { componentId: "supply", terminalId: "l1" }, to: { componentId: "supply", terminalId: "l2" }, points: [] });
    project.wires.push({ ...project.wires[0], id: "duplicate-l1" });
    expect(validateCircuit(project, catalogById)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "incompatible-terminal-direction" }),
      expect.objectContaining({ code: "duplicate-terminal-connection" }),
    ]));
  });

  it("allows compatible unused terminals and rejects a cross-domain connection", () => {
    const project = createDolMotorStarter();
    const insertedMotor = { id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 950, y: 200, rotation: 0 as const, properties: {} };
    project.components.push(insertedMotor);
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "motor-2", terminalId: "u1" })).toEqual({ ok: true });
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "start", terminalId: "13" })).toEqual(expect.objectContaining({ ok: false }));
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "supply", terminalId: "l2" })).toEqual(expect.objectContaining({ ok: false }));
  });

  it("allows the user to branch one source terminal to multiple compatible loads", () => {
    const project = createDolMotorStarter();
    project.components.push(
      { id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} },
      { id: "motor-3", definitionId: "motor.three-phase", reference: "M3", x: 900, y: 420, rotation: 0, properties: {} },
    );
    const source = { componentId: "supply", terminalId: "l1" };
    project.wires.push({ id: "branch-a", from: source, to: { componentId: "motor-2", terminalId: "u1" }, points: [] });
    expect(canConnectTerminals(project, catalogById, source, { componentId: "motor-3", terminalId: "u1" })).toEqual({ ok: true });
  });

  it("validates branched terminal connections and rejects missing branch parents", () => {
    const project = createDolMotorStarter();
    project.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    const parent = project.wires[0];
    project.wires.push({ id: "branch", from: parent.from, to: { componentId: "motor-2", terminalId: "u1" }, points: [], branchOfWireId: parent.id, branchSource: "from", branchPosition: .5 });
    expect(validateCircuit(project, catalogById)).toEqual([]);
    project.wires[project.wires.length - 1].branchOfWireId = "missing-wire";
    expect(validateCircuit(project, catalogById)).toEqual(expect.arrayContaining([expect.objectContaining({ code: "invalid-wire-branch-parent" })]));
  });
});
