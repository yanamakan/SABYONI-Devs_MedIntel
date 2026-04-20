// src/models/readingModel.js
// Handles all database operations for device_readings table
// Used by sentinelService to fetch the latest readings per patient

import { supabase } from "./supabase.js";

/**
 * Fetches the latest device readings for a specific patient
 * Joins with devices table to get the device_type alongside the value
 * Called by: sentinelService.js
 */
export async function fetchLatestReadingsForPatient(patientId, limit = 50) {
  const { data, error } = await supabase
    .from("device_readings")
    .select("value, recorded_at, device_id, devices(device_type)")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchLatestReadingsForPatient error: ${error.message}`);

  return data;
}