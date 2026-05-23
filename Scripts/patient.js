// ============================================================
// Scripts/patient.js — MedIntel Patient Portal
// ============================================================

// ── GLOBALS ──────────────────────────────────────────────────
var supabaseClient = null;
var currentUser = null;
var currentPatient = null;

// ── INIT SUPABASE ─────────────────────────────────────────────
function initSupabase() {
  if (window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  }
  console.error('Supabase config not found. Make sure config.js is loaded.');
  return false;
}

// ── SESSION ──────────────────────────────────────────────────
function getSession() {
  try {
    var raw = sessionStorage.getItem('medintel_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
// ── NOTIFICATIONS ─────────────────────────────────────────────
var notifications = [];

function updateNotificationUI() {
  var listDiv   = document.getElementById('notificationList');
  var countSpan = document.getElementById('notificationCount');
  if (!listDiv) return;

  if (notifications.length === 0) {
    listDiv.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:6px 0;">No new notifications</div>';
    if (countSpan) countSpan.style.display = 'none';
  } else {
    listDiv.innerHTML = notifications.map(function(n) {
      return '<div class="notif-item' + (n.is_read ? '' : ' notif-unread') + '">'
        + '<span>' + n.message + '</span>'
        + '<small style="display:block;color:#9ca3af;font-size:11px;margin-top:3px;">'
        + getTimeAgo(n.created_at) + '</small>'
        + '</div>';
    }).join('');
    if (countSpan) {
      var unread = notifications.filter(function(n) { return !n.is_read; }).length;
      if (unread > 0) {
        countSpan.textContent = unread;
        countSpan.style.display = 'inline-flex';
      } else {
        countSpan.style.display = 'none';
      }
    }
  }
}

async function loadNotifications() {
  if (!supabaseClient || !currentPatient) return;
  try {
    var result = await supabaseClient
      .from('nurse_notifications')
      .select('*')
      .eq('patient_id', currentPatient.patient_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!result.error && result.data) {
      notifications = result.data;
      updateNotificationUI();
    }

    // Add welcome notification if none exist
    if (!result.data || result.data.length === 0) {
      await addNotificationToDB('👋 Welcome back, '
        + (currentPatient.first_name || 'there') + '! Your portal is ready.');
    }

  } catch (err) {
    console.error('loadNotifications error:', err);
  }
}

async function addNotificationToDB(message, type) {
  if (!supabaseClient || !currentPatient) return;
  try {
    var result = await supabaseClient
      .from('nurse_notifications')
      .insert({
        message:    message,
        patient_id: currentPatient.patient_id,
        type:       type || 'info',
        is_read:    false
      })
      .select()
      .single();

    if (!result.error && result.data) {
      notifications.unshift(result.data);
      updateNotificationUI();
    }
  } catch (err) {
    console.error('addNotificationToDB error:', err);
  }
}

// Keep addNotification for instant local notifications
function addNotification(message, type) {
  if (currentPatient) {
    addNotificationToDB(message, type || 'info');
  } else {
    // Fallback before patient loads
    notifications.unshift({
      message:    message,
      is_read:    false,
      created_at: new Date().toISOString()
    });
    updateNotificationUI();
  }
}

function toggleNotificationPopup() {
  var popup = document.getElementById('notificationPopup');
  if (!popup) return;
  popup.classList.toggle('show-notification');
  if (popup.classList.contains('show-notification')) {
    updateNotificationUI();
    markAllNotificationsRead();
  }
}

async function markAllNotificationsRead() {
  if (!supabaseClient || !currentPatient) return;
  try {
    await supabaseClient
      .from('nurse_notifications')
      .update({ is_read: true })
      .eq('patient_id', currentPatient.patient_id)
      .eq('is_read', false);

    notifications.forEach(function(n) { n.is_read = true; });
    updateNotificationUI();
  } catch (err) {
    console.error('markAllRead error:', err);
  }
}

async function clearAllNotifications() {
  if (!supabaseClient || !currentPatient) return;
  try {
    await supabaseClient
      .from('nurse_notifications')
      .delete()
      .eq('patient_id', currentPatient.patient_id);

    notifications = [];
    updateNotificationUI();
    var popup = document.getElementById('notificationPopup');
    if (popup) popup.classList.remove('show-notification');
  } catch (err) {
    console.error('clearAllNotifications error:', err);
  }
}

// ── LOGOUT ────────────────────────────────────────────────────
function handleLogout() {
  sessionStorage.removeItem('medintel_user');
  window.location.href = 'login.html';
}

// ── TAB SWITCHING ─────────────────────────────────────────────
function switchTab(event, sectionId) {
  document.querySelectorAll('.tab-content').forEach(function(s) {
    s.style.display = 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var target = document.getElementById(sectionId);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  if (sectionId === 'settingsSection')     switchSettingsSubTab(null, 'profileSub');
  if (sectionId === 'appointmentsSection') loadAppointments();
  if (sectionId === 'prescriptionsSection') loadPrescriptions();
  if (sectionId === 'medicalRecordsSection') loadMedicalRecords();
  if (sectionId === 'aiHealthAssistantSection') loadChatHistory();
  if (sectionId === 'clinicMapSection') initMap();
}

function switchSettingsSubTab(event, subId) {
  document.querySelectorAll('.settings-sub-content').forEach(function(t) {
    t.style.display = 'none';
  });
  document.querySelectorAll('.s-nav-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var target = document.getElementById(subId);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else {
    document.querySelectorAll('.s-nav-btn').forEach(function(b) {
      if ((b.getAttribute('onclick') || '').includes(subId)) b.classList.add('active');
    });
  }
}

// ── VIDEO FILTER ──────────────────────────────────────────────
function filterVideos(category, btn) {
  document.querySelectorAll('.video-card').forEach(function(card) {
    card.style.display = (category === 'all' || card.classList.contains(category)) ? 'block' : 'none';
  });
  document.querySelectorAll('.filter-item').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
}

// ── SECURITY ──────────────────────────────────────────────────
function handleSecurityAction(action) {
  if (action === 'password') openChangePasswordModal();
  else if (action === '2fa') {
    if (confirm('Would you like to start the Two-Factor Authentication setup?')) {
      addNotification('🛡️ 2FA setup started — check your email for next steps.');
    }
  } else if (action === 'sessions') {
    alert('Active sessions management coming soon.');
  }
}

// ── HELPERS ───────────────────────────────────────────────────
function setEl(id, value) {
  var el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setVal(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value || '';
}

function getTimeAgo(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' minute' + (mins !== 1 ? 's' : '') + ' ago';
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + ' hour' + (hours !== 1 ? 's' : '') + ' ago';
  var days = Math.floor(hours / 24);
  if (days < 7) return days + ' day' + (days !== 1 ? 's' : '') + ' ago';
  return new Date(dateStr).toLocaleDateString();
}

// ────────────────────────────────────────────────────────────
// LOAD PATIENT PROFILE
// ────────────────────────────────────────────────────────────
async function loadPatientProfile() {
  if (!supabaseClient || !currentUser) {
    console.error('Cannot load profile: supabase or currentUser is null');
    return;
  }

  try {
    var userId    = currentUser.id || currentUser.user_id || null;
    var userEmail = currentUser.email || null;
    var patientQuery;

    if (userId) {
      patientQuery = await supabaseClient
        .from('patients')
        .select('*, users:user_id ( id, email )')
        .eq('user_id', userId)
        .single();
    } else if (userEmail) {
      console.warn('No user ID in session, falling back to email lookup');
      var userResult = await supabaseClient
        .from('users')
        .select('id, email')
        .eq('email', userEmail)
        .single();

      if (userResult.error || !userResult.data) {
        console.error('Could not find user by email:', userResult.error);
        renderFromSession();
        return;
      }
      currentUser.id = userResult.data.id;
      patientQuery = await supabaseClient
        .from('patients')
        .select('*, users:user_id ( id, email )')
        .eq('user_id', userResult.data.id)
        .single();
    } else {
      console.error('No ID or email in session');
      renderFromSession();
      return;
    }

    if (patientQuery.error || !patientQuery.data) {
      console.error('Patient row not found:', patientQuery.error);
      renderFromSession();
      return;
    }

    currentPatient = patientQuery.data;

    // Get last visit from most recent completed appointment
    var lastVisitDate = '—';
    var lastVisitRes = await supabaseClient
      .from('appointments')
      .select('date')
      .eq('patient_id', currentPatient.patient_id)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(1);

    if (!lastVisitRes.error && lastVisitRes.data && lastVisitRes.data.length > 0) {
      lastVisitDate = lastVisitRes.data[0].date;
    }

    renderPatientProfile(currentPatient, lastVisitDate);
    await loadStats();
    await loadRecentActivity();
    await loadNotifications();

  } catch (err) {
    console.error('loadPatientProfile exception:', err);
    renderFromSession();
  }
}

function renderFromSession() {
  var name = currentUser.full_name || currentUser.name || currentUser.email || 'Patient';
  var headerEl = document.getElementById('headerPatientName');
  if (headerEl) headerEl.textContent = name;
  setEl('infoName',      name);
  setEl('infoEmail',     currentUser.email || '—');
  setEl('infoAge',       '—');
  setEl('infoPhone',     '—');
  setEl('infoDob',       '—');
  setEl('infoLastVisit', '—');
  addNotification('👋 Welcome back, ' + name.split(' ')[0] + '!');
}

function renderPatientProfile(patient, lastVisitDate) {
  var firstName = patient.first_name || '';
  var lastName  = patient.last_name  || '';
  var fullName  = (firstName + ' ' + lastName).trim() || currentUser.email || 'Patient';
  var email     = (patient.users && patient.users.email) || currentUser.email || '—';
  var phone     = patient.phone || '—';
  var dob       = patient.dob   || '';

  var age = '—';
  if (dob) {
    var diff = Date.now() - new Date(dob).getTime();
    age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)) + ' years';
  }

  var headerEl = document.getElementById('headerPatientName');
  if (headerEl) headerEl.textContent = fullName;

  setEl('infoName',      fullName);
  setEl('infoAge',       age);
  setEl('infoEmail',     email);
  setEl('infoPhone',     phone);
  setEl('infoDob',       dob || '—');
  setEl('infoLastVisit', lastVisitDate || '—');

  setVal('settingsName',  fullName);
  setVal('settingsEmail', email);
  setVal('settingsPhone', phone);
  setVal('settingsDob',   dob);

}

// ── LOAD STATS ────────────────────────────────────────────────
async function loadStats() {
  if (!supabaseClient || !currentPatient) return;
  try {
    var pid = currentPatient.patient_id;

    var apptRes = await supabaseClient
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', pid)
      .gte('date', new Date().toISOString().split('T')[0])
      .eq('status', 'scheduled');

    var recRes = await supabaseClient
      .from('medical_records')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', pid);

    var prescRes = await supabaseClient
      .from('prescriptions')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', pid);

    var msgRes = await supabaseClient
      .from('nurse_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', pid);

    setEl('statAppointments',  apptRes.count  !== null ? apptRes.count  : 0);
    setEl('statRecords',       recRes.count   !== null ? recRes.count   : 0);
    setEl('statPrescriptions', prescRes.count !== null ? prescRes.count : 0);
    setEl('statMessages',      msgRes.count   !== null ? msgRes.count   : 0);

  } catch (err) {
    console.error('loadStats error:', err);
  }
}

// ── LOAD RECENT ACTIVITY ──────────────────────────────────────
async function loadRecentActivity() {
  if (!supabaseClient || !currentPatient) return;
  var container = document.getElementById('recentActivityList');
  if (!container) return;

  try {
    var pid = currentPatient.patient_id;
    var activities = [];

    // Get recent appointments
    var apptRes = await supabaseClient
      .from('appointments')
      .select('appointment_id, date, time, status, notes, doctors:doctor_id(first_name, last_name)')
      .eq('patient_id', pid)
      .order('date', { ascending: false })
      .limit(3);

    if (!apptRes.error && apptRes.data) {
      apptRes.data.forEach(function(a) {
        var doctorName = a.doctors
          ? 'Dr. ' + a.doctors.first_name + ' ' + a.doctors.last_name
          : 'a doctor';
        activities.push({
          type: 'appointment',
          text: a.status === 'completed'
            ? 'Appointment completed with ' + doctorName
            : a.status === 'cancelled'
            ? 'Appointment cancelled with ' + doctorName
            : 'Appointment scheduled with ' + doctorName,
          date: a.date + (a.time ? 'T' + a.time : 'T00:00:00'),
          color: a.status === 'completed' ? 'green'
               : a.status === 'cancelled' ? 'yellow'
               : 'blue'
        });
      });
    }

    // Get recent medical records
    var recRes = await supabaseClient
      .from('medical_records')
      .select('id, diagnosis, created_at')
      .eq('patient_id', pid)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!recRes.error && recRes.data) {
      recRes.data.forEach(function(r) {
        activities.push({
          type: 'record',
          text: 'Medical record added: ' + (r.diagnosis || 'General record'),
          date: r.created_at,
          color: 'purple'
        });
      });
    }

    // Get recent notifications (refill requests, messages, certificates)
    var notifRes = await supabaseClient
      .from('nurse_notifications')
      .select('notification_id, message, type, created_at')
      .eq('patient_id', pid)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!notifRes.error && notifRes.data) {
      notifRes.data.forEach(function(n) {
        var text = n.type === 'refill_request'    ? '💊 Refill request sent'
                 : n.type === 'patient_message'   ? '💬 Message sent to doctor'
                 : n.type === 'certificate_request' ? '📋 Certificate request submitted'
                 : n.type === 'new_appointment'   ? '📅 New appointment booked'
                 : n.message.substring(0, 60) + '...';
        activities.push({
          type: 'notification',
          text: text,
          date: n.created_at,
          color: 'yellow'
        });
      });
    }

    // Get recent ARIA sessions
    var ariaRes = await supabaseClient
      .from('ai_chat_history')
      .select('chat_id, message, timestamp')
      .eq('patient_id', pid)
      .order('timestamp', { ascending: false })
      .limit(2);

    if (!ariaRes.error && ariaRes.data) {
      ariaRes.data.forEach(function(a) {
        activities.push({
          type: 'aria',
          text: '🤖 ARIA health assessment: ' + a.message.substring(0, 50) + '...',
          date: a.timestamp,
          color: 'purple'
        });
      });
    }

    // Sort all activities by date, most recent first
    activities.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    // Take top 5
    activities = activities.slice(0, 5);

    if (activities.length === 0) {
      container.innerHTML = '<div class="activity-item"><div class="act-text"><strong>No recent activity yet</strong><small>Your activity will appear here as you use the portal</small></div></div>';
      return;
    }

    var iconMap = {
      appointment: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      record:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      notification:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      aria:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>'
    };

    container.innerHTML = activities.map(function(item) {
      return '<div class="activity-item">'
        + '<span class="act-icon ' + item.color + '">'
        + (iconMap[item.type] || iconMap.notification)
        + '</span>'
        + '<div class="act-text">'
        + '<strong>' + item.text + '</strong>'
        + '<small>' + getTimeAgo(item.date) + '</small>'
        + '</div></div>';
    }).join('');

  } catch (err) {
    console.error('loadRecentActivity error:', err);
  }
}

// ────────────────────────────────────────────────────────────
// ARIA — AI HEALTH ASSISTANT
// ────────────────────────────────────────────────────────────
async function getAIAnalysis() {
  var symptoms = document.getElementById('symptomsInput')
    ? document.getElementById('symptomsInput').value.trim() : '';
  if (!symptoms) { alert('Please describe your symptoms first.'); return; }

  var btn          = document.querySelector('.btn-ai-gradient');
  var resultPanel  = document.getElementById('ariaResultPanel');
  var resultContent = document.getElementById('ariaResultContent');
  var emptyState   = document.getElementById('ariaEmptyState');

  if (emptyState)   emptyState.style.display  = 'none';
  if (resultPanel)  resultPanel.style.display  = 'block';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ARIA is thinking...';
  }

  if (resultContent) {
    resultContent.innerHTML = ''
      + '<div class="aria-loading">'
      + '<div class="aria-siri-ring">'
      + '<div class="aria-siri-glow"></div>'
      + '<div class="aria-siri-glow2"></div>'
      + '<span class="aria-siri-icon">'
      + '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>'
      + '<path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>'
      + '</svg></span></div>'
      + '<div><p class="aria-loading-text">ARIA is thinking...</p>'
      + '<p class="aria-loading-sub">Analysing your symptoms with medical precision</p>'
      + '</div></div>';
  }

  try {
    var patientAge = null;
    if (currentPatient && currentPatient.dob) {
      patientAge = Math.floor(
        (Date.now() - new Date(currentPatient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
    }

    var payload = {
      symptoms:      symptoms,
      patientName:   currentPatient
        ? ((currentPatient.first_name || '') + ' ' + (currentPatient.last_name || '')).trim()
        : '',
      patientAge:    patientAge,
      patientGender: currentPatient ? (currentPatient.gender || '') : ''
    };

    var res = await fetch('https://sabyoni-devs-med-intel.vercel.app/api/aria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    var responseText = await res.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from ARIA service. Please try again.');
    }

    var data;
    try { data = JSON.parse(responseText); }
    catch (e) { throw new Error('Invalid response format from ARIA service.'); }

    if (!res.ok || data.error) throw new Error(data.error || 'ARIA request failed');
    if (!data.analysis)        throw new Error('No analysis returned from ARIA');

    if (resultContent) {
      resultContent.innerHTML = '<div class="aria-response">'
        + '<div class="aria-header-strip">'
        + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>'
        + '<span>ARIA Health Assessment</span>'
        + '<small>' + new Date().toLocaleTimeString() + '</small>'
        + '</div>'
        + '<div class="aria-body">' + formatARIAResponse(data.analysis) + '</div>'
        + '</div>';
    }

    // Save to chat history
    await saveChatHistory(symptoms, data.analysis);
    loadChatHistory();
    addNotification('🤖 ARIA health assessment completed');

  } catch (err) {
    console.error('ARIA error:', err);
    if (resultContent) {
      resultContent.innerHTML = '<div class="aria-error"><p>⚠️ '
        + (err.message || 'ARIA is temporarily unavailable. Please try again.')
        + '</p></div>';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg> Get AI Analysis';
    }
  }
}

function formatARIAResponse(text) {
  return text
    .replace(/## (.+)/g, '<h4 class="aria-section-title">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\* (.+)/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/⚠️(.+)/g, '<p class="aria-disclaimer">⚠️$1</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// ────────────────────────────────────────────────────────────
// APPOINTMENTS
// ────────────────────────────────────────────────────────────
async function loadAppointments() {
  if (!supabaseClient || !currentPatient) return;
  var container = document.getElementById('appointmentList');
  if (!container) return;
  container.innerHTML = '<div class="loading-row">Loading appointments...</div>';

  try {
    var result = await supabaseClient
      .from('appointments')
      .select('*, doctors:doctor_id ( first_name, last_name, specialization )')
      .eq('patient_id', currentPatient.patient_id)
      .order('date', { ascending: true });

    if (result.error) throw result.error;

    if (!result.data || result.data.length === 0) {
      container.innerHTML = '<div class="empty-list-msg"><p>No appointments found. '
        + '<button class="link-btn" onclick="openBookingModal()">Book one now →</button></p></div>';
      return;
    }

    container.innerHTML = result.data.map(function(appt) {
      var doctorName = appt.doctors
        ? (appt.doctors.first_name + ' ' + appt.doctors.last_name).trim()
        : 'Unknown Doctor';
      var date   = appt.date || '—';
      var time   = appt.time ? appt.time.slice(0, 5) : '—';
      var status = appt.status || 'scheduled';
      var statusClass = status === 'completed' ? 'completed'
                      : status === 'cancelled' ? 'cancelled' : 'scheduled';

      return '<div class="appointment-card">'
        + '<div class="appt-info">'
        + '<h4>Dr. ' + doctorName + '</h4>'
        + '<div class="appt-meta">'
        + '<span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + date + '</span>'
        + '<span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + time + '</span>'
        + (appt.notes ? '<span>' + appt.notes + '</span>' : '')
        + '</div></div>'
        + '<div style="display:flex;align-items:center;gap:10px;">'
        + '<span class="status-badge ' + statusClass + '">'
        + status.charAt(0).toUpperCase() + status.slice(1) + '</span>'
        + (status === 'scheduled'
          ? '<button class="btn-cancel-appt" onclick="cancelAppointment(\''
            + appt.appointment_id + '\')">Cancel</button>' : '')
        + '</div></div>';
    }).join('');

  } catch (err) {
    console.error('loadAppointments error:', err);
    container.innerHTML = '<div class="empty-list-msg">Failed to load appointments.</div>';
  }
}

async function cancelAppointment(apptId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    var result = await supabaseClient
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('appointment_id', apptId);
    if (result.error) throw result.error;
    addNotification('📅 Appointment cancelled successfully.');
    loadAppointments();
    loadStats();
  } catch (err) {
    console.error('cancelAppointment error:', err);
    alert('Failed to cancel appointment. Please try again.');
  }
}

async function openBookingModal() {
  var existing = document.getElementById('bookingModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'bookingModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-box">'
    + '<div class="modal-header"><h3>Book New Appointment</h3>'
    + '<button class="modal-close" onclick="closeModal(\'bookingModal\')">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="input-group"><label>Select Doctor</label>'
    + '<div class="select-wrapper"><select id="bookDoctor"><option value="">Loading doctors...</option></select>'
    + '<svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div></div>'
    + '<div class="input-group"><label>Date</label>'
    + '<div class="input-wrapper"><input type="date" id="bookDate" min="'
    + new Date().toISOString().split('T')[0] + '"></div></div>'
    + '<div class="input-group"><label>Time</label>'
    + '<div class="input-wrapper"><input type="time" id="bookTime"></div></div>'
    + '<div class="input-group"><label>Reason for Visit</label>'
    + '<div class="input-wrapper"><input type="text" id="bookReason" placeholder="e.g. Follow-up, General checkup..."></div></div>'
    + '<button class="btn-save-changes" onclick="confirmBooking()">Confirm Booking</button>'
    + '</div></div>';
  document.body.appendChild(modal);

  try {
    var result = await supabaseClient
      .from('doctors')
      .select('doctor_id, first_name, last_name, specialization');

    var select = document.getElementById('bookDoctor');
    if (!result.error && result.data && result.data.length > 0) {
      select.innerHTML = '<option value="">-- Select a doctor --</option>'
        + result.data.map(function(d) {
          var name = (d.first_name + ' ' + d.last_name).trim();
          var spec = d.specialization ? ' — ' + d.specialization : '';
          return '<option value="' + d.doctor_id + '">Dr. ' + name + spec + '</option>';
        }).join('');
    } else {
      select.innerHTML = '<option value="">No doctors available</option>';
    }
  } catch (err) {
    console.error('Failed to load doctors:', err);
  }
}

async function confirmBooking() {
  var doctorId = document.getElementById('bookDoctor') ? document.getElementById('bookDoctor').value : '';
  var date     = document.getElementById('bookDate')   ? document.getElementById('bookDate').value   : '';
  var time     = document.getElementById('bookTime')   ? document.getElementById('bookTime').value   : '';
  var notes    = document.getElementById('bookReason') ? document.getElementById('bookReason').value : '';

  if (!doctorId || !date || !time) {
    alert('Please select a doctor, date and time.');
    return;
  }

  var confirmBtn = document.querySelector('#bookingModal .btn-save-changes');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Booking...'; }

  try {
  var result = await supabaseClient
    .from('appointments')
    .insert({
      patient_id: currentPatient.patient_id,
      doctor_id:  doctorId,
      date:       date,
      time:       time,
      notes:      notes || null,
      status:     'scheduled',
      created_by: currentUser.email || 'patient'
    });

  if (result.error) throw result.error;

  // Notify nurse about new appointment
  var doctorSelect = document.getElementById('bookDoctor');
  var doctorName = doctorSelect 
    ? doctorSelect.options[doctorSelect.selectedIndex].text 
    : 'a doctor';
  var patientName = (currentPatient.first_name + ' ' + currentPatient.last_name).trim();

  await supabaseClient.from('nurse_notifications').insert({
    message: '📅 New appointment booked — Patient: ' + patientName
      + ' | Doctor: ' + doctorName
      + ' | Date: ' + date
      + ' | Time: ' + time
      + (notes ? ' | Reason: ' + notes : ''),
    patient_id: currentPatient.patient_id,
    type: 'new_appointment',
    is_read: false
  });

  closeModal('bookingModal');
  addNotification('📅 Appointment booked for ' + date + ' at ' + time);
  loadAppointments();
  loadStats();

  } catch (err) {
    console.error('confirmBooking error:', err);
    alert('Failed to book appointment: ' + err.message);
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Booking'; }
  }
}

// ────────────────────────────────────────────────────────────
// UPLOAD MEDICAL DOCUMENT
// ────────────────────────────────────────────────────────────
function openUploadModal() {
  var existing = document.getElementById('uploadModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'uploadModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-box">'
    + '<div class="modal-header"><h3>Upload Medical Document</h3>'
    + '<button class="modal-close" onclick="closeModal(\'uploadModal\')">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="input-group"><label>Document Type</label>'
    + '<div class="select-wrapper"><select id="uploadDocType">'
    + '<option value="lab_result">Lab Result</option>'
    + '<option value="scan">Scan / X-Ray</option>'
    + '<option value="referral">Referral Letter</option>'
    + '<option value="other">Other</option>'
    + '</select>'
    + '<svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div></div>'
    + '<div class="input-group"><label>Description</label>'
    + '<div class="input-wrapper"><input type="text" id="uploadDesc" placeholder="Brief description..."></div></div>'
    + '<div class="input-group"><label>Select File</label>'
    + '<div class="upload-drop-zone" id="uploadDropZone" onclick="document.getElementById(\'uploadFileInput\').click()">'
    + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
    + '<p id="uploadFileName">Click to select a file (PDF, JPG, PNG — max 5MB)</p>'
    + '</div>'
    + '<input type="file" id="uploadFileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none" onchange="handleFileSelect(this)">'
    + '</div>'
    + '<button class="btn-save-changes" onclick="confirmUpload()">Upload Document</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

function handleFileSelect(input) {
  var fileNameEl = document.getElementById('uploadFileName');
  if (input.files && input.files[0]) {
    fileNameEl.textContent = '📄 ' + input.files[0].name;
    fileNameEl.style.color = '#111827';
  }
}

async function confirmUpload() {
  var docType   = document.getElementById('uploadDocType')  ? document.getElementById('uploadDocType').value  : '';
  var desc      = document.getElementById('uploadDesc')     ? document.getElementById('uploadDesc').value.trim() : '';
  var fileInput = document.getElementById('uploadFileInput');
  var file      = fileInput && fileInput.files[0] ? fileInput.files[0] : null;

  if (!file) { alert('Please select a file to upload.'); return; }
  if (file.size > 5 * 1024 * 1024) { alert('File too large. Maximum size is 5MB.'); return; }

  var uploadBtn = document.querySelector('#uploadModal .btn-save-changes');
  if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading...'; }

  try {
    var fileName = currentPatient.patient_id + '/' + Date.now() + '_' + file.name.replace(/\s/g, '_');

    var storageResult = await supabaseClient.storage
      .from('medical-documents')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    var noteText = desc
      ? desc + ' [Document: ' + file.name + ']'
      : 'Document uploaded: ' + file.name;

    if (!storageResult.error) {
      var publicUrl = supabaseClient.storage
        .from('medical-documents')
        .getPublicUrl(fileName).data.publicUrl;
      noteText = desc
        ? desc + ' [File: ' + publicUrl + ']'
        : 'Document uploaded: ' + publicUrl;
    }

    await supabaseClient.from('medical_records').insert({
      patient_id: currentPatient.patient_id,
      diagnosis:  docType.replace(/_/g, ' ').toUpperCase(),
      notes:      noteText
    });

    closeModal('uploadModal');
    addNotification('📎 Document uploaded successfully.');
    alert('Document uploaded successfully.');
    loadStats();

  } catch (err) {
    console.error('confirmUpload error:', err);
    alert('Upload failed: ' + err.message);
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload Document'; }
  }
}

// ────────────────────────────────────────────────────────────
// MESSAGE YOUR DOCTOR
// ────────────────────────────────────────────────────────────
async function openMessageDoctorModal() {
  var existing = document.getElementById('messageModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'messageModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-box">'
    + '<div class="modal-header"><h3>Message Your Doctor</h3>'
    + '<button class="modal-close" onclick="closeModal(\'messageModal\')">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="input-group"><label>Select Doctor</label>'
    + '<div class="select-wrapper"><select id="msgDoctor"><option value="">Loading...</option></select>'
    + '<svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div></div>'
    + '<div class="input-group"><label>Subject</label>'
    + '<div class="input-wrapper"><input type="text" id="msgSubject" placeholder="e.g. Question about my medication..."></div></div>'
    + '<div class="input-group"><label>Message</label>'
    + '<textarea id="msgBody" style="width:100%;min-height:120px;border-radius:12px;border:1.5px solid #e5e7eb;padding:12px 14px;font-size:14px;font-family:inherit;background:#f9fafb;outline:none;resize:vertical;" placeholder="Type your message here..."></textarea></div>'
    + '<button class="btn-save-changes" onclick="confirmSendMessage()">Send Message</button>'
    + '</div></div>';
  document.body.appendChild(modal);

  try {
    // Show doctors from completed appointments first, fallback to all doctors
    var apptResult = await supabaseClient
      .from('appointments')
      .select('doctor_id, doctors:doctor_id ( doctor_id, first_name, last_name, specialization )')
      .eq('patient_id', currentPatient.patient_id);

    var select = document.getElementById('msgDoctor');
    var seen = {};
    var doctors = [];

    if (!apptResult.error && apptResult.data) {
      apptResult.data.forEach(function(a) {
        if (a.doctors && !seen[a.doctors.doctor_id]) {
          seen[a.doctors.doctor_id] = true;
          doctors.push(a.doctors);
        }
      });
    }

    if (doctors.length === 0) {
      var allDocs = await supabaseClient
        .from('doctors')
        .select('doctor_id, first_name, last_name, specialization');
      if (!allDocs.error && allDocs.data) doctors = allDocs.data;
    }

    if (doctors.length > 0) {
      select.innerHTML = '<option value="">-- Select a doctor --</option>'
        + doctors.map(function(d) {
          var name = (d.first_name + ' ' + d.last_name).trim();
          var spec = d.specialization ? ' — ' + d.specialization : '';
          return '<option value="' + d.doctor_id + '">Dr. ' + name + spec + '</option>';
        }).join('');
    } else {
      select.innerHTML = '<option value="">No doctors available</option>';
    }
  } catch (err) {
    console.error('Failed to load doctors for message:', err);
  }
}

async function confirmSendMessage() {
  var doctorId = document.getElementById('msgDoctor')  ? document.getElementById('msgDoctor').value        : '';
  var subject  = document.getElementById('msgSubject') ? document.getElementById('msgSubject').value.trim() : '';
  var body     = document.getElementById('msgBody')    ? document.getElementById('msgBody').value.trim()    : '';

  if (!doctorId) { alert('Please select a doctor.'); return; }
  if (!body)     { alert('Please write a message.');  return; }

  var sendBtn = document.querySelector('#messageModal .btn-save-changes');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending...'; }

  try {
    var patientName = (currentPatient.first_name + ' ' + currentPatient.last_name).trim();

    await supabaseClient.from('nurse_notifications').insert({
      message: '[MESSAGE TO DOCTOR] From: ' + patientName
        + (subject ? ' | Subject: ' + subject : '')
        + ' | ' + body,
      patient_id: currentPatient.patient_id,
      type:       'patient_message',
      is_read:    false
    });

    closeModal('messageModal');
    addNotification('💬 Message sent to your doctor successfully.');
    alert('Your message has been sent to your doctor.');
    loadStats();

  } catch (err) {
    console.error('confirmSendMessage error:', err);
    alert('Failed to send message: ' + err.message);
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Message'; }
  }
}

// ────────────────────────────────────────────────────────────
// REQUEST MEDICAL CERTIFICATE
// ────────────────────────────────────────────────────────────
function openCertificateModal() {
  var existing = document.getElementById('certificateModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'certificateModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-box">'
    + '<div class="modal-header"><h3>Request Medical Certificate</h3>'
    + '<button class="modal-close" onclick="closeModal(\'certificateModal\')">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="input-group"><label>Certificate Type</label>'
    + '<div class="select-wrapper"><select id="certType">'
    + '<option value="sick_note">Sick Note</option>'
    + '<option value="fitness">Fitness Certificate</option>'
    + '<option value="specialist_referral">Specialist Referral</option>'
    + '<option value="disability">Disability Certificate</option>'
    + '<option value="other">Other</option>'
    + '</select>'
    + '<svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></div></div>'
    + '<div class="input-group"><label>Date Required From</label>'
    + '<div class="input-wrapper"><input type="date" id="certDateFrom"></div></div>'
    + '<div class="input-group"><label>Date Required To</label>'
    + '<div class="input-wrapper"><input type="date" id="certDateTo"></div></div>'
    + '<div class="input-group"><label>Reason / Additional Notes</label>'
    + '<textarea id="certReason" style="width:100%;min-height:100px;border-radius:12px;border:1.5px solid #e5e7eb;padding:12px 14px;font-size:14px;font-family:inherit;background:#f9fafb;outline:none;resize:vertical;" placeholder="Provide any additional context for your doctor..."></textarea></div>'
    + '<button class="btn-save-changes" onclick="confirmCertificateRequest()">Submit Request</button>'
    + '</div></div>';
  document.body.appendChild(modal);

  var today = new Date().toISOString().split('T')[0];
  var certFrom = document.getElementById('certDateFrom');
  var certTo   = document.getElementById('certDateTo');
  if (certFrom) certFrom.value = today;
  if (certTo)   certTo.value   = today;
}

async function confirmCertificateRequest() {
  var certType = document.getElementById('certType')     ? document.getElementById('certType').value         : '';
  var dateFrom = document.getElementById('certDateFrom') ? document.getElementById('certDateFrom').value     : '';
  var dateTo   = document.getElementById('certDateTo')   ? document.getElementById('certDateTo').value       : '';
  var reason   = document.getElementById('certReason')   ? document.getElementById('certReason').value.trim() : '';

  if (!certType || !dateFrom) { alert('Please fill in the required fields.'); return; }

  var submitBtn = document.querySelector('#certificateModal .btn-save-changes');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

  try {
    var patientName = (currentPatient.first_name + ' ' + currentPatient.last_name).trim();
    var certLabel   = certType.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });

    await supabaseClient.from('nurse_notifications').insert({
      message: '[CERTIFICATE REQUEST] ' + certLabel
        + ' | Patient: ' + patientName
        + ' | Period: ' + dateFrom + (dateTo ? ' to ' + dateTo : '')
        + (reason ? ' | Notes: ' + reason : ''),
      patient_id: currentPatient.patient_id,
      type:       'certificate_request',
      is_read:    false
    });

    closeModal('certificateModal');
    addNotification('📋 Medical certificate request submitted.');
    alert('Your ' + certLabel + ' request has been submitted. Your doctor will review it shortly.');

  } catch (err) {
    console.error('confirmCertificateRequest error:', err);
    alert('Failed to submit request: ' + err.message);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Request'; }
  }
}

// ────────────────────────────────────────────────────────────
// PRESCRIPTIONS
// ────────────────────────────────────────────────────────────
async function loadPrescriptions() {
  if (!supabaseClient || !currentPatient) return;
  var container = document.getElementById('prescriptionList');
  if (!container) return;
  container.innerHTML = '<div class="loading-row">Loading prescriptions...</div>';

  try {
    // Try prescriptions table first, fall back to medical_records
    var result = await supabaseClient
      .from('prescriptions')
      .select('*')
      .eq('patient_id', currentPatient.patient_id)
      .order('created_at', { ascending: false });

    if (result.error || !result.data || result.data.length === 0) {
      // Fallback to medical_records with prescription field
      result = await supabaseClient
        .from('medical_records')
        .select('*, doctors:doctor_id ( first_name, last_name )')
        .eq('patient_id', currentPatient.patient_id)
        .not('prescription', 'is', null)
        .order('created_at', { ascending: false });
    }

    if (result.error) throw result.error;

    if (!result.data || result.data.length === 0) {
      container.innerHTML = '<div class="empty-list-msg"><p>No active prescriptions found.</p></div>';
      return;
    }

    container.innerHTML = result.data.map(function(rec) {
      var doctorName = rec.doctors
        ? (rec.doctors.first_name + ' ' + rec.doctors.last_name).trim()
        : 'Unknown';
      var date      = rec.created_at ? rec.created_at.split('T')[0] : '—';
      var prescText = rec.prescription || rec.medication_name || rec.notes || '—';
      if (typeof prescText === 'object') prescText = JSON.stringify(prescText);
      var diagLabel = rec.diagnosis || rec.medication_name || 'Prescription';

      return '<div class="prescription-card">'
        + '<div class="presc-content">'
        + '<div class="presc-header-row">'
        + '<span class="presc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></span>'
        + '<h4>' + diagLabel + '</h4>'
        + '</div>'
        + '<div class="presc-details">'
        + '<p>' + prescText + '</p>'
        + '<p class="presc-meta">Prescribed by Dr. ' + doctorName + ' on ' + date + '</p>'
        + '</div></div>'
        + '<button class="btn-refill" onclick="requestRefill(\'' + (rec.id || rec.record_id || '') + '\', \'' + diagLabel + '\')">Request Refill</button>'
        + '</div>';
    }).join('');

  } catch (err) {
    console.error('loadPrescriptions error:', err);
    container.innerHTML = '<div class="empty-list-msg">Failed to load prescriptions.</div>';
  }
}

async function requestRefill(recordId, medicationName) {
  if (!confirm('Request a refill for: ' + medicationName + '?')) return;
  try {
    var patientName = (currentPatient.first_name + ' ' + currentPatient.last_name).trim();
    await supabaseClient.from('nurse_notifications').insert({
      message:    'Refill request from ' + patientName + ' for: ' + medicationName,
      patient_id: currentPatient.patient_id,
      type:       'refill_request',
      is_read:    false
    });
    addNotification('💊 Refill request sent for ' + medicationName);
    alert('Refill request sent to your care team successfully.');
    loadStats();
  } catch (err) {
    console.error('requestRefill error:', err);
    alert('Failed to send refill request. Please try again.');
  }
}

// ────────────────────────────────────────────────────────────
// MEDICAL RECORDS
// ────────────────────────────────────────────────────────────
async function loadMedicalRecords() {
  if (!supabaseClient || !currentPatient) return;
  var container = document.getElementById('recordsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-row">Loading medical records...</div>';

  try {
    var result = await supabaseClient
      .from('medical_records')
      .select('*, doctors:doctor_id ( first_name, last_name )')
      .eq('patient_id', currentPatient.patient_id)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;

    if (!result.data || result.data.length === 0) {
      container.innerHTML = '<div class="empty-list-msg"><p>No medical records found.</p></div>';
      return;
    }

    container.innerHTML = result.data.map(function(rec) {
      var doctorName = rec.doctors
        ? (rec.doctors.first_name + ' ' + rec.doctors.last_name).trim()
        : 'Unknown';
      var date      = rec.created_at ? rec.created_at.split('T')[0] : '—';
      var prescStr  = rec.prescription
        ? (typeof rec.prescription === 'object' ? JSON.stringify(rec.prescription) : rec.prescription)
        : null;
      var vitalsStr = rec.vitals
        ? (typeof rec.vitals === 'object' ? JSON.stringify(rec.vitals) : rec.vitals)
        : null;
      var recId = rec.id || rec.record_id || '';

      return '<div class="record-card" id="record-' + recId + '">'
        + '<div class="record-header">'
        + '<h4>' + (rec.diagnosis || 'Medical Record') + '</h4>'
        + '<span class="record-date">' + date + '</span>'
        + '</div>'
        + '<p class="doctor-name">Dr. ' + doctorName + '</p>'
        + '<p class="record-summary">' + (rec.notes || rec.treatment || 'No summary available.') + '</p>'
        + '<button class="btn-view-report" onclick="toggleRecordDetails(\'' + recId + '\')">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        + ' View Full Report</button>'
        + '<div id="recordDetails-' + recId + '" class="record-details" style="display:none;">'
        + '<hr style="margin:14px 0;border-color:#e9d5ff;">'
        + (rec.diagnosis  ? '<p><strong>Diagnosis:</strong> '    + rec.diagnosis  + '</p>' : '')
        + (rec.treatment  ? '<p><strong>Treatment:</strong> '    + rec.treatment  + '</p>' : '')
        + (prescStr       ? '<p><strong>Prescription:</strong> ' + prescStr       + '</p>' : '')
        + (rec.notes      ? '<p><strong>Notes:</strong> '        + rec.notes      + '</p>' : '')
        + (vitalsStr      ? '<p><strong>Vitals:</strong> '       + vitalsStr      + '</p>' : '')
        + '</div></div>';
    }).join('');

  } catch (err) {
    console.error('loadMedicalRecords error:', err);
    container.innerHTML = '<div class="empty-list-msg">Failed to load medical records.</div>';
  }
}

function toggleRecordDetails(recordId) {
  var details = document.getElementById('recordDetails-' + recordId);
  var btn     = details ? details.previousElementSibling : null;
  if (!details) return;
  var isOpen = details.style.display !== 'none';
  details.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.innerHTML = isOpen
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> View Full Report'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Hide Report';
}

// ────────────────────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────────────────────
async function saveProfileChanges() {
  if (!supabaseClient || !currentPatient) return;

  var fullName = document.getElementById('settingsName')  ? document.getElementById('settingsName').value.trim()  : '';
  var phone    = document.getElementById('settingsPhone') ? document.getElementById('settingsPhone').value.trim() : '';
  var dob      = document.getElementById('settingsDob')   ? document.getElementById('settingsDob').value           : '';

  if (!fullName) { alert('Full name cannot be empty.'); return; }

  var parts     = fullName.trim().split(' ');
  var firstName = parts[0] || '';
  var lastName  = parts.slice(1).join(' ') || '';

  var btn = document.querySelector('.btn-save-changes');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    var result = await supabaseClient
      .from('patients')
      .update({ first_name: firstName, last_name: lastName, phone: phone || null, dob: dob || null })
      .eq('patient_id', currentPatient.patient_id);

    if (result.error) throw result.error;
    addNotification('✅ Profile updated successfully.');
    alert('Profile saved successfully.');
    await loadPatientProfile();

  } catch (err) {
    console.error('saveProfileChanges error:', err);
    alert('Failed to save changes: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
}

function openChangePasswordModal() {
  var existing = document.getElementById('passwordModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'passwordModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = '<div class="modal-box">'
    + '<div class="modal-header"><h3>Change Password</h3>'
    + '<button class="modal-close" onclick="closeModal(\'passwordModal\')">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="input-group"><label>New Password</label>'
    + '<div class="input-wrapper"><input type="password" id="newPassword" placeholder="Min 6 characters"></div></div>'
    + '<div class="input-group"><label>Confirm New Password</label>'
    + '<div class="input-wrapper"><input type="password" id="confirmPassword" placeholder="Confirm new password"></div></div>'
    + '<button class="btn-save-changes" onclick="confirmPasswordChange()">Update Password</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

async function confirmPasswordChange() {
  var newPass     = document.getElementById('newPassword')     ? document.getElementById('newPassword').value     : '';
  var confirmPass = document.getElementById('confirmPassword') ? document.getElementById('confirmPassword').value : '';

  if (!newPass || newPass.length < 6) { alert('Password must be at least 6 characters.'); return; }
  if (newPass !== confirmPass)         { alert('Passwords do not match.');                  return; }

  try {
    var result = await supabaseClient.auth.updateUser({ password: newPass });
    if (result.error) throw result.error;
    closeModal('passwordModal');
    addNotification('🔒 Password updated successfully.');
    alert('Password changed successfully.');
  } catch (err) {
    console.error('confirmPasswordChange error:', err);
    alert('Failed to update password: ' + err.message);
  }
}

// ────────────────────────────────────────────────────────────
// MODAL HELPERS & QUICK ACTIONS
// ────────────────────────────────────────────────────────────
function closeModal(id) {
  var modal = document.getElementById(id);
  if (modal) modal.remove();
}

function handleQuickAction(action) {
  if (action === 'book')        openBookingModal();
  else if (action === 'upload') openUploadModal();
  else if (action === 'message') openMessageDoctorModal();
  else if (action === 'certificate') openCertificateModal();
}

// ────────────────────────────────────────────────────────────
// GOOGLE MAPS
// ────────────────────────────────────────────────────────────
var mapInstance = null;
var mapFilter = 'nearest';
var allFacilities = [];

function setMapFilter(filter, btn) {
  mapFilter = filter;
  document.querySelectorAll('.map-filter-toggle .toggle-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  renderFacilityListNew(allFacilities);
}

async function initMap() {
  var mapCanvas    = document.getElementById('googleMap');
  var loadingState = document.getElementById('mapLoadingState');
  var errorState   = document.getElementById('mapErrorState');

  if (!mapCanvas) return;

  if (loadingState) loadingState.style.display = 'flex';
  if (errorState)   errorState.style.display   = 'none';
  mapCanvas.style.height = '400px';

  try {
    // Step 1 — Get API key
    var keyRes = await fetch('https://sabyoni-devs-med-intel.vercel.app/api/maps-config');
    var keyData = await keyRes.json();
    var apiKey = keyData.key;

    if (!apiKey) throw new Error('Maps API key not configured');

    console.log('Maps key loaded ✓');

    // Step 2 — Load Google Maps if not already loaded
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsScript(apiKey);
      console.log('Google Maps script loaded ✓');
    }

    // Step 3 — Get user location
    var position = await getUserLocation();
    var userLat  = position.coords.latitude;
    var userLng  = position.coords.longitude;
    console.log('Location:', userLat, userLng);

    // Step 4 — Hide loading, init map
    if (loadingState) loadingState.style.display = 'none';

    mapInstance = new window.google.maps.Map(mapCanvas, {
      center:             { lat: userLat, lng: userLng },
      zoom:               14,
      mapId:              'DEMO_MAP_ID',
      mapTypeControl:     false,
      streetViewControl:  false,
      fullscreenControl:  true
    });

    console.log('Map initialized ✓');

    // Step 5 — User location marker
    var userMarkerEl = document.createElement('div');
    userMarkerEl.style.cssText = 'width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.5);';
    new window.google.maps.marker.AdvancedMarkerElement({
      position: { lat: userLat, lng: userLng },
      map:      mapInstance,
      title:    'Your Location',
      content:  userMarkerEl
    });

    // Step 6 — Search nearby places using new Places API
    var placesLib = await window.google.maps.importLibrary('places');
    var Place     = placesLib.Place;

    var request = {
      fields: [
        'displayName',
        'location',
        'rating',
        'userRatingCount',
        'formattedAddress',
        'types',
        'regularOpeningHours',
        'id'
      ],
      locationRestriction: {
        center: { lat: userLat, lng: userLng },
        radius: 5000
      },
      includedPrimaryTypes: ['hospital', 'pharmacy', 'doctor'],
      maxResultCount: 12
    };

    console.log('Searching nearby places...');
    var response = await Place.searchNearby(request);
    console.log('Places response:', response);

    if (response && response.places && response.places.length > 0) {
      allFacilities = response.places;
      addFacilityMarkersNew(response.places, mapInstance);
      renderFacilityListNew(response.places);
      setEl('mapResultTitle', 'Facilities Near You');
      setEl('mapResultCount', response.places.length + ' facilities found');
    } else {
      setEl('mapResultTitle', 'No facilities found nearby');
      setEl('mapResultCount', 'Try expanding your search area');
      document.getElementById('facilityList').innerHTML =
        '<div class="empty-list-msg">No clinics or pharmacies found within 5km.</div>';
    }

  } catch (err) {
    console.error('initMap error:', err);
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      var errMsg = document.getElementById('mapErrorMsg');
      if (errMsg) errMsg.textContent = err.message || 'Could not load map. Please try again.';
    }
  }
}

// Load Google Maps script - add marker library
function loadGoogleMapsScript(apiKey) {
  return new Promise(function(resolve, reject) {
    // Check if already loading
    if (document.getElementById('gmaps-script')) {
      resolve();
      return;
    }
    var script    = document.createElement('script');
    script.id     = 'gmaps-script';
    script.src    = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=marker&loading=async&v=weekly';
    script.async  = true;
    script.defer  = true;
    script.onload = resolve;
    script.onerror = function() { reject(new Error('Failed to load Google Maps script')); };
    document.head.appendChild(script);
  });
}

function getUserLocation() {
  return new Promise(function(resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, function(err) {
      reject(new Error('Location access denied'));
    }, { timeout: 10000 });
  });
}

function addFacilityMarkersNew(places, map) {
  places.forEach(function(place) {
    var types = place.types || [];
    var color = types.includes('pharmacy') ? '#16a34a'
              : types.includes('hospital') ? '#ef4444'
              : '#3b82f6';

    var markerEl = document.createElement('div');
    markerEl.style.cssText = 'width:12px;height:12px;background:' + color + ';border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;';

    var marker = new window.google.maps.marker.AdvancedMarkerElement({
      position: place.location,
      map: map,
      title: place.displayName,
      content: markerEl
    });

    var infoWindow = new window.google.maps.InfoWindow({
      content: '<div style="font-family:inherit;padding:4px 2px;max-width:200px;">'
        + '<strong style="font-size:13px;color:#111827;">' + (place.displayName || '') + '</strong>'
        + (place.formattedAddress ? '<p style="font-size:12px;color:#6b7280;margin:4px 0 0;">' + place.formattedAddress + '</p>' : '')
        + (place.rating ? '<p style="font-size:12px;color:#f59e0b;margin:4px 0 0;">★ ' + place.rating + '</p>' : '')
        + '</div>'
    });

    marker.addListener('gmp-click', function() {
      infoWindow.open(map, marker);
    });
  });
}

function getMarkerIcon(types) {
  if (types && types.includes('pharmacy')) {
    return 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
  } else if (types && types.includes('hospital')) {
    return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
  }
  return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
}

function renderFacilityListNew(places) {
  var container = document.getElementById('facilityList');
  if (!container || !places) return;

  var sorted = places.slice();

  if (mapFilter === 'top_rated') {
    sorted.sort(function(a, b) {
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  sorted = sorted.slice(0, 6);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-list-msg">No facilities found nearby.</div>';
    return;
  }

  container.innerHTML = sorted.map(function(place) {
    var types      = place.types || [];
    var isOpen = null;
    try {
      if (place.regularOpeningHours) {
        isOpen = place.regularOpeningHours.isOpen ? place.regularOpeningHours.isOpen() : null;
      }
    } catch(e) {
      isOpen = null;
    }
    var typeLabel  = types.includes('pharmacy') ? 'Pharmacy'
                   : types.includes('hospital') ? 'Hospital'
                   : 'Medical Facility';
    var badgeClass = types.includes('pharmacy') ? 'nearby'
                   : types.includes('hospital') ? 'far'
                   : 'close';
    var lat = place.location.lat();
    var lng = place.location.lng();

    // Category icon based on type
    var categoryIcon = types.includes('pharmacy')
      ? '<div class="facility-cat-icon facility-cat-pharmacy">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>'
        + '</div>'
      : types.includes('hospital')
      ? '<div class="facility-cat-icon facility-cat-hospital">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        + '</div>'
      : '<div class="facility-cat-icon facility-cat-doctor">'
        + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
        + '</div>';

    // Star rating HTML
    var starsHtml = '';
    if (place.rating) {
      var fullStars  = Math.floor(place.rating);
      var halfStar   = place.rating % 1 >= 0.5;
      starsHtml = '<div class="facility-stars">';
      for (var i = 0; i < 5; i++) {
        if (i < fullStars) {
          starsHtml += '<svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        } else if (i === fullStars && halfStar) {
          starsHtml += '<svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" opacity="0.4"/></svg>';
        } else {
          starsHtml += '<svg width="12" height="12" viewBox="0 0 24 24" fill="#e5e7eb"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        }
      }
      starsHtml += '<span class="facility-rating-num">' + place.rating.toFixed(1) + '</span>';
      if (place.userRatingCount) {
        starsHtml += '<span class="facility-rating-count">(' + place.userRatingCount + ')</span>';
      }
      starsHtml += '</div>';
    }

    // Google Maps directions URL
    var directionsUrl = 'https://www.google.com/maps/dir/?api=1'
      + '&destination=' + lat + ',' + lng
      + '&destination_place_id=' + (place.id || '')
      + '&travelmode=driving';

    return '<div class="facility-card-new" onclick="focusMapPlace(' + lat + ',' + lng + ')">'
      + categoryIcon
      + '<div class="facility-card-body">'
      + '<div class="facility-card-top">'
      + '<div>'
      + '<h5 class="facility-card-name">' + (place.displayName || 'Unknown') + '</h5>'
      + '<span class="badge ' + badgeClass + '" style="font-size:10px;">' + typeLabel + '</span>'
      + '</div>'
      + (isOpen !== null
        ? '<span class="facility-open-badge ' + (isOpen ? 'open' : 'closed') + '">'
          + (isOpen ? '● Open' : '● Closed')
          + '</span>'
        : '')
      + '</div>'
      + starsHtml
      + (place.formattedAddress
        ? '<p class="facility-address">'
          + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
          + place.formattedAddress
          + '</p>'
        : '')
      + '<a class="facility-directions-btn" href="' + directionsUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>'
      + 'Get Directions'
      + '</a>'
      + '</div>'
      + '</div>';
  }).join('');
}

function focusMapPlace(lat, lng) {
  if (!mapInstance) return;
  mapInstance.panTo({ lat: lat, lng: lng });
  mapInstance.setZoom(16);
}

// ────────────────────────────────────────────────────────────
// YOUTUBE VIDEO SEARCH
// ────────────────────────────────────────────────────────────
async function searchVideosByFeeling() {
  var feeling = document.getElementById('feelingInput')
    ? document.getElementById('feelingInput').value.trim()
    : '';

  if (!feeling) {
    alert('Please describe how you are feeling first.');
    return;
  }

  var grid         = document.getElementById('videoGrid');
  var loadingState = document.getElementById('videoLoadingState');
  var errorState   = document.getElementById('videoErrorState');
  var resultLabel  = document.getElementById('videoResultLabel');
  var resultText   = document.getElementById('videoResultText');
  var searchBtn    = document.querySelector('.btn-feeling-search');

  // Show loading
  if (grid)         grid.style.display         = 'none';
  if (loadingState) loadingState.style.display = 'flex';
  if (errorState)   errorState.style.display   = 'none';
  if (resultLabel)  resultLabel.style.display  = 'none';
  if (searchBtn) {
    searchBtn.disabled    = true;
    searchBtn.textContent = 'Searching...';
  }

  try {
    var res = await fetch(
      'https://sabyoni-devs-med-intel.vercel.app/api/youtube?feeling=' + encodeURIComponent(feeling)
    );

    // Debug raw response
    var rawText = await res.text();
    console.log('YouTube raw response:', rawText.substring(0, 200));

    var data;
    try {
      data = JSON.parse(rawText);
    } catch(e) {
      throw new Error('YouTube service unavailable. Please try again shortly.');
    }

    if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch videos');

    if (!data.videos || data.videos.length === 0) {
      throw new Error('No videos found for that feeling. Try describing it differently.');
    }

    // Render videos
    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = data.videos.map(function(video) {
        return '<div class="video-card">'
          + '<div class="video-wrapper">'
          + '<iframe src="https://www.youtube.com/embed/' + video.id + '" frameborder="0" allowfullscreen loading="lazy"></iframe>'
          + '</div>'
          + '<div class="video-info">'
          + '<h4>' + escapeHtml(video.title) + '</h4>'
          + '<p>' + escapeHtml(video.channel) + '</p>'
          + '</div>'
          + '</div>';
      }).join('');
    }

    // Show result label
    if (resultLabel) resultLabel.style.display = 'flex';
    if (resultText)  resultText.textContent    = 'Showing results for: "' + feeling + '" → ' + data.query;

  } catch (err) {
    console.error('searchVideosByFeeling error:', err);
    if (grid) grid.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      var errMsg = document.getElementById('videoErrorMsg');
      if (errMsg) errMsg.textContent = err.message || 'Could not load videos. Please try again.';
    }
  } finally {
    if (loadingState) loadingState.style.display = 'none';
    if (searchBtn) {
      searchBtn.disabled  = false;
      searchBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Find Videos';
    }
  }
}

function quickFeeling(feeling) {
  var input = document.getElementById('feelingInput');
  if (input) input.value = feeling;
  searchVideosByFeeling();
}

function clearVideoSearch() {
  var input       = document.getElementById('feelingInput');
  var grid        = document.getElementById('videoGrid');
  var resultLabel = document.getElementById('videoResultLabel');
  var errorState  = document.getElementById('videoErrorState');

  if (input)       input.value               = '';
  if (resultLabel) resultLabel.style.display = 'none';
  if (errorState)  errorState.style.display  = 'none';

  if (grid) {
    grid.style.display = 'grid';
    grid.innerHTML = ''
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/inpok4MKVLM" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>5 Minute Meditation You Can Do Anywhere</h4><p>Goodful</p></div></div>'
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/COp7BR_Dvps" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>10 Minute Morning Yoga</h4><p>Yoga With Adriene</p></div></div>'
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/4pKly2JojMw" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>Full Body Stretch for Beginners</h4><p>MommaStrong</p></div></div>'
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/O-6f5wQXSu8" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>Anxiety Relief Breathing Exercise</h4><p>Headspace</p></div></div>'
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/1ZYbU82GVz4" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>Guided Sleep Meditation</h4><p>Great Meditation</p></div></div>'
      + '<div class="video-card"><div class="video-wrapper"><iframe src="https://www.youtube.com/embed/sTANio_2E0Q" frameborder="0" allowfullscreen></iframe></div><div class="video-info"><h4>10 Minute Full Body Workout</h4><p>HASfit</p></div></div>';
  }
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text || ''));
  return div.innerHTML;
}

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────
window.onload = async function () {
  if (!initSupabase()) {
    alert('System configuration error. Please contact support.');
    return;
  }

  var session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = session;

  switchTab(null, 'overviewSection');
  var firstBtn = document.querySelector('.tab-btn');
  if (firstBtn) firstBtn.classList.add('active');
  updateNotificationUI();

  await loadPatientProfile();

  var darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    darkToggle.addEventListener('change', function () {
      document.body.classList.toggle('dark-theme', this.checked);
    });
  }

  document.addEventListener('click', function (e) {
    var popup    = document.getElementById('notificationPopup');
    var notifBtn = document.querySelector('.notif-btn');
    if (popup && popup.classList.contains('show-notification')) {
      if (!popup.contains(e.target) && notifBtn && !notifBtn.contains(e.target)) {
        popup.classList.remove('show-notification');
      }
    }
  });
};

async function saveChatHistory(message, response) {
  if (!supabaseClient || !currentPatient) return;
  try {
    await supabaseClient.from('ai_chat_history').insert({
      patient_id: currentPatient.patient_id,
      message:    message,
      response:   response,
      timestamp:  new Date().toISOString()
    });
  } catch (err) {
    console.error('saveChatHistory error:', err);
  }
}

async function loadChatHistory() {
  if (!supabaseClient || !currentPatient) return;
  var container = document.getElementById('ariaChatHistory');
  if (!container) return;

  try {
    var result = await supabaseClient
      .from('ai_chat_history')
      .select('*')
      .eq('patient_id', currentPatient.patient_id)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (result.error) throw result.error;

    if (!result.data || result.data.length === 0) {
      container.innerHTML = '<div class="chat-history-empty">'
        + '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>'
        + '<p>No previous ARIA sessions yet.<br>Your chat history will appear here.</p>'
        + '</div>';
      return;
    }

    container.innerHTML = result.data.map(function(chat) {
      var date = new Date(chat.timestamp).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
      var time = new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var shortMessage = chat.message.length > 100
        ? chat.message.substring(0, 100) + '...'
        : chat.message;

      return '<div class="ch-item" id="chat-' + chat.chat_id + '">'

        // ── Header row: date + delete ──
        + '<div class="ch-header">'
        + '<span class="ch-date">'
        + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        + date + ' · ' + time
        + '</span>'
        + '<button class="ch-delete" onclick="deleteChatHistory(\'' + chat.chat_id + '\')" title="Delete session">'
        + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
        + '</button>'
        + '</div>'

        // ── Patient message preview ──
        + '<div class="ch-you-bubble">'
        + '<span class="ch-label ch-label-you">You</span>'
        + '<p class="ch-preview">' + shortMessage + '</p>'
        + '</div>'

        // ── Expandable ARIA response ──
        + '<details class="ch-details">'
        + '<summary class="ch-summary">'
        + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>'
        + 'ARIA\'s Response'
        + '</summary>'
        + '<div class="ch-aria-body">'
        + '<div class="ch-full-symptoms">'
        + '<span class="ch-label ch-label-you">Your symptoms</span>'
        + '<p>' + chat.message + '</p>'
        + '</div>'
        + '<div class="ch-full-response">'
        + '<span class="ch-label ch-label-aria">ARIA</span>'
        + '<div class="aria-body">' + formatARIAResponse(chat.response) + '</div>'
        + '</div>'
        + '</div>'
        + '</details>'

        + '</div>';
    }).join('');

  } catch (err) {
    console.error('loadChatHistory error:', err);
  }
}
async function deleteChatHistory(chatId) {
  if (!confirm('Delete this ARIA session from your history?')) return;
  try {
    var result = await supabaseClient
      .from('ai_chat_history')
      .delete()
      .eq('chat_id', chatId)
      .eq('patient_id', currentPatient.patient_id);

    if (result.error) throw result.error;

    var el = document.getElementById('chat-' + chatId);
    if (el) el.remove();

    addNotification('🗑️ ARIA session deleted from history.');

    // Show empty state if no more chats
    var container = document.getElementById('ariaChatHistory');
    if (container && container.children.length === 0) {
      loadChatHistory();
    }

  } catch (err) {
    console.error('deleteChatHistory error:', err);
    alert('Failed to delete. Please try again.');
  }
}

function toggleChatExpand(chatId) {
  var expanded = document.getElementById('chatExpand-' + chatId);
  var btn = expanded ? expanded.previousElementSibling : null;
  if (!expanded) return;
  var isOpen = expanded.style.display !== 'none';
  expanded.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.innerHTML = isOpen
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> View Full Response'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Hide Response';
}

function toggleChatHistoryPanel() {
  var panel   = document.getElementById('ariaHistoryPanel');
  var overlay = document.getElementById('ariaHistoryOverlay');
  if (!panel) return;

  var isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    panel.classList.add('open');
    overlay.classList.add('open');
    loadChatHistory();
  }
}