import { supabase } from "./supabase.js";

export async function saveAlert(patientId, vitals, analysis) {
  const { error } = await supabase
    .from("sentinel_alerts")
    .insert({
      patient_id: patientId,
      heart_rate: vitals.heart_rate,
      blood_pressure_systolic: vitals.blood_pressure_systolic,
      blood_pressure_diastolic: vitals.blood_pressure_diastolic,
      temperature: vitals.temperature,
      oxygen_saturation: vitals.oxygen_saturation,
      risk_reason: analysis.summary,
      severity: analysis.overall_status,
      resolved: false,
    });

  if (error) throw new Error(`saveAlert error: ${error.message}`);
}

export async function updatePatientRisk(patientId, analysis) {
  const atRisk = analysis.overall_status !== "normal";

  const { error } = await supabase
    .from("patients")
    .update({
      at_risk: atRisk,
      risk_reason: atRisk ? analysis.summary : null,
      last_sentinel_check: new Date().toISOString(),
    })
    .eq("patient_id", patientId);

  if (error) throw new Error(`updatePatientRisk error: ${error.message}`);
}