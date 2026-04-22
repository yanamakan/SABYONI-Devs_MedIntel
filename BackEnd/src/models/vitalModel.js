import { supabase } from "./supabase.js";

export async function savePatientVitals(patientId, vitals) {
  const { error } = await supabase
    .from("patient_vitals")
    .insert({
      patient_id: patientId,
      heart_rate: vitals.heart_rate,
      blood_pressure_systolic: vitals.blood_pressure_systolic,
      blood_pressure_diastolic: vitals.blood_pressure_diastolic,
      temperature: vitals.temperature,
      oxygen_saturation: vitals.oxygen_saturation,
    });

  if (error) throw new Error(`savePatientVitals error: ${error.message}`);
}