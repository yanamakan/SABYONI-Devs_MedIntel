// ======== SUPABASE CONFIG ========
const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

function formatRecordNotes(notes) {
  if (!notes) return '—';
  var urlMatch = notes.match(/\[File: (https?:\/\/[^\]]+)\]/);
  if (urlMatch) {
    var url = urlMatch[1];
    var desc = notes.replace(/\[File: [^\]]+\]/, '').trim();
    return (desc || 'Uploaded document')
      + ' <a href="' + url + '" target="_blank" rel="noopener noreferrer" '
      + 'style="display:inline-flex;align-items:center;gap:4px;color:#0ea5e9;font-size:.78rem;font-weight:600;text-decoration:none;padding:2px 8px;background:#f0f9ff;border-radius:4px;border:1px solid #bae6fd;margin-left:6px;">'
      + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
      + ' View Document</a>';
  }
  return notes;
}
// ======== SESSION ========
function loadSession() {
  const raw = sessionStorage.getItem("medintel_user");
  if (!raw) return null;
  return JSON.parse(raw);
}

async function applySessionToHeader() {
  const user = loadSession();
  if (!user) return;

  const nameEl = document.querySelector(".header-text p");

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nurses?user_id=eq.${user.id}&select=first_name,last_name`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    const data = await res.json();
    if (data && data[0]) {
      const fullName = `${data[0].first_name} ${data[0].last_name}`.trim();
      if (nameEl) nameEl.textContent = `${fullName} • ${user.department || 'Nursing'}`;
      // Update session name too
      user.name = fullName;
      sessionStorage.setItem('medintel_user', JSON.stringify(user));
    } else {
      if (nameEl) nameEl.textContent = `${user.name} • ${user.department || 'Nursing'}`;
    }
  } catch (err) {
    if (nameEl) nameEl.textContent = `${user.name} • ${user.department || 'Nursing'}`;
  }
}

// ======== SUPABASE FETCHERS ========
async function fetchPatients() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=patient_id,first_name,last_name,at_risk,risk_reason,dob`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch patients");
  return await res.json();
}

async function fetchLatestVitals(patientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function fetchPendingDiagnoses() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_triage_reports?status=eq.pending&order=created_at.desc&select=*,patients(first_name,last_name)`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch diagnoses");
  return await res.json();
}

async function fetchLatestMedicalRecord(patientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/medical_records?patient_id=eq.${patientId}&order=date_created.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function fetchLatestAppointment(patientId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?patient_id=eq.${patientId}&order=date.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function fetchTodayAppointments() {
  const today = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?date=eq.${today}&order=time.asc&select=*,patients(first_name,last_name),doctors(first_name,last_name)`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return [];
  return await res.json();
}

