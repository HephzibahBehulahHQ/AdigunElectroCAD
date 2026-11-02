import { describe, expect, it } from "vitest";
import { catalogById } from "../src/catalog/dolCatalog";
import { templateLibrary } from "../src/projects/templateLibrary";
import { advanceCircuitClock, resetCircuitClock } from "../src/simulation/circuitClock";
import { executeCircuitModels } from "../src/simulation/circuitModels";

describe("circuit simulation clock", () => {
  it("expires at the exact threshold after ten 100 ms steps", () => {
    let runtime = structuredClone(templateLibrary[3].document);
    runtime.components[0].properties = { energized: true, delaySeconds: 1, elapsedSeconds: 0 };
    for (let index = 0; index < 10; index++) runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(1);
    expect(executeCircuitModels(runtime, catalogById).find((run) => run.reference === "KT1")?.output.value).toBe("CLOSED");
  });
  it("resets runtime timing while preserving configured design values", () => {
    const design = structuredClone(templateLibrary[3].document);
    design.components[0].properties.elapsedSeconds = 9;
    const runtime = resetCircuitClock(design, catalogById);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(design.components[0].properties.elapsedSeconds).toBe(9);
    expect(runtime.components[0].properties.delaySeconds).toBe(design.components[0].properties.delaySeconds);
  });
  it("accumulates timer time, switches the wired actuator, and resets on power loss", () => {
    const design = structuredClone(templateLibrary[3].document);
    design.components[0].properties = { energized: true, delaySeconds: 2, elapsedSeconds: 0 };
    design.components[2].properties.returnSpring = true;
    let runtime = advanceCircuitClock(design, catalogById, 1);
    const actuator = () => executeCircuitModels(runtime, catalogById).find((run) => run.reference === "Y1")!.output.value;
    expect(actuator()).toBe("RETRACTED");
    runtime = advanceCircuitClock(runtime, catalogById, 1);
    expect(actuator()).toContain("EXTENDED");
    runtime.components[0].properties.energized = false;
    runtime = advanceCircuitClock(runtime, catalogById, 0.1);
    expect(runtime.components[0].properties.elapsedSeconds).toBe(0);
    expect(actuator()).toBe("RETRACTED");
    expect(design.components[0].properties.elapsedSeconds).toBe(0);
  });
  it("rejects invalid clock steps", () => {
    for (const delta of [-1, NaN, Infinity]) expect(() => advanceCircuitClock(templateLibrary[3].document, catalogById, delta)).toThrow();
  });
});
