var API = 'https://api.catalyst-neuromorphic.com';
var CALLBACK_URL = window.location.origin + '/console/oauth-callback';

// If already logged in, redirect (preserve CLI params)
if (localStorage.getItem('catalyst_token') || localStorage.getItem('catalyst_session')) {
  var params = new URLSearchParams(window.location.search);
  var callbackPort = params.get('callback_port');
  var deviceCode = params.get('device_code');
  if (callbackPort || deviceCode) {
    var ap = new URLSearchParams();
    if (callbackPort) ap.set('callback_port', callbackPort);
    if (deviceCode) ap.set('device_code', deviceCode);
    if (params.get('state')) ap.set('state', params.get('state'));
    window.location.href = '/console/authorize?' + ap.toString();
  } else {
    window.location.href = '/console/dashboard';
  }
}

// OAuth buttons — preserve CLI callback params if present
function _buildOAuthExtra() {
  var params = new URLSearchParams(window.location.search);
  var ap = new URLSearchParams();
  if (params.get('callback_port')) ap.set('callback_port', params.get('callback_port'));
  if (params.get('device_code')) ap.set('device_code', params.get('device_code'));
  if (params.get('state')) ap.set('state', params.get('state'));
  var qs = ap.toString();
  return qs ? '?' + qs : '';
}

var githubBtn = document.getElementById('github-btn');
if (githubBtn) githubBtn.addEventListener('click', function() {
  var extra = _buildOAuthExtra();
  window.location.href = API + '/v1/auth/github?redirect_uri=' + encodeURIComponent(CALLBACK_URL + extra);
});

var googleBtn = document.getElementById('google-btn');
if (googleBtn) googleBtn.addEventListener('click', function() {
  var extra = _buildOAuthExtra();
  window.location.href = API + '/v1/auth/google?redirect_uri=' + encodeURIComponent(CALLBACK_URL + extra);
});

// Email/password form
var signupForm = document.getElementById('signup-form');
if (signupForm) signupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var errorEl = document.getElementById('error');
  var btn = document.getElementById('submit-btn');
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;
  var confirm = document.getElementById('confirm').value;

  var termsChecked = document.getElementById('terms').checked;

  if (!termsChecked) {
    errorEl.textContent = 'You must accept the Terms of Service and Privacy Policy.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    var res = await fetch(API + '/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, terms_accepted: true }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Signup failed');
    }

    var data = await res.json();
    localStorage.setItem('catalyst_token', data.access_token);
    localStorage.setItem('catalyst_refresh_token', data.refresh_token);

    // Check for CLI callback redirect
    var params = new URLSearchParams(window.location.search);
    var callbackPort = params.get('callback_port');
    var deviceCode = params.get('device_code');
    if (callbackPort || deviceCode) {
      var ap = new URLSearchParams();
      if (callbackPort) ap.set('callback_port', callbackPort);
      if (deviceCode) ap.set('device_code', deviceCode);
      if (params.get('state')) ap.set('state', params.get('state'));
      window.location.href = '/console/authorize?' + ap.toString();
    } else {
      // Redirect to email verification
      window.location.href = '/console/verify-email';
    }
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Create account';
    btn.disabled = false;
  }
});