async function fetchDoctors() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/doctors?select=doctor_id,first_name,last_name`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return [];
  return await res.json();
}

// ======== PATIENTS DATA ========
let patients = [];
let currentVitals = {};
let activePatientId = null;

// ======== HELPER: CALCULATE AGE ========
function calculateAge(dob) {
  if (!dob) return "--";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ======== RENDER STATS ========
async function renderStats(patientsData, pendingCount) {
  document.getElementById("stat-total-patients").textContent =
    patientsData.length;
  document.getElementById("stat-pending").textContent = pendingCount;
  const atRisk = patientsData.filter((p) => p.at_risk).length;
  document.getElementById("stat-at-risk").textContent = atRisk;
  const appts = await fetchTodayAppointments();
  document.getElementById("stat-schedule").textContent = appts.length;
}

// ======== RENDER PENDING DIAGNOSES ========
async function renderPendingDiagnoses() {
  const container = document.getElementById("diagnoses-list");
  container.innerHTML =
    '<div style="padding:20px;color:#6b7280;">Loading diagnoses...</div>';

  try {
    const reports = await fetchPendingDiagnoses();

    if (!reports || reports.length === 0) {
      container.innerHTML =
        '<div style="padding:20px;color:#6b7280;">No pending AI diagnoses.</div>';
      return;
    }

    container.innerHTML = reports
      .map((r) => {
        const patient = r.patients;
        const name = patient
          ? `${patient.first_name} ${patient.last_name}`
          : "Unknown Patient";
        const suggestion = (() => {
          try {
            return JSON.parse(r.ai_suggestion || "{}");
          } catch {
            return {};
          }
        })();
        const priority = r.priority || "medium";
        const priorityColor =
          priority === "high"
            ? "#b91c1c"
            : priority === "medium"
              ? "#92400e"
              : "#065f46";
        const priorityBg =
          priority === "high"
            ? "#fee2e2"
            : priority === "medium"
              ? "#fef3c7"
              : "#d1fae5";

        return `
        <div class="diag-card" id="diag-${r.report_id}">
          <div class="diag-header">
            <div>
              <div class="diag-patient-name">${name}</div>
              <div class="diag-submitted">Submitted: ${new Date(r.created_at).toLocaleString()}</div>
            </div>
            <span class="priority-badge" style="background:${priorityBg};color:${priorityColor};padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;">
              ${priority.toUpperCase()} PRIORITY
            </span>
          </div>

          <div class="symptoms-label">Patient Vitals</div>
          <div class="symptoms-box">${r.symptoms || "No vitals recorded"}</div>

          <div class="ai-analysis-box">
            <div class="ai-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              OCTAVIA AI Analysis
            </div>
            <div class="ai-row">
              <div class="ai-row-label">Overall Status</div>
              <div class="ai-row-val">${suggestion.overall_status?.toUpperCase() || "--"}</div>
            </div>
            <div class="ai-row">
              <div class="ai-row-label">Summary</div>
              <div class="ai-row-val">${suggestion.summary || "--"}</div>
            </div>
            <div class="ai-row">
              <div class="ai-row-label">Recommendation</div>
              <div class="ai-row-val">${suggestion.recommendation || "--"}</div>
            </div>
            ${
              suggestion.vitals
                ? `
            <div class="ai-row">
              <div class="ai-row-label">Vital Breakdown</div>
              <ul class="ai-list">
                ${Object.entries(suggestion.vitals)
                  .map(
                    ([key, v]) =>
                      `<li><strong>${key.replace(/_/g, " ")}:</strong> ${v.message} (${v.status})</li>`,
                  )
                  .join("")}
              </ul>
            </div>`
                : ""
            }
            ${
              r.ai_confidence
                ? `
            <div class="ai-confidence-label">AI Confidence</div>
            <div class="conf-bar-wrap"><div class="conf-bar" style="width:${r.ai_confidence}%"></div></div>
            <div class="conf-pct">${r.ai_confidence}%</div>`
                : ""
            }
          </div>

          <div class="nurse-notes-label">Nurse Notes (Optional)</div>
          <textarea class="nurse-notes-area" id="notes-${r.report_id}" placeholder="Add any additional observations or corrections..."></textarea>

          <div class="diag-actions">
            <button class="btn-approve" onclick="handleApprove('${r.report_id}', '${name}')">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Approve &amp; Forward to Doctor
            </button>
            <button class="btn-reject" onclick="handleReject('${r.report_id}', '${name}')">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              Reject Diagnosis
            </button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<div style="padding:20px;color:#dc2626;">Error loading diagnoses: ${err.message}</div>`;
  }
}

// ======== APPROVE DIAGNOSIS ========
async function handleApprove(reportId, patientName) {
  const notes = document.getElementById(`notes-${reportId}`)?.value || "";

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_triage_reports?report_id=eq.${reportId}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    const data = await res.json();
    const report = data[0];
    if (!report) throw new Error("Report not found");

    const suggestion = (() => {
      try {
        return JSON.parse(report.ai_suggestion || "{}");
      } catch {
        return {};
      }
    })();

    await fetch(`${SUPABASE_URL}/rest/v1/medical_records`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patient_id: report.patient_id,
        diagnosis: suggestion.summary || "AI diagnosis approved by nurse",
        notes: notes || suggestion.recommendation || "",
      }),
    });

    await fetch(
      `${SUPABASE_URL}/rest/v1/ai_triage_reports?report_id=eq.${reportId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "approved",
          nurse_approved: true,
          nurse_notes: notes,
        }),
      },
    );

    const card = document.getElementById(`diag-${reportId}`);
    card.style.transition = "opacity .4s, transform .4s";
    card.style.opacity = "0";
    card.style.transform = "translateY(-10px)";
    setTimeout(() => {
      card.remove();
      showToast(`✓ ${patientName}'s diagnosis approved & forwarded to doctor`);
    }, 400);
  } catch (err) {
    showToast("Error approving diagnosis: " + err.message);
  }
}

// ======== REJECT DIAGNOSIS ========
async function handleReject(reportId, patientName) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/ai_triage_reports?report_id=eq.${reportId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "rejected" }),
      },
    );

    const card = document.getElementById(`diag-${reportId}`);
    card.style.transition = "opacity .4s, transform .4s";
    card.style.opacity = "0";
    card.style.transform = "translateY(-10px)";
    setTimeout(() => {
      card.remove();
      showToast(`✕ ${patientName}'s diagnosis rejected`);
    }, 400);
  } catch (err) {
    showToast("Error rejecting diagnosis: " + err.message);
  }
}

