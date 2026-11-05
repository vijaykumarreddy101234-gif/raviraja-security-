import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  PackageCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Eye,
  FileText,
  PlusCircle,
} from 'lucide-react';
import {
  InwardEntry,
  OutwardEntry,
  VisitorEntry,
  ReturnEntry,
  SecurityAttendance,
  SecurityAuditLog,
  UserProfile,
} from '../../types/security';
import { computeSecurityDashboardStats } from '../../utils/securityLogic';

interface SecurityDashboardProps {
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  visitors: VisitorEntry[];
  returns: ReturnEntry[];
  attendance: SecurityAttendance[];
  auditLogs: SecurityAuditLog[];
  currentUser: UserProfile;
  onNavigate: (tab: string) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
  onCheckOutVisitor: (id: string) => void;
  onApproveInward: (id: string) => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  inwards,
  outwards,
  visitors,
  returns,
  attendance,
  auditLogs,
  currentUser,
  onNavigate,
  onOpenVoucher,
  onCheckOutVisitor,
  onApproveInward,
}) => {
  const stats = computeSecurityDashboardStats(inwards, outwards, visitors, returns, attendance);

  // Status badge styling
  const renderStatus = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Dispatched':
      case 'Stock Updated':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Verified':
      case 'Ready for Dispatch':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
      case 'Pending Approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Inside Factory':
        return 'bg-teal-100 text-teal-800 border-teal-200 font-bold animate-pulse';
      case 'Checked Out':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & Gate Management Dashboard</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              LIVE GATE 1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time vigil, vehicle scale integration, gate pass tracking & automated inventory synchronization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('inward-entry')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Inward Entry
          </button>
          <button
            onClick={() => onNavigate('outward-entry')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Outward Entry
          </button>
          <button
            onClick={() => onNavigate('visitor-management')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Visitor Pass
          </button>
        </div>
      </div>

      {/* 10 Live Summary Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Live Plant Security KPI Cards</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Today's Inward */}
          <div
            onClick={() => onNavigate('inward-entry')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Today's Inward</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.todayInwardCount}</div>
            <span className="text-[10px] text-emerald-600 font-medium">Vehicles Entered Today</span>
          </div>

          {/* 2. Today's Outward */}
          <div
            onClick={() => onNavigate('outward-entry')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Today's Outward</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.todayOutwardCount}</div>
            <span className="text-[10px] text-blue-600 font-medium">Dispatches Clear</span>
          </div>

          {/* 3. Visitors Currently Inside */}
          <div
            onClick={() => onNavigate('visitor-management')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Visitors Inside</span>
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-teal-700">{stats.visitorsCurrentlyInside}</div>
            <span className="text-[10px] text-teal-600 font-medium">Inside Plant Premises</span>
          </div>

          {/* 4. Total Visitors Today */}
          <div
            onClick={() => onNavigate('visitor-management')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Total Visitors Today</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalVisitorsToday}</div>
            <span className="text-[10px] text-slate-500 font-medium">Total Passes Issued</span>
          </div>

          {/* 5. Security Staff Present */}
          <div
            onClick={() => onNavigate('security-staff')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Security Staff On Duty</span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.staffPresentToday}</div>
            <span className="text-[10px] text-purple-600 font-medium">Guards & Supervisors</span>
          </div>

          {/* 6. Pending Inward Approvals */}
          <div
            onClick={() => onNavigate('inward-entry')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Pending Inward</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700">{stats.pendingInwardApprovals}</div>
            <span className="text-[10px] text-amber-600 font-medium">Awaiting Inspection</span>
          </div>

          {/* 7. Pending Outward Approvals */}
          <div
            onClick={() => onNavigate('outward-entry')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-sky-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Pending Outward</span>
              <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-sky-700">{stats.pendingOutwardApprovals}</div>
            <span className="text-[10px] text-sky-600 font-medium">Gate Pass Pending</span>
          </div>

          {/* 8. Pending Return Approvals */}
          <div
            onClick={() => onNavigate('return-material')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Pending Return</span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700">{stats.pendingReturnApprovals}</div>
            <span className="text-[10px] text-rose-600 font-medium">QC Inspection Req</span>
          </div>

          {/* 9. Total Material Received */}
          <div
            onClick={() => onNavigate('crm-inventory')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Total Received Today</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats.totalMaterialReceivedToday.toLocaleString()} <span className="text-xs font-normal">KG</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">Raw Material In</span>
          </div>

          {/* 10. Total Material Dispatched */}
          <div
            onClick={() => onNavigate('outward-entry')}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-semibold">Dispatched Today</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {stats.totalMaterialDispatchedToday.toLocaleString()} <span className="text-xs font-normal">Pcs</span>
            </div>
            <span className="text-[10px] text-blue-600 font-medium">Finished Goods Out</span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Inward & Outward */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inward Entries */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Inward Entries (Raw Material)</h2>
            </div>
            <button
              onClick={() => onNavigate('inward-entry')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              View All ({inwards.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Entry #</th>
                  <th className="p-3">Supplier & Vehicle</th>
                  <th className="p-3 text-right">Received Qty</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inwards.slice(0, 4).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900">{entry.inwardEntryNumber}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{entry.entryTime}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-900 truncate max-w-[180px]">{entry.supplierCompanyName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{entry.vehicleNumber}</p>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {entry.actualReceivedQuantity} KG
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${renderStatus(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() =>
                          onOpenVoucher('Raw Material Inward Voucher', entry.inwardEntryNumber, 'INWARD', entry)
                        }
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Print / View Voucher"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {entry.status !== 'Approved' && currentUser.role !== 'SECURITY_STAFF' && (
                        <button
                          onClick={() => onApproveInward(entry.id)}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Outward Entries */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Outward Dispatches (Sales)</h2>
            </div>
            <button
              onClick={() => onNavigate('outward-entry')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All ({outwards.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Outward #</th>
                  <th className="p-3">Customer & Vehicle</th>
                  <th className="p-3">Gate Pass #</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outwards.slice(0, 4).map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900">{entry.outwardEntryNumber}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{entry.dispatchTime}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-900 truncate max-w-[180px]">{entry.customerCompanyName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{entry.vehicleNumber}</p>
                    </td>
                    <td className="p-3 font-mono text-slate-600 text-[11px]">{entry.gatePassNumber}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${renderStatus(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() =>
                          onOpenVoucher('Sales Dispatch Gate Pass', entry.outwardEntryNumber, 'OUTWARD', entry)
                        }
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="View Gate Pass"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid: Visitors & Return Materials & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visitors Inside Factory */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">Active Visitors Register</h2>
            </div>
            <button
              onClick={() => onNavigate('visitor-management')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              All Visitors
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {visitors.slice(0, 3).map((v) => (
              <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{v.visitorName}</p>
                    <p className="text-[11px] text-slate-600">{v.companyName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Meeting: <span className="font-semibold text-slate-700">{v.personToMeet}</span> ({v.department})
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${renderStatus(v.status)}`}>
                    {v.status}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-500">In: {v.entryTime}</span>
                  {v.status === 'Inside Factory' ? (
                    <button
                      onClick={() => onCheckOutVisitor(v.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                    >
                      Check-Out
                    </button>
                  ) : (
                    <span className="font-mono text-slate-400">Out: {v.exitTime}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Return Materials */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Returns & QC</h2>
            </div>
            <button
              onClick={() => onNavigate('return-material')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              Manage Returns
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {returns.slice(0, 3).map((ret) => (
              <div key={ret.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-900">{ret.returnEntryNumber}</span>
                    <p className="text-xs font-semibold text-slate-800">{ret.partyName}</p>
                    <p className="text-[10px] text-slate-500">{ret.returnType}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${renderStatus(ret.stockStatus)}`}>
                    {ret.stockStatus}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between items-center">
                  <span>Approved: <strong className="text-emerald-700">{ret.approvedQuantity}</strong> / Rejected: <strong className="text-rose-700">{ret.rejectedQuantity}</strong></span>
                  <button
                    onClick={() => onOpenVoucher('Return Material Gate Pass', ret.returnEntryNumber, 'RETURN', ret)}
                    className="text-blue-600 hover:underline"
                  >
                    View Pass
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Activity & Audit History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Security Activity History</h2>
            </div>
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
            >
              Full Log
            </button>
          </div>

          <div className="p-4 space-y-3">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="font-mono">{log.module} • {log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-slate-800 font-medium mt-0.5 text-[11px] leading-tight">{log.details}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">By {log.userName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
