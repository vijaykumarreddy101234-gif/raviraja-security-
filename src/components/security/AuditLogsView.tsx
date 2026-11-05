import React, { useState } from 'react';
import { History, Search, ShieldCheck, Filter, FileSpreadsheet } from 'lucide-react';
import { SecurityAuditLog } from '../../types/security';

interface AuditLogsViewProps {
  logs: SecurityAuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchModule = moduleFilter === 'ALL' || log.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Module', 'Action', 'Record Number', 'User Name', 'Role', 'Details'];
    const rows = filtered.map((l) => [
      l.timestamp,
      l.module,
      l.action,
      l.recordNumber,
      `"${l.userName}"`,
      l.userRole,
      `"${l.details}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raviraja_Security_AuditLogs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Immutable log of all inward/outward creation, verification, gate passes, visitor check-outs and stock postings.
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
            </select>
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
                          : log.action === 'REJECT'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
