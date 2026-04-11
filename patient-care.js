const patients = [
  { name: "James Wilson",    age: 41, condition: "Hypertension",         urgency: "medium", lastVisit: "2026-03-10" },
  { name: "Sarah Thompson",  age: 34, condition: "Migraine",             urgency: "low",    lastVisit: "2026-03-12" },
  { name: "Robert Anderson", age: 58, condition: "Diabetes Type 2",      urgency: "high",   lastVisit: "2026-03-14" },
  { name: "Maria Garcia",    age: 27, condition: "Respiratory Infection", urgency: "medium", lastVisit: "2026-03-15" },
  { name: "David Lee",       age: 45, condition: "Asthma",               urgency: "low",    lastVisit: "2026-03-16" }
];

function urgencyClass(u) {
  if (u === 'high')   return 'badge-high';
  if (u === 'medium') return 'badge-medium';
  return 'badge-low';
}

function renderPatients() {
  const tbody = document.getElementById('patientBody');

  tbody.innerHTML = patients.map((p, i) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.age}</td>
      <td>${p.condition}</td>
      <td><span class="badge ${urgencyClass(p.urgency)}">${p.urgency}</span></td>
      <td>${p.lastVisit}</td>
      <td><button class="btn btn-outline" onclick="viewDetails(${i})">View Details</button></td>
    </tr>
  `).join('');
}

function viewDetails(i) {
  const p = patients[i];
  alert(`Patient: ${p.name}\nAge: ${p.age}\nCondition: ${p.condition}\nUrgency: ${p.urgency}\nLast Visit: ${p.lastVisit}`);
}

renderPatients();
