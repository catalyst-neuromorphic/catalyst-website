import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface Profile {
  user_id: string;
  email: string;
  tier: string;
  credits_balance: number;
  total_deposited: number;
  created_at: string;
}

interface Balance {
  credits_balance: number;
  tier: string;
  total_deposited: number;
  next_tier_at: number | null;
}

interface UsageData {
  tier: string;
  jobs_today: number;
  jobs_limit_today: number;
  compute_seconds_this_month: number;
  estimated_cost_gbp: number;
}

export default function DashboardOverview() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [keyCount, setKeyCount] = useState<number>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) return;
    Promise.all([
      api('/v1/auth/me').then(setProfile).catch(() => {}),
      api('/v1/billing/balance').then(setBalance).catch(() => {}),
      api('/v1/usage').then(setUsage).catch(() => {}),
      api('/v1/keys').then((keys: any[]) => setKeyCount(keys.filter(k => k.active).length)).catch(() => {}),
    ]).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400">{error}</div>;
  if (!profile) return <div className="text-white/30">Loading...</div>;

  const tierColors: Record<string, string> = {
    free: 'text-white/50',
    researcher: 'text-catalyst-blue',
    startup: 'text-green-400',
    enterprise: 'text-purple-400',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-white/30 text-sm mb-8">Welcome back, {profile.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Credits */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Credits</p>
          <p className="text-3xl font-bold text-green-400">
            {'\u00A3'}{(balance?.credits_balance ?? 0).toFixed(2)}
          </p>
          {balance?.next_tier_at && (
            <p className="text-white/20 text-xs mt-1">
              {'\u00A3'}{(balance.next_tier_at - (balance.total_deposited ?? 0)).toFixed(0)} to next tier
            </p>
          )}
        </div>

        {/* Tier */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Tier</p>
          <p className={`text-2xl font-bold capitalize ${tierColors[profile.tier] || 'text-white'}`}>
            {profile.tier}
          </p>
          <p className="text-white/20 text-xs mt-1">
            {'\u00A3'}{(balance?.total_deposited ?? 0).toFixed(0)} deposited total
          </p>
        </div>

        {/* Jobs Today */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Jobs Today</p>
          <p className="text-2xl font-bold">
            {usage?.jobs_today ?? 0}
            <span className="text-white/20 text-lg">/{usage?.jobs_limit_today ?? 10}</span>
          </p>
          <p className="text-white/20 text-xs mt-1">
            {((usage?.compute_seconds_this_month ?? 0) / 3600).toFixed(1)}h compute this month
          </p>
        </div>

        {/* API Keys */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">API Keys</p>
          <p className="text-2xl font-bold">{keyCount}</p>
          <p className="text-white/20 text-xs mt-1">active keys</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <a href="/console/keys"
          className="bg-catalyst-blue/10 border border-catalyst-blue/20 text-catalyst-blue hover:bg-catalyst-blue/20 px-4 py-2 rounded-lg text-sm transition-colors">
          Create API Key
        </a>
        <a href="/console/billing"
          className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-lg text-sm transition-colors">
          Add Credits
        </a>
        <a href="/cloud/docs"
          className="bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
          API Docs
        </a>
      </div>
    </div>
  );
}
