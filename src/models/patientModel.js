// src/models/patientModel.js
// Handles all database operations for the patients table
// Used by simulatorService to get all patients to simulate vitals for

import { supabase } from "./supabase.js";

/**
 * Fetches all patients from the database
 * Returns patient_id, first_name, last_name for each patient
 * Called by: simulatorService.js
 */
export async function fetchAllPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("patient_id, first_name, last_name");

  if (error) throw new Error(`fetchAllPatients error: ${error.message}`);

  return data;
}