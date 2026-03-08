import { useState, useEffect } from 'react';
import { api, isLoggedIn, updateProfile } from './api';

interface Profile {
  user_id: string;
  email: string;
  name: string | null;
  email_verified: boolean;
  has_password: boolean;
}

export default function SettingsPanel() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    api('/v1/auth/me').then((p: Profile) => {
      setProfile(p);
      setName(p.name || '');
      setEmail(p.email);
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setMsg(''); setErr('');
    setSaving(true);
    try {
      const data: any = {};
      if (name !== (profile?.name || '')) data.name = name;
      if (email !== profile?.email) data.email = email;
      if (Object.keys(data).length === 0) { setMsg('No changes.'); setSaving(false); return; }
      await updateProfile(data);
      setMsg(data.email ? 'Profile updated. Check your new email for a verification code.' : 'Profile updated.');
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) { setErr(e.message); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwMsg(''); setPwErr('');
    if (newPw !== confirmPw) { setPwErr('Passwords do not match.'); return; }
    if (newPw.length < 10) { setPwErr('Password must be at least 10 characters.'); return; }
    setSavingPw(true);
    try {
      await updateProfile({ current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) { setPwErr(e.message); }
    setSavingPw(false);
  };

  if (!profile) return <div className="text-white/20 text-sm">Loading...</div>;

  const inputCls = "w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-colors";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Settings</h1>
      <p className="text-white/30 text-sm mb-8">Profile and password.</p>

      {/* Profile */}
      <div className="console-card p-5 mb-6">
        <p className="text-white/40 text-xs font-medium mb-4">Profile</p>
        {msg && <div className="text-white/60 text-sm border border-white/[0.08] rounded-lg px-4 py-2 mb-4">{msg}</div>}
        {err && <div className="text-red-400/70 text-sm border border-red-500/10 rounded-lg px-4 py-2 mb-4">{err}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/35 mb-1.5">Display name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-white/35 mb-1.5">
              Email
              {profile.email_verified
                ? <span className="text-white/30 ml-2 text-[10px]">Verified</span>
                : <span className="text-white/25 ml-2 text-[10px]">Unverified</span>}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            {!profile.email_verified && (
              <a href="/console/verify-email" className="text-white/40 hover:text-white/60 text-xs mt-1.5 inline-block transition-colors">Verify email</a>
            )}
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="console-card p-5">
        <p className="text-white/40 text-xs font-medium mb-4">
          {profile.has_password ? 'Change password' : 'Set password'}
        </p>
        {pwMsg && <div className="text-white/60 text-sm border border-white/[0.08] rounded-lg px-4 py-2 mb-4">{pwMsg}</div>}
        {pwErr && <div className="text-red-400/70 text-sm border border-red-500/10 rounded-lg px-4 py-2 mb-4">{pwErr}</div>}
        <div className="space-y-4">
          {profile.has_password && (
            <div>
              <label className="block text-xs text-white/35 mb-1.5">Current password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs text-white/35 mb-1.5">New password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={inputCls} />
            <p className="text-white/15 text-xs mt-1">Minimum 10 characters, mixed case + digit</p>
          </div>
          <div>
            <label className="block text-xs text-white/35 mb-1.5">Confirm password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} />
          </div>
          <button onClick={handleChangePassword} disabled={savingPw}
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            {savingPw ? 'Saving...' : profile.has_password ? 'Change password' : 'Set password'}
          </button>
        </div>
      </div>
    </div>
  );
}
