// src/models/settingsModel.js
// Handles reading and updating the settings table in Supabase
// Used by simulatorService to check if the simulator should be running

import { supabase } from "./supabase.js";

/**
 * Checks the settings table to see if the simulator is running
 * Returns true if simulator_running is set to 'true'
 * Called by: simulatorService.js
 */
export async function getSimulatorStatus() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "simulator_running")
    .single();

  if (error) throw new Error(`getSimulatorStatus error: ${error.message}`);

  return data.value === "true";
}