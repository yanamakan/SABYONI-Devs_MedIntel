// admin-dashboard.js
// Logout handler
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = 'index.html';
  }
});
