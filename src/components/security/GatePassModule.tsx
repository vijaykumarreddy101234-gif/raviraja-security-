import React, { useState } from 'react';
import {
  QrCode,
  Printer,
  Download,
  Search,
  Plus,
  FileSpreadsheet,
  CheckCircle,
  Eye,
  Shield,
  Layers,
} from 'lucide-react';
import { GatePass, GatePassType, UserProfile } from '../../types/security';
import { QrCodeView } from '../common/QrCodeView';
import { formatSequenceNumber } from '../../utils/securityLogic';

interface GatePassModuleProps {
  gatePasses: GatePass[];
  currentUser: UserProfile;
  onSaveGatePass: (pass: any) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
}

const GATE_PASS_TYPES: GatePassType[] = ['Inward', 'Outward', 'Return', 'Visitor'];

export const GatePassModule: React.FC<GatePassModuleProps> = ({
  gatePasses,
  currentUser,
  onSaveGatePass,
  onOpenVoucher,
}) => {
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    type: 'Outward' as GatePassType,
    companyName: 'Shree Ganesh UPVC Doors & Windows',
    personName: 'Kishore J. Parmar (Driver)',
    vehicleNumber: 'GJ-03-AX-5544',
    materialDetails: 'UPVC Casement Outer Frame 60mm & Sliding Sash 88mm Profiles',
    quantity: '280 Pieces (28 Bundles)',
    referenceInvoiceNumber: 'RAVI/INV/26-0505',
    approvedBy: 'Sanjay S. Verma (Security Supervisor)',
    remarks: 'Gate inspection completed. Seals verified on truck.',
    date: defaultDate,
    time: defaultTime,
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.vehicleNumber) {
      alert('Please fill company and vehicle number');
      return;
    }

    const nextPassNum = formatSequenceNumber('GP', gatePasses.length);

    const payload = {
      ...formData,
      gatePassNumber: nextPassNum,
      securityStaffName: currentUser.name,
      qrPayload: `RAVIRAJA-GP|${nextPassNum}|${formData.vehicleNumber}|${formData.companyName}`,
      status: 'Active',
    };

    onSaveGatePass(payload);
    setActiveView('LIST');
  };

  const handleExportCSV = () => {
    const headers = [
      'Gate Pass #',
      'Date',
      'Time',
      'Type',
      'Company Name',
      'Person Name',
      'Vehicle Number',
      'Materials',
      'Quantity',
      'Ref Invoice',
      'Issued By',
      'Approved By',
      'Status',
    ];

    const rows = gatePasses.map((gp) => [
      gp.gatePassNumber,
      gp.date,
      gp.time,
      gp.type,
      `"${gp.companyName}"`,
      `"${gp.personName}"`,
      gp.vehicleNumber,
      `"${gp.materialDetails}"`,
      `"${gp.quantity}"`,
      gp.referenceInvoiceNumber,
      `"${gp.securityStaffName}"`,
      `"${gp.approvedBy}"`,
      gp.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raviraja_GatePass_Register_${defaultDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredGatePasses = gatePasses.filter((gp) => {
    const matchSearch =
      gp.gatePassNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.referenceInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === 'ALL' || gp.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Gate Pass Register & Verification</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Universal gate pass tracking for Inward, Outward, Return and Visitors with encrypted QR verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'LIST' ? (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Export CSV
              </button>
              <button
                onClick={() => setActiveView('FORM')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Generate Gate Pass
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('LIST')}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
            >
              Back to Gate Passes
            </button>
          )}
        </div>
      </div>

      {activeView === 'FORM' ? (
        /* CREATE GATE PASS FORM */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                Official Gate Document
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Issue Plant Gate Pass</h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Auto ID: <strong className="text-slate-800">{formatSequenceNumber('GP', gatePasses.length)}</strong>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Gate Pass Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as GatePassType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {GATE_PASS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company / Party Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Shree Ganesh UPVC"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Carrier / Person Name *</label>
                <input
                  type="text"
                  value={formData.personName}
                  onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                  placeholder="Driver / Visitor Name"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="GJ-03-AX-5544"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Material Particulars *</label>
                <input
                  type="text"
                  value={formData.materialDetails}
                  onChange={(e) => setFormData({ ...formData, materialDetails: e.target.value })}
                  placeholder="Detailed material or item description"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Quantity / Packages *</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g. 280 Pieces (28 Bundles)"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reference Invoice / Challan Number</label>
                <input
                  type="text"
                  value={formData.referenceInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceInvoiceNumber: e.target.value })}
                  placeholder="RAVI/INV/26-0505"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Authorized Approver Name</label>
                <input
                  type="text"
                  value={formData.approvedBy}
                  onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Security Gate Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveView('LIST')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <QrCode className="w-4 h-4" />
                Issue Gate Pass & Generate QR
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* GATE PASS TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search gate pass #, company, vehicle, driver, invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">All Types ({gatePasses.length})</option>
                <option value="Inward">Inward</option>
                <option value="Outward">Outward</option>
                <option value="Return">Return</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">QR</th>
                  <th className="p-3.5">Gate Pass #</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Company / Carrier</th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Materials / Quantity</th>
                  <th className="p-3.5">Ref Invoice</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGatePasses.map((gp) => (
                  <tr key={gp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <QrCodeView value={gp.qrPayload} size={28} />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{gp.gatePassNumber}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          gp.type === 'Inward'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : gp.type === 'Outward'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : gp.type === 'Return'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-teal-100 text-teal-800 border-teal-200'
                        }`}
                      >
                        {gp.type}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{gp.date}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{gp.time}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 truncate max-w-[170px]">{gp.companyName}</p>
                      <p className="text-[11px] text-slate-500">{gp.personName}</p>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{gp.vehicleNumber}</td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-900 truncate max-w-[180px]">{gp.materialDetails}</p>
                      <p className="text-[11px] text-emerald-700 font-mono">{gp.quantity}</p>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{gp.referenceInvoiceNumber}</td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onOpenVoucher(`Official ${gp.type} Gate Pass`, gp.gatePassNumber, 'GATE_PASS', gp)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold border border-slate-300 flex items-center gap-1 ml-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Pass
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
