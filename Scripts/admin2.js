/* ============================================================
   admin.js — MedIntel Admin Dashboard
   ============================================================ */

/* ── TAB SWITCHING ── */
function switchTab(name, btn) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  // Deactivate all tabs
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  // Show selected tab & activate button
  document.getElementById('tab-' + name).style.display = 'block';
  btn.classList.add('active');
}

/* ── NOTIFICATIONS ── */
function toggleNotif() {
  const popup = document.getElementById('notifPopup');
  popup.classList.toggle('show');
}

function clearNotifs() {
  document.getElementById('notifList').innerHTML =
    '<div class="notif-item" style="color:#9ca3af;">No new notifications</div>';
  document.getElementById('notifCount').textContent = '0';
  document.getElementById('notifCount').style.background = '#9ca3af';
}

// Close popup when clicking outside
document.addEventListener('click', function(e) {
  const popup = document.getElementById('notifPopup');
  const btn = e.target.closest('.header-btn');
  if (!popup.contains(e.target) && !btn) {
    popup.classList.remove('show');
  }
});

/* ── MODALS ── */
function openAddStaffModal() {
  clearModalErrors();
  document.getElementById('addStaffModal').classList.remove('hidden');
}

function openScheduleModal() {
  document.getElementById('scheduleModal').classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Close modal on backdrop click
document.addEventListener('click', function(e) {
  document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
    if (e.target === modal) modal.classList.add('hidden');
  });
});

