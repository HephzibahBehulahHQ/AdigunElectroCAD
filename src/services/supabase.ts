import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type RuntimeConfig = AdigunElectroCadRuntimeConfig;

let client: SupabaseClient<Database, "adigunelectrocad"> | undefined;

export function runtimeConfig(): RuntimeConfig {
  const config = window.ADIGUN_ELECTRO_CAD_RUNTIME_CONFIG;
  if (!config || config.supabaseSchema !== "adigunelectrocad" || !config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("AdigunElectroCAD runtime configuration is unavailable or invalid.");
  }
  return config;
}

export function supabaseClient(): SupabaseClient<Database, "adigunelectrocad"> {
  if (client) return client;
  const config = runtimeConfig();
  client = createClient<Database, "adigunelectrocad">(config.supabaseUrl, config.supabaseAnonKey, {
    db: { schema: config.supabaseSchema },
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