// ======== NURSE MANUAL DIAGNOSIS ========
async function saveNurseDiagnosis() {
  const patientId = document.getElementById("nurse-diag-patient").value;
  const diagnosis = document.getElementById("nurse-diag-text").value.trim();
  const notes = document.getElementById("nurse-diag-notes").value.trim();

  if (!patientId || !diagnosis) {
    showToast("Please select a patient and enter a diagnosis.");
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/medical_records`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patient_id: patientId, diagnosis, notes }),
    });

    document.getElementById("nurse-diag-text").value = "";
    document.getElementById("nurse-diag-notes").value = "";
    document.getElementById("nurse-diag-patient").value = "";
    showToast("✓ Diagnosis saved to patient record");
  } catch (err) {
    showToast("Error saving diagnosis: " + err.message);
  }
}

// ======== RENDER PATIENT CARE ========
async function renderPatientCare() {
  const tbody = document.getElementById("patient-care-list");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:20px;">Loading...</td></tr>';

  try {
    const [records, appointments] = await Promise.all([
      Promise.all(patients.map((p) => fetchLatestMedicalRecord(p.patient_id))),
      Promise.all(patients.map((p) => fetchLatestAppointment(p.patient_id))),
    ]);

    tbody.innerHTML = patients
      .map((p, i) => {
        const record = records[i];
        const appt = appointments[i];
        const age = calculateAge(p.dob);
        const condition = record?.diagnosis || "No diagnosis on record";
        const urgency = p.at_risk ? "high" : "low";
        const lastVisit = appt?.date || "--";

        return `
        <tr>
          <td>${p.first_name} ${p.last_name}</td>
          <td>${age}</td>
          <td>${condition}</td>
          <td><span class="urgency-badge ${urgency}">${urgency}</span></td>
          <td>${lastVisit}</td>
          <td><button class="view-btn" onclick="openPatientDetail('${p.patient_id}')">View Details</button></td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626;padding:20px;">Error: ${err.message}</td></tr>`;
  }
}

// ======== PATIENT DETAIL MODAL ========
async function openPatientDetail(patientId) {
  const p = patients.find((x) => x.patient_id === patientId);
  if (!p) return;

  document.getElementById("detail-modal-title").textContent =
    `${p.first_name} ${p.last_name}`;
  document.getElementById("detail-modal-body").innerHTML =
    '<div style="color:#6b7280;">Loading...</div>';
  showModal("patient-detail-modal");

  const [record, vitals, appt] = await Promise.all([
    fetchLatestMedicalRecord(patientId),
    fetchLatestVitals(patientId),
    fetchLatestAppointment(patientId),
  ]);

  document.getElementById("detail-modal-body").innerHTML = `
    <div style="display:grid;gap:16px;">
      <div style="background:#f9fafb;border-radius:10px;padding:16px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Patient Info</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
          <div><span style="color:#6b7280;">Age:</span> ${calculateAge(p.dob)}</div>
          <div><span style="color:#6b7280;">DOB:</span> ${p.dob || "--"}</div>
          <div><span style="color:#6b7280;">Status:</span> ${p.at_risk ? '<span style="color:#b91c1c;font-weight:700;">AT RISK</span>' : '<span style="color:#16a34a;font-weight:700;">Stable</span>'}</div>
          <div><span style="color:#6b7280;">Risk Reason:</span> ${p.risk_reason || "None"}</div>
        </div>
      </div>
      <div style="background:#f9fafb;border-radius:10px;padding:16px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Latest Vitals</div>
        ${
          vitals
            ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
          <div><span style="color:#6b7280;">Heart Rate:</span> ${vitals.heart_rate} bpm</div>
          <div><span style="color:#6b7280;">Blood Pressure:</span> ${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg</div>
          <div><span style="color:#6b7280;">Temperature:</span> ${vitals.temperature}°C</div>
          <div><span style="color:#6b7280;">O2 Saturation:</span> ${vitals.oxygen_saturation}%</div>
        </div>`
            : '<div style="color:#6b7280;font-size:14px;">No vitals recorded</div>'
        }
      </div>
      <div style="background:#f9fafb;border-radius:10px;padding:16px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Latest Diagnosis</div>
        <div style="font-size:14px;">${record?.diagnosis || "No diagnosis on record"}</div>
        ${record?.notes ? `<div style="font-size:13px;color:#6b7280;margin-top:6px;">${formatRecordNotes(record.notes)}</div>` : ""}
      </div>
      <div style="background:#f9fafb;border-radius:10px;padding:16px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Next Appointment</div>
        <div style="font-size:14px;">${appt ? `${appt.date} at ${appt.time || "--"} — ${appt.status}` : "No appointments scheduled"}</div>
      </div>
    </div>
  `;
}

// ======== RENDER VITALS LIST ========
async function renderVitalsList() {
  const list = document.getElementById("vitals-list");
  list.innerHTML =
    '<div style="padding:20px;color:#6b7280;">Loading patients...</div>';

  try {
    patients = await fetchPatients();

    if (!patients || patients.length === 0) {
      list.innerHTML =
        '<div style="padding:20px;color:#6b7280;">No patients found.</div>';
      return;
    }

    const vitalsArray = await Promise.all(
      patients.map((p) => fetchLatestVitals(p.patient_id)),
    );

    patients.forEach((p, i) => {
      const v = vitalsArray[i];
      currentVitals[p.patient_id] = v
        ? {
            bp: `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`,
            hr: v.heart_rate,
            temp: v.temperature,
            o2: v.oxygen_saturation,
          }
        : { bp: "--", hr: "--", temp: "--", o2: "--" };
    });

    const waveIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
    const octaviaIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;

    list.innerHTML = patients
      .map((p, i) => {
        const v = vitalsArray[i];
        const bp = v
          ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
          : "--";
        const hr = v ? `${v.heart_rate} bpm` : "--";
        const temp = v ? `${v.temperature}°C` : "--";
        const o2 = v ? `${v.oxygen_saturation}%` : "--";

        return `
        <div class="vital-card">
          <div class="vital-header">
            <div>
              <div class="vital-name">
                ${p.first_name} ${p.last_name}
                ${
                  p.at_risk
                    ? `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">AT RISK</span>`
                    : `<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">Stable</span>`
                }
              </div>
              <div class="vital-condition">
                ${p.at_risk && p.risk_reason ? p.risk_reason : "No active alerts"}
              </div>
            </div>
            <div class="vital-btns">
              <button class="btn-record" onclick="openRecordModal('${p.patient_id}')">
                ${waveIcon} Record Vitals
              </button>
              <button class="btn-history" onclick="window.location.href='patient-history.html?patientId=${p.patient_id}'">
                ${octaviaIcon} OCTAVIA Analysis
              </button>
            </div>
          </div>
          <div class="vital-divider"></div>
          <div class="vitals-grid">
            <div>
              <div class="vital-stat-label">Blood Pressure</div>
              <div class="vital-stat-val" id="disp-bp-${p.patient_id}">${bp}</div>
            </div>
            <div>
              <div class="vital-stat-label">Heart Rate</div>
              <div class="vital-stat-val" id="disp-hr-${p.patient_id}">${hr}</div>
            </div>
            <div>
              <div class="vital-stat-label">Temperature</div>
              <div class="vital-stat-val" id="disp-temp-${p.patient_id}">${temp}</div>
            </div>
            <div>
              <div class="vital-stat-label">O2 Saturation</div>
              <div class="vital-stat-val" id="disp-o2-${p.patient_id}">${o2}</div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Populate nurse diagnosis patient dropdown
    const select = document.getElementById("nurse-diag-patient");
    select.innerHTML = '<option value="">-- Select a patient --</option>';
    patients.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.patient_id;
      opt.textContent = `${p.first_name} ${p.last_name}`;
      select.appendChild(opt);
    });
  } catch (err) {
    list.innerHTML = `<div style="padding:20px;color:#dc2626;">Error loading patients: ${err.message}</div>`;
  }
}

