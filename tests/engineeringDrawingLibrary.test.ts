import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { engineeringDrawings } from "../src/projects/engineeringDrawings";
import { parseProjectJson } from "../src/projects/projectSerialization";

it("lists every published native drawing exactly once and loads the matching project", () => {
  const directory = new URL("../public/examples/", import.meta.url);
  const files = readdirSync(directory).filter(name => name.endsWith(".json")).sort();
  expect(engineeringDrawings.map(({ id }) => id + ".json").sort()).toEqual(files);
  for (const { id } of engineeringDrawings) {
    const drawing = parseProjectJson(readFileSync(new URL(id + ".json", directory), "utf8"));
    expect(drawing.id).toBe(id);
  }
});
