// patient-history.js
// OCTAVIA — Full patient analysis page
// Dark IoT theme, Chart.js vitals graph
// Analyse button calls Vercel API securely

const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

let VERCEL_API_URL = "https://sabyoni-devs-med-intel.vercel.app";

const params = new URLSearchParams(window.location.search);
const patientId = params.get("patientId");

if (!patientId) window.location.href = "nurse.html";

let vitalsChart = null;
let autoRefreshInterval = null;
let currentPatient = null;
let currentAnalysis = null;

const VITALS_CONFIG = {
  heart_rate:               { label: "Heart Rate",    color: "#E05C6A", unit: "bpm"  },
  blood_pressure_systolic:  { label: "BP Systolic",   color: "#4A9FD4", unit: "mmHg" },
  blood_pressure_diastolic: { label: "BP Diastolic",  color: "#60a5fa", unit: "mmHg" },
  oxygen_saturation:        { label: "O2 Saturation", color: "#48C9A9", unit: "%"    },
  temperature:              { label: "Temperature",   color: "#F0A500", unit: "°C"   },
};

const COLORS = {
  panel:      "#111E2E",
  border:     "#1E3048",
  gridLine:   "rgba(255,255,255,0.04)",
  tickColor:  "rgba(255,255,255,0.35)",
  legendText: "#CBD5E1",
};

// ── SUPABASE FETCHERS ──────────────────────────────

async function fetchPatient() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?patient_id=eq.${patientId}&select=first_name,last_name,at_risk,risk_reason,simulator_active`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch patient");
  const data = await res.json();
  return data[0] || null;
}

async function fetchVitalsHistory() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=20`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch vitals");
  const data = await res.json();
  return data.reverse();
}

async function fetchAlertHistory() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sentinel_alerts?patient_id=eq.${patientId}&order=created_at.desc&limit=20`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  console.log("Alert history:", data);
  return data;
}

// ── SIMULATOR CONTROLS ─────────────────────────────

async function startSimulator() {
  await fetch(`${SUPABASE_URL}/rest/v1/patients?patient_id=eq.${patientId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ simulator_active: true }),
  });
  document.getElementById("sim-status").textContent = "● LIVE";
  document.getElementById("sim-status").className = "running";
  startAutoRefresh();
}

async function stopSimulator() {
  await fetch(`${SUPABASE_URL}/rest/v1/patients?patient_id=eq.${patientId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ simulator_active: false }),
  });
  document.getElementById("sim-status").textContent = "● PAUSED";
  document.getElementById("sim-status").className = "paused";
  stopAutoRefresh();
}

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(refreshVitals, 30000);
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// ── CHART ─────────────────────────────────────────

function initChart(vitals) {
  const labels = vitals.map((v) =>
    new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  const datasets = Object.entries(VITALS_CONFIG).map(([key, cfg]) => ({
    label:            cfg.label,
    data:             vitals.map((v) => v[key] !== undefined ? v[key] : null),
    borderColor:      cfg.color,
    backgroundColor:  cfg.color + "18",
    borderWidth:      1.5,
    pointRadius:      2,
    pointHoverRadius: 5,
    tension:          0.4,
    fill:             false,
    spanGaps:         true,
  }));

  const ctx = document.getElementById("vitalsChart").getContext("2d");
  if (vitalsChart) vitalsChart.destroy();

  vitalsChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      animation: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          ticks: { color: COLORS.tickColor, font: { family: "IBM Plex Mono", size: 10 } },
          grid:  { color: COLORS.gridLine },
        },
        y: {
          ticks: { color: COLORS.tickColor, font: { family: "IBM Plex Mono", size: 10 } },
          grid:  { color: COLORS.gridLine },
        },
      },
      plugins: {
        legend: {
          labels: {
            color:    COLORS.legendText,
            font:     { family: "IBM Plex Mono", size: 10 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: COLORS.panel,
          borderColor:     COLORS.border,
          borderWidth:     1,
          titleColor:      COLORS.legendText,
          bodyColor:       COLORS.tickColor,
          titleFont:       { family: "IBM Plex Mono", size: 11 },
          bodyFont:        { family: "IBM Plex Mono", size: 10 },
          callbacks: {
            label(ctx) {
              const key  = Object.keys(VITALS_CONFIG)[ctx.datasetIndex];
              const unit = VITALS_CONFIG[key]?.unit || "";
              const val  = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${val !== null ? val + " " + unit : "--"}`;
            }
          }
        }
      }
    }
  });
}

