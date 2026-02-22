import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface UsageData {
  tier: string;
  jobs_today: number;
  jobs_limit_today: number;
  compute_seconds_this_month: number;
  estimated_cost_gbp: number;
}

interface Job {
  job_id: string;
  status: string;
  network_id: string;
  num_neurons: number;
  num_timesteps: number;
  compute_seconds: number | null;
  cost_gbp: number | null;
  created_at: string;
}

export default function UsageCharts() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) return;
    api('/v1/usage').then(setUsage).catch(e => setError(e.message));
    api('/v1/jobs').then(setJobs).catch(() => {});
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusColors: Record<string, string> = {
    completed: 'text-green-400',
    running: 'text-catalyst-blue',
    pending: 'text-yellow-400',
    failed: 'text-red-400',
    cancelled: 'text-white/30',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usage</h1>
          <p className="text-white/30 text-sm mt-1">Monitor your compute usage and job history.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Jobs Today</p>
          <p className="text-2xl font-bold">
            {usage?.jobs_today ?? 0}
            <span className="text-white/20 text-lg">/{usage?.jobs_limit_today ?? 10}</span>
          </p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Compute This Month</p>
          <p className="text-2xl font-bold">
            {((usage?.compute_seconds_this_month ?? 0) / 3600).toFixed(1)}
            <span className="text-white/20 text-lg">h</span>
          </p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Estimated Cost</p>
          <p className="text-2xl font-bold text-green-400">
            {'\u00A3'}{(usage?.estimated_cost_gbp ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Tier</p>
          <p className="text-2xl font-bold capitalize">{usage?.tier ?? 'free'}</p>
        </div>
      </div>

      {/* Jobs table */}
      <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Job History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/30 font-normal px-5 py-3">Job ID</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Status</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Neurons</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Timesteps</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Compute</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Cost</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.job_id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3">
                  <code className="text-white/40 font-mono text-xs">{j.job_id}</code>
                </td>
                <td className={`px-5 py-3 ${statusColors[j.status] || 'text-white/40'}`}>
                  {j.status}
                </td>
                <td className="px-5 py-3 text-white/40">{j.num_neurons?.toLocaleString()}</td>
                <td className="px-5 py-3 text-white/40">{j.num_timesteps?.toLocaleString()}</td>
                <td className="px-5 py-3 text-white/40">
                  {j.compute_seconds != null ? `${j.compute_seconds.toFixed(1)}s` : '-'}
                </td>
                <td className="px-5 py-3 text-white/40">
                  {j.cost_gbp != null ? `\u00A3${j.cost_gbp.toFixed(4)}` : '-'}
                </td>
                <td className="px-5 py-3 text-white/40">{formatDate(j.created_at)}</td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-white/20">
                  No jobs yet. Submit a simulation to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
