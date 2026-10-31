import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { validateCircuit } from "../src/electrical/topology";
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
});
