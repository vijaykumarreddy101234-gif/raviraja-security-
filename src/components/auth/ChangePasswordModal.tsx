import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { changePassword } from '../../services/auth';

interface Props {
  userId: string;
  forced?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}

export const ChangePasswordModal: React.FC<Props> = ({ userId, forced, onDone, onCancel }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    const res = await changePassword(userId, current, next);
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.message);
  };

  const input = 'w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500';
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          {forced ? 'Set a new password' : 'Change password'}
        </div>
        {forced && <p className="text-xs text-slate-500">For security, replace the temporary password before continuing.</p>}
        <label className="block text-xs font-semibold text-slate-600">
          Current password
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          New password
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Confirm new password
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        </label>
        <p className="text-[11px] text-slate-500">Min 8 characters, with upper & lower case letters and a number.</p>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          {!forced && onCancel && (
            <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
          )}
          <button disabled={busy} className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};
