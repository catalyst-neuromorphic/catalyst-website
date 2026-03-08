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
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>API Keys</h1>
      <p className="text-white/30 text-sm mb-8">Manage your keys for programmatic access.</p>

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400/80 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      {/* New key banner */}
      {newKey && (
        <div className="console-card p-5 mb-6 border-white/10">
          <p className="text-white/70 font-medium text-sm mb-2">Key created. Copy it now — you won't see it again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm font-mono text-white/80 break-all select-all">
              {newKey.api_key}
            </code>
            <button onClick={copyKey}
              className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 px-4 py-2.5 rounded-lg text-sm shrink-0 transition-colors">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-white/25 hover:text-white/50 text-xs mt-3 transition-colors">
            Dismiss
          </button>
        </div>
      )}

      {/* Create key form */}
      <div className="console-card p-5 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-white/35 mb-1.5">Key name</label>
            <input
              type="text"
              value={keyName}
              onChange={e => setKeyName(e.target.value)}
              placeholder="e.g. production, ci-pipeline"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button onClick={createKey} disabled={creating}
            className="border border-white/15 hover:border-white/25 bg-white/[0.06] hover:bg-white/[0.10] disabled:opacity-50 text-white/80 px-5 py-2 rounded-lg text-sm transition-colors">
            {creating ? 'Creating...' : 'Create key'}
          </button>
        </div>
      </div>

      {/* Keys table or empty state */}
      {keys.length === 0 && !newKey ? (
        <div className="console-card p-12 text-center">
          <svg className="mx-auto mb-3 text-white/10" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <p className="text-white/40 text-sm font-medium mb-1">No API keys yet</p>
          <p className="text-white/20 text-xs">Create a key above to start making requests.</p>
        </div>
      ) : keys.length > 0 && (
        <div className="console-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Name</th>
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Key</th>
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Created</th>
                <th className="text-left text-white/30 text-xs font-medium px-5 py-3">Last used</th>
                <th className="text-right text-white/30 text-xs font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.key_id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-5 py-3 text-white/70">{k.name}</td>
                  <td className="px-5 py-3">
                    <code className="text-white/30 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k.key_prefix}...{'*'.repeat(8)}</code>
                  </td>
                  <td className="px-5 py-3 text-white/30 text-xs">{formatDate(k.created_at)}</td>
                  <td className="px-5 py-3 text-white/30 text-xs">
                    {k.last_used_at ? formatDate(k.last_used_at) : <span className="text-white/15">Never</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {k.active ? (
                      <button onClick={() => revokeKey(k.key_id)}
                        className="text-red-400/50 hover:text-red-400 text-xs transition-colors">
                        Revoke
                      </button>
                    ) : (
                      <span className="text-white/15 text-xs">Revoked</span>
                    )}
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
