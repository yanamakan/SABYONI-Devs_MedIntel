// ===== NOTIFICATIONS =====
let notifications = [
  "📅 Reminder: You have an appointment with Dr. Michael Chen tomorrow at 9:00 AM",
  "💊 Your prescription refill for Amlodipine is ready for pickup",
  "📝 New medical report has been added to your records"
];

function updateNotificationUI() {
  const listDiv = document.getElementById("notificationList");
  const countSpan = document.getElementById("notificationCount");
  if (!listDiv) return;
  if (notifications.length === 0) {
    listDiv.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:6px 0;">No new notifications</div>';
    if (countSpan) countSpan.style.display = "none";
  } else {
    listDiv.innerHTML = notifications
      .map(n => `<div>${n}</div>`)
      .join('');
    if (countSpan) {
      countSpan.textContent = notifications.length;
      countSpan.style.display = "inline-flex";
    }
  }
}

function toggleNotificationPopup() {
  const popup = document.getElementById("notificationPopup");
  if (!popup) return;
  popup.classList.toggle("show-notification");
  if (popup.classList.contains("show-notification")) {
    updateNotificationUI();
    setTimeout(() => popup.classList.remove("show-notification"), 5000);
  }
}

function clearAllNotifications() {
  notifications = [];
  updateNotificationUI();
  document.getElementById("notificationPopup").classList.remove("show-notification");
}

function addNotification(message) {
  notifications.unshift(message);
  updateNotificationUI();
}

function displayMessage(text, isError = true) {
  console.log(isError ? "Error: " + text : "Info: " + text);
}

// ===== LOGOUT =====
function handleLogout() {
    window.location.href = "login.html";
  
}

// ===== MAIN TAB SWITCHING =====
function switchTab(event, sectionId) {
  document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  if (sectionId === 'settingsSection') switchSettingsSubTab(null, 'profileSub');
}

// ===== SETTINGS SUB-TABS =====
function switchSettingsSubTab(event, subId) {
  document.querySelectorAll('.settings-sub-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.s-nav-btn').forEach(b => b.classList.remove('active'));
  const target = document.getElementById(subId);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else {
    const btn = Array.from(document.querySelectorAll('.s-nav-btn'))
      .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(subId));
    if (btn) btn.classList.add('active');
  }
}

// ===== VIDEO FILTER =====
function filterVideos(category, btn) {
  document.querySelectorAll('.video-card').forEach(card => {
    card.style.display = (category === 'all' || card.classList.contains(category)) ? 'block' : 'none';
  });
  document.querySelectorAll('.filter-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ===== AI ANALYSIS =====
function getAIAnalysis() {
  const symptoms = document.getElementById("symptomsInput").value;
  if (!symptoms.trim()) {
    alert("Please describe your symptoms first.");
    return;
  }
  alert("AI Analysis: Based on your symptoms, we recommend scheduling an appointment with your doctor. This is for informational purposes only.");
  addNotification("🤖 AI health analysis completed");
}

// ===== SECURITY =====
function handleSecurityAction(action) {
  if (action === 'password') alert("Redirecting to Secure Password Change form...");
  else if (action === '2fa') {
    if (confirm("Would you like to start the Two-Factor Authentication setup?")) {
      addNotification("🛡️ 2FA Setup started");
    }
  } else if (action === 'sessions') alert("Loading active devices and login history...");
}

// ===== INIT =====
window.onload = function () {
  switchTab(null, 'overviewSection');
  // Set first tab btn active
  const firstBtn = document.querySelector('.tab-btn');
  if (firstBtn) firstBtn.classList.add('active');
  
  updateNotificationUI();

  setTimeout(() => addNotification("👋 Welcome back, James! You have 2 unread messages."), 1000);

  // Dark mode toggle
  const darkToggle = document.getElementById('darkToggle');
  if (darkToggle) {
    darkToggle.addEventListener('change', function () {
      document.body.classList.toggle('dark-theme', this.checked);
    });
  }

  // Close notification popup when clicking outside
  document.addEventListener('click', function (e) {
    const popup = document.getElementById('notificationPopup');
    const notifBtn = document.querySelector('.notif-btn');
    if (popup && popup.classList.contains('show-notification')) {
      if (!popup.contains(e.target) && !notifBtn.contains(e.target)) {
        popup.classList.remove('show-notification');
      }
    }
  });
};