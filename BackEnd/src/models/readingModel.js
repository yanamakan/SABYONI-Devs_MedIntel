import { supabase } from "./supabase.js";

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