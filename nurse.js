
  // ======== PATIENTS DATA ========
  const patients = [
    { id: 'james',  name: 'James Wilson',    condition: 'Hypertension',        bp: '120/80', hr: '72',  temp: '36.8', o2: '98' },
    { id: 'sarah',  name: 'Sarah Thompson',  condition: 'Migraine',            bp: '120/80', hr: '72',  temp: '36.8', o2: '98' },
    { id: 'robert', name: 'Robert Anderson', condition: 'Diabetes Type 2',     bp: '138/88', hr: '88',  temp: '37.1', o2: '96' },
    { id: 'maria',  name: 'Maria Garcia',    condition: 'Respiratory Infection',bp: '110/70', hr: '95',  temp: '38.4', o2: '93' },
  ];

  // Seed initial history for each patient
  const vitalsHistory = {
    james:  [
      { ts: '2026-03-10 09:00', bp:'130/85', hr:'78', temp:'36.9', o2:'97', notes:'' },
      { ts: '2026-03-20 11:30', bp:'125/82', hr:'74', temp:'36.7', o2:'98', notes:'Patient calm, no complaints.' },
    ],
    sarah:  [
      { ts: '2026-03-12 10:00', bp:'118/76', hr:'68', temp:'36.6', o2:'99', notes:'Headache mild today.' },
    ],
    robert: [
      { ts: '2026-03-14 08:00', bp:'142/90', hr:'92', temp:'37.2', o2:'95', notes:'Blood sugar elevated.' },
      { ts: '2026-03-18 14:00', bp:'139/88', hr:'89', temp:'37.0', o2:'96', notes:'' },
    ],
    maria:  [
      { ts: '2026-03-15 09:30', bp:'112/72', hr:'98', temp:'38.6', o2:'92', notes:'Coughing frequently.' },
    ],
  };

  // Current displayed vitals per patient (latest or seeded)
  const currentVitals = {};
  patients.forEach(p => {
    const hist = vitalsHistory[p.id];
    const last = hist[hist.length - 1];
    currentVitals[p.id] = last ? { bp: last.bp, hr: last.hr, temp: last.temp, o2: last.o2 } : { bp: p.bp, hr: p.hr, temp: p.temp, o2: p.o2 };
  });

  // ======== RENDER VITALS LIST ========
  function renderVitalsList() {
    const list = document.getElementById('vitals-list');
    list.innerHTML = patients.map(p => {
      const v = currentVitals[p.id];
      const waveIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
      const docIcon  = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
      return `
        <div class="vital-card">
          <div class="vital-header">
            <div>
              <div class="vital-name">${p.name}</div>
              <div class="vital-condition">${p.condition}</div>
            </div>
            <div class="vital-btns">
              <button class="btn-record" onclick="openRecordModal('${p.id}')">
                ${waveIcon} Record Vitals
              </button>
              <button class="btn-history" onclick="openHistoryModal('${p.id}')">
                ${docIcon} View History
              </button>
            </div>
          </div>
          <div class="vitals-grid">
            <div><div class="vital-stat-label">Blood Pressure</div><div class="vital-stat-val" id="disp-bp-${p.id}">${v.bp}</div></div>
            <div><div class="vital-stat-label">Heart Rate</div><div class="vital-stat-val" id="disp-hr-${p.id}">${v.hr} bpm</div></div>
            <div><div class="vital-stat-label">Temperature</div><div class="vital-stat-val" id="disp-temp-${p.id}">${v.temp}°C</div></div>
            <div><div class="vital-stat-label">O2 Saturation</div><div class="vital-stat-val" id="disp-o2-${p.id}">${v.o2}%</div></div>
          </div>
        </div>`;
    }).join('');
  }

  // ======== RECORD MODAL ========
  let activePatientId = null;

  function openRecordModal(pid) {
    activePatientId = pid;
    const p = patients.find(x => x.id === pid);
    const v = currentVitals[pid];
    document.getElementById('modal-record-title').textContent = 'Record Vitals — ' + p.name;
    document.getElementById('modal-record-sub').textContent = p.condition;
    document.getElementById('inp-bp').value   = v.bp;
    document.getElementById('inp-hr').value   = v.hr;
    document.getElementById('inp-temp').value = v.temp;
    document.getElementById('inp-o2').value   = v.o2;
    document.getElementById('inp-notes').value = '';
    document.getElementById('record-error').style.display = 'none';
    showModal('record-modal');
  }

  function saveVitals() {
    const bp   = document.getElementById('inp-bp').value.trim();
    const hr   = document.getElementById('inp-hr').value.trim();
    const temp = document.getElementById('inp-temp').value.trim();
    const o2   = document.getElementById('inp-o2').value.trim();
    const notes= document.getElementById('inp-notes').value.trim();

    if (!bp || !hr || !temp || !o2) {
      document.getElementById('record-error').style.display = 'block';
      return;
    }
    document.getElementById('record-error').style.display = 'none';

    // Save to history
    const now = new Date();
    const ts = now.toLocaleDateString('en-CA') + ' ' + now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
    vitalsHistory[activePatientId].push({ ts, bp, hr, temp, o2, notes });

    // Update current display
    currentVitals[activePatientId] = { bp, hr, temp, o2 };
    document.getElementById('disp-bp-'   + activePatientId).textContent = bp;
    document.getElementById('disp-hr-'   + activePatientId).textContent = hr + ' bpm';
    document.getElementById('disp-temp-' + activePatientId).textContent = temp + '°C';
    document.getElementById('disp-o2-'   + activePatientId).textContent = o2 + '%';

    closeModal('record-modal');
    const p = patients.find(x => x.id === activePatientId);
    showToast('✓ Vitals saved for ' + p.name);
  }

  // ======== HISTORY MODAL ========
  function openHistoryModal(pid) {
    const p = patients.find(x => x.id === pid);
    document.getElementById('modal-history-title').textContent = 'Vital Signs History — ' + p.name;
    document.getElementById('modal-history-sub').textContent = p.condition + ' · ' + vitalsHistory[pid].length + ' record(s)';

    const hist = vitalsHistory[pid];
    const body = document.getElementById('history-body');

    if (!hist.length) {
      body.innerHTML = '<div style="text-align:center;padding:32px;color:#9ca3af;">No history recorded yet.</div>';
    } else {
      body.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #f3f4f6;">
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">DATE & TIME</th>
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">BP</th>
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">HR</th>
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">TEMP</th>
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">O2</th>
              <th style="text-align:left;padding:10px 12px;font-size:12px;font-weight:600;color:#6b7280;">NOTES</th>
            </tr>
          </thead>
          <tbody>
            ${[...hist].reverse().map((h, i) => `
              <tr style="border-bottom:1px solid #f9fafb;background:${i===0?'#f0fdf4':'#fff'};">
                <td style="padding:12px 12px;font-size:13px;color:#374151;white-space:nowrap;">${h.ts}${i===0?' <span style="background:#dcfce7;color:#16a34a;font-size:11px;font-weight:600;padding:2px 7px;border-radius:99px;margin-left:6px;">Latest</span>':''}</td>
                <td style="padding:12px 12px;font-size:14px;font-weight:600;color:#111827;">${h.bp}</td>
                <td style="padding:12px 12px;font-size:14px;font-weight:600;color:#111827;">${h.hr} bpm</td>
                <td style="padding:12px 12px;font-size:14px;font-weight:600;color:#111827;">${h.temp}°C</td>
                <td style="padding:12px 12px;font-size:14px;font-weight:600;color:#111827;">${h.o2}%</td>
                <td style="padding:12px 12px;font-size:13px;color:#6b7280;">${h.notes || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }
    showModal('history-modal');
  }

  // ======== MODAL HELPERS ========
  function showModal(id) {
    const m = document.getElementById(id);
    m.style.display = 'flex';
    requestAnimationFrame(() => m.querySelector('div').style.transform = 'scale(1)');
  }
  function closeModal(id) {
    document.getElementById(id).style.display = 'none';
  }
  // Close on backdrop click
  ['record-modal','history-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) closeModal(id);
    });
  });

  // ======== LOGOUT ========
  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      window.location.href = 'login.html';
    }
  }

  // ======== TABS ========
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const map = {'Pending Diagnoses':'pending','Patient Care':'patient','Vital Signs':'vitals','Schedule':'schedule'};
      document.getElementById('tab-' + map[this.textContent.trim()]).classList.add('active');
    });
  });
  document.querySelectorAll('.tab').forEach(t => t.removeAttribute('onclick'));

  // ======== TOAST ========
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  // ======== DIAGNOSES ========
  function handleApprove(cardId, name) {
    const card = document.getElementById(cardId);
    card.style.transition = 'opacity .4s, transform .4s';
    card.style.opacity = '0'; card.style.transform = 'translateY(-10px)';
    setTimeout(() => { card.remove(); showToast('✓ ' + name + '\'s diagnosis approved & forwarded to doctor'); }, 400);
  }
  function handleReject(cardId, name) {
    const card = document.getElementById(cardId);
    card.style.transition = 'opacity .4s, transform .4s';
    card.style.opacity = '0'; card.style.transform = 'translateY(-10px)';
    setTimeout(() => { card.remove(); showToast('✕ ' + name + '\'s diagnosis rejected'); }, 400);
  }

  // ======== INIT ========
  renderVitalsList();
