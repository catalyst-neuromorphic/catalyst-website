var API = 'https://api.catalyst-neuromorphic.com';

var token = localStorage.getItem('catalyst_token');
if (!token) {
  window.location.href = '/console/login';
}

async function refreshToken() {
  var refresh = localStorage.getItem('catalyst_refresh_token');
  if (!refresh) return false;
  try {
    var res = await fetch(API + '/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + refresh },
    });
    if (res.ok) {
      var data = await res.json();
      localStorage.setItem('catalyst_token', data.access_token);
      localStorage.setItem('catalyst_refresh_token', data.refresh_token);
      token = data.access_token;
      return true;
    }
  } catch(e) {}
  return false;
}

async function authedFetch(url, opts) {
  opts = opts || {};
  var h = {
    'Authorization': 'Bearer ' + token
  };
  if (opts.headers) {
    var oh = opts.headers;
    for (var k in oh) { if (oh.hasOwnProperty(k)) h[k] = oh[k]; }
  }
  if (opts.body) h['Content-Type'] = 'application/json';
  var res = await fetch(url, Object.assign({}, opts, { headers: h }));
  if (res.status === 401) {
    var refreshed = await refreshToken();
    if (refreshed) {
      h['Authorization'] = 'Bearer ' + token;
      res = await fetch(url, Object.assign({}, opts, { headers: h }));
    }
  }
  if (res.status === 401) {
    localStorage.removeItem('catalyst_token');
    localStorage.removeItem('catalyst_refresh_token');
    window.location.href = '/console/login';
  }
  return res;
}

var subtitleEl = document.getElementById('subtitle');
var errorEl = document.getElementById('error');
var successEl = document.getElementById('success');
var resendBtn = document.getElementById('resend-btn');
var cooldownTimer = null;

function startCooldown(seconds) {
  var cooldown = seconds;
  resendBtn.disabled = true;
  resendBtn.innerHTML = 'Resend code (<span id="countdown">' + cooldown + '</span>s)';
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(function() {
    cooldown--;
    var el = document.getElementById('countdown');
    if (el) el.textContent = String(cooldown);
    if (cooldown <= 0) {
      if (cooldownTimer) clearInterval(cooldownTimer);
      resendBtn.disabled = false;
      resendBtn.innerHTML = 'Resend code';
    }
  }, 1000);
}

// Auto-send verification code on page load
async function init() {
  try {
    // First check if already verified
    var meRes = await authedFetch(API + '/v1/auth/me');
    if (meRes.ok) {
      var me = await meRes.json();
      if (me.email_verified) {
        window.location.href = '/console/dashboard';
        return;
      }
      subtitleEl.textContent = 'Sending a verification code to ' + me.email + '...';
    }

    // Auto-send verification code
    var res = await authedFetch(API + '/v1/auth/resend-verification', {
      method: 'POST',
    });

    if (res.ok) {
      subtitleEl.textContent = 'Enter the 6-digit code we sent to your email.';
      successEl.textContent = 'Verification code sent! Check your inbox.';
      successEl.classList.remove('hidden');
      startCooldown(60);
    } else if (res.status === 429) {
      // Rate limited — code was already sent recently
      subtitleEl.textContent = 'Enter the 6-digit code we sent to your email.';
      var data = await res.json().catch(function() { return {}; });
      var match = (data.detail || '').match(/(\d+)\s*seconds/);
      var wait = match ? parseInt(match[1]) : 30;
      startCooldown(wait);
    } else {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Failed to send verification code');
    }
  } catch (err) {
    subtitleEl.textContent = 'Enter the 6-digit code we sent to your email.';
    errorEl.textContent = err.message || 'Failed to send code. Click resend to try again.';
    errorEl.classList.remove('hidden');
    resendBtn.disabled = false;
    resendBtn.innerHTML = 'Resend code';
  }
}

init();

// Resend button
resendBtn.addEventListener('click', async function() {
  resendBtn.disabled = true;
  resendBtn.innerHTML = 'Sending...';
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  try {
    var res = await authedFetch(API + '/v1/auth/resend-verification', {
      method: 'POST',
    });
    if (res.status === 429) {
      var data = await res.json().catch(function() { return {}; });
      var match = (data.detail || '').match(/(\d+)\s*seconds/);
      var wait = match ? parseInt(match[1]) : 30;
      startCooldown(wait);
      return;
    }
    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Failed to resend code');
    }
    successEl.textContent = 'A new code has been sent to your email.';
    successEl.classList.remove('hidden');
    startCooldown(60);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    resendBtn.disabled = false;
    resendBtn.innerHTML = 'Resend code';
  }
});

// Verify form
var verifyForm = document.getElementById('verify-form');
if (verifyForm) verifyForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = document.getElementById('submit-btn');
  var code = document.getElementById('code').value.trim();

  if (!/^\d{6}$/.test(code)) {
    errorEl.textContent = 'Please enter a 6-digit code.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.textContent = 'Verifying...';
  btn.disabled = true;

  try {
    var res = await authedFetch(API + '/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ code: code }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Verification failed');
    }

    successEl.textContent = 'Email verified! Redirecting...';
    successEl.classList.remove('hidden');
    setTimeout(function() {
      window.location.href = '/console/dashboard';
    }, 1500);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Verify';
    btn.disabled = false;
  }
});
