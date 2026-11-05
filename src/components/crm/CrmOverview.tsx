import React from 'react';
import {
  Briefcase,
  Building2,
  Receipt,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { Customer, InventoryItem, InwardEntry, OutwardEntry } from '../../types/security';

interface CrmOverviewProps {
  customers: Customer[];
  inventory: InventoryItem[];
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  onNavigate: (tab: string) => void;
}

export const CrmOverview: React.FC<CrmOverviewProps> = ({
  customers,
  inventory,
  inwards,
  outwards,
  onNavigate,
}) => {
  const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalRawStock = inventory
    .filter((i) => i.type === 'Raw Material')
    .reduce((sum, i) => sum + (i.unit === 'KG' ? i.currentStock : 0), 0);

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Raviraja CRM Enterprise Dashboard</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Core commercial management: Customers, Dealers, Sales Orders, Invoices, and Gate Security integration.
          </p>
        </div>

        <button
          onClick={() => onNavigate('security-dashboard')}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Switch to Security Module
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('crm-customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all"
        >
          <span className="text-slate-500 font-semibold uppercase text-[11px]">Active Dealer Accounts</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{customers.length} Dealers</p>
          <span className="text-[10px] text-blue-600 font-medium">Gujarat & Maharashtra regions</span>
        </div>

        <div
          onClick={() => onNavigate('crm-customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all"
        >
          <span className="text-slate-500 font-semibold uppercase text-[11px]">Outstanding Receivables</span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">₹{totalReceivables.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500 font-medium">Dealer ledgers balance</span>
        </div>

        <div
          onClick={() => onNavigate('crm-inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 cursor-pointer transition-all"
        >
          <span className="text-slate-500 font-semibold uppercase text-[11px]">Raw Material Stock</span>
          <p className="text-2xl font-black text-emerald-800 mt-1 font-mono">{totalRawStock.toLocaleString()} KG</p>
          <span className="text-[10px] text-emerald-600 font-medium">Auto-synced from Security Inward</span>
        </div>

        <div
          onClick={() => onNavigate('outward-entry')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-purple-400 cursor-pointer transition-all"
        >
          <span className="text-slate-500 font-semibold uppercase text-[11px]">Completed Dispatches</span>
          <p className="text-2xl font-black text-purple-800 mt-1">{outwards.filter((o) => o.status === 'Dispatched').length} Trucks</p>
          <span className="text-[10px] text-purple-600 font-medium">Cleared through Gate Pass</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Balances */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h2 className="font-bold text-slate-900 text-sm mb-3">Key Customer & Dealer Accounts</h2>
          <div className="divide-y divide-slate-100">
            {customers.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{c.company}</p>
                  <p className="text-[11px] text-slate-500">{c.name} • {c.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-slate-800">₹{c.balance.toLocaleString()}</p>
                  <span className="text-[10px] text-slate-400">Balance</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Gate Pass Integration Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h2 className="font-bold text-slate-900 text-sm">Security Module Integration Status</h2>
          <p className="text-slate-600 leading-relaxed">
            The Raviraja Security Management Module is fully embedded and directly wired into this CRM database.
          </p>
          <div className="space-y-2 pt-1">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Inward Raw Material Posting</span>
                <span className="text-[11px] text-emerald-800">Suppliers deliver PVC resin & stabilizers; approvals instantly update CRM stock.</span>
              </div>
              <button
                onClick={() => onNavigate('inward-entry')}
                className="px-2.5 py-1 bg-emerald-700 text-white font-semibold rounded"
              >
                Inward
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-950 block">Sales Dispatch Verification</span>
                <span className="text-[11px] text-blue-800">Dispatches automatically link to sales invoices and produce QR Gate Passes.</span>
              </div>
              <button
                onClick={() => onNavigate('outward-entry')}
                className="px-2.5 py-1 bg-blue-700 text-white font-semibold rounded"
              >
                Outward
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
