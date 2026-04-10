// nurse-dashboard.js
// Add any home dashboard interactivity here
// e.g. fetching live stats, logout handling, notifications

document.querySelectorAll('.header-btn').forEach(btn => {
  if (btn.textContent.includes('Logout')) {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html'; // redirect to login
      }
    });
  }
});
