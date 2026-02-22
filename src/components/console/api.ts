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
