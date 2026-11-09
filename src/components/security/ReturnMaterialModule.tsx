import React, { useState } from 'react';
import {
  RotateCcw,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  FileSpreadsheet,
  Boxes,
  Camera,
  Layers,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  ReturnEntry,
  ReturnMaterialItem,
  ReturnType,
  MaterialUnit,
  UserProfile,
} from '../../types/security';
import { formatSequenceNumber } from '../../utils/securityLogic';
import { alertDialog } from '../common/Dialogs';
import { confirmVehicle, confirmMobile, normalizeVehicle, normalizeMobile } from '../../utils/validators';
import { useListControls, ListExtras, Pagination, ExportMenu, useExportPdf, downloadCsv, peekListPreset } from '../common/listKit';

interface ReturnMaterialModuleProps {
  returns: ReturnEntry[];
  currentUser: UserProfile;
  onSaveReturn: (entryData: any) => void;
  onApproveReturn: (
    id: string,
    approvedQty: number,
    rejectedQty: number,
    qualityStatus: ReturnEntry['qualityVerification']
  ) => void;
  onPostStock: (id: string) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
}

const RETURN_TYPES: ReturnType[] = ['Customer Return', 'Supplier Return', 'Sales Return', 'Other'];
const UNITS: MaterialUnit[] = ['KG', 'Meters', 'Pieces', 'Boxes', 'Bags', 'Ton'];

