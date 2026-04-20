// src/services/sentinelService.js
// Contains ALL the Groq AI logic for the Sentinel module
// Updated to use Groq (llama-3.3-70b-versatile) instead of Gemini
// Saves results to patient_vitals, sentinel_alerts and updates patients.at_risk

import { savePatientVitals } from "../models/vitalModel.js";
import { saveAlert, updatePatientRisk } from "../models/alertModel.js";

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Builds the prompt string we send to Groq
 * Slots in the actual vital values so the AI can analyse them
 * Called by: runSentinelAnalysis()
 */
function buildPrompt(vitals) {
  return `
You are Sentinel, an AI medical monitoring assistant.
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

/**
 * Sends the prompt to Groq and returns the parsed JSON analysis
 * Strips any markdown formatting that might wrap around the JSON
 * Called by: runSentinelAnalysis()
 */
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

/**
 * Main exported function — runs the full Sentinel analysis pipeline for one patient
 * 1. Saves the generated vitals to patient_vitals table
 * 2. Builds the prompt
 * 3. Calls Groq and gets analysis
 * 4. Updates patients.at_risk based on result
 * 5. If warning or critical, saves an alert to sentinel_alerts
 * Called by: simulatorService.js
 */
export async function runSentinelAnalysis(patientId, vitals) {
  // Step 1 — save vitals to database
  await savePatientVitals(patientId, vitals);

  // Step 2 — build prompt and call Groq
  const prompt = buildPrompt(vitals);
  const analysis = await callGroq(prompt);

  // Step 3 — update patient at_risk flag regardless of status
  await updatePatientRisk(patientId, analysis);

  // Step 4 — only save an alert if status is warning or critical
  if (analysis.overall_status !== "normal") {
    await saveAlert(patientId, vitals, analysis);
  }

  console.log(
    `Sentinel [${patientId}]: ${analysis.overall_status} — ${analysis.summary}`
  );

  return analysis;
}