const patients = [
  {
    name: "Sarah Thompson",
    submitted: "4/10/2026, 10:59:20 PM",
    priority: "MEDIUM",
    symptoms: "Experiencing severe headaches with light sensitivity, nausea, and occasional dizziness. Symptoms started 3 days ago.",
    analysis: {
      chief: "Severe headaches with photophobia",
      duration: "Acute (3 days)",
      causes: ["Migraine", "Tension headache", "Cluster headache"],
      tests: ["Blood pressure check", "Neurological assessment", "CT scan if symptoms persist"],
      confidence: 89
    }
  },
  {
    name: "James Okafor",
    submitted: "4/11/2026, 8:14:05 AM",
    priority: "HIGH",
    symptoms: "Chest tightness and shortness of breath for the past 2 hours. Reports mild sweating. No prior cardiac history.",
    analysis: {
      chief: "Chest pain with dyspnea",
      duration: "Acute (2 hours)",
      causes: ["Angina pectoris", "Pulmonary embolism", "Anxiety attack"],
      tests: ["ECG / 12-lead", "Troponin blood levels", "Chest X-ray"],
      confidence: 94
    }
  },
  {
    name: "Lebo Dlamini",
    submitted: "4/11/2026, 9:02:47 AM",
    priority: "LOW",
    symptoms: "Sore throat, mild fever of 37.8°C, and fatigue for 4 days. No cough reported.",
    analysis: {
      chief: "Pharyngitis with low-grade fever",
      duration: "Sub-acute (4 days)",
      causes: ["Streptococcal pharyngitis", "Viral URI", "Infectious mononucleosis"],
      tests: ["Rapid strep test", "Full blood count", "Monospot test"],
      confidence: 76
    }
  }
];

function renderDiagnoses() {
  const list = document.getElementById('diagList');

  if (!patients.length) {
    list.innerHTML = '<p class="empty">No pending diagnoses.</p>';
    return;
  }

  list.innerHTML = patients.map((p, i) => `
    <div class="diag-card" id="diag-${i}">

      <div class="diag-header">
        <div>
          <div class="diag-name">${p.name}</div>
          <div class="diag-date">Submitted: ${p.submitted}</div>
        </div>
        <span class="badge badge-dark">${p.priority} PRIORITY</span>
      </div>

      <p class="symptoms-label">Patient Symptoms</p>
      <div class="symptoms-box">${p.symptoms}</div>

      <div class="ai-analysis">
        <div class="ai-header">&#129504; AI Analysis</div>
        <div class="ai-field">
          <strong>Chief Complaint</strong>
          <p>${p.analysis.chief}</p>
        </div>
        <div class="ai-field">
          <strong>Duration</strong>
          <p>${p.analysis.duration}</p>
        </div>
        <div class="ai-field">
          <strong>Possible Causes</strong>
          <ul>${p.analysis.causes.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
        <div class="ai-field">
          <strong>Recommended Tests</strong>
          <ul>${p.analysis.tests.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div class="ai-field">
          <strong>AI Confidence</strong>
          <div class="conf-row">
            <div class="conf-bar">
              <div class="conf-fill" style="width:${p.analysis.confidence}%"></div>
            </div>
            <span class="conf-pct">${p.analysis.confidence}%</span>
          </div>
        </div>
      </div>

      <label class="notes-label">Nurse Notes (Optional)</label>
      <textarea class="nurse-notes" placeholder="Add any additional observations or corrections..." id="notes-${i}"></textarea>

      <div class="action-btns">
        <button class="btn btn-green" onclick="approveDiag(${i})">&#10003; Approve &amp; Forward to Doctor</button>
        <button class="btn btn-red"   onclick="rejectDiag(${i})">&#10005; Reject Diagnosis</button>
      </div>

    </div>
  `).join('');
}

function approveDiag(i) {
  patients.splice(i, 1);
  renderDiagnoses();
}

function rejectDiag(i) {
  patients.splice(i, 1);
  renderDiagnoses();
}

renderDiagnoses();
