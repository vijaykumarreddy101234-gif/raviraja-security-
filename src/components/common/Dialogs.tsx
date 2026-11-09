import React, { useEffect, useState } from 'react';

/**
 * In-page replacements for alert / confirm / prompt. Browsers and embedded
 * previews often block the native dialogs (they silently return nothing), so
 * forms would appear to do nothing. Mount <DialogHost /> once at the app root.
 */
type Req =
  | { kind: 'alert'; message: string; resolve: () => void }
  | { kind: 'confirm'; message: string; resolve: (v: boolean) => void }
  | { kind: 'prompt'; message: string; defaultValue: string; password?: boolean; resolve: (v: string | null) => void };

let push: ((r: Req) => void) | null = null;

export const alertDialog = (message: string): Promise<void> =>
  new Promise((resolve) => (push ? push({ kind: 'alert', message, resolve }) : (window.alert(message), resolve())));

export const confirmDialog = (message: string): Promise<boolean> =>
  new Promise((resolve) => (push ? push({ kind: 'confirm', message, resolve }) : resolve(window.confirm(message))));

export const promptDialog = (message: string, defaultValue = '', password = false): Promise<string | null> =>
  new Promise((resolve) =>
    push ? push({ kind: 'prompt', message, defaultValue, password, resolve }) : resolve(window.prompt(message, defaultValue))
  );

export const DialogHost: React.FC = () => {
  const [queue, setQueue] = useState<Req[]>([]);
  const [value, setValue] = useState('');
  const current = queue[0];

  useEffect(() => {
    push = (r) => setQueue((q) => [...q, r]);
    return () => { push = null; };
  }, []);
  useEffect(() => {
    if (current?.kind === 'prompt') setValue(current.defaultValue);
  }, [current]);

  if (!current) return null;
  const close = () => setQueue((q) => q.slice(1));
  const done = (ok: boolean) => {
    if (current.kind === 'alert') current.resolve();
    else if (current.kind === 'confirm') current.resolve(ok);
    else current.resolve(ok ? value : null);
    close();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={(e) => { e.preventDefault(); done(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') done(false); }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-3"
      >
        <p className="text-sm text-slate-800 whitespace-pre-line">{current.message}</p>
        {current.kind === 'prompt' && (
          <input
            autoFocus
            type={current.password ? 'password' : 'text'}
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-emerald-500"
          />
        )}
        <div className="flex justify-end gap-2">
          {current.kind !== 'alert' && (
            <button type="button" onClick={() => done(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
          )}
          <button autoFocus={current.kind !== 'prompt'} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            OK
          </button>
        </div>
      </form>
    </div>
  );
};
