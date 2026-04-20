// vital-signs.js
// Updated to pull real patients from Supabase
// Shows at_risk badge and View Live Vitals button per patient

const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

let currentPatientIndex = null;
let patients = [];

/**
 * Fetches all patients from Supabase including their at_risk status
 * and their latest vitals from patient_vitals
 */
async function fetchPatients() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=patient_id,first_name,last_name,at_risk,risk_reason`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch patients");
  return await response.json();
}

/**
 * Fetches the latest vitals for a specific patient
 */
async function fetchLatestVitals(patientId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`,
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
 * Renders all patient cards with their latest vitals
 */
async function renderVitalCards() {
  const container = document.getElementById("vitalCards");
  container.innerHTML = `<p style="padding:20px;color:#6b7280">Loading patients...</p>`;

  try {
    patients = await fetchPatients();

    if (!patients || patients.length === 0) {
      container.innerHTML = `<p class="empty">No patients found.</p>`;
      return;
    }

    // Fetch latest vitals for all patients in parallel
    const vitalsArray = await Promise.all(
      patients.map((p) => fetchLatestVitals(p.patient_id))
    );

    container.innerHTML = patients
      .map((p, i) => {
        const v = vitalsArray[i];
        const bp = v
          ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
          : "N/A";
        const hr = v ? `${v.heart_rate} bpm` : "N/A";
        const temp = v ? `${v.temperature}°C` : "N/A";
        const spo2 = v ? `${v.oxygen_saturation}%` : "N/A";

        return `
          <div class="vital-patient-card">
            <div class="vpc-header">
              <div>
                <div class="vpc-name">
                  ${p.first_name} ${p.last_name}
                  ${p.at_risk ? `<span class="badge badge-high" style="margin-left:8px">AT RISK</span>` : `<span class="badge badge-low" style="margin-left:8px">Stable</span>`}
                </div>
                ${p.at_risk && p.risk_reason ? `<div class="vpc-condition" style="color:#dc2626">${p.risk_reason}</div>` : `<div class="vpc-condition">No active alerts</div>`}
              </div>
              <div class="vpc-actions">
                <button class="btn btn-teal" onclick="openModal(${i})">&#9195; Record Vitals</button>
                <button class="btn btn-blue" onclick="viewLiveVitals('${p.patient_id}')">&#128268; View Live Vitals</button>
                <button class="btn btn-outline" onclick="window.location.href='patient-history.html?patientId=${p.patient_id}'">&#128196; View History</button>
              </div>
            </div>
            <div class="vpc-divider"></div>
            <div class="vpc-stats" id="stats-${i}">
              <div class="vpc-stat">
                <div class="vpc-stat-label">Blood Pressure</div>
                <div class="vpc-stat-value">${bp}</div>
              </div>
              <div class="vpc-stat">
                <div class="vpc-stat-label">Heart Rate</div>
                <div class="vpc-stat-value">${hr}</div>
              </div>
              <div class="vpc-stat">
                <div class="vpc-stat-label">Temperature</div>
                <div class="vpc-stat-value">${temp}</div>
              </div>
              <div class="vpc-stat">
                <div class="vpc-stat-label">O2 Saturation</div>
                <div class="vpc-stat-value">${spo2}</div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="empty">Error loading patients: ${err.message}</p>`;
  }
}

function openModal(i) {
  currentPatientIndex = i;
  document.getElementById("modalPatientName").textContent =
    `${patients[i].first_name} ${patients[i].last_name}`;
  document.getElementById("mBP").value = "";
  document.getElementById("mHR").value = "";
  document.getElementById("mTemp").value = "";
  document.getElementById("mSPO2").value = "";
  document.getElementById("vitalModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("vitalModal").classList.add("hidden");
  currentPatientIndex = null;
}

async function saveVitals() {
  const i = currentPatientIndex;
  const bp = document.getElementById("mBP").value.trim();
  const hr = document.getElementById("mHR").value.trim();
  const temp = document.getElementById("mTemp").value.trim();
  const spo2 = document.getElementById("mSPO2").value.trim();

  if (!bp || !hr || !temp || !spo2) {
    alert("Please fill in all vitals before saving.");
    return;
  }

  const bpParts = bp.split("/");

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_vitals`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patients[i].patient_id,
          heart_rate: parseInt(hr),
          blood_pressure_systolic: parseInt(bpParts[0]),
          blood_pressure_diastolic: parseInt(bpParts[1]),
          temperature: parseFloat(temp),
          oxygen_saturation: parseInt(spo2),
        }),
      }
    );

    if (!response.ok) throw new Error("Failed to save vitals");

    closeModal();
    renderVitalCards();
  } catch (err) {
    alert(`Error saving vitals: ${err.message}`);
  }
}

function viewLiveVitals(patientId) {
  window.location.href = `live-vitals.html?patientId=${patientId}`;
}

// Initial load
renderVitalCards();