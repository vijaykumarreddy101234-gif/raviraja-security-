import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  ArrowDownLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  Package,
} from 'lucide-react';
import { InventoryItem } from '../../types/security';

interface CrmInventoryProps {
  inventory: InventoryItem[];
  onNavigateToSecurity: (tab: string) => void;
}

export const CrmInventory: React.FC<CrmInventoryProps> = ({ inventory, onNavigateToSecurity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filtered = inventory.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter || item.type === categoryFilter;
    return matchSearch && matchCat;
  });

  const rawMaterials = inventory.filter((i) => i.type === 'Raw Material');
  const finishedGoods = inventory.filter((i) => i.type === 'Finished Good');
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.reorderLevel);

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Raviraja Plant Inventory & Stock</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              GATE POSTING INTEGRATED
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Raw materials (PVC resin, CPE, TiO2, Stabilizers) and finished UPVC window & door profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToSecurity('inward-entry')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-semibold transition-colors"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Inward Gate Entry
          </button>
          <button
            onClick={() => onNavigateToSecurity('return-material')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Return Stock Intake
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Raw Material Catalog</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{rawMaterials.length} Items</p>
          <span className="text-[10px] text-emerald-600 font-medium">Synchronized with Security Inward</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Finished Goods Profiles</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{finishedGoods.length} Types</p>
          <span className="text-[10px] text-blue-600 font-medium">Dispatched via Security Outward</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{lowStockItems.length} Items</p>
          <span className="text-[10px] text-slate-500 font-medium">At or below reorder threshold</span>
        </div>
      </div>

      {/* Live Sync Banner */}
      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3 text-emerald-900">
        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-xs">Real-Time Security & Inventory Transaction Integration</p>
          <p className="text-[11px] text-emerald-800">
            Whenever Security Supervisors or Admins approve an <strong>Inward Consignment</strong> or perform a <strong>Return Material QC Inspection</strong>, the physical verified quantities are atomically posted into this inventory without manual re-entry.
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search inventory by code, item name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filter Type:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="ALL">All Inventory Items ({inventory.length})</option>
              <option value="Raw Material">Raw Materials</option>
              <option value="Finished Good">Finished Goods</option>
              <option value="PVC Resin">PVC Resin</option>
              <option value="CPE">CPE</option>
              <option value="Titanium Dioxide">Titanium Dioxide</option>
              <option value="Calcium Carbonate">Calcium Carbonate</option>
              <option value="Gasket">Gaskets</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3">Item Code</th>
                <th className="p-3">Item Name & Category</th>
                <th className="p-3">Type</th>
                <th className="p-3">Storage Location</th>
                <th className="p-3 text-right">Current Stock</th>
                <th className="p-3 text-right">Reorder Level</th>
                <th className="p-3">Stock Health</th>
                <th className="p-3 text-right">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isLow = item.currentStock <= item.reorderLevel;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.code}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-500">{item.category}</p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.type === 'Raw Material'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{item.location}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {item.currentStock.toLocaleString()} <span className="text-[10px] font-normal">{item.unit}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {item.reorderLevel.toLocaleString()} {item.unit}
                    </td>
                    <td className="p-3">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Reorder Soon
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> Optimum
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400 text-[10px]">
                      {new Date(item.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
