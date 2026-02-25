import { useState, useEffect } from 'react';
import { api, isLoggedIn, getSessions, revokeSession, deleteAccount, exportData, unlinkOAuth, setPassword, clearTokens, setupTOTP, verifyTOTPSetup, disableTOTP } from './api';

interface Profile {
  user_id: string;
  email: string;
  github_linked: boolean;
  google_linked: boolean;
  has_password: boolean;
  totp_enabled: boolean;
  created_at: string;
}

interface Session {
  id: string;
  is_cli: boolean;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export default function AccountPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [deletePw, setDeletePw] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [setPwVal, setSetPwVal] = useState('');
  const [setPwConfirm, setSetPwConfirm] = useState('');
  const [setPwMsg, setSetPwMsg] = useState('');

  // 2FA state
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'verify' | 'codes'>('idle');
  const [totpQr, setTotpQr] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[]>([]);
  const [totpMsg, setTotpMsg] = useState('');
  const [disablePw, setDisablePw] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) return;
    api('/v1/auth/me').then(setProfile).catch(() => {});
    getSessions().then(setSessions).catch(() => {});
  }, []);

  const handleUnlink = async (provider: string) => {
    setMsg(''); setErr('');
    if (!confirm(`Unlink ${provider}? You'll need to use email/password to sign in.`)) return;
    try {
      await unlinkOAuth(provider);
      setMsg(`${provider} unlinked.`);
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleSetPassword = async () => {
    setSetPwMsg(''); setErr('');
    if (setPwVal.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (setPwVal !== setPwConfirm) { setErr('Passwords do not match.'); return; }
    try {
      await setPassword(setPwVal);
      setSetPwMsg('Password set.');
      setSetPwVal(''); setSetPwConfirm('');
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleTotpSetup = async () => {
    setErr(''); setTotpMsg('');
    try {
      const data = await setupTOTP();
      setTotpQr(data.qr_code);
      setTotpSecret(data.secret);
      setTotpStep('verify');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleTotpVerify = async () => {
    setErr(''); setTotpMsg('');
    if (totpCode.length !== 6) { setErr('Enter a 6-digit code.'); return; }
    try {
      const data = await verifyTOTPSetup(totpCode);
      setTotpBackupCodes(data.backup_codes);
      setTotpStep('codes');
      setTotpCode('');
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleTotpDisable = async () => {
    setErr(''); setTotpMsg('');
    if (!disablePw || !disableCode) { setErr('Password and TOTP code are required.'); return; }
    try {
      await disableTOTP(disablePw, disableCode);
      setTotpMsg('Two-factor authentication disabled.');
      setTotpStep('idle');
      setDisablePw(''); setDisableCode('');
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeSession(id);
      setSessions(s => s.filter(x => x.id !== id));
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalyst-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const handleDelete = async () => {
    setErr('');
    try {
      await deleteAccount(deletePw);
      clearTokens();
      window.location.href = '/';
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (!profile) return <div className="text-white/30">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-white/30 text-sm mb-8">Manage linked accounts, sessions, and data.</p>

      {msg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}
      {err && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{err}</div>}

      {/* Linked Accounts */}
      <div className="console-card p-5 mb-6">
        <h2 className="text-sm font-medium text-white/70 mb-4">Linked accounts</h2>
        <div className="space-y-3" style={{ position: 'relative', zIndex: 2 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/50"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span className="text-sm text-white/60">GitHub</span>
            </div>
            {profile.github_linked ? (
              <button onClick={() => handleUnlink('github')}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1 rounded-lg">
                Unlink
              </button>
            ) : (
              <span className="text-xs text-white/25">Not linked</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span className="text-sm text-white/60">Google</span>
            </div>
            {profile.google_linked ? (
              <button onClick={() => handleUnlink('google')}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1 rounded-lg">
                Unlink
              </button>
            ) : (
              <span className="text-xs text-white/25">Not linked</span>
            )}
          </div>
        </div>

        {/* Set password prompt for OAuth-only users */}
        {!profile.has_password && (
          <div className="mt-4 pt-4 border-t border-white/5" style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-white/40 text-xs mb-3">Set a password to enable email/password login before unlinking OAuth:</p>
            {setPwMsg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg px-3 py-2 mb-3">{setPwMsg}</div>}
            <div className="flex gap-2 items-end">
              <div>
                <input type="password" placeholder="New password" value={setPwVal} onChange={e => setSetPwVal(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white w-40 focus:outline-none focus:border-catalyst-blue/50" />
              </div>
              <div>
                <input type="password" placeholder="Confirm" value={setPwConfirm} onChange={e => setSetPwConfirm(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white w-40 focus:outline-none focus:border-catalyst-blue/50" />
              </div>
              <button onClick={handleSetPassword}
                className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-3 py-1.5 rounded-lg text-xs transition-colors">
                Set password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="console-card p-5 mb-6">
        <h2 className="text-sm font-medium text-white/70 mb-4">Active sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-white/30 text-sm">No sessions found.</p>
        ) : (
          <div className="space-y-2" style={{ position: 'relative', zIndex: 2 }}>
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm text-white/60">
                    {s.is_cli ? 'CLI' : 'Web'}
                    {s.is_current && <span className="text-catalyst-blue text-xs ml-2">Current</span>}
                  </span>
                  <p className="text-xs text-white/30">
                    Created {new Date(s.created_at).toLocaleDateString()} &middot;
                    Expires {new Date(s.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {!s.is_current && (
                  <button onClick={() => handleRevoke(s.id)}
                    className="text-xs text-red-400 hover:text-red-300">
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Export */}
      <div className="console-card p-5 mb-6">
        <h2 className="text-sm font-medium text-white/70 mb-2">Data export</h2>
        <p className="text-white/40 text-xs mb-3">Download all your data as a JSON file (networks, jobs, keys, transactions).</p>
        <button onClick={handleExport} style={{ position: 'relative', zIndex: 2 }}
          className="bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
          Export data
        </button>
      </div>

      {/* Two-Factor Authentication */}
      <div className="console-card p-5 mb-6">
        <h2 className="text-sm font-medium text-white/70 mb-2">Two-factor authentication</h2>
        {totpMsg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg px-3 py-2 mb-3">{totpMsg}</div>}

        {profile.totp_enabled && totpStep === 'idle' ? (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-green-400 text-sm mb-4">Enabled</p>
            <div className="space-y-2">
              <div>
                <input type="password" placeholder="Password" value={disablePw} onChange={e => setDisablePw(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white w-40 focus:outline-none focus:border-catalyst-blue/50" />
              </div>
              <div>
                <input type="text" placeholder="TOTP code" maxLength={6} value={disableCode} onChange={e => setDisableCode(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white w-40 focus:outline-none focus:border-catalyst-blue/50" />
              </div>
              <button onClick={handleTotpDisable}
                className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg">
                Disable 2FA
              </button>
            </div>
          </div>
        ) : totpStep === 'verify' ? (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-white/40 text-xs mb-3">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
            {totpQr && <img src={totpQr} alt="TOTP QR Code" className="mb-3 rounded-lg" style={{ width: 180, height: 180, imageRendering: 'pixelated', background: '#fff', padding: 8 }} />}
            <p className="text-white/30 text-xs mb-3 font-mono select-all">{totpSecret}</p>
            <div className="flex gap-2 items-end">
              <input type="text" placeholder="6-digit code" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value)}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white w-40 focus:outline-none focus:border-catalyst-blue/50"
                style={{ letterSpacing: '0.15em' }} />
              <button onClick={handleTotpVerify}
                className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-3 py-1.5 rounded-lg text-xs transition-colors">
                Verify
              </button>
              <button onClick={() => { setTotpStep('idle'); setTotpCode(''); }}
                className="text-white/30 hover:text-white/50 text-xs px-2">Cancel</button>
            </div>
          </div>
        ) : totpStep === 'codes' ? (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-green-400 text-sm mb-2">2FA is now enabled.</p>
            <p className="text-white/40 text-xs mb-3">Save these backup codes somewhere safe. Each can only be used once.</p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 mb-3 font-mono text-sm text-white/80 grid grid-cols-2 gap-1">
              {totpBackupCodes.map((c, i) => <span key={i}>{c}</span>)}
            </div>
            <button onClick={() => { setTotpStep('idle'); setTotpBackupCodes([]); }}
              className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-3 py-1.5 rounded-lg text-xs transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-white/40 text-xs mb-3">Add an extra layer of security using a TOTP authenticator app.</p>
            <button onClick={handleTotpSetup}
              className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-4 py-2 rounded-lg text-sm transition-colors">
              Set up 2FA
            </button>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <div className="console-card p-5 border border-red-500/10">
        <h2 className="text-sm font-medium text-red-400 mb-2">Delete account</h2>
        <p className="text-white/40 text-xs mb-4">
          This will permanently delete your account and all associated data including networks, jobs, API keys, and billing records. This action cannot be undone.
        </p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} style={{ position: 'relative', zIndex: 2 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm transition-colors">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3" style={{ position: 'relative', zIndex: 2 }}>
            {profile.has_password && (
              <div>
                <label className="block text-xs text-red-400/60 mb-1">Enter your password to confirm:</label>
                <input type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)}
                  className="bg-white/[0.03] border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white w-64 focus:outline-none focus:border-red-500/50" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                Permanently delete
              </button>
              <button onClick={() => { setDeleteConfirm(false); setDeletePw(''); }}
                className="text-white/40 hover:text-white/60 px-4 py-2 text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