// ======== RENDER SCHEDULE ========
async function renderSchedule() {
  const tbody = document.getElementById("schedule-list");
  const today = new Date().toLocaleDateString("en-ZA", { dateStyle: "full" });
  document.getElementById("schedule-date").textContent =
    `Appointments for ${today}`;

  try {
    const appointments = await fetchTodayAppointments();

    if (!appointments || appointments.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:20px;">No appointments today.</td></tr>';
      return;
    }

    tbody.innerHTML = appointments
      .map((a) => {
        const patientName = a.patients
          ? `${a.patients.first_name} ${a.patients.last_name}`
          : "--";
        const doctorName = a.doctors
          ? `Dr. ${a.doctors.first_name} ${a.doctors.last_name}`
          : "--";
        const status = a.status || "scheduled";

        return `
        <tr>
          <td>${a.time || "--"}</td>
          <td>${patientName}</td>
          <td>${doctorName}</td>
          <td><span class="status-badge ${status}">${status}</span></td>
          <td style="max-width:160px;font-size:13px;color:#6b7280;">${a.notes || "--"}</td>
          <td style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-edit-appt" onclick="openEditAppointment('${a.appointment_id}')">Edit</button>
            <button class="btn-delete-appt" onclick="deleteAppointment('${a.appointment_id}')">Delete</button>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626;padding:20px;">Error: ${err.message}</td></tr>`;
  }
}

// ======== OPEN APPOINTMENT MODAL (CREATE) ========
async function openAppointmentModal() {
  document.getElementById("appt-modal-title").textContent =
    "Create Appointment";
  document.getElementById("appt-editing-id").value = "";
  document.getElementById("appt-patient").value = "";
  document.getElementById("appt-doctor").value = "";
  document.getElementById("appt-date").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("appt-time").value = "";
  document.getElementById("appt-status").value = "scheduled";
  document.getElementById("appt-notes").value = "";
  document.getElementById("appt-error").style.display = "none";
  await populateAppointmentDropdowns();
  showModal("appointment-modal");
}

// ======== OPEN APPOINTMENT MODAL (EDIT) ========
async function openEditAppointment(appointmentId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/appointments?appointment_id=eq.${appointmentId}&select=*`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  const data = await res.json();
  const appt = data[0];
  if (!appt) return;

  document.getElementById("appt-modal-title").textContent = "Edit Appointment";
  document.getElementById("appt-editing-id").value = appointmentId;
  document.getElementById("appt-date").value = appt.date || "";
  document.getElementById("appt-time").value = appt.time || "";
  document.getElementById("appt-status").value = appt.status || "scheduled";
  document.getElementById("appt-notes").value = appt.notes || "";
  document.getElementById("appt-error").style.display = "none";

  await populateAppointmentDropdowns();

  document.getElementById("appt-patient").value = appt.patient_id || "";
  document.getElementById("appt-doctor").value = appt.doctor_id || "";

  showModal("appointment-modal");
}

// ======== POPULATE APPOINTMENT DROPDOWNS ========
async function populateAppointmentDropdowns() {
  const [pts, docs] = await Promise.all([fetchPatients(), fetchDoctors()]);

  const patientSelect = document.getElementById("appt-patient");
  const doctorSelect = document.getElementById("appt-doctor");

  patientSelect.innerHTML = '<option value="">-- Select a patient --</option>';
  pts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.patient_id;
    opt.textContent = `${p.first_name} ${p.last_name}`;
    patientSelect.appendChild(opt);
  });

  doctorSelect.innerHTML = '<option value="">-- Select a doctor --</option>';
  docs.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.doctor_id;
    opt.textContent = `Dr. ${d.first_name} ${d.last_name}`;
    doctorSelect.appendChild(opt);
  });
}

// ======== SAVE APPOINTMENT ========
async function saveAppointment() {
  const editingId = document.getElementById("appt-editing-id").value;
  const patientId = document.getElementById("appt-patient").value;
  const doctorId = document.getElementById("appt-doctor").value;
  const date = document.getElementById("appt-date").value;
  const time = document.getElementById("appt-time").value;
  const status = document.getElementById("appt-status").value;
  const notes = document.getElementById("appt-notes").value.trim();

  if (!patientId || !date || !time) {
    document.getElementById("appt-error").style.display = "block";
    return;
  }

  document.getElementById("appt-error").style.display = "none";

  const body = {
    patient_id: patientId,
    doctor_id: doctorId || null,
    date,
    time,
    status,
    notes: notes || null,
    created_by: "nurse",
  };

  try {
    if (editingId) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/appointments?appointment_id=eq.${editingId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(body),
        },
      );
      showToast("✓ Appointment updated successfully");
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      showToast("✓ Appointment created successfully");
    }

    closeAppointmentModal();
    renderSchedule();
  } catch (err) {
    showToast("Error saving appointment: " + err.message);
  }
}

// ======== DELETE APPOINTMENT ========
async function deleteAppointment(appointmentId) {
  if (!confirm("Are you sure you want to delete this appointment?")) return;

  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?appointment_id=eq.${appointmentId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
      },
    );
    showToast("✓ Appointment deleted");
    renderSchedule();
  } catch (err) {
    showToast("Error deleting appointment: " + err.message);
  }
}

// ======== CLOSE APPOINTMENT MODAL ========
function closeAppointmentModal() {
  closeModal("appointment-modal");
}

// ======== RECORD MODAL ========
function openRecordModal(patientId) {
  activePatientId = patientId;
  const p = patients.find((x) => x.patient_id === patientId);
  const v = currentVitals[patientId];
  document.getElementById("modal-record-title").textContent =
    `Record Vitals — ${p.first_name} ${p.last_name}`;
  document.getElementById("modal-record-sub").textContent =
    "Manual vital entry";
  document.getElementById("inp-bp").value = v?.bp !== "--" ? v.bp : "";
  document.getElementById("inp-hr").value = v?.hr !== "--" ? v.hr : "";
  document.getElementById("inp-temp").value = v?.temp !== "--" ? v.temp : "";
  document.getElementById("inp-o2").value = v?.o2 !== "--" ? v.o2 : "";
  document.getElementById("inp-notes").value = "";
  document.getElementById("record-error").style.display = "none";
  showModal("record-modal");
}

async function saveVitals() {
  const bp = document.getElementById("inp-bp").value.trim();
  const hr = document.getElementById("inp-hr").value.trim();
  const temp = document.getElementById("inp-temp").value.trim();
  const o2 = document.getElementById("inp-o2").value.trim();

  if (!bp || !hr || !temp || !o2) {
    document.getElementById("record-error").style.display = "block";
    document.getElementById("record-error").textContent =
      "Please fill in all vital fields before saving.";
    return;
  }

  // Validate BP format
  const bpParts = bp.split("/");
  if (bpParts.length !== 2 || !bpParts[0] || !bpParts[1]) {
    document.getElementById("record-error").style.display = "block";
    document.getElementById("record-error").textContent =
      "Blood pressure must be in format: 120/80";
    return;
  }

  const systolic = parseInt(bpParts[0]);
  const diastolic = parseInt(bpParts[1]);
  const heartRate = parseInt(hr);
  const tempVal = parseFloat(temp);
  const o2Val = parseInt(o2);

  // Basic range validation
  if (
    isNaN(systolic) ||
    isNaN(diastolic) ||
    isNaN(heartRate) ||
    isNaN(tempVal) ||
    isNaN(o2Val)
  ) {
    document.getElementById("record-error").style.display = "block";
    document.getElementById("record-error").textContent =
      "Please enter valid numbers for all fields.";
    return;
  }

  document.getElementById("record-error").style.display = "none";

  // Disable save button to prevent double submit
  const saveBtn = document.querySelector(
    '#record-modal button[onclick="saveVitals()"]',
  );
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/patient_vitals`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        patient_id: activePatientId,
        heart_rate: heartRate,
        blood_pressure_systolic: systolic,
        blood_pressure_diastolic: diastolic,
        temperature: tempVal,
        oxygen_saturation: o2Val,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${res.status} — ${errText}`);
    }

    closeModal("record-modal");
    showToast("✓ Vitals saved successfully");

    // Update the displayed vitals on the card immediately without full reload
    document.getElementById(`disp-bp-${activePatientId}`).textContent = bp;
    document.getElementById(`disp-hr-${activePatientId}`).textContent =
      hr + " bpm";
    document.getElementById(`disp-temp-${activePatientId}`).textContent =
      temp + "°C";
    document.getElementById(`disp-o2-${activePatientId}`).textContent =
      o2 + "%";

    // Update currentVitals cache
    currentVitals[activePatientId] = {
      bp,
      hr: heartRate,
      temp: tempVal,
      o2: o2Val,
    };
  } catch (err) {
    console.error("saveVitals error:", err);
    document.getElementById("record-error").style.display = "block";
    document.getElementById("record-error").textContent =
      "Failed to save vitals: " + err.message;
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "✓ Save Vitals";
    }
  }
}

// ======== NOTIFICATIONS ========
let notificationsOpen = false;

async function fetchNotifications() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/nurse_notifications?created_at=gte.${cutoff}&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) return [];
  return await res.json();
}

async function renderNotifications() {
  const notifications = await fetchNotifications();
  const list = document.getElementById("notif-list");
  const badge = document.getElementById("notif-badge");

  const unread = notifications.filter((n) => !n.is_read).length;

  if (unread > 0) {
    badge.textContent = unread;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }

  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="padding:32px 20px;text-align:center;color:#9ca3af;">
        <div style="font-size:28px;margin-bottom:8px;">🔔</div>
        <div style="font-size:14px;">No notifications in the last 24 hours</div>
      </div>
    `;
    return;
  }

  const typeIcon = { diagnosis: "🧠", critical_alert: "⚠️", appointment: "📅" };
  const typeColor = {
    diagnosis: "#7c3aed",
    critical_alert: "#dc2626",
    appointment: "#0ea5e9",
  };

  list.innerHTML = notifications
    .map((n) => {
      const time = new Date(n.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const date = new Date(n.created_at).toLocaleDateString();
      const icon = typeIcon[n.type] || "🔔";
      const color = typeColor[n.type] || "#6b7280";
      const bg = n.is_read ? "#fff" : "#f8faff";

      return `
      <div style="display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid #f3f4f6;background:${bg};cursor:pointer;" onclick="markOneRead('${n.notification_id}')">
        <div style="font-size:20px;flex-shrink:0;margin-top:2px;">${icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:#111827;font-weight:${n.is_read ? "400" : "600"};line-height:1.45;">${n.message}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${date} at ${time}</div>
        </div>
        ${!n.is_read ? `<div style="width:8px;height:8px;border-radius:99px;background:${color};flex-shrink:0;margin-top:6px;"></div>` : ""}
      </div>
    `;
    })
    .join("");
}

function toggleNotifications() {
  const dropdown = document.getElementById("notif-dropdown");
  notificationsOpen = !notificationsOpen;
  dropdown.style.display = notificationsOpen ? "block" : "none";
  if (notificationsOpen) renderNotifications();
}

async function markOneRead(notificationId) {
  await fetch(
    `${SUPABASE_URL}/rest/v1/nurse_notifications?notification_id=eq.${notificationId}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ is_read: true }),
    },
  );
  renderNotifications();
}

async function markAllRead() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await fetch(
    `${SUPABASE_URL}/rest/v1/nurse_notifications?created_at=gte.${cutoff}&is_read=eq.false`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ is_read: true }),
    },
  );
  renderNotifications();
}

async function clearAllNotifications() {
  if (!confirm("Clear all notifications?")) return;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await fetch(
    `${SUPABASE_URL}/rest/v1/nurse_notifications?created_at=gte.${cutoff}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
    },
  );
  renderNotifications();
  toggleNotifications();
}

document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("notif-dropdown");
  const btn = document.querySelector(".notif-btn");
  if (
    notificationsOpen &&
    dropdown &&
    btn &&
    !dropdown.contains(e.target) &&
    !btn.contains(e.target)
  ) {
    dropdown.style.display = "none";
    notificationsOpen = false;
  }
});

