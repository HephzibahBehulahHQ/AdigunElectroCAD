import type { ElectricalProject } from "../types/electrical";
import type { Json } from "./database.types";
import { runtimeConfig, supabaseClient } from "./supabase";

export interface CloudProject { id: string; document: ElectricalProject; updatedAt: string; }

const table = () => supabaseClient().schema(runtimeConfig().supabaseSchema);
const asJson = (value: ElectricalProject) => value as unknown as Json;

export async function saveCloudProject(userId: string, project: ElectricalProject, cloudProjectId?: string): Promise<CloudProject> {
  const payload = { user_id: userId, name: project.name, description: project.description, document: asJson(project), revision: project.revision, updated_at: new Date().toISOString() };
  const request = cloudProjectId
    ? table().from("projects").update(payload).eq("id", cloudProjectId)
    : table().from("projects").insert(payload);
  const { data, error } = await request.select("id, document, updated_at").single();
  if (error) throw error;
  return { id: data.id, document: data.document as unknown as ElectricalProject, updatedAt: data.updated_at };
}

export async function loadLatestCloudProject(userId: string): Promise<CloudProject | null> {
  const { data, error } = await table().from("projects").select("id, document, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, document: data.document as unknown as ElectricalProject, updatedAt: data.updated_at } : null;
}

export async function saveUserPreferences(userId: string, preference: { theme: string; locale: string; favorites: string[] }) {
  const { error } = await table().from("user_preferences").upsert({ user_id: userId, theme: preference.theme, locale: preference.locale, favorites: preference.favorites as Json, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}
