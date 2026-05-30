/* ============================================================
   admin2.js — MedIntel Admin Dashboard (Supabase — real schema)
   ============================================================ */

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//GENERATE A RANDOM PASSWORD WHICH WILL ACT AS A TEMP PASSWORD
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ════════════════════════════════════════════════════════════
function switchTab(name, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).style.display = 'block';
  btn.classList.add('active');
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════
function toggleNotif() {
  const popup = document.getElementById('notifPopup');
  popup.classList.toggle('show');
  if (popup.classList.contains('show')) {
    loadAdminNotifications();
    markAdminNotifsRead();
  }
}

async function clearNotifs() {
  try {
    await db.from('admin_notifications').delete().neq('notification_id', '00000000-0000-0000-0000-000000000000');
    document.getElementById('notifList').innerHTML =
      '<div class="notif-item" style="color:#9ca3af;">No new notifications</div>';
    document.getElementById('notifCount').textContent = '0';
    document.getElementById('notifCount').style.display = 'none';
  } catch (err) {
    console.error('clearNotifs error:', err);
  }
}

async function loadAdminNotifications() {
  const listEl = document.getElementById('notifList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="notif-item" style="color:#9ca3af;">Loading...</div>';

  try {
    const { data, error } = await db
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="notif-item" style="color:#9ca3af;">No new notifications</div>';
      return;
    }

    listEl.innerHTML = data.map(n => `
      <div class="notif-item${n.is_read ? '' : ' notif-unread'}" style="padding:10px 14px;border-bottom:1px solid #f3f4f6;">
        <div style="font-size:13px;color:#111827;font-weight:${n.is_read ? '400' : '600'};">${escapeHtml(n.message)}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:3px;">${getTimeAgo(n.created_at)}</div>
      </div>
    `).join('');

  } catch (err) {
    console.error('loadAdminNotifications error:', err);
    listEl.innerHTML = '<div class="notif-item" style="color:#ef4444;">Failed to load notifications.</div>';
  }
}

async function markAdminNotifsRead() {
  try {
    await db.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
    document.getElementById('notifCount').style.display = 'none';
  } catch (err) {
    console.error('markAdminNotifsRead error:', err);
  }
}

async function addAdminNotification(message, type = 'info') {
  try {
    await db.from('admin_notifications').insert({ message, type, is_read: false });
    await refreshNotifCount();
  } catch (err) {
    console.error('addAdminNotification error:', err);
  }
}