/* ── ADD STAFF ── */
function clearModalErrors() {
  ['errStaffName','errStaffEmail','errStaffRole','errStaffDept','errStaffPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function submitAddStaff() {
  clearModalErrors();
  const name  = document.getElementById('staffName').value.trim();
  const email = document.getElementById('staffEmail').value.trim();
  const role  = document.getElementById('staffRole').value;
  const dept  = document.getElementById('staffDept').value;
  const spec  = document.getElementById('staffSpec').value.trim();
  const pass  = document.getElementById('staffPass').value;

  let valid = true;
  if (!name)  { document.getElementById('errStaffName').textContent  = 'Name is required';     valid = false; }
  if (!email) { document.getElementById('errStaffEmail').textContent = 'Email is required';    valid = false; }
  if (!role)  { document.getElementById('errStaffRole').textContent  = 'Role is required';     valid = false; }
  if (!dept)  { document.getElementById('errStaffDept').textContent  = 'Department required';  valid = false; }
  if (!pass)  { document.getElementById('errStaffPass').textContent  = 'Password is required'; valid = false; }
  if (!valid) return;

  if (role === 'doctor') {
    addDoctorRow(name, email, dept, spec || 'Doctor');
    updateStat('statDoctors', 1);
    updateTabLabel('doctors');
  } else {
    addNurseRow(name, email, dept);
    updateStat('statNurses', 1);
    updateTabLabel('nurses');
  }

  closeModal('addStaffModal');

  // Reset form
  ['staffName','staffEmail','staffSpec','staffPass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('staffRole').value = '';
  document.getElementById('staffDept').value = '';
}

function addDoctorRow(name, email, dept, spec) {
  const tbody = document.getElementById('doctorsTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>
      <div class="td-name">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
          <circle cx="20" cy="10" r="2"/>
        </svg>
        ${name}
      </div>
    </td>
    <td>${email}</td>
    <td><span class="badge-dept">${dept}</span></td>
    <td>${spec}</td>
    <td><span class="badge-active">Active</span></td>
    <td>
      <button class="btn btn-red" onclick="removeDoctor('${name}', this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        Remove
      </button>
    </td>`;
  tbody.appendChild(row);
}

function addNurseRow(name, email, dept) {
  const tbody = document.getElementById('nursesTableBody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>
      <div class="td-name">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        ${name}
      </div>
    </td>
    <td>${email}</td>
    <td><span class="badge-dept">${dept}</span></td>
    <td><span class="badge-active">Active</span></td>
    <td>
      <button class="btn btn-red" onclick="removeNurse('${name}', this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        Remove
      </button>
    </td>`;
  tbody.appendChild(row);
}

/* ── REMOVE STAFF ── */
function removeDoctor(name, btn) {
  if (!confirm(`Remove ${name} from the system?`)) return;
  const row = (btn || document.querySelector(`#doctorsTableBody button[onclick*="${name}"]`)).closest('tr');
  row.remove();
  updateStat('statDoctors', -1);
  updateTabLabel('doctors');
}

function removeNurse(name, btn) {
  if (!confirm(`Remove ${name} from the system?`)) return;
  const row = (btn || document.querySelector(`#nursesTableBody button[onclick*="${name}"]`)).closest('tr');
  row.remove();
  updateStat('statNurses', -1);
  updateTabLabel('nurses');
}

/* ── CONFIRM APPOINTMENT ── */
function confirmAppt(btn, patient) {
  const row = btn.closest('tr');
  // Update status badge
  const statusCell = row.cells[4];
  statusCell.innerHTML = '<span class="badge-confirmed">Confirmed</span>';
  // Replace button with greyed text
  btn.closest('td').innerHTML = '<span class="action-confirmed-text">Confirmed</span>';
  // Update urgent count if high
  const urgencyCell = row.cells[5];
  if (urgencyCell.querySelector('.badge-high')) {
    updateStat('statUrgent', -1);
  }
}

/* ── SCHEDULE APPOINTMENT ── */
function submitSchedule() {
  const patient  = document.getElementById('apptPatient').value.trim();
  const doctor   = document.getElementById('apptDoctor').value;
  const date     = document.getElementById('apptDate').value;
  const time     = document.getElementById('apptTime').value;
  const urgency  = document.getElementById('apptUrgency').value;
  const status   = document.getElementById('apptStatus').value;

  if (!patient || !doctor || !date || !time) {
    alert('Please fill in all required fields.');
    return;
  }

  const tbody = document.getElementById('appointmentsTableBody');
  const fmtTime = time.substring(0,5);

  const urgencyBadge = {
    high:   '<span class="badge-high">high</span>',
    medium: '<span class="badge-medium">medium</span>',
    low:    '<span class="badge-low">low</span>',
  }[urgency];

  const statusBadge = {
    scheduled: '<span class="badge-scheduled">Scheduled</span>',
    pending:   '<span class="badge-pending">Pending</span>',
  }[status];

  const actionBtn = status === 'pending'
    ? `<button class="btn btn-green" onclick="confirmAppt(this, '${patient}')">
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
         Confirm
       </button>`
    : '';

  const row = document.createElement('tr');
  row.innerHTML = `
    <td style="font-weight:700;color:#111827;">${patient}</td>
    <td>${doctor}</td>
    <td>${date}</td>
    <td>
      <span class="td-time">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${fmtTime}
      </span>
    </td>
    <td>${statusBadge}</td>
    <td>${urgencyBadge}</td>
    <td>${actionBtn}</td>`;
  tbody.appendChild(row);

  updateStat('statAppointments', 1);
  if (urgency === 'high') updateStat('statUrgent', 1);

  closeModal('scheduleModal');
  // Reset
  ['apptPatient','apptDate','apptTime'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('apptDoctor').value = '';
}

/* ── STAT COUNTER HELPERS ── */
function updateStat(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  el.textContent = Math.max(0, current + delta);
}

function updateTabLabel(type) {
  const counts = {
    doctors: document.getElementById('doctorsTableBody')?.rows.length || 0,
    nurses:  document.getElementById('nursesTableBody')?.rows.length || 0,
  };
  const labels = { doctors: 'Doctors', nurses: 'Nurses' };
  document.querySelectorAll('.tab').forEach(tab => {
    const label = labels[type];
    if (label && tab.textContent.startsWith(label)) {
      tab.textContent = `${label} (${counts[type]})`;
    }
  });
}

/* ── LOGOUT ── */
function handleLogout() {
  
    window.location.href = 'login.html';
  
}