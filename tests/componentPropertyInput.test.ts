import { expect, it } from "vitest";
import { componentPropertyInputType } from "../src/cad/componentPropertyInput";

it("offers a color control for valid per-instance hex color properties", () => {
  expect(componentPropertyInputType("#64748b")).toBe("color");
  expect(componentPropertyInputType("#AABBCC")).toBe("color");
  expect(componentPropertyInputType("Unassigned")).toBe("text");
  expect(componentPropertyInputType(24)).toBe("number");
});

