import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface Profile {
  user_id: string;
  email: string;
  tier: string;
  plan: string;
  credits_balance: number;
  extra_usage_enabled: boolean;
  monthly_spending_cap: number;
  api_discount_pct: number;
  created_at: string;
  github_linked: boolean;
  google_linked: boolean;
  email_verified: boolean;
}

interface UsageStatus {
  plan: string;
  session: {
    used_pct: number;
    used_seconds: number;
    limit_seconds: number;
    remaining_seconds: number;
    resets_at: string;
  };
  weekly: {
    used_pct: number;
    used_seconds: number;
    limit_seconds: number;
    remaining_seconds: number;
    resets_at: string;
  };
  extra_usage: {
    enabled: boolean;
    spent_this_month: number;
    monthly_cap: number;
    balance: number;
  };
}

function UsageBar({ label, pct, remaining, resetsAt }: {
  label: string; pct: number; remaining: number; resetsAt: string;
}) {
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const hoursLeft = Math.max(0, (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const resetLabel = hoursLeft < 24
    ? `${Math.ceil(hoursLeft)}h`
    : `${Math.ceil(hoursLeft / 24)}d`;

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-catalyst-blue';

  return (
    <div className="console-card p-5">
      <div className="flex justify-between items-center mb-2" style={{ position: 'relative', zIndex: 2 }}>
        <p className="text-white/40 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-white/30 text-xs">Resets in {resetLabel}</p>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2.5 mb-2" style={{ position: 'relative', zIndex: 2 }}>
        <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-white/50 text-xs" style={{ position: 'relative', zIndex: 2 }}>
        {pct}% used &middot; {Math.round(remaining)}s remaining
      </p>
    </div>
  );
}

export default function DashboardOverview() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [keyCount, setKeyCount] = useState<number>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) return;
    Promise.all([
      api('/v1/auth/me').then(setProfile).catch(() => {}),
      api('/v1/usage/status').then(setUsage).catch(() => {}),
      api('/v1/keys').then((keys: any[]) => setKeyCount(keys.filter(k => k.active).length)).catch(() => {}),
    ]).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!profile) return <div className="text-white/30">Loading...</div>;

  const planColors: Record<string, string> = {
    free: 'text-white/50',
    basic: 'text-catalyst-blue',
    max: 'text-green-400',
    ultra: 'text-purple-400',
  };

  const planLabels: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    max: 'Max',
    ultra: 'Ultra',
  };

  const plan = usage?.plan || profile.plan || 'free';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-white/30 text-sm mb-8">Welcome back, {profile.email}</p>

      {/* Email verification banner */}
      {!profile.email_verified && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-blue-400 text-sm font-medium">Verify your email</p>
            <p className="text-blue-400/60 text-xs mt-0.5">Please verify your email to create API keys and submit jobs.</p>
          </div>
          <a href="/console/verify-email"
            className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-500/30 transition-colors whitespace-nowrap">
            Verify now
          </a>
        </div>
      )}

      {/* Plan + Usage Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Plan Card */}
        <div className="console-card p-5">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Current Plan</p>
            <div className="flex items-center gap-3">
              <p className={`text-3xl font-bold ${planColors[plan] || 'text-white'}`}>
                {planLabels[plan] || plan}
              </p>
              {plan === 'free' && (
                <a href="/console/billing"
                  className="text-xs bg-catalyst-blue/10 text-catalyst-blue border border-catalyst-blue/20 px-3 py-1 rounded-full hover:bg-catalyst-blue/20 transition-colors">
                  Upgrade
                </a>
              )}
            </div>
            <div className="flex gap-4 mt-2 text-white/30 text-xs">
              {profile.github_linked && <span>GitHub linked</span>}
              {profile.google_linked && <span>Google linked</span>}
            </div>
          </div>
        </div>

        {/* API Credits */}
        <div className="console-card p-5">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">API Credits</p>
            <p className="text-3xl font-bold text-green-400">
              ${(profile.credits_balance ?? 0).toFixed(2)}
            </p>
            <div className="flex gap-3 mt-2">
              {profile.api_discount_pct > 0 && (
                <span className="text-xs text-purple-400">{profile.api_discount_pct}% API discount</span>
              )}
              <span className="text-white/20 text-xs">{keyCount} active key{keyCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bars */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <UsageBar
            label="Session Usage"
            pct={usage.session.used_pct}
            remaining={usage.session.remaining_seconds}
            resetsAt={usage.session.resets_at}
          />
          <UsageBar
            label="Weekly Usage"
            pct={usage.weekly.used_pct}
            remaining={usage.weekly.remaining_seconds}
            resetsAt={usage.weekly.resets_at}
          />
        </div>
      )}

      {/* Extra Usage Card */}
      {usage && (
        <div className="console-card p-5 mb-6">
          <div className="flex justify-between items-center" style={{ position: 'relative', zIndex: 2 }}>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Extra Usage</p>
              <p className="text-sm text-white/60">
                {usage.extra_usage.enabled
                  ? `$${usage.extra_usage.spent_this_month.toFixed(2)} spent this month (cap: $${usage.extra_usage.monthly_cap})`
                  : 'Disabled — jobs stop when plan limits are reached'}
              </p>
            </div>
            <a href="/console/billing"
              className="text-xs text-catalyst-blue hover:underline">
              {usage.extra_usage.enabled ? 'Manage' : 'Enable'}
            </a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a href="/console/keys"
          className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-4 py-2 rounded-lg text-sm transition-colors">
          Create API Key
        </a>
        <a href="/console/billing"
          className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-lg text-sm transition-colors">
          Buy API Credits
        </a>
        <a href="/cloud/docs"
          className="bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
          API Docs
        </a>
      </div>
    </div>
  );
}
