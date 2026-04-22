import { savePatientVitals } from "../models/vitalModel.js";
import { saveAlert, updatePatientRisk } from "../models/alertModel.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

export async function runSentinelAnalysis(patientId, vitals) {
  await savePatientVitals(patientId, vitals);

  const prompt = buildPrompt(vitals);
  const analysis = await callGroq(prompt);

  await updatePatientRisk(patientId, analysis);

  if (analysis.overall_status !== "normal") {
    await saveAlert(patientId, vitals, analysis);
  }

  console.log(`OCTAVIA [${patientId}]: ${analysis.overall_status} — ${analysis.summary}`);

  return analysis;
}