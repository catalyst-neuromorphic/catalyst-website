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

function UsageBar({ label, pct, used, limit, resetsAt }: {
  label: string; pct: number; used: number; limit: number; resetsAt: string;
}) {
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const hoursLeft = Math.max(0, (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const resetLabel = hoursLeft < 24
    ? `Resets in ${Math.ceil(hoursLeft)}h`
    : `Resets in ${Math.ceil(hoursLeft / 24)}d`;

  const barColor = pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-white/30';

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <p className="text-white/50 text-xs font-medium">{label}</p>
        <p className="text-white/20 text-xs">{resetLabel}</p>
      </div>
      <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-1.5">
        <div className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-white/30 text-xs font-mono">
        {Math.round(used)}s / {Math.round(limit)}s
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

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!profile) return <div className="text-white/20 text-sm">Loading...</div>;

  const plan = usage?.plan || profile.plan || 'free';
  const planLabel: Record<string, string> = {
    free: 'Free', basic: 'Basic', max: 'Max', ultra: 'Ultra',
    '$500': '$500', '$1000': '$1,000',
  };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Dashboard</h1>
      <p className="text-white/30 text-sm mb-8">{profile.email}</p>

      {/* Email verification banner */}
      {!profile.email_verified && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">Verify your email</p>
            <p className="text-white/35 text-xs mt-0.5">Required to create API keys and submit jobs.</p>
          </div>
          <a href="/console/verify-email"
            className="text-xs text-white/60 border border-white/10 px-3 py-1.5 rounded-lg hover:text-white/90 hover:border-white/20 transition-colors whitespace-nowrap">
            Verify now
          </a>
        </div>
      )}

      {/* Overview grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Plan */}
        <div className="console-card p-5">
          <p className="text-white/40 text-xs font-medium mb-3">Plan</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {planLabel[plan] || plan}
            </p>
            {plan === 'free' && (
              <a href="/console/billing"
                className="text-xs text-white/40 border border-white/10 px-2.5 py-1 rounded-md hover:text-white/70 hover:border-white/20 transition-colors">
                Upgrade
              </a>
            )}
          </div>
        </div>

        {/* Credits */}
        <div className="console-card p-5">
          <p className="text-white/40 text-xs font-medium mb-3">Credits</p>
          <p className="text-2xl font-semibold text-white font-mono" style={{ fontFamily: "'JetBrains Mono', 'Space Grotesk', monospace" }}>
            ${(profile.credits_balance ?? 0).toFixed(2)}
          </p>
          {profile.api_discount_pct > 0 && (
            <p className="text-white/30 text-xs mt-1">{profile.api_discount_pct}% discount active</p>
          )}
        </div>

        {/* API Keys */}
        <div className="console-card p-5">
          <p className="text-white/40 text-xs font-medium mb-3">API keys</p>
          <p className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {keyCount}
          </p>
          <p className="text-white/25 text-xs mt-1">active</p>
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="console-card p-5 mb-8">
          <p className="text-white/40 text-xs font-medium mb-4">Usage</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageBar
              label="Session"
              pct={usage.session.used_pct}
              used={usage.session.used_seconds}
              limit={usage.session.limit_seconds}
              remaining={usage.session.remaining_seconds}
              resetsAt={usage.session.resets_at}
            />
            <UsageBar
              label="Weekly"
              pct={usage.weekly.used_pct}
              used={usage.weekly.used_seconds}
              limit={usage.weekly.limit_seconds}
              remaining={usage.weekly.remaining_seconds}
              resetsAt={usage.weekly.resets_at}
            />
          </div>
          {usage.extra_usage.enabled && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center">
              <p className="text-white/30 text-xs">
                Extra usage: ${usage.extra_usage.spent_this_month.toFixed(2)} / ${usage.extra_usage.monthly_cap} cap
              </p>
              <a href="/console/billing" className="text-xs text-white/40 hover:text-white/60 transition-colors">Manage</a>
            </div>
          )}
          {!usage.extra_usage.enabled && (
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center">
              <p className="text-white/30 text-xs">Extra usage disabled</p>
              <a href="/console/billing" className="text-xs text-white/40 hover:text-white/60 transition-colors">Enable</a>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3">
        <a href="/console/keys"
          className="text-sm text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20 px-4 py-2 rounded-lg transition-colors">
          Create API key
        </a>
        <a href="/cloud/docs" target="_blank" rel="noopener noreferrer"
          className="text-sm text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20 px-4 py-2 rounded-lg transition-colors">
          API docs
        </a>
      </div>
    </div>
  );
}
