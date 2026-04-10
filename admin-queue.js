// admin-queue.js

const queue = [
  {
    name: "James Wilson",
    condition: "Hypertension",
    phone: "+27 82 123 4567",
    urgency: "medium",
    next: "2026-03-20",
    aiSummary: "Patient reports recurring chest discomfort. History of high blood pressure. Recommended: ECG, Blood pressure monitoring."
  },
  {
    name: "Sarah Thompson",
    condition: "Migraine",
    phone: "+27 83 456 7890",
    urgency: "low",
    next: "2026-03-18",
    aiSummary: "Recurring headaches, photophobia. Duration: 3 days. Possible migraine. Recommended: Neurological assessment."
  },
  {
    name: "Robert Anderson",
    condition: "Diabetes Type 2",
    phone: "+27 84 789 0123",
    urgency: "high",
    next: "2026-03-17",
    aiSummary: "Elevated blood glucose levels. Patient reports dizziness and frequent urination. Urgent: Blood sugar monitoring, A1C test."
  },
  {
    name: "Maria Garcia",
    condition: "Respiratory Infection",
    phone: "+27 85 012 3456",
    urgency: "medium",
    next: "2026-03-16",
    aiSummary: "Persistent cough with fever. O2 saturation at 94%. Recommended: Chest X-ray, sputum culture."
  },
  {
    name: "David Lee",
    condition: "Asthma",
    phone: "+27 86 345 6789",
    urgency: "low",
    next: "2026-03-16",
    aiSummary: "Mild wheezing reported. Inhaler usage increased over past week. Recommended: Spirometry, review medication dosage."
  }
];

/* ── Sort: high → medium → low ── */
const urgencyOrder = { high: 0, medium: 1, low: 2 };
queue.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

function urgencyBadge(u) {
  if (u === 'high')   return `<span class="badge badge-high">HIGH</span>`;
  if (u === 'medium') return `<span class="badge badge-medium">MEDIUM</span>`;
  return `<span class="badge badge-low">LOW</span>`;
}

function urgentIcon(u) {
  return u === 'high'
    ? `<span class="urgent-icon" title="Urgent">&#9888;</span>`
    : '';
}

function renderQueue() {
  const list = document.getElementById('queueList');

  list.innerHTML = queue.map((p, i) => `
    <div class="queue-card queue-${p.urgency}">
      <div class="queue-top">
        <div class="queue-avatar">${i + 1}</div>
        <div class="queue-info">
          <div class="queue-name">${p.name}</div>
          <div class="queue-condition">${p.condition}</div>
          <div class="queue-phone">&#128222; ${p.phone}</div>
        </div>
        <div class="queue-right">
          <div class="queue-badges">
            ${urgencyBadge(p.urgency)}
            ${urgentIcon(p.urgency)}
          </div>
          <div class="queue-next">Next: ${p.next}</div>
        </div>
      </div>
      <div class="queue-divider"></div>
      <div class="queue-summary">
        <span class="ai-label">AI Summary:</span>
        ${p.aiSummary}
      </div>
    </div>
  `).join('');
}

renderQueue();