async function refreshNotifCount() {
  try {
    const { count } = await db
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    const badge = document.getElementById('notifCount');
    if (count && count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    console.error('refreshNotifCount error:', err);
  }
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

document.addEventListener('click', function (e) {
  const popup = document.getElementById('notifPopup');
  const btn   = e.target.closest('.header-btn');
  if (popup && !popup.contains(e.target) && !btn) popup.classList.remove('show');
});

// ════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════
function openAddStaffModal() {
  clearModalErrors();
  document.getElementById('addStaffModal').classList.remove('hidden');
}

function openScheduleModal() {
  populateDoctorDropdown();
  populatePatientDropdown();
  document.getElementById('scheduleModal').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('click', function (e) {
  document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

function clearModalErrors() {
  ['errStaffName','errStaffEmail','errStaffRole','errStaffDept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ════════════════════════════════════════════════════════════
//  LOAD STATS
// ════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const [
      { count: doctorCount },
      { count: nurseCount },
      { count: apptCount },
      { count: atRiskCount },
    ] = await Promise.all([
      db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor').eq('is_active', true),
      db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'nurse').eq('is_active', true),
      db.from('appointments').select('*', { count: 'exact', head: true }),
      db.from('patients').select('*', { count: 'exact', head: true }).eq('at_risk', true),
    ]);

    document.getElementById('statDoctors').textContent      = doctorCount ?? 0;
    document.getElementById('statNurses').textContent       = nurseCount  ?? 0;
    document.getElementById('statAppointments').textContent = apptCount   ?? 0;
    document.getElementById('statUrgent').textContent       = atRiskCount ?? 0;

    document.querySelectorAll('.tab').forEach(t => {
      if (t.textContent.startsWith('Doctors'))      t.textContent = `Doctors (${doctorCount ?? 0})`;
      if (t.textContent.startsWith('Nurses'))       t.textContent = `Nurses (${nurseCount ?? 0})`;
      if (t.textContent.startsWith('Appointments')) t.textContent = `Appointments (${apptCount ?? 0})`;
    });
  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  LOAD DOCTORS
// ════════════════════════════════════════════════════════════
async function loadDoctors() {
  const tbody = document.getElementById('doctorsTableBody');
  tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;color:#9ca3af;text-align:center;">Loading doctors...</td></tr>`;

  try {
    const { data, error } = await db
      .from('users')
      .select('id, email, department, is_active, doctors(doctor_id, first_name, last_name, specialization)')
      .eq('role', 'doctor')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;color:#9ca3af;text-align:center;">No doctors found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(u => {
      const d        = u.doctors?.[0] ?? {};
      const name     = [d.first_name, d.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
      const dept     = u.department || 'Not assigned';
      const spec     = d.specialization || '—';
      const isActive = u.is_active !== false;

      return `
        <tr>
          <td>
            <div class="td-name">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                <circle cx="20" cy="10" r="2"/>
              </svg>
              ${escapeHtml(name)}
            </div>
          </td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge-dept">${escapeHtml(dept)}</span></td>
          <td>${escapeHtml(spec)}</td>
          <td><span class="${isActive ? 'badge-active' : 'badge-pending'}">${isActive ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-red" onclick="removeStaff('${u.id}', '${escapeHtml(name)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Remove
            </button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('loadDoctors error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="padding:20px;color:#ef4444;text-align:center;">Failed to load doctors.</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════
//  LOAD NURSES
// ════════════════════════════════════════════════════════════
async function loadNurses() {
  const tbody = document.getElementById('nursesTableBody');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;color:#9ca3af;text-align:center;">Loading nurses...</td></tr>`;

  try {
    const { data, error } = await db
      .from('users')
      .select('id, email, department, is_active, nurses(first_name, last_name)')
      .eq('role', 'nurse')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;color:#9ca3af;text-align:center;">No nurses found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(u => {
      const n        = u.nurses?.[0] ?? {};
      const name     = [n.first_name, n.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
      const dept     = u.department || 'Not assigned';
      const isActive = u.is_active !== false;

      return `
        <tr>
          <td>
            <div class="td-name">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              ${escapeHtml(name)}
            </div>
          </td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge-dept">${escapeHtml(dept)}</span></td>
          <td><span class="${isActive ? 'badge-active' : 'badge-pending'}">${isActive ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-red" onclick="removeStaff('${u.id}', '${escapeHtml(name)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
              Remove
            </button>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('loadNurses error:', err);
    tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;color:#ef4444;text-align:center;">Failed to load nurses.</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════
//  LOAD APPOINTMENTS
// ════════════════════════════════════════════════════════════
async function loadAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;color:#9ca3af;text-align:center;">Loading appointments...</td></tr>`;

  try {
    const { data, error } = await db
      .from('appointments')
      .select(`
        appointment_id,
        date,
        time,
        status,
        notes,
        patients!appointments_patient_id_fkey(first_name, last_name, at_risk),
        doctors!appointments_doctor_id_fkey(first_name, last_name)
      `)
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;color:#9ca3af;text-align:center;">No appointments found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(a => {
      const p           = a.patients ?? {};
      const d           = a.doctors  ?? {};
      const patientName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
      const doctorName  = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown';
      const timeDisplay = a.time ? a.time.substring(0, 5) : '--:--';

      const urgencyBadge = p.at_risk
        ? '<span class="badge-high">high</span>'
        : '<span class="badge-low">low</span>';

      const statusBadge = {
        scheduled: '<span class="badge-scheduled">Scheduled</span>',
        pending:   '<span class="badge-pending">Pending</span>',
        confirmed: '<span class="badge-confirmed">Confirmed</span>',
      }[a.status] || `<span class="badge-pending">${escapeHtml(a.status || 'Unknown')}</span>`;

      const actionCell = a.status === 'confirmed'
        ? '<span class="action-confirmed-text">Confirmed</span>'
        : `<button class="btn btn-green" onclick="confirmAppt(this, '${a.appointment_id}')">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="20 6 9 17 4 12"/>
             </svg>
             Confirm
           </button>`;

      return `
        <tr>
          <td style="font-weight:700;color:#111827;">${escapeHtml(patientName)}</td>
          <td>${escapeHtml(doctorName)}</td>
          <td>${escapeHtml(a.date || '--')}</td>
          <td>
            <span class="td-time">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              ${timeDisplay}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>${urgencyBadge}</td>
          <td>${actionCell}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('loadAppointments error:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;color:#ef4444;text-align:center;">Failed to load appointments.</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════════
//  LOAD PATIENT QUEUE
// ════════════════════════════════════════════════════════════
async function loadPatientQueue() {
  const container = document.querySelector('.queue-list');
  if (!container) return;
  container.innerHTML = `<div style="padding:28px;text-align:center;color:#9ca3af;">Loading queue...</div>`;

  try {
    const { data, error } = await db
      .from('appointments')
      .select(`
        appointment_id,
        date,
        status,
        notes,
        patients!appointments_patient_id_fkey(patient_id, first_name, last_name, phone, at_risk, risk_reason)
      `)
      .in('status', ['pending', 'scheduled'])
      .order('date', { ascending: true })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="padding:28px;text-align:center;color:#9ca3af;">No patients in queue.</div>`;
      return;
    }

    data.sort((a, b) => (a.patients?.at_risk ? 0 : 1) - (b.patients?.at_risk ? 0 : 1));

    container.innerHTML = data.map((a, i) => {
      const p       = a.patients ?? {};
      const name    = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
      const phone   = escapeHtml(p.phone || 'N/A');
      const date    = escapeHtml(a.date  || '--');
      const isHigh  = p.at_risk === true;
      const summary = escapeHtml(p.risk_reason || a.notes || 'No summary available.');

      const cardClass = isHigh ? 'queue-high' : 'queue-low';
      const badgeHtml = isHigh
        ? '<span class="badge-high">HIGH</span><span class="urgent-circle">!</span>'
        : '<span class="badge-low">LOW</span>';

      return `
        <div class="queue-card ${cardClass}">
          <div class="queue-top">
            <div class="queue-avatar">${i + 1}</div>
            <div class="queue-info">
              <div class="queue-name">${escapeHtml(name)}</div>
              <div class="queue-condition">${isHigh ? 'At Risk' : 'Stable'}</div>
              <div class="queue-phone">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12
                           19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72
                           12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6
                           l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 17Z"/>
                </svg>
                ${phone}
              </div>
            </div>
            <div class="queue-right">
              <div class="queue-badges">${badgeHtml}</div>
              <div class="queue-next">Next: ${date}</div>
            </div>
          </div>
          <div class="queue-divider"></div>
          <div class="queue-summary">
            <span class="ai-label">AI Summary:</span> ${summary}
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('loadPatientQueue error:', err);
    container.innerHTML = `<div style="padding:28px;text-align:center;color:#ef4444;">Failed to load queue.</div>`;
  }
}

// ════════════════════════════════════════════════════════════
//  POPULATE DROPDOWNS
// ════════════════════════════════════════════════════════════
async function populateDoctorDropdown() {
  const select = document.getElementById('apptDoctor');
  if (!select) return;
  select.innerHTML = '<option value="">Select doctor...</option>';

  try {
    const { data } = await db
      .from('doctors')
      .select('doctor_id, first_name, last_name, users!doctors_user_id_fkey(is_active)')
      .order('first_name');

    (data || []).forEach(d => {
      if (d.users?.is_active === false) return;
      const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'Unknown';
      const opt  = document.createElement('option');
      opt.value       = d.doctor_id;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn('populateDoctorDropdown error:', err);
  }
}

async function populatePatientDropdown() {
  const select = document.getElementById('apptPatient');
  if (!select) return;
  select.innerHTML = '<option value="">Select patient...</option>';

  try {
    const { data } = await db
      .from('patients')
      .select('patient_id, first_name, last_name')
      .order('first_name');

    (data || []).forEach(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
      const opt  = document.createElement('option');
      opt.value       = p.patient_id;
      opt.textContent = name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn('populatePatientDropdown error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  ADD STAFF
// ════════════════════════════════════════════════════════════
async function submitAddStaff() {
  clearModalErrors();

  const fullName = document.getElementById('staffName').value.trim();
  const email    = document.getElementById('staffEmail').value.trim();
  const role     = document.getElementById('staffRole').value;
  const dept     = document.getElementById('staffDept').value;
  const spec     = document.getElementById('staffSpec').value.trim();
  const password = generateTempPassword();

  let valid = true;
  if (!fullName) { document.getElementById('errStaffName').textContent  = 'Name is required';     valid = false; }
  if (!email)    { document.getElementById('errStaffEmail').textContent = 'Email is required';    valid = false; }
  if (!role)     { document.getElementById('errStaffRole').textContent  = 'Role is required';     valid = false; }
  if (!dept)     { document.getElementById('errStaffDept').textContent  = 'Department required';  valid = false; }
  if (!valid) return;

  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ');

  try {
    const { data: authData, error: authError } = await db.auth.signUp({
      email, password, options: { data: { role } }
    });
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('No user ID returned.');

    const { error: userError } = await db.from('users').insert({
      id: userId, email, role, department: dept, must_reset_password: true
    });
    if (userError) throw userError;

    if (role === 'doctor') {
      const { error } = await db.from('doctors').insert({
        user_id: userId, first_name: firstName, last_name: lastName,
        specialization: spec || dept,
      });
      if (error) throw error;
    } else if (role === 'nurse') {
      const { error } = await db.from('nurses').insert({
        user_id: userId, first_name: firstName, last_name: lastName,
      });
      if (error) throw error;
    }

    // Send first-login email
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'first_login', email, name: fullName, tempPassword: password }),
    });

    await addAdminNotification(`👤 New ${role} added: ${fullName} — ${dept}`, 'staff');
    showToast(`✓ ${role.charAt(0).toUpperCase() + role.slice(1)} created! Reset email sent to ${email}.`, 'success');
    closeModal('addStaffModal');

    ['staffName','staffEmail','staffSpec'].forEach(id =>
      document.getElementById(id).value = ''
    );
    document.getElementById('staffRole').value = '';
    document.getElementById('staffDept').value = '';
    await Promise.all([loadStats(), loadDoctors(), loadNurses()]);

  } catch (err) {
    showToast(err.message || 'Failed to create account.', 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  REMOVE STAFF
// ════════════════════════════════════════════════════════════
async function removeStaff(userId, name) {
  if (!confirm(`Remove ${name} from the system?`)) return;
  try {
    const { error } = await db.from('users').update({ is_active: false }).eq('id', userId);
    if (error) throw error;
    await addAdminNotification(`🗑️ Staff removed: ${name}`, 'staff');
    await Promise.all([loadStats(), loadDoctors(), loadNurses()]);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function removeDoctor(userId, name) { return removeStaff(userId, name); }
function removeNurse(userId, name)  { return removeStaff(userId, name); }

// ════════════════════════════════════════════════════════════
//  CONFIRM APPOINTMENT
// ════════════════════════════════════════════════════════════
async function confirmAppt(btn, appointmentId) {
  try {
    const { error } = await db
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('appointment_id', appointmentId);
    if (error) throw error;

    const row = btn.closest('tr');
    if (row) {
      row.cells[4].innerHTML = '<span class="badge-confirmed">Confirmed</span>';
      row.cells[6].innerHTML = '<span class="action-confirmed-text">Confirmed</span>';
    }
    await addAdminNotification(`✅ Appointment confirmed for patient`, 'appointment');
    await loadStats();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  SCHEDULE APPOINTMENT
// ════════════════════════════════════════════════════════════
async function submitSchedule() {
  const patientId = document.getElementById('apptPatient').value;
  const doctorId  = document.getElementById('apptDoctor').value;
  const date      = document.getElementById('apptDate').value;
  const time      = document.getElementById('apptTime').value;
  const status    = document.getElementById('apptStatus').value;

  if (!patientId || !doctorId || !date || !time) {
    await addAdminNotification(`📅 New appointment scheduled`, 'appointment');
    return;
  }

  try {
    const { data: { user } } = await db.auth.getUser();

    const { error } = await db.from('appointments').insert({
      patient_id: patientId,
      doctor_id:  doctorId,
      date,
      time,
      status,
      created_by: user?.email || 'admin',
    });
    if (error) throw error;

    showToast('✓ Appointment scheduled!', 'success');
    closeModal('scheduleModal');
    document.getElementById('apptDate').value    = '';
    document.getElementById('apptTime').value    = '';
    document.getElementById('apptDoctor').value  = '';
    document.getElementById('apptPatient').value = '';
    await Promise.all([loadStats(), loadAppointments()]);

  } catch (err) {
    showToast(err.message || 'Failed to schedule appointment.', 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function showToast(message, type = 'success') {
  const existing = document.getElementById('admin-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'admin-toast';
  toast.style.cssText = `
    position:fixed;bottom:28px;right:28px;padding:14px 22px;
    border-radius:12px;font-size:0.9rem;font-weight:600;color:#fff;
    z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.15);
    background:${type === 'success' ? '#16a34a' : '#ef4444'};
    transition:opacity 0.3s;font-family:inherit;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ════════════════════════════════════════════════════════════
//  ESCAPE HTML
// ════════════════════════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
//  LOGOUT
// ════════════════════════════════════════════════════════════
function handleLogout() {
  if (typeof sessionLogout === 'function') sessionLogout();
  else { sessionStorage.clear(); window.location.href = 'login.html'; }
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadStats(),
    loadDoctors(),
    loadNurses(),
    loadAppointments(),
    loadPatientQueue(),
    refreshNotifCount(),
  ]);

  setInterval(async () => {
    await Promise.all([
      loadStats(),
      loadDoctors(),
      loadNurses(),
      loadAppointments(),
      loadPatientQueue(),
      refreshNotifCount(),
    ]);
  }, 60000);
});