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

const PLANS = [
  { name: 'free', label: 'Free', price: 0, features: ['500 sec/week', 'N1 only', '1,024 neurons', 'Community support'] },
  { name: 'basic', label: 'Basic', price: 25, features: ['1,500 sec/week', 'N1 + N2', '32,768 neurons', 'Email support'] },
  { name: 'max', label: 'Max', price: 100, features: ['7,000 sec/week', 'N1 + N2', '131,072 neurons', 'Priority support'], recommended: true },
  { name: 'ultra', label: 'Ultra', price: 200, features: ['16,000 sec/week', 'N1 + N2', '131,072 neurons', 'Dedicated support'] },
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
    } catch (e: any) {
      alert(e.message);
    }
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
    } catch (e: any) {
      alert(e.message);
    }
    setActionLoading('');
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? It will remain active until the end of the billing period.')) return;
    setActionLoading('cancel');
    try {
      await api('/v1/billing/cancel', { method: 'POST' });
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    }
    setActionLoading('');
  };

  const handleBuyCredits = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount < 5) {
      alert('Minimum purchase is $5.');
      return;
    }
    setActionLoading('credits');
    try {
      const data = await api('/v1/billing/credits', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e: any) {
      alert(e.message);
    }
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
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="text-white/30">Loading...</div>;

  const currentPlan = sub?.plan || 'free';
  const isActive = sub?.status === 'active';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-white/30 text-sm mb-8">Manage your subscription, API credits, and extra usage.</p>

      {/* Current Plan */}
      {isActive && currentPlan !== 'free' && (
        <div className="console-card p-5 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Current Plan</p>
              <p className="text-xl font-bold capitalize">{currentPlan} &mdash; ${sub?.price_usd}/mo</p>
              {sub?.cancel_at_period_end && (
                <p className="text-yellow-400 text-xs mt-1">Cancels at end of period ({new Date(sub.current_period_end).toLocaleDateString()})</p>
              )}
              {sub?.source === 'github_sponsors' && (
                <p className="text-purple-400 text-xs mt-1">Linked via GitHub Sponsors</p>
              )}
            </div>
            <div className="flex gap-2">
              {!sub?.cancel_at_period_end && (
                <button onClick={handleCancel} disabled={actionLoading === 'cancel'}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg">
                  {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <h2 className="text-lg font-semibold mb-4">Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLANS.map(plan => {
          const isCurrent = plan.name === currentPlan;
          const isHigher = plan.price > (sub?.price_usd || 0);
          return (
            <div key={plan.name}
              className={`console-card p-5 flex flex-col ${(plan as any).recommended ? 'ring-1 ring-catalyst-blue/30' : ''}`}>
              <div className="mb-4">
                <h3 className="font-semibold">{plan.label}</h3>
                <p className="text-2xl font-bold mt-1">
                  {plan.price === 0 ? '$0' : `$${plan.price}`}
                  <span className="text-white/30 text-sm font-normal">/mo</span>
                </p>
              </div>
              <ul className="flex-1 space-y-2 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-white/50 flex items-start gap-1.5">
                    <span className="text-catalyst-blue mt-0.5">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center py-2 text-xs text-white/30 border border-white/10 rounded-lg">Current plan</span>
              ) : plan.name === 'free' ? (
                currentPlan !== 'free' ? (
                  <button onClick={handleCancel}
                    className="text-center py-2 text-xs text-white/50 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors">
                    Downgrade
                  </button>
                ) : null
              ) : isActive && currentPlan !== 'free' ? (
                <button onClick={() => handleChangePlan(plan.name)}
                  disabled={actionLoading === plan.name}
                  className="text-center py-2 text-xs font-medium rounded-lg transition-colors bg-catalyst-blue/10 text-catalyst-blue border border-catalyst-blue/20 hover:bg-catalyst-blue/20">
                  {actionLoading === plan.name ? 'Switching...' : isHigher ? 'Upgrade' : 'Switch'}
                </button>
              ) : (
                <button onClick={() => handleSubscribe(plan.name)}
                  disabled={actionLoading === plan.name}
                  className={`text-center py-2 text-xs font-medium rounded-lg transition-colors ${(plan as any).recommended ? 'bg-catalyst-blue text-white hover:bg-catalyst-blue/80' : 'bg-catalyst-blue/10 text-catalyst-blue border border-catalyst-blue/20 hover:bg-catalyst-blue/20'}`}>
                  {actionLoading === plan.name ? 'Loading...' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* API Credits */}
      <h2 className="text-lg font-semibold mb-4">API Credits</h2>
      <div className="console-card p-5 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Balance</p>
            <p className="text-2xl font-bold text-green-400">${(balance?.credits_balance ?? 0).toFixed(2)}</p>
            {(balance?.api_discount_pct ?? 0) > 0 && (
              <p className="text-purple-400 text-xs mt-1">{balance?.api_discount_pct}% discount on API rates</p>
            )}
          </div>
          <div className="text-right text-white/30 text-xs">
            <p>N1: $0.002/sec ($7.20/hr)</p>
            <p>N2: $0.005/sec ($18/hr)</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold text-sm">$</span>
            <input
              type="number"
              min="5"
              step="1"
              placeholder="5.00"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg pl-7 pr-3 py-2 text-sm text-white w-32 focus:outline-none focus:border-green-500/50"
            />
          </div>
          <button onClick={handleBuyCredits}
            disabled={actionLoading === 'credits'}
            className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 px-5 py-2 rounded-lg text-sm font-bold transition-colors">
            {actionLoading === 'credits' ? 'Loading...' : 'Buy credits'}
          </button>
          <span className="text-white/30 text-xs">$5 minimum</span>
        </div>
      </div>

      {/* Extra Usage */}
      <h2 className="text-lg font-semibold mb-4">Extra Usage</h2>
      <div className="console-card p-5 mb-8">
        <p className="text-white/50 text-sm mb-4">
          When enabled, jobs continue running after your plan limits are reached.
          Compute is billed from your API credit balance at standard API rates.
        </p>
        <div className="flex items-center gap-4">
          <button onClick={handleExtraUsage}
            className={`relative w-12 h-6 rounded-full transition-colors ${extraUsage ? 'bg-catalyst-blue' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${extraUsage ? 'left-6' : 'left-0.5'}`} />
          </button>
          <span className="text-white/60 text-sm">{extraUsage ? 'Enabled' : 'Disabled'}</span>
          {extraUsage && (
            <span className="text-white/30 text-xs">Monthly cap: ${spendingCap}</span>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <h2 className="text-lg font-semibold mb-4">History</h2>
      {history.length === 0 ? (
        <p className="text-white/30 text-sm">No transactions yet.</p>
      ) : (
        <div className="console-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Date</th>
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Type</th>
                <th className="text-left text-white/40 text-xs font-normal px-4 py-3">Description</th>
                <th className="text-right text-white/40 text-xs font-normal px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map(tx => (
                <tr key={tx.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs capitalize">
                    {tx.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-white/60 text-xs">{tx.description || '\u2014'}</td>
                  <td className={`px-4 py-3 text-xs text-right font-mono ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
