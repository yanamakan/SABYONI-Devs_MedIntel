/* ============================================================
   doctor.js — MedIntel Doctor Dashboard (Full Version)
   ============================================================ */

// ── STATE ─────────────────────────────────────────────────────
let allPatients      = [];
let doctorRecord     = null;
let sessionUser      = null;
let currentPatient   = null;
let anatomyNotes     = {};
let notificationsOpen = false;
let toastTimer;
const aiSummaryCache = {};

// ── SUPABASE HELPERS ─────────────────────────────────────────
const sbHeaders = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} — ${path}`);
  return res.json();
}

async function sbPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST failed: ${res.status} — ${txt}`);
  }
  return res.json();
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
}

async function sbDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: { ...sbHeaders(), Prefer: 'return=minimal' },
  });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
}

function formatRecordNotes(notes) {
  if (!notes) return '—';
  // Check if notes contain a file URL
  var urlMatch = notes.match(/\[File: (https?:\/\/[^\]]+)\]/);
  if (urlMatch) {
    var url = urlMatch[1];
    var desc = notes.replace(/\[File: [^\]]+\]/, '').trim();
    return escapeHtml(desc || 'Uploaded document') 
      + ' <a href="' + url + '" target="_blank" rel="noopener noreferrer" '
      + 'style="display:inline-flex;align-items:center;gap:4px;color:#0ea5e9;font-size:.78rem;font-weight:600;text-decoration:none;padding:2px 8px;background:#f0f9ff;border-radius:4px;border:1px solid #bae6fd;margin-left:6px;">'
      + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
      + ' View Document</a>';
  }
  return escapeHtml(notes);
}

