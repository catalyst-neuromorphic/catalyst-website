import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

interface ApiKey {
  key_id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  active: boolean;
}

interface NewKey {
  api_key: string;
  key_id: string;
  key_prefix: string;
  name: string;
}

export default function KeysTable() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadKeys = async () => {
    try {
      const data = await api('/v1/keys');
      setKeys(data);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { if (isLoggedIn()) loadKeys(); }, []);

  const createKey = async () => {
    setCreating(true);
    setError('');
    try {
      const data = await api('/v1/keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName || 'default' }),
      });
      setNewKey(data);
      setKeyName('');
      loadKeys();
    } catch (e: any) {
      setError(e.message);
    }
    setCreating(false);
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    try {
      await api(`/v1/keys/${keyId}`, { method: 'DELETE' });
      loadKeys();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-white/30 text-sm mt-1">Manage your API keys for programmatic access.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* New key modal */}
      {newKey && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-6">
          <p className="text-green-400 font-medium text-sm mb-2">Key created. Copy it now — you won't see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm font-mono text-white break-all">
              {newKey.api_key}
            </code>
            <button onClick={copyKey}
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2.5 rounded-lg text-sm shrink-0 transition-colors">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-white/30 hover:text-white/50 text-xs mt-3 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Create key form */}
      <div className="console-card p-5 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-white/40 mb-1">Key name</label>
            <input
              type="text"
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              placeholder="e.g. production, ci-pipeline"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-catalyst-blue/50"
            />
          </div>
          <button onClick={createKey} disabled={creating}
            className="bg-catalyst-blue hover:bg-catalyst-blue/90 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm transition-colors">
            {creating ? 'Creating...' : 'Create key'}
          </button>
        </div>
      </div>

      {/* Keys table */}
      <div className="console-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-white/30 font-normal px-5 py-3">Name</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Key</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Created</th>
              <th className="text-left text-white/30 font-normal px-5 py-3">Last used</th>
              <th className="text-right text-white/30 font-normal px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.key_id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 text-white/80">{k.name}</td>
                <td className="px-5 py-3">
                  <code className="text-white/40 font-mono text-xs">{k.key_prefix}...{'*'.repeat(8)}</code>
                </td>
                <td className="px-5 py-3 text-white/40">{formatDate(k.created_at)}</td>
                <td className="px-5 py-3 text-white/40">
                  {k.last_used_at ? formatDate(k.last_used_at) : 'Never'}
                </td>
                <td className="px-5 py-3 text-right">
                  {k.active ? (
                    <button onClick={() => revokeKey(k.key_id)}
                      className="text-red-400/60 hover:text-red-400 text-xs transition-colors">
                      Revoke
                    </button>
                  ) : (
                    <span className="text-white/20 text-xs">Revoked</span>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-white/20">
                  No API keys yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