// ── VITAL CARDS ───────────────────────────────────

function updateVitalCards(vitals, analysis) {
  if (!vitals) return;

  document.getElementById("vHR").textContent   = vitals.heart_rate ?? "--";
  document.getElementById("vBP").textContent   = vitals.blood_pressure_systolic
    ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`
    : "--";
  document.getElementById("vTemp").textContent = vitals.temperature ?? "--";
  document.getElementById("vSPO2").textContent = vitals.oxygen_saturation ?? "--";

  if (analysis?.vitals) {
    const v = analysis.vitals;
    document.getElementById("sHR").textContent   = v.heart_rate?.message        || "";
    document.getElementById("sBP").textContent   = v.blood_pressure?.message    || "";
    document.getElementById("sTemp").textContent = v.temperature?.message       || "";
    document.getElementById("sSPO2").textContent = v.oxygen_saturation?.message || "";

    ["sHR", "sBP", "sTemp", "sSPO2"].forEach((id, i) => {
      const key = ["heart_rate", "blood_pressure", "temperature", "oxygen_saturation"][i];
      const status = analysis.vitals[key]?.status;
      const el = document.getElementById(id);
      el.style.color = status === "critical" ? "#E05C6A"
                     : status === "warning"  ? "#F0A500"
                     : "rgba(255,255,255,0.4)";
    });
  }
}

// ── OCTAVIA ANALYSIS BOX ──────────────────────────

function showAnalysisBox(analysis) {
  const box = document.getElementById("octavia-summary");
  const status = analysis.overall_status;

  box.className = status;
  box.style.display = "block";

  const vitalsHTML = analysis.vitals
    ? Object.entries(analysis.vitals).map(([key, v]) => `
        <div class="octavia-vital-row">
          <span class="octavia-vital-dot"></span>
          <div>
            <div style="font-size:9px;opacity:0.6;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">${key.replace(/_/g, " ")}</div>
            <div>${v.message}</div>
          </div>
        </div>
      `).join("")
    : "";

  box.innerHTML = `
    <div class="octavia-header">
      ◈ OCTAVIA —
      <span style="
        font-size:9px;
        padding:2px 10px;
        border-radius:99px;
        background: ${status === "critical" ? "rgba(224,92,106,0.2)" : status === "warning" ? "rgba(240,165,0,0.2)" : "rgba(72,201,169,0.2)"};
        letter-spacing:0.1em;
      ">${status.toUpperCase()}</span>
    </div>
    <div class="octavia-section">
      <div class="octavia-section-title">Assessment</div>
      <div class="octavia-section-body">${analysis.summary}</div>
    </div>
    <div class="octavia-vitals-grid">${vitalsHTML}</div>
    <div class="octavia-recommendation">
      ◈ Recommendation: ${analysis.recommendation}
    </div>
    <div class="octavia-disclaimer">
      ⚠ OCTAVIA is an AI assistant and may produce inaccurate assessments.
      This analysis is advisory only and does not replace clinical judgment.
      All final medical decisions must be made by qualified hospital staff.
    </div>
  `;
}

// ── CRITICAL MODAL ────────────────────────────────

function showCriticalModal(analysis) {
  document.getElementById("modalPatientName").textContent =
    `Patient: ${currentPatient?.first_name} ${currentPatient?.last_name}`;
  document.getElementById("modalSummary").textContent = analysis.summary;
  document.getElementById("modalRecommendation").textContent =
    `◈ ${analysis.recommendation}`;
  document.getElementById("critical-overlay").classList.add("active");
}

function dismissModal() {
  document.getElementById("critical-overlay").classList.remove("active");
}

// ── SEVERITY BADGE ────────────────────────────────

function severityBadge(severity) {
  return `<span class="severity-badge severity-${severity}">${severity.toUpperCase()}</span>`;
}

// ── OCTAVIA ANALYSE BUTTON ────────────────────────

async function runAnalysis() {
  const btn = document.getElementById("analyzeBtn");
  btn.innerHTML = "Analysing...";
  btn.style.opacity = "0.6";
  btn.disabled = true;

  try {
    const res = await fetch(
      `${VERCEL_API_URL}/api/sentinel?patientId=${patientId}`
    );

    if (!res.ok) throw new Error("OCTAVIA analysis failed");

    currentAnalysis = await res.json();

    const vitalsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const vitalsData = await vitalsRes.json();
    const vitals = vitalsData[0];

    if (vitals) updateVitalCards(vitals, currentAnalysis);
    showAnalysisBox(currentAnalysis);

    if (currentAnalysis.overall_status === "critical") {
      showCriticalModal(currentAnalysis);
    }

    await loadAlertHistory();

  } catch (err) {
    console.error("OCTAVIA analysis error:", err.message);
    alert("OCTAVIA analysis failed. Please try again.");
  } finally {
    btn.innerHTML = '<span class="btn-dot"></span> Analyse';
    btn.style.opacity = "1";
    btn.disabled = false;
  }
}

// ── ALERT HISTORY ─────────────────────────────────

let alertsToShow = 3;

async function loadAlertHistory() {
  const alerts = await fetchAlertHistory();
  const tbody = document.getElementById("alertHistory");

  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No alerts recorded for this patient.</td></tr>`;
    document.getElementById("showMoreBtn").style.display = "none";
    return;
  }

  const visible = alerts.slice(0, alertsToShow);

  tbody.innerHTML = visible.map((alert) => {
    const bp = alert.blood_pressure_systolic && alert.blood_pressure_diastolic
      ? `${alert.blood_pressure_systolic}/${alert.blood_pressure_diastolic}`
      : "--";

    const resolvedBadge = alert.resolved
      ? `<span style="color:#48C9A9;font-size:10px;">✔ Resolved</span>`
      : `<span style="color:#E05C6A;font-size:10px;">● Active</span>`;

    return `
      <tr>
        <td>${new Date(alert.created_at).toLocaleString()}</td>
        <td>${severityBadge(alert.severity)}</td>
        <td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(255,255,255,0.6)">
          HR: ${alert.heart_rate ?? "--"} &nbsp;|&nbsp;
          BP: ${bp} &nbsp;|&nbsp;
          Temp: ${alert.temperature ?? "--"}°C &nbsp;|&nbsp;
          O₂: ${alert.oxygen_saturation ?? "--"}%
        </td>
        <td>${alert.risk_reason ?? "--"}</td>
        <td>${resolvedBadge}</td>
      </tr>
    `;
  }).join("");

  const showMoreBtn = document.getElementById("showMoreBtn");
  if (alerts.length > alertsToShow) {
    showMoreBtn.style.display = "block";
    showMoreBtn.textContent = `Show More (${alerts.length - alertsToShow} remaining)`;
  } else {
    showMoreBtn.style.display = "none";
  }
}

