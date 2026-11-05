import React, { useState } from 'react';
import { Receipt, Search, Plus, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import { OutwardEntry, Customer } from '../../types/security';

interface CrmSalesProps {
  outwards: OutwardEntry[];
  customers: Customer[];
  onNavigateToSecurity: (tab: string) => void;
}

export const CrmSales: React.FC<CrmSalesProps> = ({ outwards, customers, onNavigateToSecurity }) => {
  const [search, setSearch] = useState('');

  const salesRecords = outwards.map((o) => ({
    invoiceNumber: o.salesInvoiceNumber,
    date: o.dispatchDate,
    customer: o.customerCompanyName,
    vehicle: o.vehicleNumber,
    gatePass: o.gatePassNumber,
    quantity: o.materials.reduce((s, m) => s + (Number(m.quantity) || 0), 0),
    status: o.status,
  }));

  const filtered = salesRecords.filter(
    (s) =>
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customer.toLowerCase().includes(search.toLowerCase()) ||
      s.gatePass.toLowerCase().includes(search.toLowerCase()) ||
      s.vehicle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Sales Orders & Tax Invoices</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Commercial billing directly linked with security gate pass verification and truck dispatches.
          </p>
        </div>

        <button
          onClick={() => onNavigateToSecurity('outward-entry')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          New Sales Gate Dispatch
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice number, customer, vehicle, gate pass..."
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
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Dispatch Date</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Vehicle Number</th>
                <th className="p-3">Gate Pass #</th>
                <th className="p-3 text-right">Quantity (Pcs)</th>
                <th className="p-3">Gate Clearance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900">{item.invoiceNumber}</td>
                  <td className="p-3 text-slate-700">{item.date}</td>
                  <td className="p-3 font-bold text-slate-900">{item.customer}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">{item.vehicle}</td>
                  <td className="p-3 font-mono text-emerald-800 font-semibold">{item.gatePass}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        item.status === 'Dispatched'
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : item.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {item.status}
                    </span>
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
