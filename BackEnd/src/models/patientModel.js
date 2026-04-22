import { supabase } from "./supabase.js";

export async function fetchAllPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("patient_id, first_name, last_name");

  if (error) throw new Error(`fetchAllPatients error: ${error.message}`);
  return data;
}