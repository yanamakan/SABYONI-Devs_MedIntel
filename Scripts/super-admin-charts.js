/**
 * super-admin-charts.js
 * MedIntel Super Admin — Chart.js initializations + system actions
 */

// ── Global Chart Defaults ────────────────────────────────────
Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

// ── Shared scale options for line/bar charts ─────────────────
const baseScales = {
    y: {
        beginAtZero: false,
        grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] },
        ticks: { color: '#64748b', font: { size: 11 } }
    },
    x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } }
    }
};

// ── 1. GROWTH TRENDS — dual line (patients + appointments) ───
const growthCtx = document.getElementById('growthChart');
if (growthCtx) {
    new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [
                {
                    label: 'patients',
                    data: [1050, 1100, 1150, 1180, 1210, 1247],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#3b82f6'
                },
                {
                    label: 'appointments',
                    data: [280, 295, 305, 310, 318, 324],
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.06)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#06b6d4'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] },
                    ticks: { color: '#64748b', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 } }
                }
            }
        }
    });
}

// ── 2. DEPARTMENT DISTRIBUTION — grouped bars ────────────────
const deptCtx = document.getElementById('deptChart');
if (deptCtx) {
    new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: ['Cardiology', 'Pediatrics', 'Emergency', 'Neurology', 'Other'],
            datasets: [
                {
                    label: 'patients',
                    data: [240, 320, 160, 140, 190],
                    backgroundColor: '#1e40af',
                    borderRadius: 5,
                    borderSkipped: false
                },
                {
                    label: 'appointments',
                    data: [180, 260, 120, 100, 150],
                    backgroundColor: '#06b6d4',
                    borderRadius: 5,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)', borderDash: [4, 4] },
                    ticks: { color: '#64748b', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0 }
                }
            }
        }
    });
}

// ── 3. URGENCY DISTRIBUTION — pie with outside labels ────────
const urgencyCtx = document.getElementById('urgencyChart');
if (urgencyCtx) {
    new Chart(urgencyCtx, {
        type: 'pie',
        data: {
            labels: ['Low: 145', 'Medium: 112', 'High: 54', 'Emergency: 13'],
            datasets: [{
                data: [145, 112, 54, 13],
                backgroundColor: ['#3b82f6', '#06b6d4', '#a855f7', '#ef4444'],
                borderWidth: 2,
                borderColor: 'rgba(13, 24, 48, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, bottom: 20, left: 60, right: 60 } },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        },
        plugins: [{
            id: 'outsideLabels',
            afterDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                const colors = ['#3b82f6', '#06b6d4', '#a855f7', '#ef4444'];
                const labels = ['Low: 145', 'Medium: 112', 'High: 54', 'Emergency: 13'];
                ctx.save();
                ctx.font = 'bold 12px Segoe UI, system-ui, sans-serif';
                meta.data.forEach((arc, i) => {
                    const angle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
                    const r = arc.outerRadius + 28;
                    const cx = arc.x + Math.cos(angle) * r;
                    const cy = arc.y + Math.sin(angle) * r;
                    ctx.fillStyle = colors[i];
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labels[i], cx, cy);
                });
                ctx.restore();
            }
        }]
    });
}

// ── System Control Actions ───────────────────────────────────
function restartSystem() {
    if (confirm("Are you sure you want to restart the system?")) {
        alert("System restart initiated...");
    }
}

function checkUpdates() {
    alert("Checking for updates... System is currently up to date.");
}

function shutdownSystem() {
    if (confirm("WARNING: System shutdown will take all services offline. Proceed?")) {
        alert("Shutting down...");
    }
}

// ── Admin Management Actions ─────────────────────────────────
function createAdminAccount() {
    const name  = document.getElementById('adminFullName').value;
    const email = document.getElementById('adminEmail').value;
    const pass  = document.getElementById('adminPassword').value;
    if (!name || !email || !pass) {
        alert("Please fill in all fields.");
        return;
    }
    alert(`Admin account created for ${name} (${email})`);
}

function createStaffAccount() {
    const name = document.getElementById('staffFullName').value;
    const email = document.getElementById('staffEmail').value;
    const role  = document.getElementById('staffRole').value;
    if (!name || !email) {
        alert("Please fill in at least the name and email.");
        return;
    }
    alert(`Staff account created: ${name} — ${role} (${email})`);
}

function logoutUser() {
  window.location.href = 'login.html';
}