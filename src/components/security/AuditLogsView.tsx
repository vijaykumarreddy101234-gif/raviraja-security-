import React, { useState } from 'react';
import { History, Search, ShieldCheck, Filter, FileSpreadsheet } from 'lucide-react';
import { SecurityAuditLog } from '../../types/security';

interface AuditLogsViewProps {
  logs: SecurityAuditLog[];
  onExported?: (rowCount: number) => void;
}

// CSV cell: double the quotes, and neutralise spreadsheet formulas (=, +, -, @).
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onExported }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const users = Array.from(new Set(logs.map((l) => l.userName))).sort();
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchUser = userFilter === 'ALL' || log.userName === userFilter;
    const day = log.timestamp.slice(0, 10);
    const matchDate = (!from || day >= from) && (!to || day <= to);
    return matchSearch && matchModule && matchAction && matchUser && matchDate;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Module', 'Action', 'Record Number', 'User Name', 'Role', 'Details'];
    const rows = filtered.map((l) =>
      [l.timestamp, l.module, l.action, l.recordNumber, l.userName, l.userRole, l.details].map(csvCell).join(',')
    );
    const blob = new Blob(['\uFEFF' + [headers.map(csvCell).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Raviraja_Security_AuditLogs.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    onExported?.(filtered.length);
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security Audit Trail & Traceability</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Append-only log of sign-ins, access denials, user changes, inward/outward activity, gate passes, stock postings and PDF exports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          Export Audit Trail (CSV)
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit logs by record #, officer, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Module:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="ALL">All Modules</option>
              <option value="INWARD">Inward</option>
              <option value="OUTWARD">Outward</option>
              <option value="VISITOR">Visitor</option>
              <option value="RETURN">Return</option>
              <option value="GATE_PASS">Gate Pass</option>
              <option value="STAFF">Staff</option>
              <option value="STOCK_POSTING">Stock Posting</option>
              <option value="SETTINGS">Settings</option>
              <option value="AUTH">Login / Access</option>
              <option value="USER_MGMT">User Management</option>
              <option value="PDF_EDITOR">PDF Editor</option>
            </select>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700">
              <option value="ALL">All Actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 max-w-[180px]">
              <option value="ALL">All Users</option>
              {users.map((u) => <option key={u} value={u}>{u.split('(')[0]}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action</th>
                <th className="p-3">Doc / Record #</th>
                <th className="p-3">User & Role</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.action === 'APPROVE' || log.action === 'POST_STOCK'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : log.action === 'REJECT' || log.action === 'LOGIN_FAILED' || log.action === 'ACCESS_DENIED'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : log.action === 'LOGIN' || log.action === 'LOGOUT'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          : log.action === 'CREATE'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-900">{log.recordNumber}</td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-800">{log.userName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{log.userRole}</p>
                  </td>
                  <td className="p-3 text-slate-700 max-w-md">{log.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No audit records match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
