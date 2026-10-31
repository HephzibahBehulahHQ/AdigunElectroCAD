import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { canConnectTerminals, validateCircuit } from "../src/electrical/topology";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";

describe("circuit topology validation", () => {
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

  it("allows compatible unused terminals and rejects a cross-domain connection", () => {
    const project = createDolMotorStarter();
    const insertedMotor = { id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 950, y: 200, rotation: 0 as const, properties: {} };
    project.components.push(insertedMotor);
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "motor-2", terminalId: "u1" })).toEqual({ ok: true });
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "start", terminalId: "13" })).toEqual(expect.objectContaining({ ok: false }));
    expect(canConnectTerminals(project, catalogById, { componentId: "supply", terminalId: "l1" }, { componentId: "supply", terminalId: "l2" })).toEqual(expect.objectContaining({ ok: false }));
  });
});
