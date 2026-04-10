// admin-appointments.js

let appointments = [
  { patient: "James Wilson",    doctor: "Dr. Michael Chen",    date: "2026-03-20", time: "09:00", status: "Scheduled",  urgency: "medium" },
  { patient: "Sarah Thompson",  doctor: "Dr. Emily Rodriguez", date: "2026-03-18", time: "10:30", status: "Scheduled",  urgency: "low"    },
  { patient: "Robert Anderson", doctor: "Dr. Michael Chen",    date: "2026-03-17", time: "14:00", status: "Confirmed",  urgency: "high"   },
  { patient: "Maria Garcia",    doctor: "Dr. Emily Rodriguez", date: "2026-03-16", time: "11:00", status: "Pending",    urgency: "medium" },
  { patient: "David Lee",       doctor: "Dr. Michael Chen",    date: "2026-03-16", time: "15:30", status: "Scheduled",  urgency: "low"    }
];

/* ── BADGES ── */
function statusBadge(s) {
  if (s === 'Confirmed') return `<span class="badge badge-confirmed">Confirmed</span>`;
  if (s === 'Pending')   return `<span class="badge badge-pending">Pending</span>`;
  return `<span class="badge badge-scheduled">Scheduled</span>`;
}

function urgencyBadge(u) {
  if (u === 'high')   return `<span class="badge badge-high">high</span>`;
  if (u === 'medium') return `<span class="badge badge-medium">medium</span>`;
  return `<span class="badge badge-low">low</span>`;
}

/* ── ACTION BUTTON ── */
function actionBtn(status, i) {
  if (status === 'Confirmed') {
    return `<span class="text-muted">Confirmed</span>`;
  }
  if (status === 'Pending') {
    return `<button class="btn btn-green" onclick="confirmAppointment(${i})">&#10003; Confirm</button>`;
  }
  return '';
}

/* ── RENDER ── */
function renderAppointments() {
  const tbody = document.getElementById('appointmentBody');

  if (!appointments.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No appointments found.</td></tr>';
    return;
  }

  tbody.innerHTML = appointments.map((a, i) => `
    <tr>
      <td><strong>${a.patient}</strong></td>
      <td>${a.doctor}</td>
      <td>${a.date}</td>
      <td>&#128336; ${a.time}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${urgencyBadge(a.urgency)}</td>
      <td>${actionBtn(a.status, i)}</td>
    </tr>
  `).join('');
}

/* ── CONFIRM ── */
function confirmAppointment(i) {
  appointments[i].status = 'Confirmed';
  renderAppointments();
}

/* ── SCHEDULE MODAL ── */
function openScheduleModal() {
  document.getElementById('scheduleModal').classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleModal').classList.add('hidden');
  ['apptPatient', 'apptDate', 'apptTime'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('apptDoctor').value = '';
  ['apptPatientError', 'apptDoctorError', 'apptDateError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

function scheduleAppointment() {
  let valid = true;

  const patient  = document.getElementById('apptPatient').value.trim();
  const doctor   = document.getElementById('apptDoctor').value;
  const date     = document.getElementById('apptDate').value;
  const time     = document.getElementById('apptTime').value || '09:00';
  const urgency  = document.getElementById('apptUrgency').value;

  ['apptPatientError', 'apptDoctorError', 'apptDateError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  if (!patient) {
    document.getElementById('apptPatientError').textContent = 'Patient name is required.';
    valid = false;
  }
  if (!doctor) {
    document.getElementById('apptDoctorError').textContent = 'Please select a doctor.';
    valid = false;
  }
  if (!date) {
    document.getElementById('apptDateError').textContent = 'Date is required.';
    valid = false;
  }

  if (!valid) return;

  appointments.push({ patient, doctor, date, time, status: 'Scheduled', urgency });
  closeScheduleModal();
  renderAppointments();
}

/* ── INIT ── */
renderAppointments();
