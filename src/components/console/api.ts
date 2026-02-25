/**
 * Catalyst Cloud API client for the web console.
 * Uses session tokens stored in localStorage.
 */

const API_BASE = 'https://api.catalyst-neuromorphic.com';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catalyst_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('catalyst_refresh_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('catalyst_token', access);
  localStorage.setItem('catalyst_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('catalyst_token');
  localStorage.removeItem('catalyst_refresh_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function refreshTokenIfNeeded(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${refresh}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    }
  } catch {}
  return null;
}

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  let token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401, try refreshing token
  if (res.status === 401 && token) {
    const newToken = await refreshTokenIfNeeded();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (res.status === 401) {
    clearTokens();
    window.location.href = '/console/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function signup(email: string, password: string) {
  const res = await fetch(`${API_BASE}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Signup failed');
  }

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout() {
  try {
    await api('/v1/auth/logout', { method: 'POST' });
  } catch {}
  clearTokens();
}

export async function verifyEmail(code: string) {
  return api('/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function resendVerification() {
  return api('/v1/auth/resend-verification', { method: 'POST' });
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Request failed');
  }
  return res.json();
}

export async function resetPassword(token: string, password: string) {
  const res = await fetch(`${API_BASE}/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Reset failed');
  }
  return res.json();
}

export async function updateProfile(data: { name?: string; email?: string; current_password?: string; new_password?: string }) {
  return api('/v1/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getSessions() {
  return api('/v1/auth/sessions');
}

export async function revokeSession(sessionId: string) {
  return api(`/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function deleteAccount(password: string) {
  return api('/v1/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export async function exportData() {
  return api('/v1/account/export');
}

export async function unlinkOAuth(provider: string) {
  return api('/v1/account/oauth/unlink', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

export async function setPassword(password: string) {
  return api('/v1/account/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

// --- TOTP 2FA ---

export async function setupTOTP() {
  return api('/v1/auth/totp/setup', { method: 'POST' });
}

export async function verifyTOTPSetup(code: string) {
  return api('/v1/auth/totp/verify-setup', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTOTP(password: string, code: string) {
  return api('/v1/auth/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}

export async function getTOTPStatus() {
  return api('/v1/auth/totp/status');
}

export async function verify2FA(tempToken: string, code: string) {
  const res = await fetch(`${API_BASE}/v1/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_token: tempToken, code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Verification failed');
  }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}
