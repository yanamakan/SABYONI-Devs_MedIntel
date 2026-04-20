// api/sentinel.js
// Controller for the Sentinel AI module
// Accepts a patientId query parameter and runs analysis for that patient
// ALL the Gemini logic lives in sentinelService.js

import "dotenv/config";
import { runSentinelAnalysis } from "../src/services/sentinelService.js";
import { fetchAllPatients } from "../src/models/patientModel.js";
import { supabase } from "../src/models/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { patientId } = req.query;

    // If a specific patientId is provided, run analysis for that patient only
    if (patientId) {
      // Fetch their latest vitals from patient_vitals
      const { data, error } = await supabase
        .from("patient_vitals")
        .select("*")
        .eq("patient_id", patientId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (error) throw new Error(error.message);

      const analysis = await runSentinelAnalysis(patientId, data);
      return res.status(200).json(analysis);
    }

    // If no patientId, run analysis for all patients
    const patients = await fetchAllPatients();

    if (!patients || patients.length === 0) {
      return res.status(404).json({ error: "No patients found" });
    }

    const results = [];

    for (const patient of patients) {
      const { data, error } = await supabase
        .from("patient_vitals")
        .select("*")
        .eq("patient_id", patient.patient_id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (error) continue;

      const analysis = await runSentinelAnalysis(patient.patient_id, data);
      results.push({
        patient_id: patient.patient_id,
        name: `${patient.first_name} ${patient.last_name}`,
        analysis,
      });
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("Sentinel error:", err.message);
    return res.status(500).json({ error: "Sentinel analysis failed", details: err.message });
  }
}