// ======== MODAL HELPERS ========
function showModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

[
  "record-modal",
  "history-modal",
  "patient-detail-modal",
  "appointment-modal",
].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("click", function (e) {
      if (e.target === this) closeModal(id);
    });
  }
});

// ======== LOGOUT ========
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    sessionStorage.clear();
    window.location.href = "login.html";
  }
}

// ======== TABS ========
function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });

  var target = document.getElementById("tab-" + tabName);
  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }
  document.querySelector('.tab[data-tab="' + tabName + '"]').classList.add("active");

  if (tabName === "patient") renderPatientCare();
  if (tabName === "schedule") renderSchedule();
  if (tabName === "settings") loadNurseSettingsData();
}

// ======== TOAST ========
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ======== INIT ========
async function init() {
  var savedDark = localStorage.getItem('medintel_nurse_dark');
  if (savedDark === 'true') {
    document.body.classList.add('dark-mode');
  }
  applySessionToHeader();
  await renderVitalsList();
  const reports = await fetchPendingDiagnoses();
  await renderStats(patients, reports.length);
  await renderPendingDiagnoses();
  await renderNotifications();

  // Auto-refresh notifications every 30 seconds
  setInterval(async () => {
    await renderNotifications();
  }, 30000);
}

// ── NURSE SETTINGS ────────────────────────────────────────────

