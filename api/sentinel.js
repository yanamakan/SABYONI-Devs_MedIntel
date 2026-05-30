import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Fetch all patients ──
async function fetchAllPatients() {
  const { data, error } = await supabase
    .from("patients")
    .select("patient_id, first_name, last_name, simulator_active");
  if (error) throw new Error(`fetchAllPatients error: ${error.message}`);
  return data;
}

// ── Save patient vitals ──
async function savePatientVitals(patientId, vitals) {
  await supabase.from("patient_vitals").insert({
    patient_id:               patientId,
    heart_rate:               vitals.heart_rate,
    blood_pressure_systolic:  vitals.blood_pressure_systolic,
    blood_pressure_diastolic: vitals.blood_pressure_diastolic,
    oxygen_saturation:        vitals.oxygen_saturation,
    temperature:              vitals.temperature,
    timestamp:                new Date().toISOString(),
  });
}

// ── Update patient risk ──
async function updatePatientRisk(patientId, analysis) {
  await supabase
    .from("patients")
    .update({
      at_risk:             analysis.overall_status !== "normal",
      risk_reason:         analysis.summary,
      last_sentinel_check: new Date().toISOString(),
    })
    .eq("patient_id", patientId);
}

// ── Save alert ──
async function saveAlert(patientId, vitals, analysis) {
  await supabase.from("sentinel_alerts").insert({
    patient_id: patientId,
    severity:   analysis.overall_status,
    message:    analysis.summary,
    vitals:     JSON.stringify(vitals),
    resolved:   false,
    created_at: new Date().toISOString(),
  });
}

// ── Build OCTAVIA prompt ──
function buildPrompt(vitals) {
  return `
You are OCTAVIA, an AI medical monitoring assistant.
Analyze the following patient vitals and respond in JSON only.

Patient vitals:
- Heart Rate: ${vitals.heart_rate ?? "N/A"} bpm
- Blood Pressure: ${vitals.blood_pressure_systolic ?? "N/A"}/${vitals.blood_pressure_diastolic ?? "N/A"} mmHg
- Oxygen Saturation: ${vitals.oxygen_saturation ?? "N/A"} %
- Temperature: ${vitals.temperature ?? "N/A"} °C

Respond with this exact JSON structure and nothing else:
{
  "overall_status": "normal" | "warning" | "critical",
  "summary": "one sentence summary of patient status",
  "vitals": {
    "heart_rate":        { "status": "normal" | "warning" | "critical", "message": "brief explanation" },
    "blood_pressure":    { "status": "normal" | "warning" | "critical", "message": "brief explanation" },
    "oxygen_saturation": { "status": "normal" | "warning" | "critical", "message": "brief explanation" },
    "temperature":       { "status": "normal" | "warning" | "critical", "message": "brief explanation" }
  },
  "recommendation": "what the nurse or doctor should do"
}
  `;
}

// ── Call Groq ──
async function callGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  const rawText = data.choices?.[0]?.message?.content || "";
  const clean = rawText.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── Run sentinel analysis ──
async function runSentinelAnalysis(patientId, vitals) {
  await savePatientVitals(patientId, vitals);

  const prompt   = buildPrompt(vitals);
  const analysis = await callGroq(prompt);

  await updatePatientRisk(patientId, analysis);

  if (analysis.overall_status !== "normal") {
    await saveAlert(patientId, vitals, analysis);
  }

  await supabase.from("ai_triage_reports").insert({
    patient_id:    patientId,
    symptoms:      `HR: ${vitals.heart_rate}, BP: ${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}, Temp: ${vitals.temperature}, O2: ${vitals.oxygen_saturation}`,
    ai_suggestion: JSON.stringify({
      summary:        analysis.summary,
      recommendation: analysis.recommendation,
      overall_status: analysis.overall_status,
      vitals:         analysis.vitals,
    }),
    status:        "pending",
    priority:      analysis.overall_status === "critical" ? "high"
                 : analysis.overall_status === "warning"  ? "medium"
                 : "low",
    ai_confidence: 89,
    nurse_approved: false,
  });

  console.log(`OCTAVIA [${patientId}]: ${analysis.overall_status} — ${analysis.summary}`);
  return analysis;
}

// ── Main handler ──
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
        .maybeSingle();

      if (!data) {
        return res.status(200).json({
          overall_status: "no_data",
          summary: "No vitals recorded yet for this patient.",
          recommendation: "Please record patient vitals using the IoT device or manual entry before running OCTAVIA analysis.",
          vitals: {}
        });
      }

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
      .maybeSingle();

    if (!data) {
      results.push({
        patient_id: patient.patient_id,
        name: `${patient.first_name} ${patient.last_name}`,
        analysis: {
          overall_status: "no_data",
          summary: "No vitals recorded yet for this patient.",
          recommendation: "Please record patient vitals using the IoT device or manual entry before running OCTAVIA analysis.",
          vitals: {}
        }
      });
      continue;
    }
    

    const analysis = await runSentinelAnalysis(patient.patient_id, data);
    results.push({
      patient_id: patient.patient_id,
      name:       `${patient.first_name} ${patient.last_name}`,
      analysis,
    });
  }

  return res.status(200).json(results);

  } catch (err) {
    console.error("OCTAVIA error:", err.message);
    return res.status(500).json({ error: "OCTAVIA analysis failed", details: err.message });
  }
}