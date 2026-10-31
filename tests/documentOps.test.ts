import { describe, expect, it } from "vitest";
import { moveComponent } from "../src/cad/documentOps";
import { createDolMotorStarter } from "../src/projects/dolMotorStarter";

describe("component movement", () => {
  it("moves a placed component without altering terminal-level wire topology", () => {
    const project = createDolMotorStarter();
    project.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    project.wires.push({ id: "manual-wire-21", from: { componentId: "supply", terminalId: "l1" }, to: { componentId: "motor-2", terminalId: "u1" }, points: [], netName: "MANUAL_21" });
    const moved = moveComponent(project, "motor-2", 40, -20);
    expect(moved.components.find((component) => component.id === "motor-2")).toMatchObject({ x: 940, y: 160 });
    expect(moved.wires.find((wire) => wire.id === "manual-wire-21")).toMatchObject({ from: { componentId: "supply", terminalId: "l1" }, to: { componentId: "motor-2", terminalId: "u1" } });
  });
});