function nurseStabSwitch(btn) {
  var stab = btn.dataset.stab;
  document.querySelectorAll('.nurse-stab').forEach(function(b) {
    b.style.background = 'transparent';
    b.style.color = '#6b7280';
    b.style.boxShadow = 'none';
  });
  btn.style.background = '#fff';
  btn.style.color = '#111827';
  btn.style.boxShadow = '0 1px 3px rgba(0,0,0,.1)';

  ['profile','preferences','notifications','security'].forEach(function(s) {
    var el = document.getElementById('nurse-stab-' + s);
    if (el) el.style.display = 'none';
  });
  var target = document.getElementById('nurse-stab-' + stab);
  if (target) target.style.display = 'block';

  if (stab === 'preferences' || stab === 'notifications') loadNursePreferences();
  if (stab === 'security') loadNurseTwoFAStatus();
}

async function loadNurseSettingsData() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  var nameEl  = document.getElementById('nurse-profile-name');
  var emailEl = document.getElementById('nurse-profile-email');
  var phoneEl = document.getElementById('nurse-profile-phone');
  if (nameEl  && session.name)  nameEl.value  = session.name;
  if (emailEl && session.email) emailEl.value = session.email;
  if (phoneEl && session.phone) phoneEl.value = session.phone;

  // Load dept from nurses table
  // Load dept from users table
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + session.id + '&select=department', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    });
    var data = await res.json();
    if (data[0] && data[0].department) {
      var deptEl = document.getElementById('nurse-profile-dept');
      if (deptEl) deptEl.value = data[0].department;
    }
  } catch(e) {}

  loadNursePreferences();
  loadNurseTwoFAStatus();

  // Apply saved dark mode
  var savedDark = localStorage.getItem('medintel_nurse_dark');
  if (savedDark === 'true') {
    document.body.classList.add('dark-mode');
    var toggle = document.getElementById('nurse-dark-mode-toggle');
    if (toggle) toggle.checked = true;
  }
}

