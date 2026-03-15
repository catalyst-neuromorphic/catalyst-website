var API = 'https://api.catalyst-neuromorphic.com';

var forgotForm = document.getElementById('forgot-form');
if (forgotForm) forgotForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  var errorEl = document.getElementById('error');
  var successEl = document.getElementById('success');
  var btn = document.getElementById('submit-btn');
  var email = document.getElementById('email').value.trim();

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    var res = await fetch(API + '/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
    });

    if (!res.ok) {
      var data = await res.json().catch(function() { return {}; });
      throw new Error(data.detail || 'Request failed');
    }

    successEl.textContent = 'If that email is registered, a reset link has been sent. Check your inbox.';
    successEl.classList.remove('hidden');
    btn.textContent = 'Sent';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    btn.textContent = 'Send reset link';
    btn.disabled = false;
  }
});
