// src/services/simulatorService.js
// Generates and sends simulated vitals for every patient in the database

import { fetchAllPatients } from "../models/patientModel.js";
import { runSentinelAnalysis } from "./sentinelService.js";
import { getSimulatorStatus } from "../models/settingsModel.js";

/**
 * Generates a realistic random set of vitals for a patient
 */
function generateVitals() {
  return {
    heart_rate: Math.floor(Math.random() * (120 - 60 + 1)) + 60,
    blood_pressure_systolic: Math.floor(Math.random() * (140 - 100 + 1)) + 100,
    blood_pressure_diastolic: Math.floor(Math.random() * (90 - 60 + 1)) + 60,
    temperature: parseFloat((Math.random() * (39.5 - 35.5) + 35.5).toFixed(1)),
    oxygen_saturation: Math.floor(Math.random() * (100 - 90 + 1)) + 90,
  };
}

/**
 * Main function — fetches all patients, generates vitals for each one
 * then runs Sentinel analysis per patient
 * Called by: simulator.js every 30 seconds
 */
export async function sendReadings() {
  const running = await getSimulatorStatus();

  if (!running) {
    console.log("Simulator paused...");
    return;
  }

  const patients = await fetchAllPatients();

  if (!patients || patients.length === 0) {
    console.log("No patients found in database.");
    return;
  }

  for (const patient of patients) {
    const vitals = generateVitals();
    console.log(`Generating vitals for ${patient.first_name} ${patient.last_name}...`);

    try {
      await runSentinelAnalysis(patient.patient_id, vitals);
    } catch (err) {
      console.log(`Sentinel skipped for ${patient.first_name} — ${err.message}`);
    }

    // Small delay between patients
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}