async function loadNursePreferences() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  try {
    // Get nurse record first
    var nRes = await fetch(SUPABASE_URL + '/rest/v1/nurses?user_id=eq.' + session.id + '&select=nurse_id', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    });
    var nData = await nRes.json();
    if (!nData[0]) return;
    var nurseId = nData[0].nurse_id;

    var res = await fetch(SUPABASE_URL + '/rest/v1/nurse_preferences?nurse_id=eq.' + nurseId + '&limit=1', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    });
    var prefs = await res.json();

    if (!prefs || prefs.length === 0) {
      // Insert defaults
      await fetch(SUPABASE_URL + '/rest/v1/nurse_preferences', {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ nurse_id: nurseId, dark_mode: false, timezone: 'Johannesburg (SAST)', email_notifications: true, sms_notifications: false, request_alerts: true })
      });
      return;
    }

    var p = prefs[0];
    var darkToggle = document.getElementById('nurse-dark-mode-toggle');
    if (darkToggle) darkToggle.checked = p.dark_mode || false;
    document.body.classList.toggle('dark-mode', p.dark_mode || false);

    var tzEl = document.getElementById('nurse-pref-timezone');
    if (tzEl && p.timezone) tzEl.value = p.timezone;

    var emailT = document.getElementById('nurse-notif-email');
    var smsT   = document.getElementById('nurse-notif-sms');
    var reqT   = document.getElementById('nurse-notif-requests');
    if (emailT) emailT.checked = p.email_notifications !== false;
    if (smsT)   smsT.checked   = p.sms_notifications   || false;
    if (reqT)   reqT.checked   = p.request_alerts       !== false;
  } catch(e) { console.error('loadNursePreferences:', e); }
}

