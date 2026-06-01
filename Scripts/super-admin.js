/**
 * super-admin.js
 * MedIntel Super Admin — Full Supabase integration
 */

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

//GENERATE A RANDOM PASSWORD WHICH WILL ACT AS A TEMP PASSWORD
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ════════════════════════════════════════════════════════════
//  SESSION
// ════════════════════════════════════════════════════════════
function applySession() {
  const raw = sessionStorage.getItem('medintel_user');
  if (!raw) return;
  const user = JSON.parse(raw);
  const el = document.getElementById('sa-header-name');
  if (el && user.name) {
    el.textContent = `${user.name} — System Wide Access`;
  }
}

// ════════════════════════════════════════════════════════════
//  CHART DEFAULTS
// ════════════════════════════════════════════════════════════
Chart.defaults.color       = '#64748b';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

let growthChartInstance  = null;
let triageChartInstance  = null;
let urgencyChartInstance = null;

// ════════════════════════════════════════════════════════════
//  TAB SWITCHER
// ════════════════════════════════════════════════════════════
function switchTab(e, id) {
  document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).style.display = 'block';
  e.currentTarget.classList.add('active');

  if (id === 'systemControlSection') loadAuditLogs();
  if (id === 'adminManagementSection') loadAdminList();
  if (id === 'staffManagementSection') loadStaffList();
}

// ════════════════════════════════════════════════════════════
//  STATS CARDS
// ════════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const [
      { count: patientCount },
      { count: doctorCount },
      { count: nurseCount },
      { count: apptCount },
      { count: todayAppts },
      { count: criticalCount },
      { count: pendingDiag },
      { count: approvedDiag },
      { count: totalDiag },
    ] = await Promise.all([
      db.from('patients').select('*', { count: 'exact', head: true }),
      db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
      db.from('users').select('*', { count: 'exact', head: true }).eq('role', 'nurse'),
      db.from('appointments').select('*', { count: 'exact', head: true }),
      db.from('appointments').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]),
      db.from('sentinel_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'critical').eq('resolved', false),
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }),
    ]);

    document.getElementById('statPatients').textContent       = patientCount ?? '--';
    document.getElementById('statPatientsTrend').textContent  = 'Live from database';
    document.getElementById('statStaff').textContent          = (doctorCount || 0) + (nurseCount || 0);
    document.getElementById('statStaffBreakdown').textContent = `${doctorCount ?? 0} Doctors, ${nurseCount ?? 0} Nurses`;
    document.getElementById('statAppointments').textContent   = apptCount ?? '--';
    document.getElementById('statApptToday').textContent      = `${todayAppts ?? 0} today`;
    document.getElementById('statEmergency').textContent      = criticalCount ?? '--';
    document.getElementById('statPendingDiag').textContent    = pendingDiag ?? '--';

    // AI Accuracy = approved / total * 100
    const accuracy = totalDiag > 0
      ? ((approvedDiag / totalDiag) * 100).toFixed(1) + '%'
      : 'N/A';
    document.getElementById('statAIAccuracy').textContent     = accuracy;
    document.getElementById('statAIAccuracyBase').textContent = `Based on ${totalDiag ?? 0} cases`;

  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  GROWTH CHART — real monthly data
