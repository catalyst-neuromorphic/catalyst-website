var API = 'https://api.catalyst-neuromorphic.com';
var CALLBACK_URL = window.location.origin + '/console/oauth-callback';

// If already logged in, redirect to dashboard (or authorize page for CLI flows)
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

// OAuth buttons — pass CLI params (callback_port, device_code, state) through
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

var pendingTempToken = '';

function completeLogin(data) {
  localStorage.setItem('catalyst_token', data.access_token);
  localStorage.setItem('catalyst_refresh_token', data.refresh_token);
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

function showTwoFA(tempToken) {
  pendingTempToken = tempToken;
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('twofa-step').classList.remove('hidden');
  document.getElementById('totp-code').focus();
}

function hideTwoFA() {
  pendingTempToken = '';
  document.getElementById('twofa-step').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('error').classList.add('hidden');
}

// Email/password form
var loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var errorEl = document.getElementById('error');
  var btn = document.getElementById('submit-btn');
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;

  errorEl.classList.add('hidden');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    var res = await fetch(API + '/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Login failed');
    }

    var data = await res.json();

    if (data.requires_2fa) {
      showTwoFA(data.temp_token);
      btn.textContent = 'Log in';
      btn.disabled = false;
      return;
    }

    completeLogin(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Log in';
    btn.disabled = false;
  }
});

// 2FA verification
var twofaBtn = document.getElementById('twofa-btn');
if (twofaBtn) twofaBtn.addEventListener('click', async function() {
  var errorEl = document.getElementById('error');
  var btn = document.getElementById('twofa-btn');
  var code = document.getElementById('totp-code').value.trim();

  if (!code) return;

  errorEl.classList.add('hidden');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  try {
    var res = await fetch(API + '/v1/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: pendingTempToken, code: code }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Verification failed');
    }

    var data = await res.json();
    completeLogin(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Verify';
    btn.disabled = false;
  }
});

// Allow Enter key on 2FA input
var totpCode = document.getElementById('totp-code');
if (totpCode) totpCode.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    var twofaBtn = document.getElementById('twofa-btn');
    if (twofaBtn) twofaBtn.click();
  }
});

// Back button
var twofaBack = document.getElementById('twofa-back');
if (twofaBack) twofaBack.addEventListener('click', hideTwoFA);
