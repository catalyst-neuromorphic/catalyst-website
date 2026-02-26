import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

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

interface Job {
  job_id: string;
  status: string;
  chip_model: string;
  compute_seconds: number | null;
  cost_usd: number | null;
  created_at: string;
  completed_at: string | null;
}

function UsageBar({ label, pct, used, limit, remaining, resetsAt }: {
  label: string; pct: number; used: number; limit: number; remaining: number; resetsAt: string;
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
      <div className="flex justify-between items-center mb-3">
        <p className="text-white/70 text-sm font-medium">{label}</p>
        <p className="text-white/30 text-xs">Resets in {resetLabel}</p>
      </div>
      <div className="w-full bg-white/5 rounded-full h-3 mb-2">
        <div className={`${barColor} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex justify-between text-xs text-white/40">
        <span>{pct}% used ({Math.round(used)}s / {Math.round(limit)}s)</span>
        <span>{Math.round(remaining)}s remaining</span>
      </div>
    </div>
  );
}

export default function UsageCharts() {
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) return;
    Promise.all([
      api('/v1/usage/status').then(setUsage).catch(() => {}),
      api('/v1/jobs?limit=10').then(setJobs).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white/30">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Usage</h1>
      <p className="text-white/30 text-sm mb-8">Monitor your compute usage and limits.</p>

      {/* Usage Bars */}
      {usage && (
        <div className="space-y-4 mb-8">
          <UsageBar
            label="Session Usage"
            pct={usage.session.used_pct}
            used={usage.session.used_seconds}
            limit={usage.session.limit_seconds}
            remaining={usage.session.remaining_seconds}
            resetsAt={usage.session.resets_at}
          />
          <UsageBar
            label="Weekly Usage"
            pct={usage.weekly.used_pct}
            used={usage.weekly.used_seconds}
            limit={usage.weekly.limit_seconds}
            remaining={usage.weekly.remaining_seconds}
            resetsAt={usage.weekly.resets_at}
          />
        </div>
      )}

      {/* Extra Usage Summary */}
      {usage && (
        <div className="console-card p-5 mb-8">
          <h2 className="text-sm font-medium text-white/70 mb-3">Extra Usage</h2>
          {usage.extra_usage.enabled ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-white/40 text-xs mb-1">Spent this month</p>
                <p className="text-lg font-bold text-white/70">${usage.extra_usage.spent_this_month.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Monthly cap</p>
                <p className="text-lg font-bold text-white/70">${usage.extra_usage.monthly_cap}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">Credit balance</p>
                <p className="text-lg font-bold text-green-400">${usage.extra_usage.balance.toFixed(2)}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/40 text-sm">
              Extra usage is disabled. Jobs will stop when plan limits are reached.
              <a href="/console/billing" className="text-catalyst-blue ml-1 hover:underline">Enable in billing</a>
            </p>
          )}
        </div>
      )}

      {/* Recent Jobs */}
      <h2 className="text-sm font-medium text-white/70 mb-3">Recent Jobs</h2>
      {jobs.length === 0 ? (
        <div className="console-card p-5 mb-8">
          <p className="text-white/30 text-sm">No jobs yet. Submit a simulation via the API to see results here.</p>
        </div>
      ) : (
        <div className="console-card overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Job ID</th>
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Status</th>
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Chip</th>
                <th className="text-right text-white/40 text-xs font-normal px-4 py-3">Compute</th>
                <th className="text-right text-white/40 text-xs font-normal px-4 py-3">Cost</th>
                <th className="text-right text-white/40 text-xs font-normal px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => (
                <tr key={j.job_id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white/60 text-xs font-mono">{j.job_id.slice(0, 16)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      j.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      j.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                      j.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5 text-white/40'
                    }`}>{j.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs uppercase">{j.chip_model}</td>
                  <td className="px-4 py-3 text-white/50 text-xs text-right">
                    {j.compute_seconds != null ? `${j.compute_seconds.toFixed(2)}s` : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs text-right font-mono">
                    {j.cost_usd != null ? `$${j.cost_usd.toFixed(4)}` : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-white/30 text-xs text-right">
                    {new Date(j.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan Info */}
      {usage && (
        <div className="console-card p-5">
          <h2 className="text-sm font-medium text-white/70 mb-3">Current Plan</h2>
          <p className="text-white/40 text-sm">
            <span className="text-white font-semibold capitalize">{usage.plan}</span>
            {' '}&middot;{' '}
            {Math.round(usage.weekly.limit_seconds)} compute-seconds/week
            {' '}&middot;{' '}
            N2 uses 2.5x allocation
          </p>
          {usage.plan === 'free' && (
            <a href="/console/billing" className="text-catalyst-blue text-sm mt-2 inline-block hover:underline">
              Upgrade for more compute
            </a>
          )}
        </div>
      )}
    </div>
  );
}
