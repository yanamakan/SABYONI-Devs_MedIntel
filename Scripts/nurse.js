// ======== SUPABASE CONFIG ========
const SUPABASE_URL = "https://epuphcvapnqngdwgwpyu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXBoY3ZhcG5xbmdkd2d3cHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5Mjg4MDUsImV4cCI6MjA4OTUwNDgwNX0.1sdd1YzWfh0KbSENK8oZJ-iMHlrcjeKMcFCfFjRgXZ4";

// ======== SUPABASE FETCHERS ========
async function fetchPatients() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/patients?select=patient_id,first_name,last_name,at_risk,risk_reason`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
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
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

// ======== PATIENTS DATA (kept for modals) ========
let patients = [];
let currentVitals = {};
let activePatientId = null;

// ======== RENDER VITALS LIST ========
async function renderVitalsList() {
  const list = document.getElementById('vitals-list');
  list.innerHTML = '<div style="padding:20px;color:#6b7280;">Loading patients...</div>';

  try {
    patients = await fetchPatients();

    if (!patients || patients.length === 0) {
      list.innerHTML = '<div style="padding:20px;color:#6b7280;">No patients found.</div>';
      return;
    }

    const vitalsArray = await Promise.all(
      patients.map(p => fetchLatestVitals(p.patient_id))
    );

    // Store current vitals for modal use
    patients.forEach((p, i) => {
      const v = vitalsArray[i];
      currentVitals[p.patient_id] = v ? {
        bp: `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`,
        hr: v.heart_rate,
        temp: v.temperature,
        o2: v.oxygen_saturation
      } : { bp: '--', hr: '--', temp: '--', o2: '--' };
    });

    const waveIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
    const docIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    const octaviaIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`;

    list.innerHTML = patients.map((p, i) => {
      const v = vitalsArray[i];
      const bp = v ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '--';
      const hr = v ? `${v.heart_rate} bpm` : '--';
      const temp = v ? `${v.temperature}°C` : '--';
      const o2 = v ? `${v.oxygen_saturation}%` : '--';

      // return `
      // <div class="vital-card">
      //   <div class="vital-header">
      //     <div>
      //       <div class="vital-name">
      //         ${p.first_name} ${p.last_name}
      //         ${p.at_risk
      //           ? `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">AT RISK</span>`
      //           : `<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">Stable</span>`
      //         }
      //       </div>
      //       <div class="vital-condition">
      //         ${p.at_risk && p.risk_reason ? p.risk_reason : 'No active alerts'}
      //       </div>
      //     </div>
      //     <div class="vital-btns">
      //       <button class="btn-record" onclick="openRecordModal('${p.patient_id}')">
      //         ${waveIcon} Record Vitals
      //       </button>
      //       <button class="btn-history" onclick="window.location.href='patient-history.html?patientId=${p.patient_id}'">
      //         ${octaviaIcon} OCTAVIA Analysis
      //       </button>
      //     </div>
      //   </div>
      //   <div class="vitals-grid">
      //     <div><div class="vital-stat-label">Blood Pressure</div><div class="vital-stat-val" id="disp-bp-${p.patient_id}">${bp}</div></div>
      //     <div><div class="vital-stat-label">Heart Rate</div><div class="vital-stat-val" id="disp-hr-${p.patient_id}">${hr}</div></div>
      //     <div><div class="vital-stat-label">Temperature</div><div class="vital-stat-val" id="disp-temp-${p.patient_id}">${temp}</div></div>
      //     <div><div class="vital-stat-label">O2 Saturation</div><div class="vital-stat-val" id="disp-o2-${p.patient_id}">${o2}</div></div>
      //   </div>
      // </div>`;

      return `
  <div class="vital-card">

    <div class="vital-header">
      <div>
        <div class="vital-name">
          ${p.first_name} ${p.last_name}
          ${p.at_risk
          ? `<span style="background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">AT RISK</span>`
          : `<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;margin-left:8px;">Stable</span>`
        }
        </div>
        <div class="vital-condition">
          ${p.at_risk && p.risk_reason ? p.risk_reason : 'No active alerts'}
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
    }).join('');

  } catch (err) {
    list.innerHTML = `<div style="padding:20px;color:#dc2626;">Error loading patients: ${err.message}</div>`;
  }
}

// ======== RECORD MODAL ========
function openRecordModal(patientId) {
  activePatientId = patientId;
  const p = patients.find(x => x.patient_id === patientId);
  const v = currentVitals[patientId];
  document.getElementById('modal-record-title').textContent = `Record Vitals — ${p.first_name} ${p.last_name}`;
  document.getElementById('modal-record-sub').textContent = 'Manual vital entry';
  document.getElementById('inp-bp').value = v?.bp !== '--' ? v.bp : '';
  document.getElementById('inp-hr').value = v?.hr !== '--' ? v.hr : '';
  document.getElementById('inp-temp').value = v?.temp !== '--' ? v.temp : '';
  document.getElementById('inp-o2').value = v?.o2 !== '--' ? v.o2 : '';
  document.getElementById('inp-notes').value = '';
  document.getElementById('record-error').style.display = 'none';
  showModal('record-modal');
}

async function saveVitals() {
  const bp = document.getElementById('inp-bp').value.trim();
  const hr = document.getElementById('inp-hr').value.trim();
  const temp = document.getElementById('inp-temp').value.trim();
  const o2 = document.getElementById('inp-o2').value.trim();

  if (!bp || !hr || !temp || !o2) {
    document.getElementById('record-error').style.display = 'block';
    return;
  }

  const bpParts = bp.split('/');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/patient_vitals`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_id: activePatientId,
        heart_rate: parseInt(hr),
        blood_pressure_systolic: parseInt(bpParts[0]),
        blood_pressure_diastolic: parseInt(bpParts[1]),
        temperature: parseFloat(temp),
        oxygen_saturation: parseInt(o2),
      }),
    });

    if (!res.ok) throw new Error('Failed to save vitals');

    closeModal('record-modal');
    showToast('✓ Vitals saved successfully');
    renderVitalsList();

  } catch (err) {
    showToast('Error saving vitals: ' + err.message);
  }
}

// ======== MODAL HELPERS ========
function showModal(id) {
  const m = document.getElementById(id);
  m.style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

['record-modal', 'history-modal'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function (e) {
      if (e.target === this) closeModal(id);
    });
  }
});

// ======== LOGOUT ========
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = 'login.html';
  }
}

// ======== TABS ========
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    const map = {
      'Pending Diagnoses': 'pending',
      'Patient Care': 'patient',
      'Vital Signs': 'vitals',
      'Schedule': 'schedule'
    };
    document.getElementById('tab-' + map[this.textContent.trim()]).classList.add('active');
  });
});

// ======== TOAST ========
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ======== DIAGNOSES ========
function handleApprove(cardId, name) {
  const card = document.getElementById(cardId);
  card.style.transition = 'opacity .4s, transform .4s';
  card.style.opacity = '0';
  card.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    card.remove();
    showToast('✓ ' + name + '\'s diagnosis approved & forwarded to doctor');
  }, 400);
}

function handleReject(cardId, name) {
  const card = document.getElementById(cardId);
  card.style.transition = 'opacity .4s, transform .4s';
  card.style.opacity = '0';
  card.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    card.remove();
    showToast('✕ ' + name + '\'s diagnosis rejected');
  }, 400);
}

// ======== INIT ========
renderVitalsList();