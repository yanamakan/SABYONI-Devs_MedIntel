// live-vitals.js
// Fetches and displays live vitals for a specific patient
// Auto-refreshes every 30 seconds
// Patient ID is read from the URL query parameter

const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

// Read the patientId from the URL
const params = new URLSearchParams(window.location.search);
const patientId = params.get("patientId");

// If no patientId in URL, redirect back
if (!patientId) {
  window.location.href = "vital-signs.html";
}

/**
 * Fetches the patient's details including at_risk status
 */
async function fetchPatient() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?patient_id=eq.${patientId}&select=first_name,last_name,at_risk,risk_reason`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch patient");
  const data = await response.json();
  return data[0] || null;
}

/**
 * Fetches the latest vitals for this patient
 */
async function fetchLatestVitals() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch vitals");
  const data = await response.json();
  return data[0] || null;
}

/**
 * Fetches the latest Sentinel alert for this patient
 */
async function fetchLatestAlert() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sentinel_alerts?patient_id=eq.${patientId}&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data[0] || null;
}

/**
 * Fetches alert history for this patient
 */
async function fetchAlertHistory() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/sentinel_alerts?patient_id=eq.${patientId}&order=created_at.desc&limit=10`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) return [];
  return await response.json();
}

/**
 * Returns a colour styled badge based on severity
 */
function severityBadge(severity) {
  if (severity === "critical") {
    return `<span class="badge badge-high">${severity.toUpperCase()}</span>`;
  } else if (severity === "warning") {
    return `<span class="badge badge-medium">${severity.toUpperCase()}</span>`;
  } else {
    return `<span class="badge badge-low">${severity.toUpperCase()}</span>`;
  }
}

/**
 * Colours a vital value red if the patient is at risk
 */
function vitalColour(value, atRisk) {
  if (atRisk) return `<span style="color:#dc2626; font-weight:700">${value}</span>`;
  return value;
}

/**
 * Main function — fetches all data and updates the page
 * Called on load and every 30 seconds
 */
async function refreshPage() {
  try {
    // Fetch patient, vitals and latest alert in parallel
    const [patient, vitals, latestAlert, alertHistory] = await Promise.all([
      fetchPatient(),
      fetchLatestVitals(),
      fetchLatestAlert(),
      fetchAlertHistory(),
    ]);

    if (!patient) {
      document.getElementById("patientTitle").textContent = "Patient not found";
      return;
    }

    // Update patient name in title
    document.getElementById("patientTitle").textContent =
      `${patient.first_name} ${patient.last_name}`;

    // Show or hide risk banner
    const riskBanner = document.getElementById("riskBanner");
    if (patient.at_risk && patient.risk_reason) {
      riskBanner.style.display = "block";
      document.getElementById("riskReason").textContent = patient.risk_reason;
    } else {
      riskBanner.style.display = "none";
    }

    // Update live vitals
    if (vitals) {
      document.getElementById("liveBP").innerHTML = vitalColour(
        `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg`,
        patient.at_risk
      );
      document.getElementById("liveHR").innerHTML = vitalColour(
        `${vitals.heart_rate} bpm`,
        patient.at_risk
      );
      document.getElementById("liveTemp").innerHTML = vitalColour(
        `${vitals.temperature}°C`,
        patient.at_risk
      );
      document.getElementById("liveSPO2").innerHTML = vitalColour(
        `${vitals.oxygen_saturation}%`,
        patient.at_risk
      );

      // Update last updated time
      const time = new Date(vitals.timestamp).toLocaleTimeString();
      document.getElementById("lastUpdated").textContent =
        `Last updated: ${time} — auto-refreshes every 30 seconds`;
    }

    // Update Sentinel analysis box
    if (latestAlert) {
      document.getElementById("sentinelBox").innerHTML = `
        <div class="ai-header">&#129302; Sentinel — ${severityBadge(latestAlert.severity)}</div>
        <div class="ai-field">
          <strong>Summary</strong>
          <p>${latestAlert.risk_reason}</p>
        </div>
        <div class="ai-field">
          <strong>Vitals at time of alert</strong>
          <p>
            BP: ${latestAlert.blood_pressure_systolic}/${latestAlert.blood_pressure_diastolic} mmHg &nbsp;|&nbsp;
            HR: ${latestAlert.heart_rate} bpm &nbsp;|&nbsp;
            Temp: ${latestAlert.temperature}°C &nbsp;|&nbsp;
            O2: ${latestAlert.oxygen_saturation}%
          </p>
        </div>
      `;
    } else {
      document.getElementById("sentinelBox").innerHTML = `
        <div class="ai-header">&#129302; Sentinel</div>
        <p style="font-size:.87rem; color:#6b7280;">No alerts for this patient.</p>
      `;
    }

    // Update alert count in stats
    document.getElementById("alertCount").textContent = alertHistory.length;

    // Update alert history table
    const tbody = document.getElementById("alertHistory");
    if (alertHistory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty">No alerts recorded.</td></tr>`;
    } else {
      tbody.innerHTML = alertHistory.map((alert) => `
        <tr>
          <td>${new Date(alert.created_at).toLocaleString()}</td>
          <td>${severityBadge(alert.severity)}</td>
          <td>${alert.risk_reason}</td>
        </tr>
      `).join("");
    }

  } catch (err) {
    console.error("Live vitals error:", err.message);
  }
}

// Load on page open
refreshPage();

// Auto-refresh every 30 seconds
setInterval(refreshPage, 30000);