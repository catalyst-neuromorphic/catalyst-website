// Auth guard — redirect to login if no token (check both keys for backwards compat)
var token = localStorage.getItem('catalyst_token');
var sessionToken = null;
try {
  var session = localStorage.getItem('catalyst_session');
  if (session) { var d = JSON.parse(session); sessionToken = d && d.access_token ? d.access_token : null; }
} catch(e) {}
if (!token && !sessionToken && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup') && !window.location.pathname.includes('/authorize')) {
  window.location.href = '/console/login';
}

// Mobile sidebar toggle
var menuBtn = document.getElementById('mobile-menu-btn');
var sidebar = document.getElementById('console-sidebar');
var overlay = document.getElementById('sidebar-overlay');
function closeSidebar() {
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}
if (menuBtn) menuBtn.addEventListener('click', function() {
  var isOpen = sidebar && sidebar.classList.contains('open');
  if (isOpen) { closeSidebar(); } else {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('open');
  }
});
if (overlay) overlay.addEventListener('click', closeSidebar);
if (sidebar) sidebar.querySelectorAll('.sidebar-link').forEach(function(link) {
  link.addEventListener('click', closeSidebar);
});

// Logout button — clear all token keys
var logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async function() {
  try {
    var t = localStorage.getItem('catalyst_token');
    if (t) {
      await fetch('https://api.catalyst-neuromorphic.com/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + t },
      });
    }
  } catch(e) {}
  localStorage.removeItem('catalyst_token');
  localStorage.removeItem('catalyst_refresh_token');
  localStorage.removeItem('catalyst_session');
  window.location.href = '/console/login';
});
