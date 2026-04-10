let currentPatientIndex = null;

const patients = [
  {
    name: "James Wilson",
    condition: "Hypertension",
    bp: "120/80", hr: "72 bpm", temp: "36.8°C", spo2: "98%"
  },
  {
    name: "Sarah Thompson",
    condition: "Migraine",
    bp: "120/80", hr: "72 bpm", temp: "36.8°C", spo2: "98%"
  },
  {
    name: "Robert Anderson",
    condition: "Diabetes Type 2",
    bp: "120/80", hr: "72 bpm", temp: "36.8°C", spo2: "98%"
  },
  {
    name: "Maria Garcia",
    condition: "Respiratory Infection",
    bp: "120/80", hr: "72 bpm", temp: "36.8°C", spo2: "98%"
  },
  {
    name: "David Lee",
    condition: "Asthma",
    bp: "120/80", hr: "72 bpm", temp: "36.8°C", spo2: "98%"
  }
];

function renderVitalCards() {
  const container = document.getElementById('vitalCards');

  container.innerHTML = patients.map((p, i) => `
    <div class="vital-patient-card">
      <div class="vpc-header">
        <div>
          <div class="vpc-name">${p.name}</div>
          <div class="vpc-condition">${p.condition}</div>
        </div>
        <div class="vpc-actions">
          <button class="btn btn-teal" onclick="openModal(${i})">&#9195; Record Vitals</button>
          <button class="btn btn-outline" onclick="viewHistory(${i})">&#128196; View History</button>
        </div>
      </div>
      <div class="vpc-divider"></div>
      <div class="vpc-stats" id="stats-${i}">
        <div class="vpc-stat">
          <div class="vpc-stat-label">Blood Pressure</div>
          <div class="vpc-stat-value">${p.bp}</div>
        </div>
        <div class="vpc-stat">
          <div class="vpc-stat-label">Heart Rate</div>
          <div class="vpc-stat-value">${p.hr}</div>
        </div>
        <div class="vpc-stat">
          <div class="vpc-stat-label">Temperature</div>
          <div class="vpc-stat-value">${p.temp}</div>
        </div>
        <div class="vpc-stat">
          <div class="vpc-stat-label">O2 Saturation</div>
          <div class="vpc-stat-value">${p.spo2}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function openModal(i) {
  currentPatientIndex = i;
  document.getElementById('modalPatientName').textContent = patients[i].name;
  document.getElementById('mBP').value   = '';
  document.getElementById('mHR').value   = '';
  document.getElementById('mTemp').value = '';
  document.getElementById('mSPO2').value = '';
  document.getElementById('vitalModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('vitalModal').classList.add('hidden');
  currentPatientIndex = null;
}

function saveVitals() {
  const i    = currentPatientIndex;
  const bp   = document.getElementById('mBP').value.trim()   || patients[i].bp;
  const hr   = document.getElementById('mHR').value.trim()   || patients[i].hr.replace(' bpm','');
  const temp = document.getElementById('mTemp').value.trim() || patients[i].temp.replace('°C','');
  const spo2 = document.getElementById('mSPO2').value.trim() || patients[i].spo2.replace('%','');

  patients[i].bp   = bp;
  patients[i].hr   = hr + ' bpm';
  patients[i].temp = temp + '°C';
  patients[i].spo2 = spo2 + '%';

  closeModal();
  renderVitalCards();
}

function viewHistory(i) {
  alert(`Viewing history for ${patients[i].name}\n(Connect to your backend to show full history)`);
}

renderVitalCards();
