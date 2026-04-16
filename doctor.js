/* ============================================================
   doctor.js — MedIntel Doctor Dashboard
   ============================================================ */
 
// ── DATA ──────────────────────────────────────────────────────────
const patients = [
  {
    id: 1, name: "James Wilson", age: 41, gender: "Male", priority: "medium",
    condition: "Hypertension", lastVisit: "2026-03-10", nextAppointment: "2026-03-20",
    email: "james.wilson@example.com", phone: "+27 82 123 4567",
    history: [
      { title: "Hypertension", date: "2026-02-15", notes: "Blood pressure: 145/95. Prescribed Amlodipine 5mg.", doctor: "Dr. Michael Chen" },
      { title: "Annual Checkup", date: "2026-01-10", notes: "General health good. Continue current medications.", doctor: "Dr. Emily Rodriguez" },
    ],
    prescriptions: [{ name: "Amlodipine", dose: "5mg", frequency: "Once daily" }],
  },
  {
    id: 2, name: "Sarah Thompson", age: 34, gender: "Female", priority: "low",
    condition: "Migraine", lastVisit: "2026-03-12", nextAppointment: "2026-04-05",
    email: "sarah.thompson@example.com", phone: "+27 83 456 7890",
    history: [
      { title: "Migraine Assessment", date: "2026-03-12", notes: "Prescribed Sumatriptan 50mg as needed.", doctor: "Dr. Michael Chen" },
    ],
    prescriptions: [{ name: "Sumatriptan", dose: "50mg", frequency: "As needed" }],
  },
  {
    id: 3, name: "Robert Anderson", age: 58, gender: "Male", priority: "high",
    condition: "Diabetes Type 2", lastVisit: "2026-03-14", nextAppointment: "2026-03-28",
    email: "robert.anderson@example.com", phone: "+27 71 234 5678",
    history: [
      { title: "Diabetes Review", date: "2026-03-14", notes: "HbA1c: 9.2%. Increased Metformin dosage.", doctor: "Dr. Michael Chen" },
      { title: "Foot Examination", date: "2026-02-01", notes: "No signs of neuropathy. Continue monitoring.", doctor: "Dr. Emily Rodriguez" },
    ],
    prescriptions: [
      { name: "Metformin", dose: "1000mg", frequency: "Twice daily" },
      { name: "Insulin Glargine", dose: "20 units", frequency: "Once nightly" },
    ],
  },
  {
    id: 4, name: "Maria Garcia", age: 27, gender: "Female", priority: "medium",
    condition: "Respiratory Infection", lastVisit: "2026-03-15", nextAppointment: "2026-03-22",
    email: "maria.garcia@example.com", phone: "+27 79 345 6789",
    history: [
      { title: "Respiratory Assessment", date: "2026-03-15", notes: "Prescribed Amoxicillin 500mg for 7 days.", doctor: "Dr. Michael Chen" },
    ],
    prescriptions: [{ name: "Amoxicillin", dose: "500mg", frequency: "Three times daily" }],
  },
];
 
const appointments = [
  { patient: "James Wilson",  date: "2026-03-16", time: "09:00", status: "Completed", priority: "medium" },
  { patient: "Robert Anderson", date: "2026-03-16", time: "10:00", status: "Completed", priority: "high" },
  { patient: "Maria Garcia",  date: "2026-03-16", time: "11:00", status: "Pending",   priority: "medium" },
  { patient: "David Lee",     date: "2026-03-16", time: "15:30", status: "Scheduled", priority: "low" },
  { patient: "Sarah Thompson",date: "2026-04-05", time: "14:00", status: "Scheduled", priority: "low" },
  { patient: "James Wilson",  date: "2026-03-20", time: "09:30", status: "Scheduled", priority: "medium" },
];
 
