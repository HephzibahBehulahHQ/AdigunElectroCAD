import { parseBotWindow, type BotWindowLayout } from "../copilot/windowLayout";
import { supabaseClient } from "./supabase";

const prefix = "ADIGUN_ELECTROCAD_BOT_WINDOW_V1:";
const contentPattern = prefix.replaceAll("_", "\\_") + "%";
const table = () => supabaseClient().schema("adigunelectrocad").from("my_data");
async function ownedWindowRow(userId: string) {
  const { data, error } = await table().select("id, content").eq("user_id", userId).like("content", contentPattern).order("id", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (data && (!Number.isSafeInteger(data.id) || data.id <= 0)) throw new Error("Account layout ID exceeds the supported numeric range.");
  if (data && !data.content?.startsWith(prefix)) throw new Error("The returned account row is not a Bot layout record.");
  return data;
}
export async function loadAccountBotWindow(userId: string): Promise<BotWindowLayout | null> {
  const row = await ownedWindowRow(userId);
  if (!row?.content?.startsWith(prefix)) return null;
  try { return parseBotWindow(JSON.parse(row.content.slice(prefix.length))); } catch { return null; }
}
export async function saveAccountBotWindow(userId: string, layout: BotWindowLayout): Promise<void> {
  if (!parseBotWindow(layout)) throw new Error("Invalid Bot window layout.");
  const row = await ownedWindowRow(userId);
  const content = prefix + JSON.stringify(layout);
  const request = row ? table().update({ content }).eq("id", row.id).eq("user_id", userId) : table().insert({ user_id: userId, content });
  const { data, error } = await request.select("id").single();
  if (error) throw error;
  if (!data || !Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("Account window layout could not be saved.");
}
