// Scroll-triggered frosted glass
var nav = document.getElementById('nav');
var scrolled = false;
window.addEventListener('scroll', function() {
  var s = window.scrollY > 50;
  if (s !== scrolled) {
    scrolled = s;
    if (nav) nav.classList.toggle('scrolled', s);
  }
}, { passive: true });

// Mobile menu toggle
var btn = document.getElementById('mobile-menu-btn');
var menu = document.getElementById('mobile-menu');
var menuIcon = document.getElementById('menu-icon');
var closeIcon = document.getElementById('close-icon');

if (btn) btn.addEventListener('click', function() {
  var isOpen = menu && !menu.classList.contains('hidden');
  if (menu) menu.classList.toggle('hidden');
  if (menuIcon) menuIcon.classList.toggle('hidden', !isOpen);
  if (closeIcon) closeIcon.classList.toggle('hidden', isOpen);
});

// Auth state — check both catalyst_token and catalyst_session for backwards compat
var signInLink = document.getElementById('sign-in-link');
var avatarBtn = document.getElementById('avatar-btn');
var avatarDropdown = document.getElementById('avatar-dropdown');
var mobileSignIn = document.getElementById('mobile-sign-in');

var isLoggedIn = false;
try {
  var token = localStorage.getItem('catalyst_token');
  if (token) {
    isLoggedIn = true;
  } else {
    var session = localStorage.getItem('catalyst_session');
    if (session) {
      var data = JSON.parse(session);
      if (data && data.access_token) isLoggedIn = true;
    }
  }
} catch(e) {}

if (isLoggedIn) {
  if (signInLink) signInLink.style.setProperty('display', 'none');
  if (avatarBtn) {
    avatarBtn.style.display = 'flex';
  }
  if (mobileSignIn) mobileSignIn.style.setProperty('display', 'none');

  // Avatar dropdown toggle
  if (avatarBtn) avatarBtn.addEventListener('click', function() {
    var isVisible = avatarDropdown && !avatarDropdown.classList.contains('invisible');
    if (isVisible) {
      if (avatarDropdown) {
        avatarDropdown.classList.add('opacity-0', 'invisible');
        avatarDropdown.classList.remove('opacity-100', 'visible');
      }
    } else {
      if (avatarDropdown) {
        avatarDropdown.classList.remove('opacity-0', 'invisible');
        avatarDropdown.classList.add('opacity-100', 'visible');
      }
    }
  });
}

// Sign out — clear both token keys
var signOutBtn = document.getElementById('sign-out-btn');
if (signOutBtn) signOutBtn.addEventListener('click', function() {
  localStorage.removeItem('catalyst_session');
  localStorage.removeItem('catalyst_token');
  localStorage.removeItem('catalyst_refresh_token');
  window.location.href = '/';
});
