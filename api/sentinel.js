import { runSentinelAnalysis } from "../SABYONI-Devs_MedIntel/BackEnd/src/services/sentinelService.js";
import { fetchAllPatients } from "../SABYONI-Devs_MedIntel/BackEnd/src/models/patientModel.js";
import { supabase } from "../SABYONI-Devs_MedIntel/BackEnd/src/models/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { patientId } = req.query;

    if (patientId) {
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
    console.error("OCTAVIA error:", err.message);
    return res
      .status(500)
      .json({ error: "OCTAVIA analysis failed", details: err.message });
  }
}
