import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

if (!process.argv.includes("--execute")) {
  console.log("Use --execute for an authorized live test. Two anonymous sessions are created; tokens remain in memory. Seed the printed application fixtures, then enter run.");
  process.exit(0);
}
const config = await readFile(new URL("../public/runtime-config.js", import.meta.url), "utf8");
const value = (key) => config.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1];
const url = value("supabaseUrl"); const key = value("supabaseAnonKey");
if (url !== "https://fqcbfnktdvqojyezxeis.supabase.co" || value("supabaseSchema") !== "adigunelectrocad" || !key) throw new Error("Unexpected application configuration.");
const clients = [0, 1].map(() => createClient(url, key, {
  db: { schema: "adigunelectrocad" },
  auth: { storageKey: `adigunelectrocad-rls-${randomUUID()}`, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (request, options) => fetch(request, { ...options, signal: AbortSignal.any([...(options?.signal ? [options.signal] : []), AbortSignal.timeout(20000)]) }) },
}));
const fixtures = [randomUUID(), randomUUID()];
const unexpectedInserts = [];
const checks = {};
let users = [];
try {
  for (const client of clients) {
    const { data, error } = await client.auth.signInAnonymously();
    if (data.user) users.push(data.user.id);
    if (error || !data.user?.is_anonymous) throw new Error(error ? `Anonymous sign-in failed: ${error.name} / ${error.status} / ${error.code ?? "no code"} / ${error.message}` : `Unexpected user state: user=${Boolean(data.user)}, anonymous=${String(data.user?.is_anonymous)}, session=${Boolean(data.session)}`);
  }
  console.log(JSON.stringify({ stage: "awaiting-fixtures", actorA: users[0], actorB: users[1], fixtureA: fixtures[0], fixtureB: fixtures[1] }));
  const input = createInterface({ input: process.stdin, terminal: false });
  const command = await new Promise((resolve) => input.once("line", resolve)); input.close();
  if (command.trim() !== "run") throw new Error("Test aborted before fixture access.");
  const table = (index) => clients[index].schema("adigunelectrocad").from("projects");
  const readA = await table(0).select("id").in("id", fixtures);
  const readB = await table(1).select("id").in("id", fixtures);
  checks.actorAReadsOnlyOwn = !readA.error && readA.data?.length === 1 && readA.data[0].id === fixtures[0];
  checks.actorBReadsOnlyOwn = !readB.error && readB.data?.length === 1 && readB.data[0].id === fixtures[1];
  const ownUpdate = await table(0).update({ name: "RLS test updated by owner" }).eq("id", fixtures[0]).select("id");
  checks.anonymousOwnerCanUpdate = !ownUpdate.error && ownUpdate.data?.length === 1;
  const otherUpdate = await table(0).update({ name: "Unauthorized update" }).eq("id", fixtures[1]).select("id");
  checks.crossOwnerUpdateBlocked = !otherUpdate.error && otherUpdate.data?.length === 0;
  const transfer = await table(0).update({ user_id: users[1] }).eq("id", fixtures[0]).select("id");
  checks.ownerTransferBlocked = transfer.error?.code === "42501";
  const insert = await table(0).insert({ user_id: users[0], name: "RLS unexpected insert", document: {} }).select("id");
  if (insert.data) unexpectedInserts.push(...insert.data.map((row) => row.id));
  checks.anonymousProjectInsertBlocked = insert.error?.code === "42501";
  const preferenceInsert = await clients[0].schema("adigunelectrocad").from("user_preferences").insert({ user_id: users[0], theme: "dark", locale: "en", favorites: [] }).select("user_id");
  checks.anonymousPreferenceInsertBlocked = preferenceInsert.error?.code === "42501";
  if (!preferenceInsert.error) await clients[0].schema("adigunelectrocad").from("user_preferences").delete().eq("user_id", users[0]);
  const otherDelete = await table(0).delete().eq("id", fixtures[1]).select("id");
  checks.crossOwnerDeleteBlocked = !otherDelete.error && otherDelete.data?.length === 0;
  const remainingB = await table(1).select("id,name").eq("id", fixtures[1]).single();
  checks.otherOwnersRowUnchanged = !remainingB.error && remainingB.data?.name === "RLS verification fixture B";
  const ownDelete = await table(0).delete().eq("id", fixtures[0]).select("id");
  checks.anonymousOwnerCanDelete = !ownDelete.error && ownDelete.data?.length === 1;
  console.log(JSON.stringify({ stage: "checks", checks, allPassed: Object.values(checks).every(Boolean) }));
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ stage: "error", message: String(error.message).replace(/eyJ[A-Za-z0-9_.-]+/g, "[token]").slice(0, 300) })); process.exitCode = 1;
} finally {
  const cleanupIds = [...fixtures, ...unexpectedInserts];
  for (let index = 0; index < clients.length; index++) {
    if (!users[index]) continue;
    try {
      const cleanup = await clients[index].schema("adigunelectrocad").from("projects").delete().in("id", cleanupIds).select("id");
      console.log(JSON.stringify({ stage: "fixture-cleanup", actor: index === 0 ? "A" : "B", deleted: cleanup.data?.length ?? 0, errorCode: cleanup.error?.code ?? null }));
      const signedOut = await clients[index].auth.signOut({ scope: "local" });
      if (cleanup.error || signedOut.error) process.exitCode = 1;
    } catch { console.log(JSON.stringify({ stage: "cleanup-incomplete", actor: index === 0 ? "A" : "B" })); process.exitCode = 1; }
  }
}