const facilities = [
  { name: "City Medical Center",       rating: 4.8, distance: "1.2 km away", address: "123 Main Street, Johannesburg", phone: "+27 11 123 4567", hours: "Mon-Fri: 8AM-6PM", tags: ["General Practice","Pharmacy","Emergency"], proximity: "Nearby" },
  { name: "Sandton Health Clinic",     rating: 4.6, distance: "2.5 km away", address: "45 Rivonia Road, Sandton",       phone: "+27 11 234 5678", hours: "Mon-Sat: 7AM-8PM", tags: ["Specialists","Pharmacy","Lab Tests"],     proximity: "Close" },
  { name: "Melrose Arch Medical Centre",rating:4.7, distance: "3.2 km away", address: "Melrose Arch, Johannesburg",    phone: "+27 11 678 9012", hours: "Mon-Sat: 8AM-7PM", tags: ["Specialists","Dentistry","Optometry","Pharmacy"], proximity: "Close" },
  { name: "Rosebank Medical Plaza",    rating: 4.7, distance: "3.8 km away", address: "78 Oxford Road, Rosebank",      phone: "+27 11 345 6789", hours: "Mon-Fri: 9AM-5PM", tags: ["General Practice","Pharmacy","Radiology"], proximity: "Close" },
  { name: "Greenside Family Clinic",   rating: 4.5, distance: "4.1 km away", address: "Gleneagles Road, Greenside",   phone: "+27 11 567 8901", hours: "Mon-Fri: 8AM-5PM", tags: ["General Practice","Pediatrics","Vaccinations"], proximity: "Far" },
  { name: "Fourways Life Hospital",    rating: 4.9, distance: "5.2 km away", address: "Cedar Road, Fourways",         phone: "+27 11 456 7890", hours: "24/7 Emergency",   tags: ["Hospital","Emergency","Pharmacy","Surgery"],   proximity: "Far" },
];
 
const aiSummaryCache = {};
let currentPatient = null;
let anatomyNotes = {};  // { patientId: [{part, note, timestamp}] }
 
// ── TAB SWITCHING ─────────────────────────────────────────────────
const TAB_MAP = {
  patients: "tab-patients",
  anatomy:  "tab-anatomy",
  appointments: "tab-appointments",
  map:      "tab-map",
  settings: "tab-settings",
};
 
function switchTab(tabKey) {
  Object.values(TAB_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
 
  const target = document.getElementById(TAB_MAP[tabKey]);
  if (!target) return;
 
  if (tabKey === "patients") {
    target.style.display = "grid";
  } else {
    target.style.display = "block";
    // Refresh dynamic content for tab
    if (tabKey === "anatomy")      renderAnatomyTab();
    if (tabKey === "appointments") renderAppointments();
    if (tabKey === "map")          renderFacilities("nearest");
  }
 
  document.querySelectorAll(".tab").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === tabKey)
  );
}
 
document.querySelectorAll(".tab").forEach(btn =>
  btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);
 
