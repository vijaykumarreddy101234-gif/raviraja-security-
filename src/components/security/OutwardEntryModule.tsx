import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle,
  Truck,
  ArrowUpRight,
  Search,
  Camera,
  Layers,
  Save,
  ShieldCheck,
} from 'lucide-react';
import {
  OutwardEntry,
  OutwardMaterialItem,
  MaterialUnit,
  UserProfile,
  Customer,
} from '../../types/security';
import { formatSequenceNumber } from '../../utils/securityLogic';
import { alertDialog } from '../common/Dialogs';
import { confirmVehicle, confirmMobile, normalizeVehicle, normalizeMobile } from '../../utils/validators';
import { useListControls, ListExtras, Pagination, ExportMenu, useExportPdf, downloadCsv, peekListPreset } from '../common/listKit';

interface OutwardEntryModuleProps {
  outwards: OutwardEntry[];
  customers: Customer[];
  currentUser: UserProfile;
  onSaveOutward: (entry: any) => void;
  onUpdateStatus: (id: string, status: any, remarks?: string) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
}

const UNITS: MaterialUnit[] = ['Pieces', 'Boxes', 'KG', 'Bags', 'Ton', 'Meters'];

export const OutwardEntryModule: React.FC<OutwardEntryModuleProps> = ({
  outwards,
  customers,
  currentUser,
  onSaveOutward,
  onUpdateStatus,
  onOpenVoucher,
}) => {
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => peekListPreset('outward')?.status ?? 'ALL');

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    customerName: '',
    customerCompanyName: '',
    customerMobileNumber: '',
    customerAddress: '',
    gstNumber: '',
    vehicleNumber: '',
    driverName: '',
    driverMobileNumber: '',
    dispatchDate: defaultDate,
    dispatchTime: defaultTime,
    salesInvoiceNumber: 'RAVI/INV/26-0501',
    dispatchPurpose: 'Finished Goods Sales Delivery',
    transportName: 'Shree Patel Goods Transport',
    destination: 'Rajkot Main Depot',
    invoiceVerification: true,
    vehicleNumberVerification: true,
    materialQuantityVerification: true,
    securityRemarks: 'Material counting verified at loading bay. Seals intact.',
    documents: {
      salesInvoiceUrl: '',
      gatePassUrl: '',
      vehiclePhotoUrl: '',
      materialLoadingPhotoUrl: '',
      otherDocumentUrl: '',
    },
  });

  const [materials, setMaterials] = useState<OutwardMaterialItem[]>([
    {
      id: `out-mat-1`,
      materialName: '60mm 3-Chamber Casement Window Frame (Brilliant White)',
      materialCode: 'FG-60-FRAME',
      quantity: 100,
      unit: 'Pieces',
      numberOfPackages: 10,
      batchNumber: 'FG-LOT-901',
      description: '10 bundles of 10 profiles each with protective film',
    },
  ]);

  const handleCustomerSelect = (companyName: string) => {
    const cust = customers.find((c) => c.company === companyName);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerCompanyName: cust.company,
        customerName: cust.name,
        customerMobileNumber: cust.phone,
        customerAddress: cust.address,
        gstNumber: cust.gstNumber,
      }));
    } else {
      setFormData((prev) => ({ ...prev, customerCompanyName: companyName }));
    }
  };

  const handleAddMaterialRow = () => {
    setMaterials([
      ...materials,
      {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        materialName: '',
        materialCode: 'FG-PRO-01',
        quantity: 0,
        unit: 'Pieces',
        numberOfPackages: 0,
        batchNumber: '',
        description: '',
      },
    ]);
  };

  const handleRemoveMaterialRow = (id: string) => {
    if (materials.length <= 1) return;
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const handleMaterialChange = (id: string, field: keyof OutwardMaterialItem, value: any) => {
    setMaterials((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!formData.customerCompanyName) {
      alertDialog('Please select or enter customer company name');
      return;
    }
    if (!formData.vehicleNumber) {
      alertDialog('Please enter vehicle number');
      return;
    }
    const queued = outwards.filter((o) => o.status !== 'Dispatched' && o.status !== 'Rejected').map((o) => o.vehicleNumber);
    if (!(await confirmVehicle(formData.vehicleNumber, queued, 'the dispatch queue'))) return;

    const payload = {
      ...formData,
      vehicleNumber: normalizeVehicle(formData.vehicleNumber),
      materials,
      verifiedBy: currentUser.name,
      status: isDraft ? 'Pending' : 'Ready for Dispatch',
      isDraft,
    };

    onSaveOutward(payload);
    setActiveView('LIST');
  };

  const buildExport = () => {
    const headers = [
      'Outward No',
      'Date',
      'Time',
      'Customer',
      'GST',
      'Vehicle',
      'Driver',
      'Sales Invoice',
      'Gate Pass',
      'Total Items',
      'Status',
      'Verified By',
    ];

    const rows = list.all.map((o) => [
      o.outwardEntryNumber,
      o.dispatchDate,
      o.dispatchTime,
      o.customerCompanyName,
      o.gstNumber,
      o.vehicleNumber,
      o.driverName,
      o.salesInvoiceNumber,
      o.gatePassNumber,
      o.materials.reduce((s, m) => s + (Number(m.quantity) || 0), 0),
      o.status,
      o.verifiedBy,
    ]);

    return { headers, rows };
  };

  const handleExportCSV = () => {
    const { headers, rows } = buildExport();
    downloadCsv(`Raviraja_Outward_Register_${defaultDate}.csv`, headers, rows);
  };

  const handleExportPdf = () => {
    const { headers, rows } = buildExport();
    exportPdf('Outward Dispatch Register', headers, rows, `Raviraja_Outward_Register_${defaultDate}.pdf`);
  };

  const filteredOutwards = outwards.filter((item) => {
    const matchSearch =
      item.outwardEntryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerCompanyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.salesInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.gatePassNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportPdf = useExportPdf();
  const list = useListControls(filteredOutwards, {
    module: 'outward',
    dateOf: (r: any) => `${r.dispatchDate} ${r.dispatchTime}`,
    defaultSort: 'date',
    sorters: {
      date: { label: 'Dispatch date & time', value: (r) => `${r.dispatchDate} ${r.dispatchTime}` },
      number: { label: 'Outward number', value: (r) => r.outwardEntryNumber },
      customer: { label: 'Customer', value: (r) => r.customerCompanyName },
      vehicle: { label: 'Vehicle number', value: (r) => r.vehicleNumber },
      qty: { label: 'Total quantity', value: (r) => r.materials.reduce((s: number, m: any) => s + (Number(m.quantity) || 0), 0) },
      status: { label: 'Status', value: (r) => r.status },
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Sales Dispatch & Outward Entry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Finished UPVC profiles, pipes and deliveries gate clearance, barcode gate pass verification & vehicle dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'LIST' ? (
            <>
              <ExportMenu onCsv={handleExportCSV} onPdf={handleExportPdf} />
              <button
                onClick={() => setActiveView('FORM')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Outward Dispatch
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('LIST')}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Back to Outward Register
            </button>
          )}
        </div>
      </div>

      {activeView === 'FORM' ? (
        /* OUTWARD DISPATCH FORM */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Outward Gate Pass & Dispatch
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Create Finished Goods Sales Dispatch</h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Auto ID: <strong className="text-slate-800">{formatSequenceNumber('OUT', outwards.length)}</strong>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
            className="p-6 space-y-8 text-xs"
          >
            {/* Section A: Dispatch Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  A
                </span>
                Customer & Transport Logistics Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Customer / Dealer Company *</label>
                  <input
                    type="text"
                    list="customer-list"
                    value={formData.customerCompanyName}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    placeholder="e.g. Shree Ganesh UPVC Doors"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 text-xs"
                  />
                  <datalist id="customer-list">
                    {customers.map((c) => (
                      <option key={c.id} value={c.company} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Mahesh B. Sanghvi"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Customer Mobile Number</label>
                  <input
                    type="text"
                    value={formData.customerMobileNumber}
                    onChange={(e) => setFormData({ ...formData, customerMobileNumber: e.target.value })}
                    placeholder="+91 98250 11223"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Customer Delivery Address</label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    placeholder="Delivery site / showroom address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Customer GST Number</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AABCS4455F1Z2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. GJ-03-AX-5544"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
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
                    placeholder="+91 98790 33445"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Dispatch Information */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  B
                </span>
                Dispatch & Transport Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sales Invoice Number *</label>
                  <input
                    type="text"
                    value={formData.salesInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, salesInvoiceNumber: e.target.value })}
                    placeholder="RAVI/INV/26-0501"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Dispatch Purpose</label>
                  <input
                    type="text"
                    value={formData.dispatchPurpose}
                    onChange={(e) => setFormData({ ...formData, dispatchPurpose: e.target.value })}
                    placeholder="e.g. Sales Delivery / Sample"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Transporter Name</label>
                  <input
                    type="text"
                    value={formData.transportName}
                    onChange={(e) => setFormData({ ...formData, transportName: e.target.value })}
                    placeholder="e.g. Shree Patel Goods Transport"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Destination City / Site</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. Rajkot / Vadodara / Surat"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Material Details */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                    C
                  </span>
                  Outward Material Particulars (Multi-Item)
                </h3>
                <button
                  type="button"
                  onClick={handleAddMaterialRow}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ADD MATERIAL
                </button>
              </div>

              <div className="space-y-4">
                {materials.map((mat, index) => (
                  <div key={mat.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        Dispatched Item #{index + 1}
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
                      <div className="lg:col-span-2">
                        <label className="block text-slate-600 font-semibold mb-1">Material Name *</label>
                        <input
                          type="text"
                          value={mat.materialName}
                          onChange={(e) => handleMaterialChange(mat.id, 'materialName', e.target.value)}
                          placeholder="e.g. 60mm Casement Outer Frame"
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
                          placeholder="FG-60-FRAME"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Quantity *</label>
                        <input
                          type="number"
                          step="any"
                          value={mat.quantity || ''}
                          onChange={(e) => handleMaterialChange(mat.id, 'quantity', parseFloat(e.target.value) || 0)}
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
                        <label className="block text-slate-600 font-semibold mb-1">No. of Bundles / Packages</label>
                        <input
                          type="number"
                          value={mat.numberOfPackages || ''}
                          onChange={(e) => handleMaterialChange(mat.id, 'numberOfPackages', parseInt(e.target.value) || 0)}
                          placeholder="10"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Lot / Batch Number</label>
                        <input
                          type="text"
                          value={mat.batchNumber}
                          onChange={(e) => handleMaterialChange(mat.id, 'batchNumber', e.target.value)}
                          placeholder="FG-LOT-901"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Packaging Description</label>
                        <input
                          type="text"
                          value={mat.description}
                          onChange={(e) => handleMaterialChange(mat.id, 'description', e.target.value)}
                          placeholder="Protective film, strapped bundles"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section D: Documents and Loading Photos */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  D
                </span>
                Dispatch Documents & Vehicle Loading Photos
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    key: 'salesInvoiceUrl',
                    label: 'Sales Invoice Copy',
                    sample:
                      'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'vehiclePhotoUrl',
                    label: 'Loaded Truck Photo',
                    sample:
                      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'materialLoadingPhotoUrl',
                    label: 'Profile Stacking Photo',
                    sample:
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
                  },
                  {
                    key: 'otherDocumentUrl',
                    label: 'E-Way Bill & Weighment',
                    sample:
                      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60',
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
                          <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-md p-2 transition-colors">
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
                            className="text-[9px] text-blue-600 hover:underline block mx-auto"
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

            {/* Section E: Security Physical Verification Checkpoints */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  E
                </span>
                Security Gate Verification Checkpoints
              </h3>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.invoiceVerification}
                      onChange={(e) => setFormData({ ...formData, invoiceVerification: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Sales Invoice Verified</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.vehicleNumberVerification}
                      onChange={(e) => setFormData({ ...formData, vehicleNumberVerification: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Vehicle Number Verified</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.materialQuantityVerification}
                      onChange={(e) => setFormData({ ...formData, materialQuantityVerification: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Package Count Verified</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Security Officer Remarks</label>
                    <input
                      type="text"
                      value={formData.securityRemarks}
                      onChange={(e) => setFormData({ ...formData, securityRemarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Verified By</label>
                    <input
                      type="text"
                      readOnly
                      value={currentUser.name}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveView('LIST')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Submit Outward Dispatch
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* OUTWARD REGISTER TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search outward #, customer, gate pass, invoice, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
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
                <option value="ALL">All Statuses ({outwards.length})</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Ready for Dispatch">Ready for Dispatch</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <ListExtras list={list} onClearAll={() => { setSearchQuery(''); setStatusFilter('ALL'); }} />
<div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Outward #</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Customer & Destination</th>
                  <th className="p-3.5">Vehicle & Driver</th>
                  <th className="p-3.5">Gate Pass #</th>
                  <th className="p-3.5 text-right">Items Qty</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.total === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      No outward dispatch records found.
                    </td>
                  </tr>
                ) : (
                  list.pageRows.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{entry.outwardEntryNumber}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800">{entry.dispatchDate}</span>
                        <p className="text-[10px] text-slate-400 font-mono">{entry.dispatchTime}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">{entry.customerCompanyName}</p>
                        <p className="text-[11px] text-slate-500">{entry.destination}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {entry.vehicleNumber}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{entry.driverName}</p>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] font-semibold text-emerald-800">
                        {entry.gatePassNumber}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {entry.materials.reduce((s, m) => s + (Number(m.quantity) || 0), 0)} Pcs
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            entry.status === 'Dispatched'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : entry.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : entry.status === 'Ready for Dispatch'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : entry.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                        {/* Printable Gate Pass */}
                        <button
                          onClick={() =>
                            onOpenVoucher('Sales Dispatch Gate Pass', entry.outwardEntryNumber, 'OUTWARD', entry)
                          }
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                          title="Print Gate Pass"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Supervisor/Admin Approve Dispatch */}
                        {entry.status === 'Pending' && currentUser.role !== 'SECURITY_STAFF' && (
                          <button
                            onClick={() => onUpdateStatus(entry.id, 'Approved')}
                            className="px-2 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Approve
                          </button>
                        )}

                        {/* Mark Dispatched at Gate Exit */}
                        {(entry.status === 'Approved' || entry.status === 'Ready for Dispatch') && (
                          <button
                            onClick={() => onUpdateStatus(entry.id, 'Dispatched', 'Vehicle cleared main gate exit')}
                            className="px-2 py-1 text-[10px] font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                          >
                            Mark Dispatched
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination list={list} />
        </div>
      )}
    </div>
  );
};
