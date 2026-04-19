// ========== NOTIFICATION SYSTEM (FIXED) ==========
let notifications = [
    "📅 Reminder: You have an appointment with Dr. Michael Chen tomorrow at 9:00 AM",
    "💊 Your prescription refill for Amlodipine is ready for pickup",
    "📝 New medical report has been added to your records"
];

function updateNotificationUI() {
    const listDiv = document.getElementById("notificationList");
    const countSpan = document.getElementById("notificationCount");
    if (listDiv) {
        if (notifications.length === 0) {
            listDiv.innerHTML = "<i>No new notifications</i>";
            if (countSpan) countSpan.style.display = "none";
        } else {
            listDiv.innerHTML = notifications.map(n => `<div style="border-bottom:1px solid #ddd; padding:6px 0;">${n}</div>`).join('');
            if (countSpan) {
                countSpan.innerText = notifications.length;
                countSpan.style.display = "inline-block";
            }
        }
    }
}
function toggleNotificationPopup() {
    const popup = document.getElementById("notificationPopup");
    
    if (!popup) return;

    // Toggle the CSS class you created
    popup.classList.toggle("show-notification");

    // If we are opening it, update the list and set an auto-hide timer
    if (popup.classList.contains("show-notification")) {
        updateNotificationUI();

        // Optional: Auto-hide after 5 seconds
        setTimeout(() => {
            popup.classList.remove("show-notification");
        }, 5000);
    }
}

function clearAllNotifications() {
    notifications = [];
    updateNotificationUI();
    document.getElementById("notificationPopup").style.display = "none";
    displayMessage("All notifications cleared", false);
}

function addNotification(message) {
    notifications.unshift(message);
    updateNotificationUI();
    const popup = document.getElementById("notificationPopup");
    if (popup.style.display !== "block") {
        popup.style.display = "block";
        setTimeout(() => {
            if (popup.style.display === "block") popup.style.display = "none";
        }, 4000);
    }
    const bellBtn = document.getElementById("notificationsBtn");
    if (bellBtn) {
        bellBtn.style.backgroundColor = "#ffcc00";
        setTimeout(() => { bellBtn.style.backgroundColor = ""; }, 500);
    }
}

function displayMessage(text, isError = true) {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;
    messageDiv.innerHTML = text;
    messageDiv.style.color = isError ? "red" : "green";
    setTimeout(() => { messageDiv.innerHTML = ""; }, 3000);
}

// ========== MAIN NAVIGATION (CONSOLIDATED) ==========
// This single function now handles ALL main tab switching
function switchTab(event, sectionId) {
    // 1. Hide all main sections
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // 2. Remove active state from all buttons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the target main section (e.g., Overview, Settings)
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // 4. Update main navigation button UI
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    /**
     * SPECIAL LOGIC: 
     * If switching to Settings, automatically trigger the Profile sub-tab.
     * We pass 'null' for the event and 'profileSub' for the section.
     */
    if (sectionId === 'settingsSection') {
        // This ensures the sub-content is visible AND the sub-nav button highlights
        switchSettingsSubTab(null, 'profileSub');
    }
}

// ========== SETTINGS SUB-NAVIGATION ==========
function switchSettingsSubTab(event, subSectionId) {
    // 1. Hide all settings sub-sections
    const allSubTabs = document.querySelectorAll('.settings-sub-content');
    allSubTabs.forEach(tab => {
        tab.style.display = 'none';
    });

    // 2. Remove active class from all sub-nav buttons
    const allSubBtns = document.querySelectorAll('.s-nav-btn');
    allSubBtns.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Show the requested sub-tab
    const targetTab = document.getElementById(subSectionId);
    if (targetTab) {
        targetTab.style.display = 'block';
    }

    // 4. Handle Button Highlighting
    if (event && event.currentTarget) {
        // Highlight the button the user actually clicked
        event.currentTarget.classList.add('active');
    } else {
        // If called automatically, find the button for this subSectionId and highlight it
        // This ensures the "Profile" button turns white when you enter Settings
        const targetBtn = Array.from(allSubBtns).find(btn => 
            btn.getAttribute('onclick').includes(subSectionId)
        );
        if (targetBtn) targetBtn.classList.add('active');
    }
}

