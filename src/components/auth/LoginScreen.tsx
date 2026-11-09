import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AppUser } from '../../types/security';
import { login } from '../../services/auth';

interface Props {
  onLoggedIn: (user: AppUser) => void;
  sessionNotice?: string;
}

export const LoginScreen: React.FC<Props> = ({ onLoggedIn, sessionNotice }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await login(username, password);
    setBusy(false);
    if (res.ok === true) onLoggedIn(res.user);
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-lg">
            RI
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white tracking-tight">RAVIRAJA INDUSTRIES</h1>
          <p className="text-sm text-slate-400">Security & Gate Management System</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Sign in to continue
          </div>

          {sessionNotice && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">{sessionNotice}</div>
          )}

          <label className="block text-xs font-semibold text-slate-600">
            Username
            <div className="relative mt-1">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Password
            <div className="relative mt-1">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={busy || !username || !password}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            First-time setup accounts: <b>admin</b>, <b>supervisor</b>, <b>guard</b> (passwords in README). You will be asked to
            set a new password on first sign-in.
          </p>
        </form>
      </div>
    </div>
  );
};
