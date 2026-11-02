import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAnonymousUser } from "../src/services/auth";

const read = (path: string) => readFileSync(path, "utf8");

describe("Supabase integration", () => {
  it("pins the client to the AdigunElectroCAD schema without a privileged browser key", () => {
    const runtime = read("public/runtime-config.js");
    const client = read("src/services/supabase.ts");
    expect(runtime).toContain('supabaseSchema: "adigunelectrocad"');
    expect(runtime).not.toContain("service_role");
    expect(client).toContain("db: { schema: config.supabaseSchema }");
  });

  it("keeps owner and permanent-user insert policies on every cloud table", () => {
    const migration = read("supabase/migrations/202611020001_adigunelectrocad_cloud_projects.sql");
    for (const table of ["projects", "user_preferences"]) {
      expect(migration).toContain(`create table if not exists adigunelectrocad.${table}`);
      expect(migration).toContain(`alter table adigunelectrocad.${table} enable row level security`);
      expect(migration).toContain(`on adigunelectrocad.${table} for all to authenticated`);
      expect(migration).toContain(`on adigunelectrocad.${table} as restrictive for insert to authenticated`);
    }
  });

  it("recognizes Supabase anonymous sessions for the two-step upgrade path", () => {
    expect(isAnonymousUser({ is_anonymous: true } as never)).toBe(true);
    expect(isAnonymousUser({ is_anonymous: false } as never)).toBe(false);
  });
});