// Keep your original specific functions for backward compatibility with old buttons
function showSettingsProfile() { switchSettingsSubTab(null, 'settingsProfile'); }
function showSettingsPreferences() { switchSettingsSubTab(null, 'settingsPreferences'); }
function showSettingsNotifications() { switchSettingsSubTab(null, 'settingsNotifications'); }
function showSettingsSecurity() { switchSettingsSubTab(null, 'settingsSecurity'); }

// ========== YOUTUBE FILTERS ==========
function filterVideos(category, btn) {
    const cards = document.querySelectorAll('.video-card');
    const buttons = document.querySelectorAll('.filter-item');

    buttons.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    cards.forEach(card => {
        if (category === 'all' || card.classList.contains(category)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ========== APPOINTMENTS, PRESCRIPTIONS, QUICK ACTIONS ==========
function bookAppointment() { switchTab(null, 'upcomingAppointmentsSection'); showBookAppointmentForm(); }
function uploadDocument() { displayMessage("Upload document feature coming soon.", false); addNotification("📄 Document upload coming soon"); }
function messageDoctor() { switchTab(null, 'messagesSection'); showNewMessageForm(); }
function requestCertificate() { displayMessage("Medical certificate request submitted.", false); addNotification("📋 Certificate request submitted"); }

function showBookAppointmentForm() { document.getElementById("bookAppointmentForm").style.display = "block"; }
function hideBookAppointmentForm() { document.getElementById("bookAppointmentForm").style.display = "none"; }

function confirmBookAppointment() {
    let doctor = document.getElementById("appointmentDoctor").value;
    let date = document.getElementById("appointmentDate").value;
    let time = document.getElementById("appointmentTime").value;

    if (!date || !time) {
        displayMessage("Please select date and time");
        return;
    }

    displayMessage(`Appointment booked with ${doctor}`, false);
    addNotification(`✅ New appointment: ${doctor} on ${date}`);
    hideBookAppointmentForm();
}

function requestRefill(medication) {
    displayMessage(`Refill request for ${medication} submitted.`, false);
    addNotification(`💊 Refill requested: ${medication}`);
}

// ========== INITIALIZATION ==========
window.onload = function() {
    // Show Overview by default
    switchTab(null, 'overviewSection');
    updateNotificationUI();
    
    // Add welcome message
    setTimeout(() => {
        addNotification("👋 Welcome back, James! You have 2 unread messages.");
    }, 1000);

    // Dark Mode Logic
    const darkToggle = document.querySelector('.toggle-switch input');
    if (darkToggle) {
        darkToggle.addEventListener('change', function() {
            document.body.classList.toggle('dark-theme', this.checked);
        });
    }

    // Preference Change listeners
    document.querySelectorAll('.select-wrapper select').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            alert(`Preference updated to: ${this.value}`);
        });
    });
};
/**
 * SECURITY ACTIONS
 * Handles Password changes, 2FA, and Session management
 */

// We use a single function to handle these simple security alerts
function handleSecurityAction(actionName) {
    // In a real app, this would open a modal or redirect to a secure page
    if (actionName === 'password') {
        alert("Redirecting to Secure Password Change form...");
    } else if (actionName === '2fa') {
        const confirmEnable = confirm("Would you like to start the Two-Factor Authentication setup?");
        if (confirmEnable) {
            displayMessage("2FA Setup initiated. Check your email.", false);
            addNotification("🛡️ 2FA Setup started");
        }
    } else if (actionName === 'sessions') {
        alert("Loading active devices and login history...");
    }
}