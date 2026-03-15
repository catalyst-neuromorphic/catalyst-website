import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface Subscription {
  plan: string;
  status: string;
  price_usd: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  source: string;
}

interface Balance {
  credits_balance: number;
  tier: string;
  plan: string;
  api_discount_pct: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface UsageStatus {
  plan: string;
  session: { used_pct: number; used_seconds: number; limit_seconds: number; remaining_seconds: number; resets_at: string; };
  weekly: { used_pct: number; used_seconds: number; limit_seconds: number; remaining_seconds: number; resets_at: string; };
  extra_usage: { enabled: boolean; spent_this_month: number; monthly_cap: number; balance: number; };
}

function UsageBar({ label, pct, used, limit, resetsAt }: {
  label: string; pct: number; used: number; limit: number; remaining: number; resetsAt: string;
}) {
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const hoursLeft = Math.max(0, (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const resetLabel = hoursLeft < 24 ? `Resets in ${Math.ceil(hoursLeft)}h` : `Resets in ${Math.ceil(hoursLeft / 24)}d`;
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
      <p className="text-white/30 text-xs font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {Math.round(used)}s / {Math.round(limit)}s
      </p>
    </div>
  );
}

const PLANS = [
  { name: 'free', label: 'Free', price: 0, features: ['500 sec/week', '30s max per job', '50 jobs/day'] },
  { name: 'basic', label: 'Basic', price: 25, features: ['1,500 sec/week', '5 min max per job', 'All chip architectures', '200 jobs/day'] },
  { name: 'max', label: 'Max', price: 100, features: ['7,000 sec/week', '30 min max per job', 'All chip architectures', '500 jobs/day'], recommended: true },
  { name: 'ultra', label: 'Ultra', price: 200, features: ['16,000 sec/week', '1 hour max per job', 'All chip architectures', '1,000 jobs/day'] },
];

export default function BillingPanel() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [extraUsage, setExtraUsage] = useState(false);
  const [spendingCap, setSpendingCap] = useState(100);
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [usage, setUsage] = useState<UsageStatus | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    Promise.all([
      api('/v1/billing/subscription').then(setSub).catch(() => {}),
      api('/v1/billing/balance').then(setBalance).catch(() => {}),
      api('/v1/billing/history?limit=20').then(setHistory).catch(() => {}),
      api('/v1/auth/me').then((p: any) => {
        setExtraUsage(p.extra_usage_enabled);
        setSpendingCap(p.monthly_spending_cap || 100);
      }).catch(() => {}),
      api('/v1/usage/status').then(setUsage).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan: string) => {
    setActionLoading(plan);
    try {
      const data = await api('/v1/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  };

  const handleChangePlan = async (plan: string) => {
    if (!confirm(`Switch to ${plan} plan? Prorated charges will apply.`)) return;
    setActionLoading(plan);
    try {
      await api('/v1/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      window.location.reload();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? It will remain active until the end of the billing period.')) return;
    setActionLoading('cancel');
    try {
      await api('/v1/billing/cancel', { method: 'POST' });
      window.location.reload();
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  };

  const handleBuyCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount < 5) { alert('Minimum purchase is $5.'); return; }
    setActionLoading('credits');
    try {
      const data = await api('/v1/billing/credits', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) { alert(e.message); }
    setActionLoading('');
  };

  const handleExtraUsage = async () => {
    const newVal = !extraUsage;
    try {
      await api('/v1/billing/extra-usage', {
        method: 'POST',
        body: JSON.stringify({ enabled: newVal, monthly_spending_cap: spendingCap }),
      });
      setExtraUsage(newVal);
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="text-white/20 text-sm">Loading...</div>;

  const currentPlan = sub?.plan || 'free';
  const isActive = sub?.status === 'active';

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Billing</h1>
      <p className="text-white/30 text-sm mb-8">Subscription, usage, and credits.</p>

      {/* Usage */}
      {usage && (
        <div className="console-card p-5 mb-8">
          <p className="text-white/40 text-xs font-medium mb-4">Usage</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageBar label="Session" pct={usage.session.used_pct} used={usage.session.used_seconds}
              limit={usage.session.limit_seconds} remaining={usage.session.remaining_seconds} resetsAt={usage.session.resets_at} />
            <UsageBar label="Weekly" pct={usage.weekly.used_pct} used={usage.weekly.used_seconds}
              limit={usage.weekly.limit_seconds} remaining={usage.weekly.remaining_seconds} resetsAt={usage.weekly.resets_at} />
          </div>
        </div>
      )}

      {/* Current plan info */}
      {isActive && currentPlan !== 'free' && (
        <div className="console-card p-5 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/40 text-xs font-medium mb-1">Current plan</p>
              <p className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} &mdash; ${sub?.price_usd}/mo
              </p>
              {sub?.cancel_at_period_end && (
                <p className="text-white/40 text-xs mt-1">Cancels {new Date(sub.current_period_end).toLocaleDateString()}</p>
              )}
              {sub?.source === 'github_sponsors' && (
                <p className="text-white/30 text-xs mt-1">via GitHub Sponsors</p>
              )}
            </div>
            {!sub?.cancel_at_period_end && (
              <button onClick={handleCancel} disabled={actionLoading === 'cancel'}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <p className="text-white/40 text-xs font-medium mb-3">Plans</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLANS.map(plan => {
          const isCurrent = plan.name === currentPlan;
          const isHigher = plan.price > (sub?.price_usd || 0);
          return (
            <div key={plan.name}
              className={`console-card p-5 flex flex-col ${(plan as any).recommended ? 'border-white/12' : ''}`}>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-white/80">{plan.label}</h3>
                <p className="text-xl font-semibold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  ${plan.price}<span className="text-white/20 text-xs font-normal">/mo</span>
                </p>
              </div>
              <ul className="flex-1 space-y-1.5 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-white/35 flex items-start gap-1.5">
                    <span className="text-white/20 mt-px">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center py-2 text-xs text-white/25 border border-white/[0.06] rounded-lg">Current</span>
              ) : plan.name === 'free' ? (
                currentPlan !== 'free' ? (
                  <button onClick={handleCancel}
                    className="text-center py-2 text-xs text-white/40 border border-white/[0.06] rounded-lg hover:text-white/60 hover:border-white/12 transition-colors">
                    Downgrade
                  </button>
                ) : null
              ) : isActive && currentPlan !== 'free' ? (
                <button onClick={() => handleChangePlan(plan.name)}
                  disabled={actionLoading === plan.name}
                  className="text-center py-2 text-xs text-white/60 border border-white/10 rounded-lg hover:text-white/90 hover:border-white/20 transition-colors">
                  {actionLoading === plan.name ? 'Switching...' : isHigher ? 'Upgrade' : 'Switch'}
                </button>
              ) : (
                <button onClick={() => handleSubscribe(plan.name)}
                  disabled={actionLoading === plan.name}
                  className={`text-center py-2 text-xs font-medium rounded-lg transition-colors ${
                    (plan as any).recommended
                      ? 'bg-white/[0.08] text-white/80 border border-white/12 hover:bg-white/[0.12]'
                      : 'text-white/50 border border-white/[0.08] hover:text-white/70 hover:border-white/15'
                  }`}>
                  {actionLoading === plan.name ? 'Loading...' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Credits */}
      <p className="text-white/40 text-xs font-medium mb-3">API credits</p>
      <div className="console-card p-5 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-2xl font-semibold font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ${(balance?.credits_balance ?? 0).toFixed(2)}
            </p>
            {(balance?.api_discount_pct ?? 0) > 0 && (
              <p className="text-white/30 text-xs mt-1">{balance?.api_discount_pct}% discount active</p>
            )}
          </div>
          <div className="text-right text-white/20 text-xs font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <p>N1 $0.002/sec</p>
            <p>N2 $0.005/sec</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input
              type="number" min="5" step="1" placeholder="5.00"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg pl-7 pr-3 py-2 text-sm text-white w-28 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button onClick={handleBuyCredits} disabled={actionLoading === 'credits'}
            className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 px-4 py-2 rounded-lg text-sm transition-colors">
            {actionLoading === 'credits' ? 'Loading...' : 'Buy credits'}
          </button>
          <span className="text-white/20 text-xs">$5 minimum</span>
        </div>
      </div>

      {/* Extra Usage */}
      <p className="text-white/40 text-xs font-medium mb-3">Extra usage</p>
      <div className="console-card p-5 mb-8">
        <p className="text-white/35 text-xs mb-4">
          When enabled, jobs continue after plan limits are reached. Billed from credit balance at standard rates.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={handleExtraUsage}
            className={`relative w-10 h-5 rounded-full transition-colors ${extraUsage ? 'bg-white/25' : 'bg-white/[0.08]'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${extraUsage ? 'left-5' : 'left-0.5'}`} />
          </button>
          <span className="text-white/50 text-xs">{extraUsage ? 'Enabled' : 'Disabled'}</span>
          {extraUsage && (
            <div className="flex items-center gap-2">
              <span className="text-white/25 text-xs">Cap:</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">$</span>
                <input type="number" min="10" step="10" value={spendingCap}
                  onChange={e => setSpendingCap(Number(e.target.value))}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg pl-5 pr-2 py-1 text-xs text-white w-20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <button onClick={handleExtraUsage}
                className="text-xs text-white/40 hover:text-white/70 border border-white/[0.08] px-2 py-1 rounded-md transition-colors">
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <p className="text-white/40 text-xs font-medium mb-3">Transaction history</p>
      {history.length === 0 ? (
        <div className="console-card p-8 text-center">
          <p className="text-white/20 text-xs">No transactions yet.</p>
        </div>
      ) : (
        <div className="console-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Date</th>
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Type</th>
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Description</th>
                <th className="text-right text-white/30 text-xs font-medium px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map(tx => (
                <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-5 py-3 text-white/40 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-white/40 text-xs capitalize">{tx.type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-white/50 text-xs">{tx.description || '\u2014'}</td>
                  <td className="px-5 py-3 text-xs text-right font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: tx.amount >= 0 ? 'rgba(255,255,255,0.5)' : 'rgba(239,68,68,0.6)' }}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(4)}` : `$${tx.amount.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
