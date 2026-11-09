import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  FileCheck,
  Save,
  Printer,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  ArrowDownLeft,
  FileSpreadsheet,
  Eye,
  Camera,
  Layers,
  LogOut,
  Clock,
  Tag,
  FolderPlus,
  X,
} from 'lucide-react';
import {
  InwardEntry,
  InwardMaterialItem,
  MaterialCategory,
  MaterialUnit,
  UserProfile,
  Supplier,
} from '../../types/security';
import {
  calculateQuantityDifference,
  formatSequenceNumber,
  calculateTurnaroundDuration,
} from '../../utils/securityLogic';
import {
  getSecuritySettings,
  getMaterialCategories,
  saveMaterialCategory,
} from '../../services/storage';
import { alertDialog } from '../common/Dialogs';

interface InwardEntryModuleProps {
  inwards: InwardEntry[];
  suppliers: Supplier[];
  currentUser: UserProfile;
  onSaveInward: (entry: any) => void;
  onApproveInward: (id: string) => void;
  onVerifyInward: (id: string) => void;
  onRejectInward: (id: string, reason: string) => void;
  onRecordExit?: (id: string, exitDate: string, exitTime: string) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
}

const UNITS: MaterialUnit[] = ['KG', 'Bags', 'Pieces', 'Boxes', 'Ton', 'Meters'];

