import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production deployment configuration", () => {
  it("builds for the root-domain production target", () => {
    expect(readFileSync("vite.config.ts", "utf8")).toContain('base: "/"');
    expect(readFileSync("public/CNAME", "utf8").trim()).toBe("adigunelectrocad.hephzibahbehulah.com");
  });
});
