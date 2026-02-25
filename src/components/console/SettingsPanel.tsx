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
      if (Object.keys(data).length === 0) {
        setMsg('No changes.');
        setSaving(false);
        return;
      }
      await updateProfile(data);
      setMsg(data.email ? 'Profile updated. Check your new email for a verification code.' : 'Profile updated.');
      // Refresh profile
      const p = await api('/v1/auth/me');
      setProfile(p);
    } catch (e: any) {
      setErr(e.message);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwMsg(''); setPwErr('');
    if (newPw !== confirmPw) {
      setPwErr('Passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setPwErr('Password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await updateProfile({ current_password: currentPw, new_password: newPw });
      setPwMsg('Password changed.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setPwErr(e.message);
    }
    setSavingPw(false);
  };

  if (!profile) return <div className="text-white/30">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-white/30 text-sm mb-8">Manage your profile and password.</p>

      {/* Profile Section */}
      <div className="console-card p-5 mb-6">
        <h2 className="text-sm font-medium text-white/70 mb-4">Profile</h2>
        {msg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}
        {err && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{err}</div>}
        <div className="space-y-4" style={{ position: 'relative', zIndex: 2 }}>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Display name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-catalyst-blue/50" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Email
              {profile.email_verified
                ? <span className="text-green-400 ml-2">Verified</span>
                : <span className="text-yellow-400 ml-2">Unverified</span>}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-catalyst-blue/50" />
            {!profile.email_verified && (
              <a href="/console/verify-email" className="text-catalyst-blue text-xs mt-1 inline-block hover:underline">Verify email</a>
            )}
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="console-card p-5">
        <h2 className="text-sm font-medium text-white/70 mb-4">
          {profile.has_password ? 'Change password' : 'Set password'}
        </h2>
        {pwMsg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2 mb-4">{pwMsg}</div>}
        {pwErr && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{pwErr}</div>}
        <div className="space-y-4" style={{ position: 'relative', zIndex: 2 }}>
          {profile.has_password && (
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Current password</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                className="w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-catalyst-blue/50" />
            </div>
          )}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">New password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-catalyst-blue/50" />
            <p className="text-white/20 text-xs mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Confirm password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full max-w-sm bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-catalyst-blue/50" />
          </div>
          <button onClick={handleChangePassword} disabled={savingPw}
            className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            {savingPw ? 'Saving...' : profile.has_password ? 'Change password' : 'Set password'}
          </button>
        </div>
      </div>
    </div>
  );
}
