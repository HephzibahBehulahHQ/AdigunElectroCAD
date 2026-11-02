import { expect, it } from "vitest";
import { windingConnection } from "../src/electrical/windingConnections";
import type { CircuitDocument } from "../src/types/electrical";
const motor = (terminalId: string) => ({ componentId: "M1", terminalId });
const document: CircuitDocument = { id: "test", name: "Windings", description: "", revision: 1, components: [], wires: [] };
it("detects open, star, delta, and simultaneous star/delta shorts", () => {
  const star: [ReturnType<typeof motor>, ReturnType<typeof motor>][] = [[motor("u2"), motor("v2")], [motor("v2"), motor("w2")]];
  const delta: typeof star = [[motor("u2"), motor("w1")], [motor("v2"), motor("u1")], [motor("w2"), motor("v1")]];
  expect(windingConnection(document, "M1")).toBe("open");
  expect(windingConnection(document, "M1", star)).toBe("star");
  expect(windingConnection(document, "M1", delta)).toBe("delta");
  expect(windingConnection(document, "M1", [...star, ...delta])).toBe("invalid");
});
it("derives connections from persisted wires rather than a declared mode", () => {
  const wired = { ...document, wires: [{ id: "w1", from: motor("u2"), to: motor("v2"), points: [] }, { id: "w2", from: motor("v2"), to: motor("w2"), points: [] }] };
  expect(windingConnection(wired, "M1")).toBe("star");
  expect(windingConnection({ ...wired, wires: wired.wires.slice(0, 1) }, "M1")).toBe("invalid");
});