export const InwardEntryModule: React.FC<InwardEntryModuleProps> = ({
  inwards,
  suppliers,
  currentUser,
  onSaveInward,
  onApproveInward,
  onVerifyInward,
  onRejectInward,
  onRecordExit,
  onOpenVoucher,
}) => {
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<InwardEntry | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Vehicle Exit / Gate Out modal state
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitTargetEntry, setExitTargetEntry] = useState<InwardEntry | null>(null);

  // Form State
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [exitModalDate, setExitModalDate] = useState(defaultDate);
  const [exitModalTime, setExitModalTime] = useState(defaultTime);

  // Material Categories State & Add Modal
  const [materialCategories, setMaterialCategories] = useState<string[]>(getMaterialCategories);
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [targetMaterialRowId, setTargetMaterialRowId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCodePrefix, setNewCategoryCodePrefix] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const handleOpenAddCategory = (materialRowId?: string) => {
    setTargetMaterialRowId(materialRowId || null);
    setNewCategoryName('');
    setNewCategoryCodePrefix('RM-');
    setCategoryError('');
    setAddCategoryModalOpen(true);
  };

  const handleSaveNewCategory = (categoryNameToAdd?: string) => {
    const nameToUse = (categoryNameToAdd || newCategoryName).trim();
    if (!nameToUse) {
      setCategoryError('Please enter a category name');
      return;
    }

    const updated = saveMaterialCategory(nameToUse, currentUser);
    setMaterialCategories(updated);

    if (targetMaterialRowId) {
      const cleanPrefix = newCategoryCodePrefix.trim() || `RM-${nameToUse.slice(0, 3).toUpperCase()}`;
      const codePrefix = cleanPrefix.endsWith('-') ? cleanPrefix : `${cleanPrefix}-`;
      const generatedCode = `${codePrefix}${Math.floor(100 + Math.random() * 900)}`;

      setMaterials((prev) =>
        prev.map((item) => {
          if (item.id === targetMaterialRowId) {
            return {
              ...item,
              materialCategory: nameToUse as MaterialCategory,
              materialCode: item.materialCode && !item.materialCode.startsWith('RM-') ? item.materialCode : generatedCode,
            };
          }
          return item;
        })
      );
    }

    setAddCategoryModalOpen(false);
    setNewCategoryName('');
    setNewCategoryCodePrefix('');
    setTargetMaterialRowId(null);
  };

  const [formData, setFormData] = useState({
    supplierName: '',
    supplierCompanyName: '',
    supplierMobileNumber: '',
    supplierAddress: '',
    vehicleNumber: '',
    driverName: '',
    driverMobileNumber: '',
    entryDate: defaultDate,
    entryTime: defaultTime,
    exitDate: '',
    exitTime: '',
    vehicleExitStatus: 'Inside Factory' as 'Inside Factory' | 'Exited',
    invoiceQuantity: 0,
    actualReceivedQuantity: 0,
    differenceRemarks: '',
    documents: {
      invoicePhotoUrl: '',
      materialPhotoUrl: '',
      vehiclePhotoUrl: '',
      weighmentSlipUrl: '',
      otherDocumentUrl: '',
    },
  });

  const [materials, setMaterials] = useState<InwardMaterialItem[]>([
    {
      id: `mat-${Date.now()}`,
      materialName: 'Suspension PVC Resin Grade K-67',
      materialCode: 'RM-PVC-K67',
      materialCategory: 'PVC Resin',
      materialType: 'Virgin Polymer Powder',
      quantityReceived: 5000,
      unit: 'KG',
      numberOfPackages: 200,
      batchNumber: 'LOT-2601',
      materialDescription: 'Standard 25kg multi-wall paper bags with plastic liner',
    },
  ]);

  // Handle supplier prefill
  const handleSupplierSelect = (companyName: string) => {
    const supp = suppliers.find((s) => s.company === companyName);
    if (supp) {
      setFormData((prev) => ({
        ...prev,
        supplierCompanyName: supp.company,
        supplierName: supp.name,
        supplierMobileNumber: supp.phone,
        supplierAddress: supp.address,
      }));
    } else {
      setFormData((prev) => ({ ...prev, supplierCompanyName: companyName }));
    }
  };

  const handleAddMaterialRow = () => {
    const newRow: InwardMaterialItem = {
      id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      materialName: '',
      materialCode: '',
      materialCategory: 'PVC Resin',
      materialType: '',
      quantityReceived: 0,
      unit: 'KG',
      numberOfPackages: 0,
      batchNumber: '',
      materialDescription: '',
    };
    setMaterials([...materials, newRow]);
  };

  const handleRemoveMaterialRow = (id: string) => {
    if (materials.length <= 1) return;
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const handleMaterialChange = (id: string, field: keyof InwardMaterialItem, value: any) => {
    setMaterials((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // If category changes, set code prefix suggestion
          if (field === 'materialCategory') {
            updated.materialCode = `RM-${String(value).slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Auto calculate sum of received materials
  const totalItemsReceived = materials.reduce((sum, m) => sum + (Number(m.quantityReceived) || 0), 0);
  const diffCalc = calculateQuantityDifference(formData.invoiceQuantity, totalItemsReceived);

  // Form submission
  const handleSubmit = (isDraft: boolean = false) => {
    if (!formData.supplierCompanyName) {
      alertDialog('Please enter or select a Supplier Company Name');
      return;
    }
    if (!formData.vehicleNumber) {
      alertDialog('Please enter Vehicle Number');
      return;
    }

    const payload = {
      ...formData,
      materials,
      invoiceQuantity: Number(formData.invoiceQuantity) || totalItemsReceived,
      actualReceivedQuantity: totalItemsReceived,
      shortageQuantity: diffCalc.shortage,
      excessQuantity: diffCalc.excess,
      differenceRemarks: formData.differenceRemarks || diffCalc.differenceRemarks,
      verifiedBy: currentUser.name,
      status: isDraft ? 'Pending' : 'Pending',
      isDraft,
      vehicleExitStatus: formData.exitTime ? 'Exited' : (formData.vehicleExitStatus || 'Inside Factory'),
      gatePassNumber: '',
    };

    onSaveInward(payload);
    setActiveView('LIST');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Inward No',
      'Entry Date',
      'Entry Time',
      'Exit Date',
      'Exit Time',
      'Turnaround Duration',
      'Supplier Company',
      'Supplier Contact',
      'Vehicle Number',
      'Driver Name',
      'Invoice Qty',
      'Received Qty',
      'Shortage Qty',
      'Excess Qty',
      'Status',
      'Vehicle Gate Status',
      'Verified By',
      'Stock Posted',
    ];

    const rows = inwards.map((i) => {
      const duration = i.exitTime
        ? calculateTurnaroundDuration(i.entryDate, i.entryTime, i.exitDate, i.exitTime)
        : 'In Plant';
      return [
        i.inwardEntryNumber,
        i.entryDate,
        i.entryTime,
        i.exitDate || '-',
        i.exitTime || '-',
        duration,
        `"${i.supplierCompanyName}"`,
        i.supplierMobileNumber,
        i.vehicleNumber,
        `"${i.driverName}"`,
        i.invoiceQuantity,
        i.actualReceivedQuantity,
        i.shortageQuantity,
        i.excessQuantity,
        i.status,
        i.vehicleExitStatus || (i.exitTime ? 'Exited' : 'Inside Factory'),
        `"${i.verifiedBy}"`,
        i.stockPosted ? 'YES' : 'NO',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raviraja_Inward_Register_${defaultDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered entries
  const filteredInwards = inwards.filter((item) => {
    const matchSearch =
      item.inwardEntryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierCompanyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Raw Material Inward Entry Module</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Weighbridge, supplier invoice reconciliation, physical QC inspection & auto-inventory posting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'LIST' ? (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export Excel/CSV
              </button>
              <button
                onClick={() => setActiveView('FORM')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Inward Entry
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('LIST')}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Back to Inward Register
            </button>
          )}
        </div>
      </div>

      {activeView === 'FORM' ? (
        /* INWARD FORM */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Raw Material Gate Inward
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Create Inward Consignment Record</h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Auto ID: <strong className="text-slate-800">{formatSequenceNumber('INW', inwards.length)}</strong>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
            className="p-6 space-y-8"
          >
            {/* Section A: Basic Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  A
                </span>
                Basic Supplier & Logistics Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Company Name *</label>
                  <input
                    type="text"
                    list="supplier-list"
                    value={formData.supplierCompanyName}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    placeholder="e.g. Reliance Industries Limited"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-emerald-500 text-xs"
                  />
                  <datalist id="supplier-list">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.company} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Contact Person</label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    placeholder="e.g. Anil Agarwal"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Mobile Number</label>
                  <input
                    type="text"
                    value={formData.supplierMobileNumber}
                    onChange={(e) => setFormData({ ...formData, supplierMobileNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Plant Address</label>
                  <input
                    type="text"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                    placeholder="Plot / GIDC / City / State"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. GJ-16-AX-8912"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Driver Name *</label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Driver full name"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Driver Mobile Number</label>
                  <input
                    type="text"
                    value={formData.driverMobileNumber}
                    onChange={(e) => setFormData({ ...formData, driverMobileNumber: e.target.value })}
                    placeholder="+91 99999 88888"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Entry Date *</label>
                    <input
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      required
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Entry Time *</label>
                    <input
                      type="time"
                      value={formData.entryTime}
                      onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                      required
                      className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Exit Date <span className="text-[10px] text-slate-400 font-normal">(Departure)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.exitDate}
                      onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Exit Time <span className="text-[10px] text-slate-400 font-normal">(Departure)</span>
                    </label>
                    <input
                      type="time"
                      value={formData.exitTime}
                      onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section B & C: Material Details with 14 Categories */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                    B
                  </span>
                  Raw Material Item Details (Multi-Item)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddCategory()}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-colors"
                    title="Add custom Material Category to system"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                    + Add Category
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ADD MATERIAL
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {materials.map((mat, index) => (
                  <div
                    key={mat.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        Material Item #{index + 1}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Name *</label>
                        <input
                          type="text"
                          value={mat.materialName}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialName', e.target.value)}
                          placeholder="e.g. PVC Resin K-67"
                          required
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-600 font-semibold flex items-center gap-1">
                            <span>Material Category</span>
                            <span className="text-[10px] text-slate-400 font-normal">({materialCategories.length})</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenAddCategory(mat.id)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            title="Add new category"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={mat.materialCategory}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                handleOpenAddCategory(mat.id);
                              } else {
                                handleMaterialChange(mat.id, 'materialCategory', e.target.value);
                              }
                            }}
                            className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          >
                            {materialCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option disabled value="">──────────────</option>
                            <option value="__ADD_NEW__" className="text-emerald-700 font-bold bg-emerald-50">
                              + Add New Category...
                            </option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleOpenAddCategory(mat.id)}
                            className="shrink-0 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs hover:border-emerald-400 cursor-pointer"
                            title="Add new material category"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Code</label>
                        <input
                          type="text"
                          value={mat.materialCode}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialCode', e.target.value)}
                          placeholder="RM-PVC-K67"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Material Type</label>
                        <input
                          type="text"
                          value={mat.materialType}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialType', e.target.value)}
                          placeholder="Virgin / Compound / Regrind"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Quantity Received *</label>
                        <input
                          type="number"
                          step="any"
                          value={mat.quantityReceived || ''}
                          onChange={(e) => handleMaterialChange(mat.id, 'quantityReceived', parseFloat(e.target.value) || 0)}
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
                        <label className="block text-slate-600 font-semibold mb-1">No. of Packages / Bags</label>
                        <input
                          type="number"
                          value={mat.numberOfPackages || ''}
                          onChange={(e) => handleMaterialChange(mat.id, 'numberOfPackages', parseInt(e.target.value) || 0)}
                          placeholder="e.g. 200 bags"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Batch / Lot Number</label>
                        <input
                          type="text"
                          value={mat.batchNumber}
                          onChange={(e) => handleMaterialChange(mat.id, 'batchNumber', e.target.value)}
                          placeholder="e.g. B-2026-90"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className="block text-slate-600 font-semibold mb-1">Material Description</label>
                        <input
                          type="text"
                          value={mat.materialDescription}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialDescription', e.target.value)}
                          placeholder="Packaging details, manufacturer brand, pallet condition..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section D: Documents & Photos Upload */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  D
                </span>
                Inspection Photos & Weighment Documents
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                {[
                  {
                    key: 'invoicePhotoUrl',
                    label: 'Supplier Invoice Photo',
                    sample:
                      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'materialPhotoUrl',
                    label: 'Material Photo',
                    sample:
                      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'vehiclePhotoUrl',
                    label: 'Vehicle Number Plate Photo',
                    sample:
                      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'weighmentSlipUrl',
                    label: 'Weighment Scale Slip',
                    sample:
                      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'otherDocumentUrl',
                    label: 'Other Documents / E-Way Bill',
                    sample:
                      'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=60',
                  },
                ].map((doc) => {
                  const currentVal = (formData.documents as any)[doc.key];
                  return (
                    <div key={doc.key} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <span className="block font-semibold text-slate-700 text-[11px] mb-2 truncate" title={doc.label}>
                        {doc.label}
                      </span>
                      {currentVal ? (
                        <div className="space-y-1.5">
                          <img
                            src={currentVal}
                            alt={doc.label}
                            className="w-full h-18 object-cover rounded border border-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                documents: { ...formData.documents, [doc.key]: '' },
                              })
                            }
                            className="text-[10px] text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-md p-2 transition-colors">
                            <Camera className="w-5 h-5 mx-auto text-slate-400" />
                            <span className="text-[10px] text-slate-500 mt-1 block">Upload / Snap</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setFormData({
                                      ...formData,
                                      documents: { ...formData.documents, [doc.key]: reader.result as string },
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                documents: { ...formData.documents, [doc.key]: doc.sample },
                              })
                            }
                            className="text-[9px] text-emerald-600 hover:underline block mx-auto"
                          >
                            + Quick Sample
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section E: Quantity Verification & Discrepancy */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  E
                </span>
                Quantity Reconciliation (Invoice vs Actual Weighment)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Invoice Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.invoiceQuantity || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceQuantity: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 5000"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Actual Received (From Items)</label>
                  <input
                    type="number"
                    readOnly
                    value={totalItemsReceived}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Shortage Quantity</label>
                  <div
                    className={`px-3 py-2 rounded-lg font-mono font-bold border ${
                      diffCalc.shortage > 0 ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {diffCalc.shortage} Units
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Excess Quantity</label>
                  <div
                    className={`px-3 py-2 rounded-lg font-mono font-bold border ${
                      diffCalc.excess > 0 ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {diffCalc.excess} Units
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-600 font-semibold mb-1">Difference Remarks / Weighbridge Note</label>
                  <input
                    type="text"
                    value={formData.differenceRemarks}
                    onChange={(e) => setFormData({ ...formData, differenceRemarks: e.target.value })}
                    placeholder={diffCalc.differenceRemarks}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Verified By Gate Officer</label>
                  <input
                    type="text"
                    readOnly
                    value={currentUser.name}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveView('LIST')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Submit Inward Consignment
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* INWARD REGISTER TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search inward #, supplier, vehicle, driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Statuses ({inwards.length})</option>
                <option value="Pending">Pending</option>
                <option value="Verified">Verified</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Inward #</th>
                  <th className="p-3.5">Gate Entry</th>
                  <th className="p-3.5">Gate Exit & Turnaround</th>
                  <th className="p-3.5">Supplier Details</th>
                  <th className="p-3.5">Vehicle & Driver</th>
                  <th className="p-3.5">Materials</th>
                  <th className="p-3.5 text-right">Recv Qty</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Stock Sync</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInwards.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                      No inward consignment entries found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInwards.map((entry) => {
                    const isExited = entry.vehicleExitStatus === 'Exited' || !!entry.exitTime;
                    const turnaround = isExited
                      ? calculateTurnaroundDuration(entry.entryDate, entry.entryTime, entry.exitDate, entry.exitTime)
                      : null;

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{entry.inwardEntryNumber}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">{entry.entryDate}</span>
                          <p className="text-[10px] text-slate-400 font-mono">{entry.entryTime}</p>
                        </td>
                        <td className="p-3.5">
                          {isExited ? (
                            <div>
                              <span className="font-semibold text-slate-800">{entry.exitDate || entry.entryDate}</span>
                              <p className="text-[10px] text-slate-500 font-mono">{entry.exitTime}</p>
                              {turnaround && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                                  {turnaround}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Inside Plant
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">{entry.supplierCompanyName}</p>
                          <p className="text-[11px] text-slate-500">{entry.supplierName}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {entry.vehicleNumber}
                          </span>
                          <p className="text-[11px] text-slate-600 mt-0.5">{entry.driverName}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-medium text-slate-900 truncate max-w-[160px]">
                            {entry.materials[0]?.materialName || 'Raw Material'}
                          </p>
                          {entry.materials.length > 1 && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                              +{entry.materials.length - 1} more items
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {entry.actualReceivedQuantity} KG
                          {entry.shortageQuantity > 0 && (
                            <p className="text-[10px] text-rose-600 font-normal">(-{entry.shortageQuantity} short)</p>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              entry.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : entry.status === 'Verified'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : entry.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {entry.stockPosted ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Updated
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          {/* Printable Voucher */}
                          <button
                            onClick={() =>
                              onOpenVoucher('Raw Material Inward Voucher', entry.inwardEntryNumber, 'INWARD', entry)
                            }
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                            title="Print Inward Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Record Vehicle Exit / Gate Out */}
                          {!isExited && onRecordExit && (
                            <button
                              onClick={() => {
                                setExitTargetEntry(entry);
                                const nowInst = new Date();
                                const todayI = nowInst.toISOString().split('T')[0];
                                const timeI = `${String(nowInst.getHours()).padStart(2, '0')}:${String(nowInst.getMinutes()).padStart(2, '0')}`;
                                setExitModalDate(todayI);
                                setExitModalTime(timeI);
                                setExitModalOpen(true);
                              }}
                              className="px-2 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded transition-colors inline-flex items-center gap-1"
                              title="Record Vehicle Gate Out & Departure"
                            >
                              <LogOut className="w-3 h-3 text-amber-400" />
                              Gate Out
                            </button>
                          )}

                          {/* Supervisor Verification */}
                          {entry.status === 'Pending' && (
                            <button
                              onClick={() => onVerifyInward(entry.id)}
                              className="px-2 py-1 text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Verify
                            </button>
                          )}

                          {/* Admin / Supervisor Approval */}
                          {entry.status !== 'Approved' && currentUser.role !== 'SECURITY_STAFF' && (
                            <button
                              onClick={() => onApproveInward(entry.id)}
                              className="px-2 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                            >
                              Approve
                            </button>
                          )}

                          {/* Reject Inward */}
                          {entry.status !== 'Approved' &&
                            entry.status !== 'Rejected' &&
                            currentUser.role !== 'SECURITY_STAFF' && (
                              <button
                                onClick={() => {
                                  setRejectTargetId(entry.id);
                                  setRejectModalOpen(true);
                                }}
                                className="px-2 py-1 text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                              >
                                Reject
                              </button>
                            )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vehicle Exit / Gate Out Modal */}
      {exitModalOpen && exitTargetEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
              <LogOut className="w-5 h-5 text-emerald-600" />
              <span>Record Vehicle Exit / Gate Out</span>
            </div>
            <p className="text-slate-600 mb-4">
              Confirm vehicle unloading completion and capture official gate departure date and time:
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Inward Entry:</span>
                <span className="font-mono font-bold text-slate-800">{exitTargetEntry.inwardEntryNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle / Driver:</span>
                <span className="font-bold text-slate-800">{exitTargetEntry.vehicleNumber} ({exitTargetEntry.driverName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="text-slate-800 truncate max-w-[220px]">{exitTargetEntry.supplierCompanyName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-500">Gate In:</span>
                <span className="font-mono text-slate-700 font-semibold">{exitTargetEntry.entryDate} at {exitTargetEntry.entryTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exit Date *</label>
                <input
                  type="date"
                  value={exitModalDate}
                  onChange={(e) => setExitModalDate(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exit Time *</label>
                <input
                  type="time"
                  value={exitModalTime}
                  onChange={(e) => setExitModalTime(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>
            </div>

            {exitModalDate && exitModalTime && (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 mb-4 text-[11px] flex items-center justify-between">
                <span>Calculated Turnaround:</span>
                <strong className="font-mono text-xs">
                  {calculateTurnaroundDuration(exitTargetEntry.entryDate, exitTargetEntry.entryTime, exitModalDate, exitModalTime)}
                </strong>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setExitModalOpen(false);
                  setExitTargetEntry(null);
                }}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exitTargetEntry && exitModalDate && exitModalTime) {
                    onRecordExit?.(exitTargetEntry.id, exitModalDate, exitModalTime);
                    setExitModalOpen(false);
                    setExitTargetEntry(null);
                  }
                }}
                disabled={!exitModalDate || !exitModalTime}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Gate Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm mb-2">
              <XCircle className="w-5 h-5" />
              <span>Confirm Inward Rejection</span>
            </div>
            <p className="text-slate-600 mb-4">
              Please provide reasons for rejecting this consignment (e.g. wet packages, severe shortage, unsealed gate, QC failure):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectTargetId && rejectReason.trim()) {
                    onRejectInward(rejectTargetId, rejectReason.trim());
                    setRejectModalOpen(false);
                    setRejectReason('');
                  }
                }}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                Reject Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Material Category Modal */}
      {addCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Add New Material Category</h3>
                  <p className="text-[11px] text-slate-500">Create custom category for Raviraja CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (categoryError) setCategoryError('');
                    const words = e.target.value.trim().split(/\s+/);
                    const prefix = words.map(w => w.slice(0, 3).toUpperCase()).join('');
                    if (prefix) {
                      setNewCategoryCodePrefix(`RM-${prefix.slice(0, 4)}-`);
                    }
                  }}
                  placeholder="e.g. Impact Modifier, Masterbatch, Optical Brightener"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
                {categoryError && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{categoryError}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Item Code Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={newCategoryCodePrefix}
                  onChange={(e) => setNewCategoryCodePrefix(e.target.value)}
                  placeholder="e.g. RM-IMP-"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Used for auto-generating material codes like RM-IMP-101</p>
              </div>

              {/* Quick Suggestions */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1.5 text-[11px]">
                  Common Industry Categories:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Impact Modifier',
                    'Masterbatch',
                    'Optical Brightener',
                    'Stearic Acid',
                    'Zinc Stearate',
                    'Solvent Cement',
                    'Acrylic Foam Tape',
                    'Purging Compound',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setNewCategoryName(suggestion);
                        setNewCategoryCodePrefix(`RM-${suggestion.slice(0, 3).toUpperCase()}-`);
                        setCategoryError('');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-md text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-5 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                {targetMaterialRowId ? 'Will auto-select on active item' : 'Will be saved to system catalog'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddCategoryModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewCategory()}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Save &amp; Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
