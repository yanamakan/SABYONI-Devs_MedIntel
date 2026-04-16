const appointments = [
  { time: "09:00", patient: "James Wilson",    doctor: "Dr. Michael Chen",    status: "Scheduled",  priority: "medium" },
  { time: "10:30", patient: "Sarah Thompson",  doctor: "Dr. Emily Rodriguez", status: "Scheduled",  priority: "low"    },
  { time: "11:00", patient: "Maria Garcia",    doctor: "Dr. Emily Rodriguez", status: "Pending",    priority: "medium" },
  { time: "14:00", patient: "Robert Anderson", doctor: "Dr. Michael Chen",    status: "Confirmed",  priority: "high"   },
  { time: "15:30", patient: "David Lee",       doctor: "Dr. Michael Chen",    status: "Scheduled",  priority: "low"    }
];

const STORAGE_KEY = 'schedule_done_' + new Date().toLocaleDateString('en-CA');

function loadDoneState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDoneState(doneList) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doneList));
}

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

function updateProgress(doneList) {
  const count = doneList.length;
  const total = appointments.length;

  // Update the stat card
  const statEl = document.getElementById('tasksCompletedStat');
  if (statEl) statEl.textContent = count;

  // Update the progress label below the table
  const labelEl = document.getElementById('progressLabel');
  if (labelEl) {
    labelEl.innerHTML = `<span>${count}</span> of ${total} tasks completed today`;
  }
}

function renderSchedule() {
  // Set date subtitle
  const today = new Date();
  document.getElementById('scheduleDate').textContent =
    `Appointments and tasks for ${today.toLocaleDateString('en-CA')}`;

  const now     = today.getHours() * 60 + today.getMinutes();
  const tbody   = document.getElementById('scheduleBody');
  const doneList = loadDoneState();

  tbody.innerHTML = appointments.map((a, index) => {
    const [h, m] = a.time.split(':').map(Number);
    const past   = (h * 60 + m) < now;
    const done   = doneList.includes(index);

    return `
      <tr class="${past ? 'row-past' : ''} ${done ? 'row-done' : ''}" data-index="${index}">
        <td>
          <input
            type="checkbox"
            class="task-checkbox"
            data-index="${index}"
            ${done ? 'checked' : ''}
            aria-label="Mark ${a.patient} appointment as done"
          />
        </td>
        <td><strong>${a.time}</strong></td>
        <td>${a.patient}</td>
        <td>${a.doctor}</td>
        <td><span class="badge ${statusClass(a.status)}">${a.status}</span></td>
        <td><span class="badge ${priorityClass(a.priority)}">${a.priority}</span></td>
      </tr>
    `;
  }).join('');

  updateProgress(doneList);

  // Attach checkbox listeners
  tbody.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const idx      = parseInt(checkbox.dataset.index, 10);
      const row      = tbody.querySelector(`tr[data-index="${idx}"]`);
      let   doneNow  = loadDoneState();

      if (checkbox.checked) {
        if (!doneNow.includes(idx)) doneNow.push(idx);
        row.classList.add('row-done');
      } else {
        doneNow = doneNow.filter(i => i !== idx);
        row.classList.remove('row-done');
      }

      saveDoneState(doneNow);
      updateProgress(doneNow);
    });
  });
}

renderSchedule();