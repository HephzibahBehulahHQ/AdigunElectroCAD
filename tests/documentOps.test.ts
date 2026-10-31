import { describe, expect, it } from "vitest";
import { canPlaceComponent, findOpenPlacement, moveComponent } from "../src/cad/documentOps";
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
});
