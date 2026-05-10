// ======== SESSION MANAGER ========
// Handles session timeout for all MedIntel dashboard pages
// Timeout: 30 minutes of inactivity
// Warning: shown at 25 minutes

const SESSION_TIMEOUT = 30 * 60 * 1000;    // 30 minutes
const SESSION_WARNING = 25 * 60 * 1000;    // 25 minutes
const SESSION_KEY = 'medintel_user';

let timeoutTimer;
let warningTimer;
let warningShown = false;

// ======== CREATE WARNING MODAL ========
function createWarningModal() {
  if (document.getElementById('session-warning-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'session-warning-modal';
  modal.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.5);
    z-index:99999;
    align-items:center;
    justify-content:center;
  `;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:36px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">⏱</div>
      <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Session Expiring Soon</div>
      <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Your session will expire due to inactivity in</div>
      <div id="session-countdown" style="font-size:36px;font-weight:700;color:#ef4444;margin-bottom:20px;">5:00</div>
      <div style="font-size:13px;color:#9ca3af;margin-bottom:28px;">For patient data security, you will be automatically logged out.</div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button onclick="extendSession()" style="flex:1;padding:12px;border-radius:10px;border:none;background:#0ea5e9;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">
          Stay Logged In
        </button>
        <button onclick="sessionLogout()" style="flex:1;padding:12px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;font-weight:600;cursor:pointer;color:#374151;">
          Logout Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// ======== SHOW WARNING ========
let countdownInterval;

function showWarning() {
  warningShown = true;
  const modal = document.getElementById('session-warning-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  let secondsLeft = 5 * 60;
  const countdownEl = document.getElementById('session-countdown');

  countdownInterval = setInterval(() => {
    secondsLeft--;
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    if (countdownEl) {
      countdownEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    if (secondsLeft <= 0) {
      clearInterval(countdownInterval);
      sessionLogout();
    }
  }, 1000);
}

// ======== HIDE WARNING ========
function hideWarning() {
  const modal = document.getElementById('session-warning-modal');
  if (modal) modal.style.display = 'none';
  clearInterval(countdownInterval);
  warningShown = false;
}

// ======== EXTEND SESSION ========
function extendSession() {
  hideWarning();
  resetTimers();
}

// ======== LOGOUT ========
function sessionLogout() {
  clearTimers();
  hideWarning();
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'login.html';
}

// ======== RESET TIMERS ========
function resetTimers() {
  clearTimers();

  warningTimer = setTimeout(() => {
    showWarning();
  }, SESSION_WARNING);

  timeoutTimer = setTimeout(() => {
    if (!warningShown) sessionLogout();
  }, SESSION_TIMEOUT);
}

// ======== CLEAR TIMERS ========
function clearTimers() {
  clearTimeout(warningTimer);
  clearTimeout(timeoutTimer);
}

// ======== ACTIVITY LISTENERS ========
function initSessionManager() {
  // Check if user is logged in
  const user = localStorage.getItem(SESSION_KEY);
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Create the warning modal
  createWarningModal();

  // Start timers
  resetTimers();

  // Reset on any user activity
  ['mousemove', 'mousedown', 'keypress', 'touchstart', 'click', 'scroll'].forEach(event => {
    document.addEventListener(event, () => {
      if (!warningShown) resetTimers();
    }, { passive: true });
  });
}

// ======== AUTO INIT ========
document.addEventListener('DOMContentLoaded', initSessionManager);