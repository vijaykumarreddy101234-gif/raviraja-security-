import React, { useState } from 'react';
import { Building2, Plus, Search, Phone, MapPin, Receipt, ArrowUpRight } from 'lucide-react';
import { Customer } from '../../types/security';

interface CrmCustomersProps {
  customers: Customer[];
  onNavigateToSecurity: (tab: string) => void;
}

export const CrmCustomers: React.FC<CrmCustomersProps> = ({ customers, onNavigateToSecurity }) => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.gstNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Customer & Dealer Accounts</h1>
          </div>
          <p className="text-slate-500 mt-1">
            UPVC fabricators, window & door dealers, institutional builders and architects.
          </p>
        </div>

        <button
          onClick={() => onNavigateToSecurity('outward-entry')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          Create Sales Dispatch
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customers by company, contact person, phone, GST..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3">Customer Code</th>
                <th className="p-3">Company & Contact</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Delivery Address</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3 text-right">Outstanding Balance</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900">{c.code}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{c.company}</p>
                    <p className="text-[11px] text-slate-500">{c.name}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{c.phone}</td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">{c.address}</td>
                  <td className="p-3 font-mono text-slate-800">{c.gstNumber}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                    ₹{c.balance.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onNavigateToSecurity('outward-entry')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold border border-slate-300"
                    >
                      Dispatch Goods
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
