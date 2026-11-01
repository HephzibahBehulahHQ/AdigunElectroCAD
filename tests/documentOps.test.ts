import { describe, expect, it } from "vitest";
import { canPlaceComponent, findOpenPlacement, moveComponent, removeComponent, rotateComponent, updateComponentProperty } from "../src/cad/documentOps";
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

  it("allocates clear grid positions and rejects an overlapping move", () => {
    const placed = [] as ReturnType<typeof createDolMotorStarter>["components"];
    for (let index = 0; index < 15; index += 1) {
      const position = findOpenPlacement(placed, "reference");
      expect(position).not.toBeNull();
      placed.push({ id: `placed-${index}`, definitionId: "motor.three-phase", reference: `M${index + 1}`, x: position!.x, y: position!.y, rotation: 0, properties: {} });
    }
    expect(findOpenPlacement(placed, "reference")).toBeNull();
    expect(canPlaceComponent(placed, "placed-0", placed[1].x, placed[1].y)).toBe(false);
  });

  it("removes a placed component and its connected wires together", () => {
    const project = createDolMotorStarter();
    project.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    project.wires.push({ id: "manual-wire-21", from: { componentId: "supply", terminalId: "l1" }, to: { componentId: "motor-2", terminalId: "u1" }, points: [], netName: "MANUAL_21" });
    const result = removeComponent(project, "motor-2");

    expect(result.removedWireCount).toBe(1);
    expect(result.document.components.some((component) => component.id === "motor-2")).toBe(false);
    expect(result.document.wires.some((wire) => wire.id === "manual-wire-21")).toBe(false);
  });

  it("rotates a placed component in right angles", () => {
    const project = createDolMotorStarter();
    project.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: {} });
    expect(rotateComponent(project, "motor-2").components.find((component) => component.id === "motor-2")).toMatchObject({ rotation: 90 });
  });

  it("updates one placed-component parameter without changing another component", () => {
    const project = createDolMotorStarter();
    project.components.push({ id: "motor-2", definitionId: "motor.three-phase", reference: "M2", x: 900, y: 180, rotation: 0, properties: { ratedCurrentA: 12.5 } });
    const updated = updateComponentProperty(project, "motor-2", "ratedCurrentA", 16);
    expect(updated.revision).toBe(project.revision + 1);
    expect(updated.components.find((component) => component.id === "motor-2")?.properties).toEqual({ ratedCurrentA: 16 });
    expect(updated.components.find((component) => component.id === "motor")?.properties).toEqual(project.components.find((component) => component.id === "motor")?.properties);
  });
});
