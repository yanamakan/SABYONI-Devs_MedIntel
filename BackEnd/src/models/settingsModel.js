import { supabase } from "./supabase.js";

export async function getSimulatorStatus() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "simulator_running")
    .single();

  if (error) throw new Error(`getSimulatorStatus error: ${error.message}`);
  return data.value === "true";
}