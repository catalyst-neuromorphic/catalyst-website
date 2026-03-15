var hash = window.location.hash.substring(1); // remove the #
var params = new URLSearchParams(hash);
var accessToken = params.get('access_token');
var refreshToken = params.get('refresh_token');
var statusEl = document.getElementById('status');

if (accessToken && refreshToken) {
  localStorage.setItem('catalyst_token', accessToken);
  localStorage.setItem('catalyst_refresh_token', refreshToken);

  // Check for CLI callback (callback_port or device_code in params)
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
} else {
  if (statusEl) {
    statusEl.textContent = 'Authentication failed. Redirecting to login...';
    statusEl.classList.add('text-red-400');
  }
  setTimeout(function() {
    window.location.href = '/console/login';
  }, 2000);
}
