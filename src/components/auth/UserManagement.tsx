import React, { useState } from 'react';
import { Users, UserPlus, KeyRound, Check, X } from 'lucide-react';
import { AppUser, UserProfile, UserRole } from '../../types/security';
import { createUser, updateUser, adminResetPassword } from '../../services/auth';
import { ALL_PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS } from '../../utils/permissions';

interface Props {
  users: AppUser[];
  currentUser: UserProfile;
  onChanged: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const ROLES: UserRole[] = ['ADMIN', 'SECURITY_SUPERVISOR', 'SECURITY_STAFF'];

export const UserManagement: React.FC<Props> = ({ users, currentUser, onChanged, notify }) => {
  const [form, setForm] = useState({ username: '', name: '', role: 'SECURITY_STAFF' as UserRole, badgeNumber: '', department: '', password: '' });
  const [showForm, setShowForm] = useState(false);

  const report = (r: { ok: boolean; message: string }) => {
    notify(r.message, r.ok ? 'success' : 'error');
    if (r.ok) onChanged();
    return r.ok;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (report(await createUser(currentUser, form))) {
      setForm({ username: '', name: '', role: 'SECURITY_STAFF', badgeNumber: '', department: '', password: '' });
      setShowForm(false);
    }
  };

  const reset = async (u: AppUser) => {
    const pw = prompt(`Temporary password for ${u.username} (min 8, upper+lower+number):`);
    if (pw) report(await adminResetPassword(currentUser, u.id, pw));
  };

  const input = 'w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500';

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900">Users & Role Access</h1>
          </div>
          <p className="text-slate-500 mt-1">Create accounts, assign roles, disable users and reset passwords. Every change is audited.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">
          <UserPlus className="w-4 h-4" /> Add user
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-white p-5 rounded-xl border border-slate-200 grid sm:grid-cols-3 gap-3">
          <label className="font-semibold text-slate-600">Username<input className={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label className="font-semibold text-slate-600">Full name<input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="font-semibold text-slate-600">Role
            <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
          <label className="font-semibold text-slate-600">Badge no.<input className={input} value={form.badgeNumber} onChange={(e) => setForm({ ...form, badgeNumber: e.target.value })} /></label>
          <label className="font-semibold text-slate-600">Department<input className={input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label className="font-semibold text-slate-600">Temporary password<input type="password" autoComplete="new-password" className={input} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <div className="sm:col-span-3 flex justify-end">
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold">Create user</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] border-b border-slate-200">
            <tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last login</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const self = u.id === currentUser.id;
              return (
                <tr key={u.id}>
                  <td className="p-3"><p className="font-semibold text-slate-900">{u.name}</p><p className="font-mono text-[10px] text-slate-500">@{u.username} · {u.badgeNumber}</p></td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      disabled={self}
                      onChange={(e) => report(updateUser(currentUser, u.id, { role: e.target.value as UserRole }))}
                      className="px-2 py-1 border border-slate-300 rounded-md disabled:bg-slate-50"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${u.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                    {u.lockedUntil && u.lockedUntil > Date.now() && <span className="ml-1 text-[10px] text-rose-600 font-bold">Locked</span>}
                  </td>
                  <td className="p-3 text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    <button onClick={() => reset(u)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"><KeyRound className="w-3 h-3" />Reset password</button>
                    {!self && (
                      <button onClick={() => report(updateUser(currentUser, u.id, { isActive: !u.isActive }))} className="text-rose-600 hover:underline font-semibold">
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="p-4 border-b border-slate-200 font-bold text-slate-900">Role access matrix</div>
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-[11px]">
            <tr><th className="p-3">Permission</th>{ROLES.map((r) => <th key={r} className="p-3 text-center">{ROLE_LABELS[r]}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_PERMISSIONS.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium text-slate-700">{p.label}</td>
                {ROLES.map((r) => (
                  <td key={r} className="p-3 text-center">
                    {ROLE_PERMISSIONS[r].includes(p.id) ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-slate-300 inline" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
