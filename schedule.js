const appointments = [
  { time: "09:00", patient: "James Wilson",    doctor: "Dr. Michael Chen",    status: "Scheduled",  priority: "medium" },
  { time: "10:30", patient: "Sarah Thompson",  doctor: "Dr. Emily Rodriguez", status: "Scheduled",  priority: "low"    },
  { time: "11:00", patient: "Maria Garcia",    doctor: "Dr. Emily Rodriguez", status: "Pending",    priority: "medium" },
  { time: "14:00", patient: "Robert Anderson", doctor: "Dr. Michael Chen",    status: "Confirmed",  priority: "high"   },
  { time: "15:30", patient: "David Lee",       doctor: "Dr. Michael Chen",    status: "Scheduled",  priority: "low"    }
];

function statusClass(s) {
  if (s === 'Confirmed') return 'badge-confirmed';
  if (s === 'Pending')   return 'badge-pending';
  return 'badge-scheduled';
}

function priorityClass(p) {
  if (p === 'high')   return 'badge-high';
  if (p === 'medium') return 'badge-medium';
  return 'badge-low';
}

function renderSchedule() {
  // Set date subtitle
  const today = new Date();
  document.getElementById('scheduleDate').textContent =
    `Appointments and tasks for ${today.toLocaleDateString('en-CA')}`;

  const now    = today.getHours() * 60 + today.getMinutes();
  const tbody  = document.getElementById('scheduleBody');

  tbody.innerHTML = appointments.map(a => {
    const [h, m] = a.time.split(':').map(Number);
    const past   = (h * 60 + m) < now;

    return `
      <tr class="${past ? 'row-past' : ''}">
        <td><strong>${a.time}</strong></td>
        <td>${a.patient}</td>
        <td>${a.doctor}</td>
        <td><span class="badge ${statusClass(a.status)}">${a.status}</span></td>
        <td><span class="badge ${priorityClass(a.priority)}">${a.priority}</span></td>
      </tr>
    `;
  }).join('');
}

renderSchedule();