// ── SESSION ───────────────────────────────────────────────────
function loadSession() {
  try {
    const raw = sessionStorage.getItem('medintel_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function applySessionToHeader() {
  if (!sessionUser) return;
  const nameEl = document.getElementById('doctor-name');
  if (nameEl) nameEl.textContent = sessionUser.name || sessionUser.email || 'Doctor';

  // Pre-fill settings
  const nameInput  = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const phoneInput = document.getElementById('profile-phone');
  if (nameInput  && sessionUser.name)  nameInput.value  = sessionUser.name;
  if (emailInput && sessionUser.email) emailInput.value = sessionUser.email;
  if (phoneInput && sessionUser.phone) phoneInput.value = sessionUser.phone;
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('doctor-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3000);
}

// ── HELPERS ───────────────────────────────────────────────────
function calculateAge(dob) {
  if (!dob) return '--';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso) {
  if (!iso) return '--';
  return String(iso).split('T')[0];
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── DATA FETCHERS ─────────────────────────────────────────────
async function fetchDoctorRecord(userId) {
  const data = await sbFetch(`doctors?user_id=eq.${userId}&select=*`);
  return data[0] || null;
}

async function fetchMyPatients(doctorId) {
  return sbFetch(
    `patients?select=patient_id,first_name,last_name,dob,phone,gender,at_risk,risk_reason,user_id&order=first_name.asc`
  );
}

async function fetchTodayAppointments(doctorId) {
  const today = new Date().toISOString().split('T')[0];
  return sbFetch(
    `appointments?doctor_id=eq.${doctorId}&date=eq.${today}&select=*,patients(first_name,last_name)&order=time.asc`
  );
}

async function fetchAllMyAppointments(doctorId) {
  return sbFetch(
    `appointments?doctor_id=eq.${doctorId}&select=*,patients(first_name,last_name)&order=date.asc,time.asc`
  );
}

async function fetchMedicalRecords(patientId) {
  return sbFetch(`medical_records?patient_id=eq.${patientId}&order=date_created.desc`);
}

async function fetchAllMyRecords(doctorId) {
  const patientIds = allPatients.map(p => p.patient_id).join(',');
  if (!patientIds) return [];
  return sbFetch(
    `medical_records?patient_id=in.(${patientIds})&select=*,patients(first_name,last_name)&order=date_created.desc`
  );
}

async function fetchPrescriptions(patientId) {
  return sbFetch(`prescriptions?patient_id=eq.${patientId}&order=date_issued.desc`);
}

async function fetchAllMyPrescriptions(doctorId) {
  // Get all patients first, then fetch their prescriptions
  const patientIds = allPatients.map(p => p.patient_id).join(',');
  if (!patientIds) return [];
  return sbFetch(
    `prescriptions?patient_id=in.(${patientIds})&select=*,patients(first_name,last_name)&order=date_issued.desc`
  );
}

async function fetchLatestVitals(patientId) {
  const data = await sbFetch(
    `patient_vitals?patient_id=eq.${patientId}&order=timestamp.desc&limit=1`
  );
  return data[0] || null;
}

// Patient requests come from nurse_notifications where the type is
// patient-initiated: refill_request, patient_message, certificate_request, new_appointment
async function fetchPatientRequests() {
  const doctorId = doctorRecord?.doctor_id;
  return sbFetch(
    `doctor_notifications?type=in.(refill_request,patient_message,certificate_request,new_appointment)&is_read=eq.false&or=(doctor_id.eq.${doctorId},doctor_id.is.null)&order=created_at.desc&limit=50`
  );
}

async function fetchNotifications(userId) {
  const doctorId = doctorRecord?.doctor_id;
  if (!doctorId) return [];
  return sbFetch(
    `doctor_notifications?or=(doctor_id.eq.${doctorId},doctor_id.is.null)&order=created_at.desc&limit=30`
  ).catch(() => []);
}

// ── STATS ─────────────────────────────────────────────────────
async function renderStats() {
  try {
    const doctorId = doctorRecord?.doctor_id;
    const [todayAppts, allAppts, requests] = await Promise.all([
      fetchTodayAppointments(doctorId),
      fetchAllMyAppointments(doctorId),
      fetchPatientRequests(),
    ]);
    const pending = allAppts.filter(a =>
      a.status === 'scheduled' || a.status === 'pending'
    ).length;
    const unreadRequests = requests.length;

    document.getElementById('stat-appointments').textContent = todayAppts.length;
    document.getElementById('stat-patients').textContent     = allPatients.length;
    document.getElementById('stat-pending').textContent      = pending;
    document.getElementById('stat-requests').textContent     = unreadRequests;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ── TAB SWITCHING ─────────────────────────────────────────────
const TAB_MAP = {
  patients:      'tab-patients',
  records:       'tab-records',
  prescriptions: 'tab-prescriptions',
  requests:      'tab-requests',
  anatomy:       'tab-anatomy',
  appointments:  'tab-appointments',
  map:           'tab-map',
  settings:      'tab-settings',
};

function switchTab(tabKey) {
  Object.entries(TAB_MAP).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const target = document.getElementById(TAB_MAP[tabKey]);
  if (!target) return;
  target.style.display = tabKey === 'patients' ? 'grid' : 'block';

  document.querySelectorAll('.tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabKey)
  );

  if (tabKey === 'records')       renderRecordsTab();
  if (tabKey === 'prescriptions') renderPrescriptionsTab();
  if (tabKey === 'requests')      renderRequestsTab();
  if (tabKey === 'anatomy')       renderAnatomyTab();
  if (tabKey === 'appointments')  renderAppointments();
  if (tabKey === 'map') initDoctorMap();
}

document.querySelectorAll('.tab').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);

// ── PATIENT QUEUE ─────────────────────────────────────────────
function renderQueue(list) {
  const queue = document.getElementById('patient-queue');
  if (!queue) return;
  queue.innerHTML = '';

  if (!list || list.length === 0) {
    queue.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;padding:8px 4px;">No patients assigned yet.</p>';
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  const sorted = [...list].sort((a, b) => {
    if (a.at_risk && !b.at_risk) return -1;
    if (!a.at_risk && b.at_risk) return 1;
    return (a.first_name || '').localeCompare(b.first_name || '');
  });

  sorted.forEach((patient, i) => {
    const name     = `${patient.first_name} ${patient.last_name}`;
    const priority = patient.at_risk ? 'high' : 'low';
    const age      = calculateAge(patient.dob);

    const card = document.createElement('div');
    card.className = 'patient-card' + (i === 0 ? ' active' : '');
    card.dataset.patientId = patient.patient_id;
    card.innerHTML = `
      <div class="card-top">
        <span class="patient-card-name">${escapeHtml(name)}</span>
        <span class="tag ${priority}">${priority}</span>
      </div>
      <p class="patient-card-condition">${escapeHtml(patient.risk_reason || (patient.at_risk ? 'At risk' : 'Stable'))}</p>
      <small class="patient-card-visit">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Age: ${age}
      </small>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.patient-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      showDetails(patient);
    });
    queue.appendChild(card);
  });

  if (sorted.length > 0) showDetails(sorted[0]);
}

// ── PATIENT DETAILS ───────────────────────────────────────────
async function showDetails(patient) {
  currentPatient = patient;

  document.getElementById('empty-state').style.display           = 'none';
  document.getElementById('ai-summary').style.display            = 'block';
  document.getElementById('info-grid').style.display             = 'grid';
  document.getElementById('history-section').style.display       = 'block';
  document.getElementById('prescriptions-section').style.display = 'block';

  const name     = `${patient.first_name} ${patient.last_name}`;
  const age      = calculateAge(patient.dob);
  const gender   = patient.gender || '—';
  const priority = patient.at_risk ? 'high' : 'low';

  document.getElementById('detail-name').textContent = name;
  document.getElementById('detail-meta').textContent = `${age} years • ${gender}`;

  const badge = document.getElementById('detail-priority');
  badge.textContent = `${priority.toUpperCase()} PRIORITY`;
  badge.className   = `priority-badge ${priority}`;

  // Latest vitals
  try {
    const vitals = await fetchLatestVitals(patient.patient_id);
    document.getElementById('detail-bp').textContent   = vitals ? `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg` : '—';
    document.getElementById('detail-hr').textContent   = vitals ? `${vitals.heart_rate} bpm` : '—';
    document.getElementById('detail-temp').textContent = vitals ? `${vitals.temperature}°C` : '—';
    document.getElementById('detail-o2').textContent   = vitals ? `${vitals.oxygen_saturation}%` : '—';
  } catch {
    ['detail-bp','detail-hr','detail-temp','detail-o2'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
  }

  // Appointments for last/next visit
  try {
    const appts = await sbFetch(
      `appointments?patient_id=eq.${patient.patient_id}&doctor_id=eq.${doctorRecord.doctor_id}&order=date.desc&limit=10`
    );
    const now      = new Date();
    const lastAppt = appts.find(a => new Date(a.date) <= now);
    const nextAppt = appts.find(a => new Date(a.date) >  now);
    document.getElementById('detail-last-visit').textContent = lastAppt ? formatDate(lastAppt.date) : '—';
    document.getElementById('detail-next-appt').textContent  = nextAppt ? formatDate(nextAppt.date) : '—';
  } catch {
    document.getElementById('detail-last-visit').textContent = '—';
    document.getElementById('detail-next-appt').textContent  = '—';
  }

  // User email/phone
  try {
    if (patient.user_id) {
      const userRows = await sbFetch(`users?id=eq.${patient.user_id}&select=email,phone`);
      const u = userRows[0] || {};
      document.getElementById('detail-email').textContent = u.email || '—';
      document.getElementById('detail-phone').textContent = patient.phone || u.phone || '—';
    }
  } catch {
    document.getElementById('detail-email').textContent = '—';
    document.getElementById('detail-phone').textContent = patient.phone || '—';
  }

  await renderMedicalHistory(patient.patient_id);
  await renderPrescriptions(patient.patient_id);
  fetchAISummary(patient);
}

// ── MEDICAL HISTORY (detail panel) ───────────────────────────
async function renderMedicalHistory(patientId) {
  const list = document.getElementById('history-list');
  list.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;">Loading…</p>';
  try {
    const [records, triageReports] = await Promise.all([
      fetchMedicalRecords(patientId),
      sbFetch(`ai_triage_reports?patient_id=eq.${patientId}&order=created_at.desc&limit=10`)
    ]);

    // Extract unique conditions from triage reports
    const conditions = new Set();
    triageReports.forEach(r => {
      try {
        const suggestion = typeof r.ai_suggestion === 'string'
          ? JSON.parse(r.ai_suggestion)
          : r.ai_suggestion;
        if (suggestion.vitals) {
          Object.entries(suggestion.vitals).forEach(([key, v]) => {
            if (v.status !== 'normal' && v.message) {
              // Extract condition name from message (e.g. "Tachycardia, heart rate is elevated" → "Tachycardia")
              const condition = v.message.split(',')[0].trim();
              if (condition.length < 40) conditions.add(condition);
            }
          });
        }
      } catch(e) {}
    });

    let html = '';

    // Show detected conditions banner if any
    if (conditions.size > 0) {
      html += `
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:9px;padding:12px 16px;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
            ⚠ AI-Detected Conditions
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${[...conditions].map(c => `
              <span style="font-size:11px;padding:3px 10px;border-radius:99px;background:#fef9c3;border:1px solid #fde047;color:#713f12;font-weight:500;">
                ${escapeHtml(c)}
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (records.length === 0 && conditions.size === 0) {
      list.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;">No records found.</p>';
      return;
    }

    html += records.map(r => `
      <div class="history-item">
        <div class="history-item-header">
          <strong>${escapeHtml(r.diagnosis || 'Record')}</strong>
          <span class="history-date">${formatDate(r.date_created)}</span>
        </div>
        <p>${formatRecordNotes(r.notes)}</p>
        ${r.body_location ? `<span class="history-doctor">Location: ${escapeHtml(r.body_location)}</span>` : ''}
      </div>
    `).join('');

    list.innerHTML = html;
  } catch (err) {
    list.innerHTML = '<p style="color:#dc2626;font-size:.82rem;">Could not load history.</p>';
  }
}

// ── PRESCRIPTIONS (detail panel) ─────────────────────────────
async function renderPrescriptions(patientId) {
  const list = document.getElementById('prescriptions-list');
  list.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;">Loading…</p>';
  try {
    const data = await fetchPrescriptions(patientId);
    if (data.length === 0) {
      list.innerHTML = '<p style="color:#9ca3af;font-size:.82rem;">No prescriptions found.</p>';
      return;
    }
    list.innerHTML = data.map(rx => `
      <div class="rx-item">
        <div class="rx-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </div>
        <div>
          <strong>${escapeHtml(rx.medicine)}</strong>
          <p>${escapeHtml(rx.dosage || '')}${rx.dosage && rx.instructions ? ' — ' : ''}${escapeHtml(rx.instructions || '')}</p>
          ${rx.pharmacy_name ? `<p style="font-size:.75rem;color:#9ca3af;">Pharmacy: ${escapeHtml(rx.pharmacy_name)}</p>` : ''}
        </div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p style="color:#dc2626;font-size:.82rem;">Could not load prescriptions.</p>';
  }
}

// ── AI SUMMARY ────────────────────────────────────────────────
async function fetchAISummary(patient) {
  const el = document.getElementById('ai-summary-text');
  const cacheKey = patient.patient_id;

  if (aiSummaryCache[cacheKey]) {
    el.innerHTML = aiSummaryCache[cacheKey];
    el.classList.remove('loading');
    return;
  }

  el.textContent = 'Loading AI clinical summary…';
  el.classList.add('loading');

  try {
    // Pull most recent approved triage report
    const reports = await sbFetch(
      `ai_triage_reports?patient_id=eq.${patient.patient_id}&status=eq.approved&order=created_at.desc&limit=1`
    );

    if (reports.length === 0) {
      // Fallback to any report if no approved one exists
      const anyReport = await sbFetch(
        `ai_triage_reports?patient_id=eq.${patient.patient_id}&order=created_at.desc&limit=1`
      );
      if (anyReport.length === 0) {
        el.textContent = 'No AI triage reports available for this patient yet.';
        el.classList.remove('loading');
        return;
      }
      reports.push(anyReport[0]);
    }

    const report = reports[0];
    const suggestion = typeof report.ai_suggestion === 'string'
      ? JSON.parse(report.ai_suggestion)
      : report.ai_suggestion;

    const statusColor = suggestion.overall_status === 'critical' ? '#dc2626'
                      : suggestion.overall_status === 'warning'  ? '#ca8a04'
                      : '#16a34a';

    const vitalsHTML = suggestion.vitals
      ? Object.entries(suggestion.vitals).map(([key, v]) => {
          const color = v.status === 'critical' ? '#dc2626'
                      : v.status === 'warning'  ? '#ca8a04'
                      : '#16a34a';
          return `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
            <span style="color:${color};font-size:10px;margin-top:2px;">●</span>
            <span style="font-size:12px;color:#6b7280;text-transform:capitalize;">${key.replace(/_/g,' ')}:</span>
            <span style="font-size:12px;color:#374151;">${v.message}</span>
          </div>`;
        }).join('')
      : '';

    const html = `
      <div style="margin-bottom:10px;">
        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:${statusColor}20;color:${statusColor};text-transform:uppercase;letter-spacing:0.05em;">
          ${suggestion.overall_status}
        </span>
        <span style="font-size:11px;color:#9ca3af;margin-left:8px;">${new Date(report.created_at).toLocaleDateString()}</span>
      </div>
      <p style="font-size:13px;color:#374151;margin-bottom:10px;line-height:1.6;">${suggestion.summary}</p>
      ${vitalsHTML}
      <div style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border-radius:8px;border-left:3px solid #0ea5e9;">
        <span style="font-size:11px;font-weight:600;color:#0ea5e9;">Recommendation: </span>
        <span style="font-size:12px;color:#374151;">${suggestion.recommendation}</span>
      </div>
    `;

    aiSummaryCache[cacheKey] = html;
    el.innerHTML = html;

  } catch (err) {
    console.error('AI summary error:', err);
    el.textContent = 'Could not load AI summary.';
  } finally {
    el.classList.remove('loading');
  }
}

// ── QUICK RECORD/RX FROM DETAIL PANEL ────────────────────────
document.getElementById('btn-quick-record').addEventListener('click', () => {
  switchTab('records');
  document.getElementById('record-form').style.display = 'block';
  if (currentPatient) {
    const sel = document.getElementById('rec-patient');
    if (sel) sel.value = currentPatient.patient_id;
  }
});

document.getElementById('btn-quick-rx').addEventListener('click', () => {
  switchTab('prescriptions');
  document.getElementById('rx-form').style.display = 'block';
  if (currentPatient) {
    const sel = document.getElementById('rx-patient');
    if (sel) sel.value = currentPatient.patient_id;
  }
});

// ── POPULATE PATIENT DROPDOWNS ───────────────────────────────
function populatePatientDropdowns() {
  ['rec-patient', 'rx-patient', 'records-filter-patient', 'rx-filter-patient'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const isFilter = id.includes('filter');
    sel.innerHTML = `<option value="">${isFilter ? 'All Patients' : '-- Select patient --'}</option>`;
    allPatients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.patient_id;
      opt.textContent = `${p.first_name} ${p.last_name}`;
      sel.appendChild(opt);
    });
  });
}

// ── MEDICAL RECORDS TAB ───────────────────────────────────────
function setupRecordsTab() {
  document.getElementById('btn-new-record').addEventListener('click', () => {
    const form = document.getElementById('record-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('rec-cancel').addEventListener('click', () => {
    document.getElementById('record-form').style.display = 'none';
    clearRecordForm();
  });
  document.getElementById('rec-save').addEventListener('click', saveRecord);
  document.getElementById('records-filter-patient').addEventListener('change', renderRecordsTab);
}

function clearRecordForm() {
  ['rec-patient','rec-diagnosis','rec-location','rec-treatment','rec-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function saveRecord() {
  const patientId = document.getElementById('rec-patient').value;
  const diagnosis = document.getElementById('rec-diagnosis').value.trim();
  const location  = document.getElementById('rec-location').value.trim();
  const treatment = document.getElementById('rec-treatment').value.trim();
  const notes     = document.getElementById('rec-notes').value.trim();

  if (!patientId || !diagnosis) {
    showToast('Please select a patient and enter a diagnosis.');
    return;
  }

  const btn = document.getElementById('rec-save');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    await sbPost('medical_records', {
      patient_id:    patientId,
      doctor_id:     doctorRecord.doctor_id,
      diagnosis,
      body_location: location || null,
      notes:         treatment ? `Treatment: ${treatment}${notes ? '\n' + notes : ''}` : (notes || null),
    });

    // Notify the patient via patient_notifications
    await sbPost('patient_notifications', {
      patient_id: patientId,
      message:    `📋 Dr. ${doctorRecord.first_name} ${doctorRecord.last_name} has added a new medical record: ${diagnosis}`,
      type:       'medical_record',
      is_read:    false,
    }).catch(() => {}); // non-blocking

    showToast('✓ Medical record saved and sent to patient');
    document.getElementById('record-form').style.display = 'none';
    clearRecordForm();
    renderRecordsTab();

    // Refresh detail panel if same patient
    if (currentPatient && currentPatient.patient_id === patientId) {
      renderMedicalHistory(patientId);
    }
  } catch (err) {
    showToast('Error saving record: ' + err.message);
  } finally {
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Save & Send to Patient`;
    btn.disabled = false;
  }
}

const PATIENT_COLORS = [
  { bg: '#eff6ff', border: '#bae6fd', text: '#1d4ed8', dot: '#3b82f6' },
  { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
  { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', dot: '#a855f7' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
  { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' },
  { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', dot: '#14b8a6' },
  { bg: '#fefce8', border: '#fde68a', text: '#92400e', dot: '#eab308' },
  { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', dot: '#8b5cf6' },
];

const expandedPatients = new Set();

async function renderRecordsTab() {
  const container = document.getElementById('records-tbody').closest('.table-card');
  const filterPt  = document.getElementById('records-filter-patient').value;

  container.innerHTML = `<div style="padding:24px;text-align:center;color:#9ca3af;">Loading…</div>`;

  try {
    const data = await fetchAllMyRecords(doctorRecord.doctor_id);
    const filtered = filterPt ? data.filter(r => r.patient_id === filterPt) : data;

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding:32px;text-align:center;color:#9ca3af;">No records found.</div>`;
      return;
    }

    // Group by patient
    const grouped = {};
    const patientOrder = [];
    filtered.forEach(r => {
      const pid = r.patient_id;
      if (!grouped[pid]) {
        grouped[pid] = { name: r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : '—', records: [] };
        patientOrder.push(pid);
      }
      grouped[pid].records.push(r);
    });

    let html = '<div style="display:flex;flex-direction:column;gap:12px;padding:16px;">';

    patientOrder.forEach((pid, idx) => {
      const group  = grouped[pid];
      const color  = PATIENT_COLORS[idx % PATIENT_COLORS.length];
      const latest = group.records[0];
      const extra  = group.records.slice(1);
      const isExpanded = expandedPatients.has(pid);

      html += `
        <div style="border:1.5px solid ${color.border};border-radius:12px;overflow:hidden;background:${color.bg};">
          
          <!-- Patient header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid ${color.border};">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${color.dot};flex-shrink:0;"></div>
              <strong style="font-size:.92rem;color:${color.text};">${escapeHtml(group.name)}</strong>
              <span style="font-size:.75rem;font-weight:600;padding:2px 9px;border-radius:99px;background:${color.dot}20;color:${color.text};">
                ${group.records.length} record${group.records.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <!-- Latest record always visible -->
          <div style="padding:14px 18px;">
            ${renderRecordRow(latest, color)}
          </div>

          <!-- Extra records collapsible -->
          ${extra.length > 0 ? `
            <div id="extra-${pid}" style="display:${isExpanded ? 'block' : 'none'};">
              ${extra.map(r => `<div style="padding:0 18px 14px;">${renderRecordRow(r, color)}</div>`).join('')}
            </div>
            <div style="padding:10px 18px;border-top:1px solid ${color.border};">
              <button onclick="togglePatientRecords('${pid}')" 
                style="background:none;border:none;color:${color.text};font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="chevron-${pid}" 
                  style="transform:${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};transition:transform .2s;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                ${isExpanded ? 'Show less' : `Show ${extra.length} more record${extra.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:20px;">Error: ${err.message}</div>`;
  }
}

function renderRecordRow(r, color) {
  return `
    <div style="background:white;border:1px solid ${color.border};border-radius:9px;padding:12px 14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <strong style="font-size:.88rem;color:#111827;">${escapeHtml(r.diagnosis || 'Record')}</strong>
        <span style="font-size:.75rem;color:#9ca3af;white-space:nowrap;margin-left:8px;">${formatDate(r.date_created)}</span>
      </div>
      ${r.body_location ? `<p style="font-size:.78rem;color:#6b7280;margin-bottom:4px;">📍 ${escapeHtml(r.body_location)}</p>` : ''}
      <p style="font-size:.82rem;color:#374151;line-height:1.5;">${formatRecordNotes(r.notes)}</p>
    </div>
  `;
}

function togglePatientRecords(pid) {
  if (expandedPatients.has(pid)) {
    expandedPatients.delete(pid);
  } else {
    expandedPatients.add(pid);
  }
  const extra   = document.getElementById(`extra-${pid}`);
  const chevron = document.getElementById(`chevron-${pid}`);
  const btn     = chevron?.closest('button');
  const isNowExpanded = expandedPatients.has(pid);

  if (extra)   extra.style.display        = isNowExpanded ? 'block' : 'none';
  if (chevron) chevron.style.transform    = isNowExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  if (btn) {
    const count = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="chevron-${pid}"
        style="transform:${isNowExpanded ? 'rotate(180deg)' : 'rotate(0deg)'};transition:transform .2s;">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
      ${isNowExpanded ? 'Show less' : `Show ${count} more record${count !== 1 ? 's' : ''}`}
    `;
  }
}
// ── PRESCRIPTIONS TAB ─────────────────────────────────────────
function setupPrescriptionsTab() {
  document.getElementById('btn-new-rx').addEventListener('click', () => {
    const form = document.getElementById('rx-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('rx-cancel').addEventListener('click', () => {
    document.getElementById('rx-form').style.display = 'none';
    clearRxForm();
  });
  document.getElementById('rx-save').addEventListener('click', saveRx);
  document.getElementById('rx-filter-patient').addEventListener('change', renderPrescriptionsTab);
}

function clearRxForm() {
  ['rx-patient','rx-medicine','rx-dosage','rx-pharmacy','rx-instructions'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function saveRx() {
  const patientId    = document.getElementById('rx-patient').value;
  const medicine     = document.getElementById('rx-medicine').value.trim();
  const dosage       = document.getElementById('rx-dosage').value.trim();
  const pharmacy     = document.getElementById('rx-pharmacy').value.trim();
  const instructions = document.getElementById('rx-instructions').value.trim();

  if (!patientId || !medicine) {
    showToast('Please select a patient and enter a medication name.');
    return;
  }

  const btn = document.getElementById('rx-save');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  try {
    await sbPost('prescriptions', {
      patient_id:    patientId,
      doctor_id:     doctorRecord.doctor_id,
      medicine,
      dosage:        dosage       || null,
      instructions:  instructions || null,
      pharmacy_name: pharmacy     || null,
      date_issued:   new Date().toISOString().split('T')[0],
    });

    // Notify patient
    await sbPost('patient_notifications', {
      patient_id: patientId,
      message:    `💊 Dr. ${doctorRecord.first_name} ${doctorRecord.last_name} has issued a prescription for: ${medicine}${dosage ? ' — ' + dosage : ''}`,
      type:       'prescription',
      is_read:    false,
    }).catch(() => {});

    showToast('✓ Prescription issued and sent to patient');
    document.getElementById('rx-form').style.display = 'none';
    clearRxForm();
    renderPrescriptionsTab();

    if (currentPatient && currentPatient.patient_id === patientId) {
      renderPrescriptions(patientId);
    }
  } catch (err) {
    showToast('Error issuing prescription: ' + err.message);
  } finally {
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg> Issue & Send to Patient`;
    btn.disabled = false;
  }
}

async function renderPrescriptionsTab() {
  const tbody    = document.getElementById('rx-tbody');
  const filterPt = document.getElementById('rx-filter-patient').value;
  tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Loading…</td></tr>`;
  try {
    const data     = await fetchAllMyPrescriptions(doctorRecord.doctor_id);
    const filtered = filterPt ? data.filter(r => r.patient_id === filterPt) : data;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">No prescriptions found.</td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map(rx => {
      const patName = rx.patients ? `${rx.patients.first_name} ${rx.patients.last_name}` : '—';
      return `
        <tr>
          <td><strong>${escapeHtml(patName)}</strong></td>
          <td>${escapeHtml(rx.medicine)}</td>
          <td>${escapeHtml(rx.dosage || '—')}</td>
          <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(rx.instructions || '—')}</td>
          <td>${escapeHtml(rx.pharmacy_name || '—')}</td>
          <td>${formatDate(rx.date_issued)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626;padding:20px;">Error: ${err.message}</td></tr>`;
  }
}

// ── PATIENT REQUESTS TAB ──────────────────────────────────────
function setupRequestsTab() {
  document.getElementById('btn-refresh-requests').addEventListener('click', renderRequestsTab);
}

function getRequestBadge(type) {
  const map = {
    refill_request:      { cls: 'req-refill',  label: '💊 Refill Request' },
    patient_message:     { cls: 'req-message', label: '💬 Message' },
    certificate_request: { cls: 'req-cert',    label: '📋 Certificate Request' },
    new_appointment:     { cls: 'req-appt',    label: '📅 Appointment Request' },
  };
  return map[type] || { cls: 'req-default', label: type || 'Request' };
}

async function renderRequestsTab() {
  const container = document.getElementById('requests-list');
  container.innerHTML = '<div class="loading-cell" style="padding:32px;text-align:center;color:#9ca3af;">Loading requests…</div>';

  try {
    const [active, resolved] = await Promise.all([
      fetchPatientRequests(),
      sbFetch(`doctor_notifications?type=in.(refill_request,patient_message,certificate_request,new_appointment)&is_read=eq.true&or=(doctor_id.eq.${doctorRecord?.doctor_id},doctor_id.is.null)&order=created_at.desc&limit=20`)
    ]);

    if ((!active || active.length === 0) && (!resolved || resolved.length === 0)) {
      container.innerHTML = `
        <div style="text-align:center;padding:56px;color:#9ca3af;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" style="margin-bottom:12px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <p style="font-size:.9rem;">No patient requests at this time.</p>
        </div>`;
      return;
    }

    let html = '';

    // Active requests
    if (active && active.length > 0) {
      html += `<div style="font-size:.78rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;padding:4px 0 12px;">
        Active Requests (${active.length})
      </div>`;
      html += active.map(req => renderRequestCard(req, false)).join('');
    } else {
      html += `<div style="padding:20px;text-align:center;color:#9ca3af;font-size:.87rem;background:#f9fafb;border-radius:10px;margin-bottom:16px;">
        No active requests
      </div>`;
    }

    // Resolved requests
    if (resolved && resolved.length > 0) {
      html += `<div style="font-size:.78rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;padding:16px 0 12px;margin-top:8px;border-top:1px solid #f3f4f6;">
        Resolved (${resolved.length})
      </div>`;
      html += resolved.map(req => renderRequestCard(req, true)).join('');
    }

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color:#dc2626;padding:24px;">Error loading requests: ${err.message}</div>`;
  }

  renderStats();
}

function renderRequestCard(req, isResolved) {
  const badge = getRequestBadge(req.type);
  return `
    <div class="request-card" id="req-${req.id}" style="${!isResolved ? 'border-left:3px solid #0ea5e9;' : 'opacity:0.6;'}">
      <div class="request-card-header">
        <div>
          <div class="request-patient-name">${escapeHtml(req.title || 'Patient Request')}</div>
          <div class="request-time">${timeAgo(req.created_at)}</div>
        </div>
        <span class="request-type-badge ${badge.cls}">${badge.label}</span>
      </div>
      <p class="request-message">${escapeHtml(req.message)}</p>
      <div class="request-actions">
        ${!isResolved ? `
        <button class="req-btn-resolve" onclick="resolveRequest('${req.id}')">
          ✓ Mark Resolved
        </button>` : `
        <span style="font-size:.78rem;color:#16a34a;font-weight:600;">✓ Resolved</span>
        `}
        ${!isResolved && (req.type === 'refill_request' || req.type === 'patient_message') ? `
        <button class="req-btn-rx" onclick="switchTab('prescriptions')">
          + Issue Prescription
        </button>` : ''}
        ${!isResolved && (req.type === 'certificate_request' || req.type === 'patient_message') ? `
        <button class="req-btn-record" onclick="switchTab('records')">
          + Add Record
        </button>` : ''}
      </div>
    </div>
  `;
}

async function resolveRequest(notificationId) {
  try {
    await sbPatch(
      `doctor_notifications?id=eq.${notificationId}`,
      { is_read: true }
    );
    const card = document.getElementById(`req-${notificationId}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transition = 'opacity .3s';
      setTimeout(() => card.remove(), 300);
    }
    showToast('✓ Request marked as resolved');
    renderStats();
  } catch (err) {
    showToast('Error: ' + err.message);
  }
}

function quickRxFromRequest(patientId) {
  switchTab('prescriptions');
  document.getElementById('rx-form').style.display = 'block';
  const sel = document.getElementById('rx-patient');
  if (sel) sel.value = patientId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quickRecordFromRequest(patientId) {
  switchTab('records');
  document.getElementById('record-form').style.display = 'block';
  const sel = document.getElementById('rec-patient');
  if (sel) sel.value = patientId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAnatomyForm() {
  const sel = document.getElementById('body-part-select');
  const txt = document.getElementById('anatomy-note-text');
  if (sel) sel.value = '';
  if (txt) txt.value = '';
}

// ── ANATOMY TAB ───────────────────────────────────────────────
function renderAnatomyTab() {
  if (!currentPatient && allPatients.length > 0) {
    currentPatient = allPatients[0];
  }
  if (!currentPatient) {
    document.getElementById('anatomy-patient-name').textContent = 'no patient selected';
    document.getElementById('anatomy-viewer-name').textContent  = 'No patient selected';
    document.getElementById('anatomy-notes-list').innerHTML = '<p class="anatomy-no-notes">Select a patient from the Patients tab first.</p>';
    document.getElementById('anatomy-note-count').textContent = '0';
    return;
  }
  const name = `${currentPatient.first_name} ${currentPatient.last_name}`;
  document.getElementById('anatomy-patient-name').textContent = name;
  document.getElementById('anatomy-viewer-name').textContent  = name;
  clearAnatomyForm();
  renderAnatomyNotes(currentPatient.patient_id);
}

document.getElementById('anatomy-save-btn').addEventListener('click', async () => {
  const p    = currentPatient;
  const part = document.getElementById('body-part-select')?.value;
  const note = document.getElementById('anatomy-note-text').value.trim();

  if (!p)        { showToast('Please select a patient first.'); return; }
  if (!part)     { showToast('Please select a body part.'); return; }
  if (!note)     { showToast('Please enter a note.'); return; }

  try {
    await sbPost('medical_records', {
      patient_id:    p.patient_id,
      doctor_id:     doctorRecord.doctor_id,
      diagnosis:     `Anatomical note — ${part}`,
      body_location: part,
      notes:         note,
    });

    // Notify patient
    await sbPost('patient_notifications', {
      patient_id: p.patient_id,
      message:    `📋 Dr. ${doctorRecord.first_name} ${doctorRecord.last_name} added a clinical note for: ${part}`,
      type:       'medical_record',
      is_read:    false,
    }).catch(() => {});

    if (!anatomyNotes[p.patient_id]) anatomyNotes[p.patient_id] = [];
    anatomyNotes[p.patient_id].push({ part, note, timestamp: new Date().toLocaleString() });
    clearAnatomyForm();
    renderAnatomyNotes(p.patient_id);
    showToast('✓ Note saved to patient record');
  } catch (err) {
    showToast('Error saving note: ' + err.message);
  }
});

async function renderAnatomyNotes(patientId) {
  const list  = document.getElementById('anatomy-notes-list');
  const count = document.getElementById('anatomy-note-count');
  list.innerHTML = '<p class="anatomy-no-notes" style="color:#9ca3af;font-size:.82rem;">Loading...</p>';

  try {
    const records = await sbFetch(
      `medical_records?patient_id=eq.${patientId}&diagnosis=like.Anatomical note*&order=date_created.desc`
    );

    if (count) count.textContent = records.length;

    if (records.length === 0) {
      list.innerHTML = '<p class="anatomy-no-notes">No notes recorded yet</p>';
      return;
    }

    const PREVIEW_COUNT = 3;
    const preview  = records.slice(0, PREVIEW_COUNT);
    const overflow = records.slice(PREVIEW_COUNT);
    const hasMore  = overflow.length > 0;

    function renderNoteCard(r, hidden = false) {
      const part = r.body_location || r.diagnosis?.replace('Anatomical note — ', '') || 'Unknown';
      const date = formatDate(r.date_created);
      return `
        <div class="anatomy-note-entry" id="anote-${r.record_id}" style="${hidden ? 'display:none;' : ''}position:relative;">
          <button onclick="deleteAnatomyNote('${r.record_id}', '${patientId}')"
            title="Delete note"
            style="position:absolute;top:6px;right:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:3px 7px;cursor:pointer;color:#dc2626;font-size:11px;font-weight:700;line-height:1;display:flex;align-items:center;gap:3px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete
          </button>
          <div class="anatomy-note-part" style="padding-right:56px;">${escapeHtml(part)}</div>
          <p style="padding-right:56px;">${escapeHtml(r.notes || '—')}</p>
          <small>${date}</small>
        </div>
      `;
    }

    let html = preview.map(r => renderNoteCard(r)).join('');

    if (hasMore) {
      html += overflow.map(r => renderNoteCard(r, true)).join('');
      html += `
      <button id="anatomy-show-more-btn" onclick="toggleAnatomyOverflow()"
        style="width:100%;margin-top:8px;padding:8px;background:none;border:1.5px dashed #d1d5db;border-radius:8px;color:#6b7280;font-size:.8rem;font-weight:600;cursor:pointer;font-family:inherit;">
        Show more ▾
      </button>
    `;
    }

    list.innerHTML = html;

  } catch (err) {
    list.innerHTML = '<p style="color:#dc2626;font-size:.82rem;">Could not load notes.</p>';
  }
}

function toggleAnatomyOverflow() {
  const btn     = document.getElementById('anatomy-show-more-btn');
  const entries = document.querySelectorAll('.anatomy-note-entry');
  const expanded = [...entries].some(e => e.style.display === 'none');

  [...entries].forEach((e, i) => {
    if (i >= 3) e.style.display = expanded ? '' : 'none';
  });
  btn.textContent = expanded ? 'Show less ▴' : 'Show more ▾';
}

async function deleteAnatomyNote(recordId, patientId) {
  if (!confirm('Delete this anatomy note?')) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/medical_records?record_id=eq.${recordId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
    });
    console.log('Delete status:', res.status);
    const text = await res.text();
    console.log('Delete response:', text);

    if (!res.ok) throw new Error(`${res.status} — ${text}`);

    const card = document.getElementById(`anote-${recordId}`);
    if (card) {
      card.style.transition = 'opacity .25s, transform .25s';
      card.style.opacity    = '0';
      card.style.transform  = 'translateX(10px)';
      setTimeout(() => card.remove(), 250);
    }
    const count = document.getElementById('anatomy-note-count');
    if (count) count.textContent = Math.max(0, parseInt(count.textContent) - 1);
    showToast('✓ Note deleted');
  } catch (err) {
    showToast('Error deleting note: ' + err.message);
    console.error('Delete error:', err);
  }
}

// ── APPOINTMENTS TAB ──────────────────────────────────────────
async function renderAppointments() {
  const tbody = document.getElementById('appointments-tbody');
  tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">Loading…</td></tr>`;
  try {
    const data = await fetchAllMyAppointments(doctorRecord.doctor_id);
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-cell">No appointments found.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(a => {
      const patientName = a.patients
        ? `${a.patients.first_name} ${a.patients.last_name}` : '—';
      const status      = a.status || 'scheduled';
      const statusClass = {
        completed: 'status-completed',
        pending:   'status-pending',
        cancelled: 'status-cancelled',
      }[status] || 'status-scheduled';

      return `
        <tr>
          <td><strong>${escapeHtml(patientName)}</strong></td>
          <td>${a.date || '—'}</td>
          <td>${a.time ? String(a.time).slice(0,5) : '—'}</td>
          <td><span class="appt-status ${statusClass}">${capitalize(status)}</span></td>
          <td style="max-width:160px;font-size:.82rem;color:#6b7280;">${escapeHtml(a.notes || '—')}</td>
          <td>
            <button class="view-patient-btn" onclick="jumpToPatient('${escapeHtml(patientName)}')">
              View Patient
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626;padding:20px;">Error: ${err.message}</td></tr>`;
  }
}

function jumpToPatient(name) {
  const p = allPatients.find(p =>
    `${p.first_name} ${p.last_name}` === name
  );
  if (p) {
    switchTab('patients');
    document.querySelectorAll('.patient-card').forEach(c =>
      c.classList.toggle('active', c.dataset.patientId === p.patient_id)
    );
    showDetails(p);
  } else {
    showToast(`${name} is not in your patient list.`);
  }
}

// ── CLINIC MAP (Google Maps — same pattern as patient.js) ────
let doctorMapInstance = null;
let allDocFacilities  = [];
let docMapFilter      = 'nearest';

document.querySelectorAll('.map-filter-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    docMapFilter = btn.dataset.filter;
    document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDocFacilityList(allDocFacilities);
  })
);

async function initDoctorMap() {
  const mapCanvas    = document.getElementById('doctor-google-map');
  const loadingState = document.getElementById('map-loading-state');
  const errorState   = document.getElementById('map-error-state');

  if (!mapCanvas) return;

  if (loadingState) loadingState.style.display = 'flex';
  if (errorState)   errorState.style.display   = 'none';

  try {
    // Step 1 — get API key from your Vercel backend (same endpoint as patient page)
    const keyRes  = await fetch('https://sabyoni-devs-med-intel.vercel.app/api/maps-config');
    const keyData = await keyRes.json();
    const apiKey  = keyData.key;
    if (!apiKey) throw new Error('Maps API key not configured');

    // Step 2 — load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsScript(apiKey);
    }

    // Step 3 — get user location
    const position = await getUserLocation();
    const userLat  = position.coords.latitude;
    const userLng  = position.coords.longitude;

    // Step 4 — hide loader, init map
    if (loadingState) loadingState.style.display = 'none';

    doctorMapInstance = new window.google.maps.Map(mapCanvas, {
      center:            { lat: userLat, lng: userLng },
      zoom:              14,
      mapId:             'DEMO_MAP_ID',
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    // Step 5 — user location marker
    const userDot = document.createElement('div');
    userDot.style.cssText = 'width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,.5);';
    new window.google.maps.marker.AdvancedMarkerElement({
      position: { lat: userLat, lng: userLng },
      map:      doctorMapInstance,
      title:    'Your Location',
      content:  userDot,
    });

    // Step 6 — search nearby places
    const placesLib = await window.google.maps.importLibrary('places');
    const Place     = placesLib.Place;

    const response = await Place.searchNearby({
      fields: ['displayName','location','rating','userRatingCount','formattedAddress','types','regularOpeningHours','id'],
      locationRestriction: { center: { lat: userLat, lng: userLng }, radius: 5000 },
      includedPrimaryTypes: ['hospital', 'pharmacy', 'doctor'],
      maxResultCount: 12,
    });

    if (response && response.places && response.places.length > 0) {
      allDocFacilities = response.places;
      addDocFacilityMarkers(response.places, doctorMapInstance);
      renderDocFacilityList(response.places);
      document.getElementById('map-result-title').textContent  = 'Facilities Near You';
      document.getElementById('map-result-count').textContent  = `${response.places.length} facilities found`;
    } else {
      document.getElementById('map-result-title').textContent = 'No facilities found nearby';
      document.getElementById('map-result-count').textContent = 'Try expanding your search area';
      document.getElementById('doctor-facility-list').innerHTML =
        '<div style="padding:28px;color:#9ca3af;text-align:center;grid-column:1/-1;">No clinics or pharmacies found within 5km.</div>';
    }

  } catch (err) {
    console.error('initDoctorMap error:', err);
    if (loadingState) loadingState.style.display = 'none';
    const errorState  = document.getElementById('map-error-state');
    const errorMsg    = document.getElementById('map-error-msg');
    if (errorState) errorState.style.display = 'block';
    if (errorMsg)   errorMsg.textContent     = err.message || 'Could not load map. Please try again.';
  }
}

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gmaps-script')) { resolve(); return; }
    const script    = document.createElement('script');
    script.id       = 'gmaps-script';
    script.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async&v=weekly`;
    script.async    = true;
    script.defer    = true;
    script.onload   = resolve;
    script.onerror  = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () =>
      reject(new Error('Location access denied — please enable location services')),
      { timeout: 10000 }
    );
  });
}

function addDocFacilityMarkers(places, map) {
  places.forEach(place => {
    const types = place.types || [];
    const color = types.includes('pharmacy') ? '#16a34a'
                : types.includes('hospital') ? '#ef4444'
                : '#3b82f6';

    const dot = document.createElement('div');
    dot.style.cssText = `width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.3);cursor:pointer;`;

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      position: place.location,
      map,
      title:   place.displayName,
      content: dot,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="font-family:inherit;padding:4px;max-width:200px;">
        <strong style="font-size:13px;color:#111827;">${place.displayName || ''}</strong>
        ${place.formattedAddress ? `<p style="font-size:12px;color:#6b7280;margin:4px 0 0;">${place.formattedAddress}</p>` : ''}
        ${place.rating ? `<p style="font-size:12px;color:#f59e0b;margin:4px 0 0;">★ ${place.rating}</p>` : ''}
      </div>`,
    });

    marker.addListener('gmp-click', () => infoWindow.open(map, marker));
  });
}

function renderDocFacilityList(places) {
  const container = document.getElementById('doctor-facility-list');
  if (!container || !places) return;

  let sorted = [...places];
  if (docMapFilter === 'toprated') {
    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  sorted = sorted.slice(0, 6);

  if (sorted.length === 0) {
    container.innerHTML = '<div style="padding:28px;color:#9ca3af;text-align:center;grid-column:1/-1;">No facilities found.</div>';
    return;
  }

  container.innerHTML = sorted.map(place => {
    const types     = place.types || [];
    const typeLabel = types.includes('pharmacy') ? 'Pharmacy'
                    : types.includes('hospital') ? 'Hospital'
                    : 'Medical Facility';
    const tagCls    = types.includes('pharmacy') ? 'prox-nearby'
                    : types.includes('hospital') ? 'prox-far'
                    : 'prox-close';

    let isOpen = null;
    try {
      if (place.regularOpeningHours) {
        isOpen = place.regularOpeningHours.isOpen ? place.regularOpeningHours.isOpen() : null;
      }
    } catch(e) { isOpen = null; }

    const lat = place.location.lat();
    const lng = place.location.lng();
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.id || ''}&travelmode=driving`;

    const starsHtml = place.rating ? (() => {
      const full = Math.floor(place.rating);
      const half = place.rating % 1 >= 0.5;
      let html = '<div style="display:flex;align-items:center;gap:2px;margin:5px 0;">';
      for (let i = 0; i < 5; i++) {
        const fill = i < full ? '#f59e0b' : (i === full && half ? '#f59e0b' : '#e5e7eb');
        const op   = i === full && half ? '0.5' : '1';
        html += `<svg width="11" height="11" viewBox="0 0 24 24" fill="${fill}" opacity="${op}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      html += `<span style="font-size:11px;color:#6b7280;margin-left:4px;">${place.rating.toFixed(1)}`;
      if (place.userRatingCount) html += ` (${place.userRatingCount})`;
      html += '</span></div>';
      return html;
    })() : '';

    return `
      <div class="facility-card" style="cursor:pointer;" onclick="focusDocMapPlace(${lat},${lng})">
        <div class="facility-card-header">
          <div>
            <h4>${place.displayName || 'Unknown'}</h4>
            <span class="facility-proximity ${tagCls}" style="font-size:.7rem;">${typeLabel}</span>
          </div>
          ${isOpen !== null
            ? `<span style="font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:99px;background:${isOpen ? '#dcfce7' : '#fee2e2'};color:${isOpen ? '#166534' : '#b91c1c'};">${isOpen ? '● Open' : '● Closed'}</span>`
            : ''}
        </div>
        ${starsHtml}
        ${place.formattedAddress
          ? `<p class="facility-info">
               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
               ${place.formattedAddress}
             </p>` : ''}
        <a class="facility-tag" href="${directionsUrl}" target="_blank" rel="noopener noreferrer"
           onclick="event.stopPropagation()"
           style="display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:#eff6ff;color:#1d4ed8;padding:4px 10px;border-radius:99px;font-size:.75rem;font-weight:600;text-decoration:none;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Get Directions
        </a>
      </div>
    `;
  }).join('');
}

function focusDocMapPlace(lat, lng) {
  if (!doctorMapInstance) return;
  doctorMapInstance.panTo({ lat, lng });
  doctorMapInstance.setZoom(16);
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
async function renderNotifications() {
  if (!sessionUser) return;
  const notifications = await fetchNotifications(sessionUser.id);
  const unread = notifications.filter(n => !n.is_read).length;

  const badge = document.getElementById('notif-count');
  badge.textContent   = unread;
  badge.style.display = unread > 0 ? 'inline' : 'none';

  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;

  const typeIcon  = { urgent: '🚨', warning: '⚠️', success: '✅', info: '💬' };
  const typeColor = { urgent: '#dc2626', warning: '#ca8a04', success: '#16a34a', info: '#0ea5e9' };

  const items = notifications.length === 0
    ? `<div style="padding:32px 20px;text-align:center;color:#9ca3af;"><div style="font-size:28px;margin-bottom:8px;">🔔</div><div style="font-size:14px;">No notifications yet</div></div>`
    : notifications.map(n => {
        const icon  = typeIcon[n.type]  || '💬';
        const color = typeColor[n.type] || '#6b7280';
        const bg    = n.is_read ? '#fff' : '#f8faff';
        return `
          <div style="display:flex;gap:12px;padding:14px 20px;border-bottom:1px solid #f3f4f6;background:${bg};cursor:pointer;"
               onclick="markOneNotifRead('${n.id}')">
            <div style="font-size:20px;flex-shrink:0;margin-top:2px;">${icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;color:#111827;font-weight:${n.is_read ? '400' : '600'};margin-bottom:2px;">${escapeHtml(n.title || '')}</div>
              <div style="font-size:12px;color:#6b7280;line-height:1.45;">${escapeHtml(n.message || '')}</div>
              <div style="font-size:11px;color:#9ca3af;margin-top:4px;">${timeAgo(n.created_at)}</div>
            </div>
            ${!n.is_read ? `<div style="width:8px;height:8px;border-radius:99px;background:${color};flex-shrink:0;margin-top:6px;"></div>` : ''}
          </div>
        `;
      }).join('');

  dropdown.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #f3f4f6;">
      <div style="font-size:15px;font-weight:700;color:#111827;">Notifications</div>
      <div style="display:flex;gap:10px;">
        ${unread > 0 ? `<button onclick="markAllNotifsRead()" style="font-size:12px;color:#0ea5e9;background:none;border:none;cursor:pointer;font-weight:600;">Mark all read</button>` : ''}
        <button onclick="clearAllNotifs()" style="font-size:12px;color:#dc2626;background:none;border:none;cursor:pointer;font-weight:600;">Clear all</button>
      </div>
    </div>
    <div style="max-height:380px;overflow-y:auto;">${items}</div>
  `;
}

function toggleNotifications() {
  notificationsOpen = !notificationsOpen;
  const dropdown = document.getElementById('notif-dropdown');
  dropdown.style.display = notificationsOpen ? 'block' : 'none';
  if (notificationsOpen) renderNotifications();
}

async function markOneNotifRead(id) {
  await sbPatch(`doctor_notifications?id=eq.${id}`, { is_read: true }).catch(() => {});
  renderNotifications();
}

async function markAllNotifsRead() {
  if (!doctorRecord) return;
  await sbPatch(
    `doctor_notifications?doctor_id=eq.${doctorRecord.doctor_id}&is_read=eq.false`,
    { is_read: true }
  ).catch(() => {});
  renderNotifications();
}

async function clearAllNotifs() {
  if (!confirm('Clear all notifications?') || !doctorRecord) return;
  await sbDelete(`doctor_notifications?doctor_id=eq.${doctorRecord.doctor_id}`).catch(() => {});
  renderNotifications();
}

document.addEventListener('click', e => {
  const dropdown = document.getElementById('notif-dropdown');
  const btn      = document.getElementById('notif-btn');
  if (notificationsOpen && dropdown && btn &&
      !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = 'none';
    notificationsOpen = false;
  }
});

// ── SETTINGS SUB-TABS ─────────────────────────────────────────
document.querySelectorAll('.settings-subtab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-subtab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`stab-${btn.dataset.stab}`);
    if (target) target.style.display = 'block';
    if (btn.dataset.stab === 'preferences')   loadDoctorPreferences();
    if (btn.dataset.stab === 'notifications') loadDoctorPreferences();
  });
});

// ── DARK MODE TOGGLE (live) ───────────────────────────────────
document.getElementById('dark-mode-toggle').addEventListener('change', function() {
  document.body.classList.toggle('dark-mode', this.checked);
  localStorage.setItem('medintel_doctor_dark_mode', this.checked);
});

// ── DOCTOR PREFERENCES (Supabase) ────────────────────────────
let doctorPreferences = null;

async function loadDoctorPreferences() {
  if (!doctorRecord) return;
  try {
    const data = await sbFetch(
      `doctor_preferences?doctor_id=eq.${doctorRecord.doctor_id}&limit=1`
    );

    if (!data || data.length === 0) {
      // Create default row
      const inserted = await sbPost('doctor_preferences', {
        doctor_id:           doctorRecord.doctor_id,
        dark_mode:           false,
        language:            'English',
        timezone:            'Johannesburg (SAST)',
        email_notifications: true,
        sms_notifications:   false,
        request_alerts:      true,
      });
      doctorPreferences = Array.isArray(inserted) ? inserted[0] : inserted;
    } else {
      doctorPreferences = data[0];
    }

    applyDoctorPreferences(doctorPreferences);
  } catch (err) {
    console.error('loadDoctorPreferences error:', err);
  }
}

function applyDoctorPreferences(prefs) {
  if (!prefs) return;

  // Dark mode
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) darkToggle.checked = prefs.dark_mode || false;
  document.body.classList.toggle('dark-mode', prefs.dark_mode || false);
  localStorage.setItem('medintel_doctor_dark_mode', prefs.dark_mode || false);

  // Language — only English allowed, keep select locked
  const langSelect = document.getElementById('pref-language');
  if (langSelect) langSelect.value = 'English';

  // Timezone
  const tzSelect = document.getElementById('pref-timezone');
  if (tzSelect && prefs.timezone) tzSelect.value = prefs.timezone;

  // Notification toggles
  const emailToggle   = document.getElementById('notif-email-toggle');
  const smsToggle     = document.getElementById('notif-sms-toggle');
  const requestToggle = document.getElementById('notif-request-toggle');
  if (emailToggle)   emailToggle.checked   = prefs.email_notifications !== false;
  if (smsToggle)     smsToggle.checked     = prefs.sms_notifications   || false;
  if (requestToggle) requestToggle.checked = prefs.request_alerts      !== false;
}

async function saveDoctorPreferences() {
  if (!doctorRecord) return;

  const darkMode  = document.getElementById('dark-mode-toggle')?.checked || false;
  const timezone  = document.getElementById('pref-timezone')?.value || 'Johannesburg (SAST)';

  const btn = document.getElementById('save-pref-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    await sbPatch(
      `doctor_preferences?doctor_id=eq.${doctorRecord.doctor_id}`,
      {
        dark_mode:  darkMode,
        language:   'English',
        timezone:   timezone,
        updated_at: new Date().toISOString(),
      }
    );

    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('medintel_doctor_dark_mode', darkMode);
    showToast('✓ Preferences saved');
  } catch (err) {
    showToast('Error saving preferences: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Preferences'; }
  }
}

async function saveDoctorNotifPreferences() {
  if (!doctorRecord) return;

  const emailNotif   = document.getElementById('notif-email-toggle')?.checked   ?? true;
  const smsNotif     = document.getElementById('notif-sms-toggle')?.checked     ?? false;
  const requestAlert = document.getElementById('notif-request-toggle')?.checked ?? true;

  const btn = document.getElementById('save-notif-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    await sbPatch(
      `doctor_preferences?doctor_id=eq.${doctorRecord.doctor_id}`,
      {
        email_notifications: emailNotif,
        sms_notifications:   smsNotif,
        request_alerts:      requestAlert,
        updated_at:          new Date().toISOString(),
      }
    );
    showToast('✓ Notification preferences saved');
  } catch (err) {
    showToast('Error saving notification preferences: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Preferences'; }
  }
}

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const name  = document.getElementById('profile-name').value.trim();
  const phone = document.getElementById('profile-phone').value.trim();
  const spec  = document.getElementById('profile-specialization').value.trim();
  if (!name) { showToast('Name cannot be empty.'); return; }

  try {
    const parts     = name.replace(/^Dr\.?\s*/i, '').split(' ');
    const firstName = parts[0] || '';
    const lastName  = parts.slice(1).join(' ') || '';

    await sbPatch(`doctors?doctor_id=eq.${doctorRecord.doctor_id}`, {
      first_name:     firstName,
      last_name:      lastName,
      specialization: spec || null,
    });
    showToast('✓ Profile updated successfully');
    document.getElementById('doctor-name').textContent = name;
  } catch (err) {
    showToast('Error saving profile: ' + err.message);
  }
});

// ── HEADER BUTTONS ────────────────────────────────────────────
document.getElementById('notif-btn').addEventListener('click', e => {
  e.stopPropagation();
  toggleNotifications();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  if (typeof sessionLogout === 'function') {
    sessionLogout();
  } else {
    sessionStorage.removeItem('medintel_user');
    window.location.href = 'login.html';
  }
});

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  sessionUser = loadSession();
  if (!sessionUser) {
    window.location.href = 'login.html';
    return;
  }

  applySessionToHeader();

  try {
    doctorRecord = await fetchDoctorRecord(sessionUser.id);
    if (!doctorRecord) {
      console.warn('No doctor record found for this user ID.');
      // Still render with empty state so page doesn't break
    } else {
      // Fill specialization in settings
      const specInput = document.getElementById('profile-specialization');
      if (specInput && doctorRecord.specialization) {
        specInput.value = doctorRecord.specialization;
      }
    }

    allPatients = doctorRecord
      ? await fetchMyPatients(doctorRecord.doctor_id)
      : [];

    populatePatientDropdowns();
    renderQueue(allPatients);

    if (doctorRecord) {
      await renderStats();
    }

    await renderNotifications();

    setupRecordsTab();
    setupPrescriptionsTab();
    setupRequestsTab();

    // Apply dark mode immediately from localStorage to prevent flash
    const savedDark = localStorage.getItem('medintel_doctor_dark_mode');
    if (savedDark === 'true') document.body.classList.add('dark-mode');

    // Load preferences in background
    if (doctorRecord) loadDoctorPreferences();

    switchTab('patients');

    // Auto-refresh every 30s
    setInterval(() => {
      renderNotifications();
      renderStats();
    }, 30000);

  } catch (err) {
    console.error('Init error:', err);
    showToast('Error loading dashboard: ' + err.message);
  }
}

init();