import { useState, useEffect } from 'react';
import { api, isLoggedIn } from './api';

export default function AuthorizePrompt() {
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [userCode, setUserCode] = useState('');

  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const callbackPort = params.get('callback_port');
  const deviceCode = params.get('device_code');
  const state = params.get('state') || '';

  useEffect(() => {
    if (!isLoggedIn()) {
      const loginParams = new URLSearchParams();
      if (callbackPort) loginParams.set('callback_port', callbackPort);
      if (deviceCode) loginParams.set('device_code', deviceCode);
      if (state) loginParams.set('state', state);
      window.location.href = `/console/login?${loginParams.toString()}`;
    }
  }, []);

  const authorize = async () => {
    setAuthorizing(true);
    setError('');
    try {
      // Path A: localhost callback (browser on same machine as CLI)
      if (callbackPort) {
        const data = await api('/v1/auth/cli-token', { method: 'POST' });
        if (!data.access_token || !data.refresh_token) {
          throw new Error('Server returned incomplete token response.');
        }
        const callbackUrl = `http://localhost:${callbackPort}/callback` +
          `?access_token=${encodeURIComponent(data.access_token)}` +
          `&refresh_token=${encodeURIComponent(data.refresh_token)}` +
          `&state=${encodeURIComponent(state)}`;
        window.location.href = callbackUrl;
        setDone(true);
        return;
      }

      // Path B: device code (manual URL, possibly different device)
      if (deviceCode) {
        const data = await api('/v1/auth/device-code/authorize', {
          method: 'POST',
          body: JSON.stringify({ device_code: deviceCode }),
        });
        if (!data.user_code) {
          throw new Error('Server did not return a code. The device code may have expired — please restart login from the CLI.');
        }
        setUserCode(data.user_code);
        setDone(true);
        return;
      }

      setError('Missing callback port or device code. Please start login from the CLI.');
    } catch (e: any) {
      console.error('[AuthorizePrompt] authorize failed:', e);
      setError(e.message || 'Authorization failed. Please try again.');
    }
    setAuthorizing(false);
  };

  const deny = () => {
    if (callbackPort) {
      window.location.href = `http://localhost:${callbackPort}/callback?error=access_denied&state=${encodeURIComponent(state)}`;
    } else {
      window.location.href = '/console/dashboard';
    }
  };

  if (done) {
    // Device code mode: show the code for the user to type into the CLI
    if (userCode) {
      return (
        <div className="text-center py-12">
          <p className="text-green-400 text-lg font-medium mb-4">Authorized</p>
          <p className="text-white/50 text-sm mb-6">Enter this code in the CLI to complete login:</p>
          <div className="inline-block bg-white/[0.04] border border-white/[0.08] rounded-xl px-8 py-5 mb-6">
            <p className="text-3xl font-mono font-bold tracking-[0.25em] text-white select-all">
              {userCode}
            </p>
          </div>
          <p className="text-white/25 text-xs">This code expires in 10 minutes.</p>
        </div>
      );
    }
    // Localhost callback mode: just confirm
    return (
      <div className="text-center py-12">
        <p className="text-green-400 text-lg font-medium mb-2">Authorized</p>
        <p className="text-white/30 text-sm">You can close this tab and return to the CLI.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="console-card p-6">
        <h1 className="text-lg font-semibold mb-2">Authorize Catalyst CLI</h1>
        <p className="text-white/40 text-sm mb-6">
          The Catalyst CLI is requesting access to your account.
          This will allow the CLI to submit simulations and manage jobs on your behalf.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4 mb-6">
          <p className="text-white/60 text-sm mb-2">Permissions requested:</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>Submit and manage simulation jobs</li>
            <li>View account balance and usage</li>
            <li>Download bitstreams for your tier</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={authorize}
            disabled={authorizing}
            className="flex-1 bg-catalyst-blue hover:bg-catalyst-blue/90 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {authorizing ? 'Authorizing...' : 'Authorize'}
          </button>
          <button
            onClick={deny}
            className="bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}
