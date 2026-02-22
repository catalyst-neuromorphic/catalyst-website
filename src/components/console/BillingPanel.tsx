import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface Balance {
  credits_balance: number;
  tier: string;
  total_deposited: number;
  next_tier_at: number | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const CREDIT_PACKS = [5, 20, 50, 100, 200];

export default function BillingPanel() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) return;
    api('/v1/billing/balance').then(setBalance).catch(e => setError(e.message));
    api('/v1/billing/history').then(setTransactions).catch(() => {});
  }, []);

  const buyCredits = async (amount: number) => {
    setLoading(amount);
    setError('');
    try {
      const data = await api('/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const tierColors: Record<string, string> = {
    free: 'text-white/50',
    researcher: 'text-catalyst-blue',
    startup: 'text-green-400',
    enterprise: 'text-purple-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-white/30 text-sm mt-1">Manage your credits and view transaction history.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* Balance overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Credit Balance</p>
          <p className="text-3xl font-bold text-green-400">
            {'\u00A3'}{(balance?.credits_balance ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Current Tier</p>
          <p className={`text-2xl font-bold capitalize ${tierColors[balance?.tier || 'free'] || 'text-white'}`}>
            {balance?.tier ?? 'free'}
          </p>
          <p className="text-white/20 text-xs mt-1">
            {'\u00A3'}{(balance?.total_deposited ?? 0).toFixed(0)} deposited total
          </p>
        </div>
        <div className="bg-[#111] border border-white/5 rounded-xl p-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Next Tier</p>
          {balance?.next_tier_at ? (
            <>
              <p className="text-2xl font-bold">
                {'\u00A3'}{(balance.next_tier_at - (balance.total_deposited ?? 0)).toFixed(0)}
              </p>
              <p className="text-white/20 text-xs mt-1">more to unlock</p>
            </>
          ) : (
            <p className="text-white/20 text-sm mt-2">Max tier reached</p>
          )}
        </div>
      </div>

      {/* Add credits */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-white/60 mb-4">Add Credits</h2>
        <div className="flex flex-wrap gap-3">
          {CREDIT_PACKS.map(amount => (
            <button
              key={amount}
              onClick={() => buyCredits(amount)}
              disabled={loading !== null}
              className="bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {loading === amount ? 'Redirecting...' : `\u00A3${amount}`}
            </button>
          ))}
        </div>
        <p className="text-white/20 text-xs mt-3">
          Credits never expire. Tier advances with cumulative deposit.
          Compute rate: {'\u00A3'}0.005/sec ({'\u00A3'}18/hr).
        </p>
      </div>

      {/* Tier progression */}
      <div className="bg-[#111] border border-white/5 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-medium text-white/60 mb-4">Tier Progression</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { name: 'Free', deposit: '\u00A30', jobs: '10/day', neurons: '1,024', runtime: '30s' },
            { name: 'Researcher', deposit: '\u00A35+', jobs: '100/day', neurons: '32,768', runtime: '5min' },
            { name: 'Startup', deposit: '\u00A350+', jobs: '500/day', neurons: '131,072', runtime: '30min' },
            { name: 'Enterprise', deposit: '\u00A3200+', jobs: 'Unlimited', neurons: '131,072', runtime: '1hr' },
          ].map(tier => (
            <div key={tier.name}
              className={`border rounded-lg p-3 text-xs ${
                balance?.tier?.toLowerCase() === tier.name.toLowerCase()
                  ? 'border-catalyst-blue/30 bg-catalyst-blue/5'
                  : 'border-white/5'
              }`}
            >
              <p className="font-medium text-sm mb-2">{tier.name}</p>
              <p className="text-white/30">Deposit: {tier.deposit}</p>
              <p className="text-white/30">Jobs: {tier.jobs}</p>
              <p className="text-white/30">Neurons: {tier.neurons}</p>
              <p className="text-white/30">Runtime: {tier.runtime}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Transaction History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/30 font-normal px-5 py-3">Date</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Type</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Description</th>
              <th className="text-right text-white/30 font-normal px-5 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 text-white/40">{formatDate(tx.created_at)}</td>
                <td className="px-5 py-3 text-white/60 capitalize">{tx.type}</td>
                <td className="px-5 py-3 text-white/40">{tx.description || '-'}</td>
                <td className={`px-5 py-3 text-right font-mono ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{'\u00A3'}{tx.amount.toFixed(4)}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-white/20">
                  No transactions yet. Add credits to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