async function getNurseId() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return null;
  var res = await fetch(SUPABASE_URL + '/rest/v1/nurses?user_id=eq.' + session.id + '&select=nurse_id', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
  });
  var data = await res.json();
  return data[0]?.nurse_id || null;
}

async function saveNurseProfile() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  var name  = document.getElementById('nurse-profile-name')?.value.trim();
  var dept  = document.getElementById('nurse-profile-dept')?.value.trim();
  var phone = document.getElementById('nurse-profile-phone')?.value.trim();
  if (!name) { showToast('Name cannot be empty.'); return; }
  try {
    var nurseId = await getNurseId();
    if (nurseId) {
      var parts = name.split(' ');
      await fetch(SUPABASE_URL + '/rest/v1/nurses?nurse_id=eq.' + nurseId, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '', department: dept || null })
      });
    }
    showToast('✓ Profile updated successfully');
  } catch(e) { showToast('Error: ' + e.message); }
}

async function saveNursePreferences() {
  var nurseId = await getNurseId();
  if (!nurseId) return;
  var dark = document.getElementById('nurse-dark-mode-toggle')?.checked || false;
  var tz   = document.getElementById('nurse-pref-timezone')?.value || 'Johannesburg (SAST)';
  try {
    await fetch(SUPABASE_URL + '/rest/v1/nurse_preferences?nurse_id=eq.' + nurseId, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ dark_mode: dark, timezone: tz, updated_at: new Date().toISOString() })
    });
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('medintel_nurse_dark', dark);
    showToast('✓ Preferences saved');
  } catch(e) { showToast('Error: ' + e.message); }
}

async function saveNurseNotifPreferences() {
  var nurseId = await getNurseId();
  if (!nurseId) return;
  var emailN = document.getElementById('nurse-notif-email')?.checked  ?? true;
  var smsN   = document.getElementById('nurse-notif-sms')?.checked    ?? false;
  var reqN   = document.getElementById('nurse-notif-requests')?.checked ?? true;
  try {
    await fetch(SUPABASE_URL + '/rest/v1/nurse_preferences?nurse_id=eq.' + nurseId, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email_notifications: emailN, sms_notifications: smsN, request_alerts: reqN, updated_at: new Date().toISOString() })
    });
    showToast('✓ Notification preferences saved');
  } catch(e) { showToast('Error: ' + e.message); }
}

async function loadNurseTwoFAStatus() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + session.id + '&select=two_fa_enabled', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    });
    var data = await res.json();
    var enabled = data[0]?.two_fa_enabled || false;
    var toggle = document.getElementById('nurse-twofa-toggle');
    var status = document.getElementById('nurse-twofa-status');
    if (toggle) toggle.checked = enabled;
    if (status) { status.textContent = enabled ? '2FA is enabled' : '2FA is disabled'; status.style.color = enabled ? '#16a34a' : '#6b7280'; }
  } catch(e) { console.error('loadNurseTwoFAStatus:', e); }
}

async function toggleNurseTwoFA(enabled) {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  var status = document.getElementById('nurse-twofa-status');
  try {
    await fetch(SUPABASE_URL + '/rest/v1/users?id=eq.' + session.id, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ two_fa_enabled: enabled })
    });
    if (status) { status.textContent = enabled ? '2FA is enabled' : '2FA is disabled'; status.style.color = enabled ? '#16a34a' : '#6b7280'; }
    session.two_fa_enabled = enabled;
    sessionStorage.setItem('medintel_user', JSON.stringify(session));
    showToast(enabled ? '✓ 2FA enabled' : '✓ 2FA disabled');
  } catch(e) {
    showToast('Error: ' + e.message);
    var toggle = document.getElementById('nurse-twofa-toggle');
    if (toggle) toggle.checked = !enabled;
  }
}

async function sendNursePasswordReset() {
  var session = JSON.parse(sessionStorage.getItem('medintel_user') || 'null');
  if (!session) return;
  try {
    var res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'forgot_password', email: session.email, name: session.name })
    });
    var data = await res.json();
    showToast(data.success ? '✓ Password reset code sent to your email' : 'Failed: ' + data.error);
  } catch(e) { showToast('Error: ' + e.message); }
}

init();
