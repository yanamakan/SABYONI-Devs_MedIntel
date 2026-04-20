// patient-history.js
// OCTAVIA — Full patient analysis page
// Dark IoT theme, Chart.js vitals graph, Groq AI analysis
// Start / Stop / Analyse controls per patient

const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

const params = new URLSearchParams(window.location.search);
const patientId = params.get("patientId");

if (!patientId) window.location.href = "vital-signs.html";

let vitalsChart = null;
let autoRefreshInterval = null;
let currentPatient = null;
let currentAnalysis = null;

const VITALS_CONFIG = {
  heart_rate:               { label: "Heart Rate",        color: "#E05C6A", unit: "bpm"  },
  blood_pressure_systolic:  { label: "BP Systolic",       color: "#4A9FD4", unit: "mmHg" },
  blood_pressure_diastolic: { label: "BP Diastolic",      color: "#60a5fa", unit: "mmHg" },
  oxygen_saturation:        { label: "O2 Saturation",     color: "#48C9A9", unit: "%"    },
  temperature:              { label: "Temperature",       color: "#F0A500", unit: "°C"   },
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
    `${SUPABASE_URL}/rest/v1/patients?patient_id=eq.${patientId}&select=first_name,last_name,at_risk,risk_reason`,
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
    `${SUPABASE_URL}/rest/v1/sentinel_alerts?patient_id=eq.${patientId}&order=created_at.desc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return [];
  return await res.json();
}

// ── SIMULATOR CONTROLS ─────────────────────────────

async function startSimulator() {
  await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.simulator_running`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: "true" }),
  });
  document.getElementById("sim-status").textContent = "● LIVE";
  document.getElementById("sim-status").className = "running";
  startAutoRefresh();
}

async function stopSimulator() {
  await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.simulator_running`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: "false" }),
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

  // If analysis exists update per-vital status messages
  if (analysis?.vitals) {
    const v = analysis.vitals;
    document.getElementById("sHR").textContent   = v.heart_rate?.message        || "";
    document.getElementById("sBP").textContent   = v.blood_pressure?.message    || "";
    document.getElementById("sTemp").textContent = v.temperature?.message       || "";
    document.getElementById("sSPO2").textContent = v.oxygen_saturation?.message || "";

    // Colour the status text based on vital status
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
  btn.textContent = "Analysing...";
  btn.style.opacity = "0.6";
  btn.disabled = true;

  try {
    // Fetch latest vitals for this patient
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    const vitals = data[0];

    if (!vitals) {
      alert("No vitals found for this patient yet.");
      return;
    }

    // Call OCTAVIA via Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `
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
          `
        }],
        temperature: 0.3,
      }),
    });

    const groqData = await groqRes.json();
    const rawText = groqData.choices?.[0]?.message?.content || "";
    const clean = rawText.replace(/```json|```/g, "").trim();
    currentAnalysis = JSON.parse(clean);

    // Update vital cards with analysis
    updateVitalCards(vitals, currentAnalysis);

    // Show analysis box
    showAnalysisBox(currentAnalysis);

    // Show critical modal if needed
    if (currentAnalysis.overall_status === "critical") {
      showCriticalModal(currentAnalysis);
    }

    // Refresh alert history
    loadAlertHistory();

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

async function loadAlertHistory() {
  const alerts = await fetchAlertHistory();
  const tbody = document.getElementById("alertHistory");

  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-row">No alerts recorded for this patient.</td></tr>`;
    return;
  }

  tbody.innerHTML = alerts.map((alert) => `
    <tr>
      <td>${new Date(alert.created_at).toLocaleString()}</td>
      <td>${severityBadge(alert.severity)}</td>
      <td>${alert.risk_reason}</td>
    </tr>
  `).join("");
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
    }

    if (vitals.length > 0) {
      initChart(vitals);
      updateVitalCards(vitals[vitals.length - 1], null);
    }

    await loadAlertHistory();

    // Start auto refresh
    startAutoRefresh();

  } catch (err) {
    console.error("Page load error:", err.message);
  }
}

loadPage();