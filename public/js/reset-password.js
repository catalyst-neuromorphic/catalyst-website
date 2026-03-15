var API = 'https://api.catalyst-neuromorphic.com';

// Get token from URL
var params = new URLSearchParams(window.location.search);
var resetToken = params.get('token');

if (!resetToken) {
  document.getElementById('no-token').classList.remove('hidden');
  document.getElementById('reset-form-wrapper').classList.add('hidden');
}

var resetForm = document.getElementById('reset-form');
if (resetForm) resetForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var errorEl = document.getElementById('error');
  var successEl = document.getElementById('success');
  var btn = document.getElementById('submit-btn');
  var password = document.getElementById('password').value;
  var confirm = document.getElementById('confirm').value;

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.textContent = 'Resetting...';
  btn.disabled = true;

  try {
    var res = await fetch(API + '/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: password }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Reset failed');
    }

    // Clear any existing tokens (all sessions were killed server-side)
    localStorage.removeItem('catalyst_token');
    localStorage.removeItem('catalyst_refresh_token');

    successEl.textContent = 'Password reset! Redirecting to login...';
    successEl.classList.remove('hidden');
    btn.textContent = 'Done';

    setTimeout(function() {
      window.location.href = '/console/login';
    }, 2000);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Reset password';
    btn.disabled = false;
  }
});
