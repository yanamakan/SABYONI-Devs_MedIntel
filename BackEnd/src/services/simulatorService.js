import { fetchAllPatients } from "../models/patientModel.js";
import { runSentinelAnalysis } from "./sentinelService.js";

function generateVitals() {
  // 70% chance of normal vitals, 30% chance of abnormal
  const isNormal = Math.random() < 0.7;

  if (isNormal) {
    return {
      heart_rate: Math.floor(Math.random() * (90 - 60 + 1)) + 60,
      blood_pressure_systolic: Math.floor(Math.random() * (120 - 100 + 1)) + 100,
      blood_pressure_diastolic: Math.floor(Math.random() * (80 - 60 + 1)) + 60,
      temperature: parseFloat((Math.random() * (37.5 - 36.1) + 36.1).toFixed(1)),
      oxygen_saturation: Math.floor(Math.random() * (100 - 96 + 1)) + 96,
    };
  } else {
    return {
      heart_rate: Math.floor(Math.random() * (140 - 110 + 1)) + 110,
      blood_pressure_systolic: Math.floor(Math.random() * (180 - 140 + 1)) + 140,
      blood_pressure_diastolic: Math.floor(Math.random() * (110 - 90 + 1)) + 90,
      temperature: parseFloat((Math.random() * (39.5 - 38.5) + 38.5).toFixed(1)),
      oxygen_saturation: Math.floor(Math.random() * (93 - 88 + 1)) + 88,
    };
  }
}

export async function sendReadings() {
  const patients = await fetchAllPatients();

  if (!patients || patients.length === 0) {
    console.log("No patients found in database.");
    return;
  }

  for (const patient of patients) {
    if (!patient.simulator_active) {
      console.log(`Simulator inactive for ${patient.first_name} ${patient.last_name}, skipping...`);
      continue;
    }

    try {
      const vitals = generateVitals();
      console.log(`Generating vitals for ${patient.first_name} ${patient.last_name}...`);
      await runSentinelAnalysis(patient.patient_id, vitals);
    } catch (err) {
      console.error(`Error processing patient ${patient.patient_id}:`, err.message);
    }
  }
}