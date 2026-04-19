/**
 * SECTION 1: NAVIGATION CONTROLLER
 * This logic handles the "Analytics", "System Control", and "Admin Management" tabs.
 */
function showSection(sectionId) {
    // 1. Define the sections we want to manage
    const sections = ['analyticsSection', 'systemControlSection', 'adminManagementSection'];
    
    // 2. Hide all main sections
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });

    // 3. Show the one that was clicked
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
    }

    // 4. Update the visual "active" state of the buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Ensure the current clicked button glows white
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

/**
 * SECTION 2: CHART.JS GLOBAL DEFAULTS
 * Styling the fonts and grid lines to match your dark-mode dashboard.
 */
Chart.defaults.color = '#94a3b8'; // Light gray text for labels
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)'; // Subtle grid lines
Chart.defaults.font.family = "'Inter', sans-serif";

// Reusable chart options to keep the code clean
const globalChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Prevents the 'stretching' loop
    plugins: {
        legend: {
            display: false // Hide legends for Line and Bar charts for a cleaner look
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
            grid: { display: false } // Hide vertical grid lines
        }
    }
};

/**
 * SECTION 3: INITIALIZING THE CHARTS
 */

// --- 1. GROWTH TRENDS (Line Chart) ---
const growthCtx = document.getElementById('growthChart');
if (growthCtx) {
    new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [{
                label: 'Patients',
                data: [1050, 1100, 1150, 1180, 1210, 1247],
                borderColor: '#3b82f6', // Neon Blue
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4 // Creates the smooth 'wavy' line
            }]
        },
        options: globalChartOptions
    });
}

// --- 2. DEPARTMENT DISTRIBUTION (Bar Chart) ---
const deptCtx = document.getElementById('deptChart');
if (deptCtx) {
    new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: ['Cardio', 'Peds', 'ER', 'Ortho', 'Neuro', 'Other'],
            datasets: [{
                label: 'Patients',
                data: [240, 320, 160, 200, 140, 190],
                backgroundColor: '#3b82f6',
                borderRadius: 8 // Rounded bars matching your screenshot
            }]
        },
        options: globalChartOptions
    });
}

// --- 3. URGENCY DISTRIBUTION (Doughnut Chart) ---
const urgencyCtx = document.getElementById('urgencyChart');
if (urgencyCtx) {
    new Chart(urgencyCtx, {
        type: 'doughnut',
        data: {
            labels: ['Low', 'Medium', 'High', 'Emergency'],
            datasets: [{
                data: [145, 112, 54, 13],
                backgroundColor: [
                    '#10b981', // Green (Low)
                    '#3b82f6', // Blue (Medium)
                    '#a855f7', // Purple (High)
                    '#ef4444'  // Red (Emergency)
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Creates the thin modern ring look
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}
function restartSystem() {
    if(confirm("Are you sure you want to restart the system?")) {
        alert("System restart initiated...");
    }
}

function checkUpdates() {
    alert("Checking for updates... System is currently up to date.");
}

function shutdownSystem() {
    if(confirm("WARNING: System shutdown will take all services offline. Proceed?")) {
        alert("Shutting down...");
    }
}