// ── PATIENT QUEUE ─────────────────────────────────────────────────
function renderQueue(list) {
  const queue = document.getElementById("patient-queue");
  queue.innerHTML = "";
 
  list.forEach((patient, i) => {
    const card = document.createElement("div");
    card.classList.add("patient-card");
    if (i === 0) card.classList.add("active");
    card.dataset.patientId = patient.id;
 
    card.innerHTML = `
      <div class="card-top">
        <h4 class="patient-card-name">${patient.name}</h4>
        <span class="tag ${patient.priority}">${patient.priority}</span>
      </div>
      <p class="patient-card-condition">${patient.condition}</p>
      <small class="patient-card-visit">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Last visit: ${patient.lastVisit}
      </small>
    `;
 
    card.addEventListener("click", () => {
      document.querySelectorAll(".patient-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      showDetails(patient);
    });
 
    queue.appendChild(card);
  });
 
  if (list.length > 0) showDetails(list[0]);
}
 
// ── PATIENT DETAILS ───────────────────────────────────────────────
function showDetails(patient) {
  currentPatient = patient;
 
  document.getElementById("empty-state").style.display          = "none";
  document.getElementById("ai-summary").style.display           = "block";
  document.getElementById("info-grid").style.display            = "grid";
  document.getElementById("history-section").style.display      = "block";
  document.getElementById("prescriptions-section").style.display = "block";
 
  document.getElementById("detail-name").textContent = patient.name;
  document.getElementById("detail-meta").textContent = `${patient.age} years • ${patient.gender}`;
 
  const badge = document.getElementById("detail-priority");
  badge.textContent = `${patient.priority.toUpperCase()} PRIORITY`;
  badge.className = `priority-badge ${patient.priority}`;
 
  document.getElementById("detail-email").textContent      = patient.email;
  document.getElementById("detail-phone").textContent      = patient.phone;
  document.getElementById("detail-last-visit").textContent = patient.lastVisit;
  document.getElementById("detail-next-appt").textContent  = patient.nextAppointment;
 
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";
  patient.history.forEach(entry => {
    const item = document.createElement("div");
    item.classList.add("history-item");
    item.innerHTML = `
      <div class="history-item-header">
        <strong>${entry.title}</strong>
        <span class="history-date">${entry.date}</span>
      </div>
      <p>${entry.notes}</p>
      <a class="history-doctor">By: ${entry.doctor}</a>
    `;
    historyList.appendChild(item);
  });
 
  const rxList = document.getElementById("prescriptions-list");
  rxList.innerHTML = "";
  patient.prescriptions.forEach(rx => {
    const item = document.createElement("div");
    item.classList.add("rx-item");
    item.innerHTML = `
      <div class="rx-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      </div>
      <div><strong>${rx.name}</strong><p>${rx.dose} • ${rx.frequency}</p></div>
    `;
    rxList.appendChild(item);
  });
 
  fetchAISummary(patient);
}
 
// ── AI SUMMARY ────────────────────────────────────────────────────
async function fetchAISummary(patient) {
  const el = document.getElementById("ai-summary-text");
 
  if (aiSummaryCache[patient.id]) {
    el.textContent = aiSummaryCache[patient.id];
    el.classList.remove("loading");
    return;
  }
 
  el.textContent = "Generating AI summary…";
  el.classList.add("loading");
 
  const historyText = patient.history.map(h => `• ${h.title} (${h.date}): ${h.notes}`).join("\n");
  const rxText      = patient.prescriptions.map(r => `• ${r.name} ${r.dose}, ${r.frequency}`).join("\n");
 
  const prompt = `You are a clinical AI assistant. Generate a concise 1-2 sentence clinical summary for a doctor reviewing this patient before their visit.
 
Patient: ${patient.name}, ${patient.age}-year-old ${patient.gender}
Primary condition: ${patient.condition}
Last visit: ${patient.lastVisit}
 
Medical history:\n${historyText}
Current prescriptions:\n${rxText}
 
Write only the summary sentence(s). No intro, no labels, no markdown. Be clinically precise and actionable.`;
 
  try {
    const res  = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data    = await res.json();
    const summary = data.content?.[0]?.text?.trim() || "Unable to generate summary.";
    aiSummaryCache[patient.id] = summary;
    el.textContent = summary;
  } catch {
    el.textContent = "AI summary unavailable.";
  } finally {
    el.classList.remove("loading");
  }
}
 
// ── ANATOMY TAB ───────────────────────────────────────────────────
function renderAnatomyTab() {
  const p = currentPatient || patients[0];
  document.getElementById("anatomy-patient-name").textContent = p.name;
  document.getElementById("anatomy-viewer-name").textContent  = p.name;
  // Reset marker
  document.getElementById("anatomy-marker").setAttribute("cx", -100);
  document.getElementById("anatomy-marker").setAttribute("cy", -100);
  document.getElementById("selected-body-part").textContent = "—";
  document.getElementById("anatomy-selected-confirm").style.display = "none";
  document.getElementById("anatomy-note-text").value = "";
  renderAnatomyNotes(p.id);
}
 
// Click on SVG body
document.getElementById("body-svg").addEventListener("click", function(e) {
  const part = e.target.dataset.part;
  const svg  = this;
  const pt   = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
 
  // Move marker
  const marker = document.getElementById("anatomy-marker");
  marker.setAttribute("cx", svgP.x);
  marker.setAttribute("cy", svgP.y);
 
  document.getElementById("selected-body-part").textContent = part || "Body";
  document.getElementById("anatomy-selected-confirm").style.display = "block";
});
 
// Save anatomy note
document.getElementById("anatomy-save-btn").addEventListener("click", () => {
  const p    = currentPatient || patients[0];
  const part = document.getElementById("selected-body-part").textContent;
  const note = document.getElementById("anatomy-note-text").value.trim();
 
  if (!note || part === "—") {
    alert("Please click a body part and enter a note first.");
    return;
  }
 
  if (!anatomyNotes[p.id]) anatomyNotes[p.id] = [];
  anatomyNotes[p.id].push({ part, note, timestamp: new Date().toLocaleString() });
 
  document.getElementById("anatomy-note-text").value = "";
  renderAnatomyNotes(p.id);
  alert("Note saved to patient record!");
});
 
// Reset anatomy view
document.getElementById("anatomy-reset").addEventListener("click", () => {
  document.getElementById("anatomy-marker").setAttribute("cx", -100);
  document.getElementById("anatomy-marker").setAttribute("cy", -100);
  document.getElementById("selected-body-part").textContent = "—";
  document.getElementById("anatomy-selected-confirm").style.display = "none";
});
 
function renderAnatomyNotes(patientId) {
  const notes = anatomyNotes[patientId] || [];
  const list  = document.getElementById("anatomy-notes-list");
  document.getElementById("anatomy-note-count").textContent = notes.length;
 
  if (notes.length === 0) {
    list.innerHTML = '<p class="anatomy-no-notes">No notes recorded yet</p>';
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="anatomy-note-entry">
      <div class="anatomy-note-part">${n.part}</div>
      <p>${n.note}</p>
      <small>${n.timestamp}</small>
    </div>
  `).join("");
}
 
// ── APPOINTMENTS ──────────────────────────────────────────────────
function renderAppointments() {
  const tbody = document.getElementById("appointments-tbody");
  tbody.innerHTML = "";
 
  appointments.forEach(a => {
    const tr = document.createElement("tr");
    const statusClass = a.status === "Completed" ? "status-completed"
                      : a.status === "Pending"   ? "status-pending"
                      : "status-scheduled";
    tr.innerHTML = `
      <td><strong>${a.patient}</strong></td>
      <td>${a.date}</td>
      <td>${a.time}</td>
      <td><span class="appt-status ${statusClass}">${a.status}</span></td>
      <td><span class="tag ${a.priority}">${a.priority}</span></td>
      <td><button class="view-patient-btn" onclick="jumpToPatient('${a.patient}')">View Patient</button></td>
    `;
    tbody.appendChild(tr);
  });
}
 
function jumpToPatient(name) {
  const p = patients.find(p => p.name === name);
  if (p) {
    switchTab("patients");
    document.querySelectorAll(".patient-card").forEach(c => {
      c.classList.toggle("active", parseInt(c.dataset.patientId) === p.id);
    });
    showDetails(p);
  } else {
    alert(`${name} is not yet in the patient record system.`);
  }
}
 
// ── CLINIC MAP / FACILITIES ───────────────────────────────────────
let currentFilter = "nearest";
 
function renderFacilities(filter) {
  currentFilter = filter;
  const grid = document.getElementById("facility-grid");
  grid.innerHTML = "";
 
  let sorted = [...facilities];
  if (filter === "toprated") sorted.sort((a, b) => b.rating - a.rating);
 
  sorted.forEach(f => {
    const proximityClass = f.proximity === "Nearby" ? "prox-nearby"
                         : f.proximity === "Close"  ? "prox-close"
                         : "prox-far";
    const card = document.createElement("div");
    card.classList.add("facility-card");
    card.innerHTML = `
      <div class="facility-card-header">
        <div>
          <h4>${f.name}</h4>
          <p class="facility-rating">⭐ ${f.rating} <span class="facility-distance">• ${f.distance}</span></p>
        </div>
        <span class="facility-proximity ${proximityClass}">${f.proximity}</span>
      </div>
      <p class="facility-info">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${f.address}
      </p>
      <p class="facility-info">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.12.96.34 1.9.65 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.02-1.02a2 2 0 0 1 2.11-.45c.91.31 1.85.53 2.81.65A2 2 0 0 1 22 16.92z"/></svg>
        ${f.phone}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:8px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${f.hours}
      </p>
      <div class="facility-tags">
        ${f.tags.map(t => `<span class="facility-tag">${t}</span>`).join("")}
      </div>
    `;
    grid.appendChild(card);
  });
 
  document.querySelectorAll(".map-filter-btn").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.filter === filter)
  );
}
 
document.querySelectorAll(".map-filter-btn").forEach(btn =>
  btn.addEventListener("click", () => renderFacilities(btn.dataset.filter))
);
 
// ── SETTINGS SUB-TABS ─────────────────────────────────────────────
document.querySelectorAll(".settings-subtab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".settings-subtab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
 
    document.querySelectorAll(".settings-panel").forEach(p => p.style.display = "none");
    const target = document.getElementById(`stab-${btn.dataset.stab}`);
    if (target) target.style.display = "block";
  });
});
 
// Dark mode toggle
document.getElementById("dark-mode-toggle").addEventListener("change", function() {
  document.body.classList.toggle("dark-mode", this.checked);
});
 
// ── HEADER BUTTONS ────────────────────────────────────────────────
document.getElementById("notif-btn").addEventListener("click", () => {
  alert("Notifications:\n• Robert Anderson flagged as HIGH priority\n• James Wilson appointment in 30 min");
});
 
document.querySelector(".logout-btn").addEventListener("click", () => {
  if (confirm("Are you sure you want to log out?")) {
    window.location.href = "login.html";
  }
});
 
// ── INIT ──────────────────────────────────────────────────────────
renderQueue(patients);
switchTab("patients");