// ════════════════════════════════════════════════════════════
async function loadGrowthChart() {
  try {
    const { data: patients } = await db
      .from('patients')
      .select('patient_id');

    const { data: appointments } = await db
      .from('appointments')
      .select('date');

    // Build last 6 months labels
    const months = [];
    const monthLabels = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      monthLabels.push(d.toLocaleString('default', { month: 'short' }));
    }

    // Since we don't have created_at on patients yet, show cumulative total
    const patientData = months.map(() => patients?.length || 0);

    // Count appointments per month
    const apptData = months.map(m =>
      (appointments || []).filter(a => a.date && a.date.startsWith(m)).length
    );

    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    if (growthChartInstance) growthChartInstance.destroy();

    growthChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Patients',
            data: patientData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
          },
          {
            label: 'Appointments',
            data: apptData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.06)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#06b6d4',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4,4] }, ticks: { color: '#64748b', font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
        }
      }
    });

  } catch (err) {
    console.error('loadGrowthChart error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  TRIAGE STATUS CHART — real data from ai_triage_reports
// ════════════════════════════════════════════════════════════
async function loadTriageChart() {
  try {
    const [
      { count: pending },
      { count: approved },
      { count: rejected },
    ] = await Promise.all([
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      db.from('ai_triage_reports').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);

    const ctx = document.getElementById('triageChart');
    if (!ctx) return;
    if (triageChartInstance) triageChartInstance.destroy();

    triageChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [`Pending: ${pending || 0}`, `Approved: ${approved || 0}`, `Rejected: ${rejected || 0}`],
        datasets: [{
          data: [pending || 0, approved || 0, rejected || 0],
          backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
          borderWidth: 2,
          borderColor: 'rgba(13,24,48,0.9)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 }
          }
        }
      }
    });

  } catch (err) {
    console.error('loadTriageChart error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  URGENCY CHART — real data from sentinel_alerts
// ════════════════════════════════════════════════════════════
async function loadUrgencyChart() {
  try {
    const [
      { count: normal },
      { count: warning },
      { count: critical },
    ] = await Promise.all([
      db.from('sentinel_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'normal'),
      db.from('sentinel_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'warning'),
      db.from('sentinel_alerts').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
    ]);

    const ctx = document.getElementById('urgencyChart');
    if (!ctx) return;
    if (urgencyChartInstance) urgencyChartInstance.destroy();

    urgencyChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [
          `Normal: ${normal || 0}`,
          `Warning: ${warning || 0}`,
          `Critical: ${critical || 0}`
        ],
        datasets: [{
          data: [normal || 0, warning || 0, critical || 0],
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: 'rgba(13,24,48,0.9)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 }
          }
        }
      }
    });

  } catch (err) {
    console.error('loadUrgencyChart error:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  AUDIT LOGS
// ════════════════════════════════════════════════════════════
async function loadAuditLogs() {
  const container = document.getElementById('auditLogList');
  if (!container) return;
  container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">Loading logs…</div>`;

  try {
    const { data, error } = await db
      .from('audit_logs')
      .select('log_id, action, timestamp, users(email)')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">No audit logs found.</div>`;
      return;
    }

    container.innerHTML = data.map(log => {
      const email   = log.users?.email ?? 'system';
      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="log-item">
          <span class="log-time">${timeStr}</span>
          <span class="log-msg">${escapeHtml(log.action)}</span>
          <span class="log-user">${escapeHtml(email)}</span>
          <span class="status-tag success">success</span>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('loadAuditLogs error:', err);
    container.innerHTML = `<div style="color:#ef4444;padding:12px 0;font-size:0.85rem;">Failed to load logs.</div>`;
  }
}

// ════════════════════════════════════════════════════════════
//  ADMIN LIST
// ════════════════════════════════════════════════════════════
async function loadAdminList() {
  const container = document.getElementById('adminUserList');
  if (!container) return;
  container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">Loading admins…</div>`;

  try {
    const { data, error } = await db
      .from('users')
      .select('id, email, created_at, is_active')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">No admin accounts found.</div>`;
      return;
    }

    const adminsWithNames = await Promise.all(data.map(async (u) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/admins?user_id=eq.${u.id}&select=first_name,last_name`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const profile = await res.json();
        return { ...u, profile: profile[0] || null };
      } catch {
        return { ...u, profile: null };
      }
    }));

    container.innerHTML = adminsWithNames.map(u => {
      const firstName = u.profile?.first_name || '';
      const lastName  = u.profile?.last_name  || '';
      const fullName  = [firstName, lastName].filter(Boolean).join(' ') || u.email.split('@')[0];
      const createdAt = new Date(u.created_at).toISOString().split('T')[0];
      const isActive  = u.is_active !== false;

      return `
        <div class="user-item">
          <div class="user-info">
            <strong>${escapeHtml(fullName)}</strong>
            <span>${escapeHtml(u.email)} · Admin</span>
          </div>
          <div class="user-meta">
            <small>Created: ${createdAt}</small>
            <span class="status-tag ${isActive ? 'active' : 'warning'}">${isActive ? 'Active' : 'Inactive'}</span>
            <button class="btn-manage" onclick="manageUser('${u.id}', 'admin')">Manage</button>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444;padding:12px 0;font-size:0.85rem;">Failed to load admins.</div>`;
  }
}

// ════════════════════════════════════════════════════════════
//  STAFF LIST
// ════════════════════════════════════════════════════════════
async function loadStaffList() {
  const container = document.getElementById('staffUserList');
  if (!container) return;
  container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">Loading staff…</div>`;

  try {
    const { data, error } = await db
      .from('users')
      .select('id, email, role, created_at, is_active')
      .in('role', ['doctor', 'nurse'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      container.innerHTML = `<div style="color:#64748b;padding:12px 0;font-size:0.85rem;">No staff accounts found.</div>`;
      return;
    }

    // Fetch profiles directly like nurse.js and doctor.js do
    const staffWithNames = await Promise.all(data.map(async (u) => {
      try {
        const table = u.role === 'doctor' ? 'doctors' : 'nurses';
        const fields = u.role === 'doctor' ? 'first_name,last_name,specialization' : 'first_name,last_name';
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${u.id}&select=${fields}`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
        });
        const profile = await res.json();
        return { ...u, profile: profile[0] || null };
      } catch {
        return { ...u, profile: null };
      }
    }));

    container.innerHTML = staffWithNames.map(u => {
      const firstName = u.profile?.first_name || '';
      const lastName  = u.profile?.last_name  || '';
      const fullName  = [firstName, lastName].filter(Boolean).join(' ') || u.email.split('@')[0];
      const roleLabel = u.role.charAt(0).toUpperCase() + u.role.slice(1);
      const extra     = u.profile?.specialization || '';
      const subtitle  = extra ? `${roleLabel} · ${extra}` : roleLabel;
      const createdAt = new Date(u.created_at).toISOString().split('T')[0];
      const isActive  = u.is_active !== false;

      return `
        <div class="user-item">
          <div class="user-info">
            <strong>${escapeHtml(fullName)}</strong>
            <span>${escapeHtml(u.email)} · ${subtitle}</span>
          </div>
          <div class="user-meta">
            <small>Created: ${createdAt}</small>
            <span class="status-tag ${isActive ? 'active' : 'warning'}">${isActive ? 'Active' : 'Inactive'}</span>
            <button class="btn-manage" onclick="manageUser('${u.id}', '${u.role}')">Manage</button>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:#ef4444;padding:12px 0;font-size:0.85rem;">Failed to load staff.</div>`;
  }
}

// ════════════════════════════════════════════════════════════
//  MANAGE USER MODAL
// ════════════════════════════════════════════════════════════
let currentManageUserId   = null;
let currentManageUserRole = null;
let currentManageIsActive = true;

async function manageUser(userId, role) {
  currentManageUserId   = userId;
  currentManageUserRole = role;

  // Fetch user data
  const { data, error } = await db
    .from('users')
    .select(`id, email, is_active,
      admins(first_name, last_name),
      doctors(first_name, last_name),
      nurses(first_name, last_name)`)
    .eq('id', userId)
    .single();

  if (error || !data) {
    showToast('Failed to load user data.', 'error');
    return;
  }

  let firstName = '', lastName = '';
  if (role === 'admin'  && data.admins?.[0])  { firstName = data.admins[0].first_name  || ''; lastName = data.admins[0].last_name  || ''; }
  if (role === 'doctor' && data.doctors?.[0]) { firstName = data.doctors[0].first_name || ''; lastName = data.doctors[0].last_name || ''; }
  if (role === 'nurse'  && data.nurses?.[0])  { firstName = data.nurses[0].first_name  || ''; lastName = data.nurses[0].last_name  || ''; }

  currentManageIsActive = data.is_active !== false;

  document.getElementById('manage-modal-title').textContent = `Manage ${role.charAt(0).toUpperCase() + role.slice(1)} — ${data.email}`;
  document.getElementById('manage-first-name').value = firstName;
  document.getElementById('manage-last-name').value  = lastName;
  document.getElementById('manage-email').value      = data.email;
  document.getElementById('manage-role').value       = role;

  const toggleBtn = document.getElementById('manage-toggle-btn');
  toggleBtn.textContent = currentManageIsActive ? '⏸ Deactivate Account' : '▶ Reactivate Account';
  toggleBtn.style.background = currentManageIsActive ? '#f59e0b' : '#22c55e';

  document.getElementById('manage-modal').style.display = 'flex';
}

function closeManageModal() {
  document.getElementById('manage-modal').style.display = 'none';
  currentManageUserId   = null;
  currentManageUserRole = null;
}

async function saveManageUser() {
  const firstName = document.getElementById('manage-first-name').value.trim();
  const lastName  = document.getElementById('manage-last-name').value.trim();
  const email     = document.getElementById('manage-email').value;

  if (!firstName) {
    showToast('First name is required.', 'error');
    return;
  }

  try {
    const tableMap = { admin: 'admins', doctor: 'doctors', nurse: 'nurses' };
    const table = tableMap[currentManageUserRole];

    if (table) {
      const { data: existing, error: fetchError } = await db
        .from(table)
        .select('*')
        .eq('user_id', currentManageUserId);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        // Row exists — update it
        const { error: updateError } = await db
          .from(table)
          .update({ first_name: firstName, last_name: lastName })
          .eq('user_id', currentManageUserId);
        if (updateError) throw updateError;
      } else {
        // Row doesn't exist — insert it
        const insertData = { user_id: currentManageUserId, first_name: firstName, last_name: lastName };
        if (currentManageUserRole === 'doctor') insertData.specialization = '';
        const { error: insertError } = await db.from(table).insert(insertData);
        if (insertError) throw insertError;
      }
    }

    await logAction(`Updated ${currentManageUserRole} profile: ${email}`);
    showToast('✓ User updated successfully', 'success');
    closeManageModal();

    // Force fresh reload of the correct list
    if (currentManageUserRole === 'admin') await loadAdminList();
    else await loadStaffList();

  } catch (err) {
    showToast('Error updating user: ' + err.message, 'error');
  }
}

async function sendPasswordReset() {
  const email     = document.getElementById('manage-email').value;
  const firstName = document.getElementById('manage-first-name').value.trim();
  const lastName  = document.getElementById('manage-last-name').value.trim();
  const name      = `${firstName} ${lastName}`.trim() || email.split('@')[0];

  try {
    const { error: flagError } = await db
      .from('users')
      .update({ must_reset_password: true })
      .eq('id', currentManageUserId);
    if (flagError) throw flagError;

    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'forgot_password', email, name }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Email failed');

    await logAction(`Password reset sent to: ${email}`);
    showToast(`✓ Password reset code sent to ${email}`, 'success');

  } catch (err) {
    showToast('Error sending reset: ' + err.message, 'error');
  }
}

async function toggleUserActive() {
  const newStatus = !currentManageIsActive;
  try {
    const { error } = await db
      .from('users')
      .update({ is_active: newStatus })
      .eq('id', currentManageUserId);
    if (error) throw error;

    currentManageIsActive = newStatus;
    const toggleBtn = document.getElementById('manage-toggle-btn');
    toggleBtn.textContent = newStatus ? '⏸ Deactivate Account' : '▶ Reactivate Account';
    toggleBtn.style.background = newStatus ? '#f59e0b' : '#22c55e';

    await logAction(`${newStatus ? 'Reactivated' : 'Deactivated'} account: ${document.getElementById('manage-email').value}`);
    showToast(`✓ Account ${newStatus ? 'reactivated' : 'deactivated'}`, 'success');

    if (currentManageUserRole === 'admin') await loadAdminList();
    else loadStaffList();

  } catch (err) {
    showToast('Error updating account status: ' + err.message, 'error');
  }
}

async function deleteUserAccount() {
  const email = document.getElementById('manage-email').value;
  if (!confirm(`Are you sure you want to permanently delete ${email}? This cannot be undone.`)) return;

  try {
    // 1. Delete profile row based on role
    const tableMap = { admin: 'admins', doctor: 'doctors', nurse: 'nurses' };
    const table = tableMap[currentManageUserRole];
    if (table) {
      await db.from(table).delete().eq('user_id', currentManageUserId);
    }

    // 2. Delete notifications
    await db.from('doctor_notifications').delete().eq('doctor_id', currentManageUserId);
    await db.from('nurse_notifications').delete().eq('user_id', currentManageUserId);

    // 3. Delete otp_codes
    await db.from('otp_codes').delete().eq('email', email);

    // 4. Delete users row
    const { error } = await db.from('users').delete().eq('id', currentManageUserId);
    if (error) throw error;

    // 5. Delete from Supabase Auth via server
    const authRes = await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentManageUserId })
    });
    const authData = await authRes.json();
    if (!authData.success) console.error('Auth delete failed:', authData.error);

    await logAction(`Deleted account: ${email}`);
    showToast(`✓ Account deleted`, 'success');
    closeManageModal();

    if (currentManageUserRole === 'admin') await loadAdminList();
    else loadStaffList();

  } catch (err) {
    showToast('Error deleting account: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  CREATE ADMIN ACCOUNT
// ════════════════════════════════════════════════════════════
async function createAdminAccount() {
  const fullName = document.getElementById('adminFullName').value.trim();
  const email    = document.getElementById('adminEmail').value.trim();
  const password = generateTempPassword();

  if (!fullName || !email) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ');

  try {
    const { data: authData, error: authError } = await db.auth.signUp({
      email, password, options: { data: { role: 'admin' } }
    });
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('User creation returned no ID.');

    const { error: userError } = await db.from('users').insert({
      id: userId, email, role: 'admin', must_reset_password: true
    });
    if (userError) throw userError;

    const { error: profileError } = await db.from('admins').insert({
      user_id: userId, first_name: firstName, last_name: lastName
    });
    if (profileError) throw profileError;

    // Send first-login email

    
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'first_login', email, name: fullName, tempPassword: password }),
    });

    await logAction(`Created new admin account: ${email}`);
    showToast(`✓ Admin account created for ${fullName}! Reset email sent.`, 'success');

    document.getElementById('adminFullName').value = '';
    document.getElementById('adminEmail').value    = '';
    await loadAdminList();

  } catch (err) {
    showToast(err.message || 'Failed to create admin account.', 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  CREATE STAFF ACCOUNT
// ════════════════════════════════════════════════════════════
async function createStaffAccount() {
  const fullName = document.getElementById('staffFullName').value.trim();
  const email    = document.getElementById('staffEmail').value.trim();
  const password = generateTempPassword();
  const role     = document.getElementById('staffRole').value;
  const dept     = document.getElementById('staffDept').value;
  const spec     = document.getElementById('staffSpec').value.trim();

  if (!fullName || !email || !role) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ');

  try {
    const { data: authData, error: authError } = await db.auth.signUp({
      email, password, options: { data: { role } }
    });
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('User creation returned no ID.');

    const { error: userError } = await db.from('users').insert({
      id: userId, email, role, must_reset_password: true
    });
    if (userError) throw userError;

    if (role === 'doctor') {
      const { error } = await db.from('doctors').insert({
        user_id: userId, first_name: firstName, last_name: lastName,
        specialization: spec || dept || null
      });
      if (error) throw error;
    } else if (role === 'nurse') {
      const { error } = await db.from('nurses').insert({
        user_id: userId, first_name: firstName, last_name: lastName
      });
      if (error) throw error;
    }

    // Send first-login email
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'first_login', email, name: fullName, tempPassword: password }),
    });

    await logAction(`Created new ${role} account: ${email}`);
    showToast(`✓ ${role.charAt(0).toUpperCase() + role.slice(1)} account created! Reset email sent.`, 'success');

    ['staffFullName','staffEmail','staffSpec'].forEach(id =>
      document.getElementById(id).value = ''
    );
    document.getElementById('staffRole').selectedIndex = 0;
    document.getElementById('staffDept').selectedIndex = 0;
    await loadStaffList();

  } catch (err) {
    showToast(err.message || 'Failed to create staff account.', 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════
let saNotifOpen = false;

async function fetchSANotifications() {
  const { data } = await db
    .from('superadmin_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  return data || [];
}

async function renderSANotifications() {
  const notifications = await fetchSANotifications();
  const badge = document.getElementById('sa-notif-badge');
  const list  = document.getElementById('sa-notif-list');

  if (!list) return;

  list.innerHTML = '';

  const unread = notifications.filter(n => !n.is_read).length;

  if (badge) {
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="padding:28px 20px;text-align:center;color:#64748b;font-size:13px;">
        <div style="font-size:28px;margin-bottom:8px;">🔔</div>
        No notifications
      </div>`;
    return;
  }

  const typeIcon  = {
    critical_alert: '🚨',
    new_user: '👤',
    diagnosis_approved: '✅',
    appointment: '📅'
  };

  const typeColor = {
    critical_alert: '#ef4444',
    new_user: '#3b82f6',
    diagnosis_approved: '#22c55e',
    appointment: '#38bdf8'
  };

  notifications.forEach(n => {
    const time  = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date  = new Date(n.created_at).toLocaleDateString();
    const icon  = typeIcon[n.type] || '🔔';
    const color = typeColor[n.type] || '#64748b';
    const bg    = n.is_read ? 'transparent' : 'rgba(255,255,255,0.04)';

    const div = document.createElement('div');
    div.id = `sa-notif-${n.notification_id}`;

    div.style.cssText = `
      display:flex;
      gap:12px;
      padding:14px 20px;
      border-bottom:1px solid rgba(255,255,255,0.06);
      background:${bg};
      cursor:pointer;
    `;

    div.innerHTML = `
      <div style="font-size:18px;flex-shrink:0;margin-top:2px;">${icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;color:#e2e8f0;font-weight:${n.is_read ? '400' : '600'};line-height:1.45;">
          ${n.message}
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">
          ${date} at ${time}
        </div>
      </div>
      ${!n.is_read ? `<div style="width:7px;height:7px;border-radius:99px;background:${color};flex-shrink:0;margin-top:6px;"></div>` : ''}
    `;

    div.addEventListener('click', () => markOneSARead(n.notification_id));
    list.appendChild(div);
  });
}

function toggleSANotifications() {
  const dropdown = document.getElementById('sa-notif-dropdown');
  saNotifOpen = !saNotifOpen;

  if (dropdown) {
    dropdown.style.display = saNotifOpen ? 'block' : 'none';
  }

  if (saNotifOpen) renderSANotifications();
}

async function markOneSARead(id) {
  // instant UI feedback
  const el = document.getElementById(`sa-notif-${id}`);
  if (el) el.style.opacity = '0.4';

  await db
    .from('superadmin_notifications')
    .update({ is_read: true })
    .eq('notification_id', id);

  await renderSANotifications();
}

async function markAllSARead() {
  await db
    .from('superadmin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  await renderSANotifications();
}

async function clearAllSANotifications() {
  if (!confirm('Clear all notifications?')) return;

  const { error } = await db
    .from('superadmin_notifications')
    .delete()
    .neq('notification_id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    showToast('Error: ' + error.message, 'error');
    return;
  }

  const list  = document.getElementById('sa-notif-list');
  const badge = document.getElementById('sa-notif-badge');

  if (list) {
    list.innerHTML = `
      <div style="padding:28px 20px;text-align:center;color:#64748b;font-size:13px;">
        <div style="font-size:28px;margin-bottom:8px;">🔔</div>
        No notifications
      </div>`;
  }

  if (badge) badge.style.display = 'none';
}

document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('sa-notif-dropdown');
  const btn = document.querySelector('.notif-pill');

  if (saNotifOpen && dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = 'none';
    saNotifOpen = false;
  }
});

// ════════════════════════════════════════════════════════════
//  LOG ACTION
// ════════════════════════════════════════════════════════════
async function logAction(action) {
  try {
    const { data: { user } } = await db.auth.getUser();
    await db.from('audit_logs').insert({ user_id: user?.id ?? null, action });
  } catch (err) {
    console.warn('logAction failed (non-critical):', err);
  }
}

// ════════════════════════════════════════════════════════════
//  SYSTEM CONTROL
// ════════════════════════════════════════════════════════════
async function restartSystem() {
  if (!confirm('Restart the system? All active sessions will be refreshed.')) return;
  try {
    await db.from('settings').update({ value: 'online' }).eq('key', 'system_status');
    await logAction('System restart initiated by super admin');
    await updateSystemStatusPill();
    showToast('System is back online.', 'success');
    await loadStats();
    await loadAuditLogs();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function checkUpdates() {
  showToast('Checking system status...', 'success');
  try {
    const { data, error } = await db
      .from('settings')
      .select('value')
      .eq('key', 'system_status')
      .single();

    if (error) throw error;

    await logAction('System update check performed');
    showToast('✓ All systems operational. No updates required.', 'success');
  } catch (e) {
    showToast('Could not reach database.', 'error');
  }
}

async function toggleSystem() {
  try {
    const { data } = await db
      .from('settings')
      .select('value')
      .eq('key', 'system_status')
      .single();

    const isOnline = data?.value === 'online';

    if (isOnline) {
      if (!confirm('WARNING: This will set the system to offline mode. All users will be redirected to maintenance page. Proceed?')) return;
      await db.from('settings').update({ value: 'offline' }).eq('key', 'system_status');
      await logAction('System shutdown initiated by super admin');
      showToast('System is now offline.', 'error');
    } else {
      if (!confirm('Bring the system back online?')) return;
      await db.from('settings').update({ value: 'online' }).eq('key', 'system_status');
      await logAction('System restored by super admin');
      showToast('✓ System is back online.', 'success');
    }

    await updateSystemStatusPill();
    updateSystemToggleButton(isOnline ? 'offline' : 'online');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

function updateSystemToggleButton(status) {
  const btn  = document.getElementById('systemToggleBtn');
  const text = document.getElementById('systemToggleText');
  if (!btn || !text) return;

  if (status === 'offline') {
    btn.className  = 'btn-action bg-cyan';
    text.textContent = 'Restore System';
  } else {
    btn.className  = 'btn-action bg-red';
    text.textContent = 'Shutdown System';
  }
}

async function updateSystemStatusPill() {
  try {
    const { data } = await db
      .from('settings')
      .select('value')
      .eq('key', 'system_status')
      .single();

    const pill = document.getElementById('system-status-pill');
    const text = document.getElementById('system-status-text');
    const dot  = pill?.querySelector('.status-dot-glow');
    const status = data?.value || 'online';

    if (status === 'offline') {
      if (text) text.textContent = 'System Offline';
      if (dot)  { dot.style.background = '#ef4444'; dot.style.boxShadow = '0 0 8px #ef4444'; }
    } else {
      if (text) text.textContent = 'System Online';
      if (dot)  { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 8px #22c55e'; }
    }

    updateSystemToggleButton(status);

  } catch (e) {}
}
// ════════════════════════════════════════════════════════════
//  LOGOUT
// ════════════════════════════════════════════════════════════
function logoutUser() {
  if (typeof sessionLogout === 'function') {
    sessionLogout();
  } else {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function showToast(message, type = 'success') {
  const existing = document.getElementById('sa-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'sa-toast';
  toast.style.cssText = `
    position:fixed;bottom:28px;right:28px;padding:14px 22px;
    border-radius:12px;font-size:0.9rem;font-weight:600;color:#fff;
    z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.3);
    background:${type === 'success' ? '#16a34a' : '#ef4444'};
    transition:opacity 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ════════════════════════════════════════════════════════════
//  ESCAPE HTML
// ════════════════════════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  applySession();
  await Promise.all([
    loadStats(),
    loadGrowthChart(),
    loadTriageChart(),
    loadUrgencyChart(),
    loadAuditLogs(),
    loadAdminList(),
    renderSANotifications(),
    updateSystemStatusPill(),
  ]);

  setInterval(async () => {
    await loadStats();
    await loadGrowthChart();
    await loadTriageChart();
    await loadUrgencyChart();
    await renderSANotifications();
    await updateSystemStatusPill();
  }, 60000);
});