export const ReturnMaterialModule: React.FC<ReturnMaterialModuleProps> = ({
  returns,
  currentUser,
  onSaveReturn,
  onApproveReturn,
  onPostStock,
  onOpenVoucher,
}) => {
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => peekListPreset('return')?.status ?? 'ALL');

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedReturnForApproval, setSelectedReturnForApproval] = useState<ReturnEntry | null>(null);
  const [approvalQty, setApprovalQty] = useState<number>(0);
  const [rejectQty, setRejectQty] = useState<number>(0);
  const [qualityVerification, setQualityVerification] = useState<ReturnEntry['qualityVerification']>('Passed');

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    returnType: 'Customer Return' as ReturnType,
    partyName: 'Balaji Window Systems Pvt Ltd',
    originalInvoiceNumber: 'RAVI/INV/26-0390',
    vehicleNumber: 'GJ-01-CZ-3321',
    returnDate: defaultDate,
    returnTime: defaultTime,
    returnAmount: 12000,
    qualityVerification: 'Under Inspection' as ReturnEntry['qualityVerification'],
    remarks: 'Profile length variation reported by client. Under QC inspection.',
  });

  const [materials, setMaterials] = useState<ReturnMaterialItem[]>([
    {
      id: `ret-mat-1`,
      materialName: 'EPDM Co-Extruded Weatherstrip Gasket',
      materialCode: 'RM-GSK-EPDM',
      returnQuantity: 200,
      unit: 'Meters',
      batchNumber: 'GSK-26-90',
      materialCondition: 'Opened / Partially Used',
      returnReason: 'Color shade variation compared to approved drawing',
      photoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60',
    },
  ]);

  const handleAddMaterialRow = () => {
    setMaterials([
      ...materials,
      {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        materialName: '',
        materialCode: 'RM-RET-01',
        returnQuantity: 0,
        unit: 'KG',
        batchNumber: '',
        materialCondition: 'Good / Unopened',
        returnReason: '',
      },
    ]);
  };

  const handleRemoveMaterialRow = (id: string) => {
    if (materials.length <= 1) return;
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const handleMaterialChange = (id: string, field: keyof ReturnMaterialItem, value: any) => {
    setMaterials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName || !formData.vehicleNumber) {
      alertDialog('Please fill party name and vehicle number');
      return;
    }
    if (!(await confirmVehicle(formData.vehicleNumber))) return;

    const totalReturnQty = materials.reduce((s, m) => s + (Number(m.returnQuantity) || 0), 0);

    const payload = {
      ...formData,
      vehicleNumber: normalizeVehicle(formData.vehicleNumber),
      materials,
      receivedBy: currentUser.name,
      verifiedBy: currentUser.name,
      approvedQuantity: 0,
      rejectedQuantity: totalReturnQty,
      status: 'Pending',
      gatePassNumber: '',
    };

    onSaveReturn(payload);
    setActiveView('LIST');
  };

  const handleOpenApproveModal = (entry: ReturnEntry) => {
    setSelectedReturnForApproval(entry);
    const totalQty = entry.materials.reduce((s, m) => s + (Number(m.returnQuantity) || 0), 0);
    setApprovalQty(totalQty);
    setRejectQty(0);
    setQualityVerification('Passed');
    setApproveModalOpen(true);
  };

  const handleConfirmApproval = () => {
    if (selectedReturnForApproval) {
      onApproveReturn(selectedReturnForApproval.id, approvalQty, rejectQty, qualityVerification);
      setApproveModalOpen(false);
      setSelectedReturnForApproval(null);
    }
  };

  const buildExport = () => {
    const headers = [
      'Return #',
      'Date',
      'Type',
      'Party Name',
      'Original Invoice',
      'Vehicle',
      'Material',
      'Total Qty',
      'Approved Qty',
      'Rejected Qty',
      'Quality Check',
      'Stock Posted',
    ];

    const rows = list.all.map((r) => [
      r.returnEntryNumber,
      r.returnDate,
      r.returnType,
      r.partyName,
      r.originalInvoiceNumber,
      r.vehicleNumber,
      r.materials[0]?.materialName || 'Material',
      r.materials.reduce((s, m) => s + (Number(m.returnQuantity) || 0), 0),
      r.approvedQuantity,
      r.rejectedQuantity,
      r.qualityVerification,
      r.stockPosted ? 'YES' : 'NO',
    ]);

    return { headers, rows };
  };

  const handleExportCSV = () => {
    const { headers, rows } = buildExport();
    downloadCsv(`Raviraja_Returns_${defaultDate}.csv`, headers, rows);
  };

  const handleExportPdf = () => {
    const { headers, rows } = buildExport();
    exportPdf('Return Material Register', headers, rows, `Raviraja_Returns_${defaultDate}.pdf`);
  };

  const filteredReturns = returns.filter((r) => {
    const matchSearch =
      r.returnEntryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.originalInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || r.stockStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportPdf = useExportPdf();
  const list = useListControls(filteredReturns, {
    module: 'return',
    dateOf: (r: any) => `${r.returnDate} ${r.returnTime}`,
    defaultSort: 'date',
    sorters: {
      date: { label: 'Return date & time', value: (r) => `${r.returnDate} ${r.returnTime}` },
      number: { label: 'Return number', value: (r) => r.returnEntryNumber },
      party: { label: 'Party', value: (r) => r.partyName },
      vehicle: { label: 'Vehicle number', value: (r) => r.vehicleNumber },
      status: { label: 'QC status', value: (r) => r.status },
      stock: { label: 'Stock status', value: (r) => r.stockStatus },
    },
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Return Material & QC Inspection</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Customer returns, supplier rejections, quality inspection verification & transactional stock replenishment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'LIST' ? (
            <>
              <ExportMenu onCsv={handleExportCSV} onPdf={handleExportPdf} />
              <button
                onClick={() => setActiveView('FORM')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Return Material Entry
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('LIST')}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
            >
              Back to Returns Register
            </button>
          )}
        </div>
      </div>

      {activeView === 'FORM' ? (
        /* RETURN ENTRY FORM */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Return Material Intake
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Create Return Material Entry & Inspection</h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Auto ID: <strong className="text-slate-800">{formatSequenceNumber('RET', returns.length)}</strong>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
            {/* Section A: Return Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  A
                </span>
                Return Details & Original Invoice
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Return Type *</label>
                  <select
                    value={formData.returnType}
                    onChange={(e) => setFormData({ ...formData, returnType: e.target.value as ReturnType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {RETURN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Party (Customer / Supplier) Name *</label>
                  <input
                    type="text"
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    placeholder="e.g. Balaji Window Systems"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Original Invoice Number *</label>
                  <input
                    type="text"
                    value={formData.originalInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, originalInvoiceNumber: e.target.value })}
                    placeholder="e.g. RAVI/INV/26-0390"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="GJ-01-CZ-3321"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Return Date</label>
                    <input
                      type="date"
                      value={formData.returnDate}
                      onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Return Time</label>
                    <input
                      type="time"
                      value={formData.returnTime}
                      onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Estimated Return Value (₹)</label>
                  <input
                    type="number"
                    value={formData.returnAmount || ''}
                    onChange={(e) => setFormData({ ...formData, returnAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="12000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Initial Receiving Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Reason for return as stated by carrier"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Material Rows with Condition & Reason */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                    B
                  </span>
                  Returned Material Details & Condition
                </h3>
                <button
                  type="button"
                  onClick={handleAddMaterialRow}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ADD MATERIAL
                </button>
              </div>

              <div className="space-y-4">
                {materials.map((mat, idx) => (
                  <div key={mat.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-rose-600" />
                        Returned Item #{idx + 1}
                      </span>
                      {materials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialRow(mat.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Name *</label>
                        <input
                          type="text"
                          value={mat.materialName}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialName', e.target.value)}
                          placeholder="e.g. EPDM Gasket"
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Code</label>
                        <input
                          type="text"
                          value={mat.materialCode}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialCode', e.target.value)}
                          placeholder="RM-GSK-EPDM"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Return Quantity *</label>
                        <input
                          type="number"
                          step="any"
                          value={mat.returnQuantity || ''}
                          onChange={(e) => handleMaterialChange(mat.id, 'returnQuantity', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Unit</label>
                        <select
                          value={mat.unit}
                          onChange={(e) => handleMaterialChange(mat.id, 'unit', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Physical Condition</label>
                        <select
                          value={mat.materialCondition}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialCondition', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="Good / Unopened">Good / Unopened</option>
                          <option value="Opened / Partially Used">Opened / Partially Used</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Defective Profile">Defective Profile</option>
                          <option value="Quality Issue">Quality Issue</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Batch Number</label>
                        <input
                          type="text"
                          value={mat.batchNumber}
                          onChange={(e) => handleMaterialChange(mat.id, 'batchNumber', e.target.value)}
                          placeholder="B-26-90"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-semibold mb-1">Reason for Return</label>
                        <input
                          type="text"
                          value={mat.returnReason}
                          onChange={(e) => handleMaterialChange(mat.id, 'returnReason', e.target.value)}
                          placeholder="e.g. Dimensions non-compliant / moisture contamination"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
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
                className="flex items-center gap-1.5 px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                Submit Return for Quality Inspection
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* RETURN REGISTER TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search return #, party name, original invoice, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="ALL">All Statuses ({returns.length})</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Stock Updated">Stock Updated</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <ListExtras list={list} onClearAll={() => { setSearchQuery(''); setStatusFilter('ALL'); }} />
<div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Return #</th>
                  <th className="p-3.5">Type & Date</th>
                  <th className="p-3.5">Party / Customer</th>
                  <th className="p-3.5">Ref Invoice & Vehicle</th>
                  <th className="p-3.5 text-right">Total Returned</th>
                  <th className="p-3.5 text-right">QC Approved</th>
                  <th className="p-3.5">QC Verification</th>
                  <th className="p-3.5">Inventory Stock Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.total === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No return material records found.
                    </td>
                  </tr>
                ) : (
                  list.pageRows.map((entry) => {
                    const totalQty = entry.materials.reduce((s, m) => s + (Number(m.returnQuantity) || 0), 0);
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{entry.returnEntryNumber}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">{entry.returnType}</span>
                          <p className="text-[10px] text-slate-400 font-mono">{entry.returnDate}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{entry.partyName}</td>
                        <td className="p-3.5">
                          <p className="font-mono text-slate-800">{entry.originalInvoiceNumber}</p>
                          <p className="text-[10px] font-mono text-slate-500">{entry.vehicleNumber}</p>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                          {totalQty} {entry.materials[0]?.unit || 'Units'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                          {entry.approvedQuantity} {entry.materials[0]?.unit || 'Units'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              entry.qualityVerification === 'Passed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : entry.qualityVerification === 'Under Inspection'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                          >
                            {entry.qualityVerification}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              entry.stockStatus === 'Stock Updated'
                                ? 'bg-purple-100 text-purple-800 border-purple-200 font-bold'
                                : entry.stockStatus === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {entry.stockStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          {/* Print Gate Pass */}
                          <button
                            onClick={() =>
                              onOpenVoucher('Return Material Gate Pass', entry.returnEntryNumber, 'RETURN', entry)
                            }
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200"
                            title="Print Return Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Supervisor / Admin QC Approval */}
                          {entry.status !== 'Approved' && currentUser.role !== 'SECURITY_STAFF' && (
                            <button
                              onClick={() => handleOpenApproveModal(entry)}
                              className="px-2 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                            >
                              QC Inspection
                            </button>
                          )}

                          {/* POST STOCK TO INVENTORY (CRITICAL) */}
                          {entry.status === 'Approved' && !entry.stockPosted && currentUser.role !== 'SECURITY_STAFF' && (
                            <button
                              onClick={() => onPostStock(entry.id)}
                              className="px-2 py-1 text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors shadow-xs"
                            >
                              Post to Inventory
                            </button>
                          )}

                          {entry.stockPosted && (
                            <span className="text-[10px] font-semibold text-emerald-700">✓ In Stock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination list={list} />
        </div>
      )}

      {/* QC Approval & Quantity Inspection Modal */}
      {approveModalOpen && selectedReturnForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Quality Inspection & Quantity Acceptance
            </h2>
            <p className="text-slate-500 mb-4">
              Return No: <strong className="text-slate-800 font-mono">{selectedReturnForApproval.returnEntryNumber}</strong> ({selectedReturnForApproval.partyName})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Quality Inspection Verdict</label>
                <select
                  value={qualityVerification}
                  onChange={(e) => setQualityVerification(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Passed">Passed (100% Meets Specification)</option>
                  <option value="Conditional Acceptance">Conditional Acceptance (Partial Usable)</option>
                  <option value="Failed">Failed (Total Reject / Scrap)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Approved Quantity (To Stock)</label>
                  <input
                    type="number"
                    step="any"
                    value={approvalQty}
                    onChange={(e) => setApprovalQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Rejected Quantity (Scrap)</label>
                  <input
                    type="number"
                    step="any"
                    value={rejectQty}
                    onChange={(e) => setRejectQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-rose-700 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                <strong>Inventory Safety Rule:</strong> Only the approved quantity of{' '}
                <span className="font-bold">{approvalQty}</span> will be eligible for inventory stock posting. Rejected stock will not affect active counts.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
              >
                Confirm QC Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