function showMoreAlerts() {
  alertsToShow += 5;
  loadAlertHistory();
}

// ── REFRESH VITALS ────────────────────────────────

async function refreshVitals() {
  try {
    const vitals = await fetchVitalsHistory();
    if (vitals.length > 0) {
      initChart(vitals);
      updateVitalCards(vitals[vitals.length - 1], currentAnalysis);
    }
    await loadAlertHistory();
  } catch (err) {
    console.error("Refresh error:", err.message);
  }
}

// ── PAGE LOAD ─────────────────────────────────────

async function loadPage() {
  try {
    const [patient, vitals] = await Promise.all([
      fetchPatient(),
      fetchVitalsHistory(),
    ]);

    currentPatient = patient;

    if (patient) {
      document.getElementById("patientName").textContent =
        `${patient.first_name} ${patient.last_name} ${patient.at_risk ? "— ⚠ AT RISK" : "— Stable"}`;

      // Sync simulator button state with DB
      if (patient.simulator_active) {
        document.getElementById("sim-status").textContent = "● LIVE";
        document.getElementById("sim-status").className = "running";
        startAutoRefresh();
      } else {
        document.getElementById("sim-status").textContent = "● PAUSED";
        document.getElementById("sim-status").className = "paused";
      }
    }

    if (vitals.length > 0) {
      initChart(vitals);
      updateVitalCards(vitals[vitals.length - 1], null);
    }

    await loadAlertHistory();

  } catch (err) {
    console.error("Page load error:", err.message);
  }
}

loadPage();