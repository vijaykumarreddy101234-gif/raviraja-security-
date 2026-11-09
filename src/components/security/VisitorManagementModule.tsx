import React, { useState } from 'react';
import {
  Users,
  Plus,
  Printer,
  Download,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  LogOut,
  Building,
  User,
  Phone,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { VisitorEntry, VisitorType, UserProfile } from '../../types/security';
import { formatSequenceNumber, calculateTurnaroundDuration } from '../../utils/securityLogic';
import { alertDialog } from '../common/Dialogs';
import { confirmVehicle, confirmMobile, normalizeVehicle, normalizeMobile } from '../../utils/validators';
import { useListControls, ListExtras, Pagination, ExportMenu, useExportPdf, downloadCsv, peekListPreset } from '../common/listKit';

interface VisitorManagementModuleProps {
  visitors: VisitorEntry[];
  currentUser: UserProfile;
  onCheckInVisitor: (visitorData: any, allowOverride?: boolean) => { success: boolean; duplicate?: VisitorEntry; message?: string };
  onCheckOutVisitor: (id: string, exitDate?: string, exitTime?: string) => void;
  onOpenVoucher: (title: string, docNumber: string, docType: any, data: any) => void;
}

const VISITOR_TYPES: VisitorType[] = [
  'Customer',
  'Supplier',
  'Dealer',
  'Fabricator',
  'Contractor',
  'Guest',
  'Other',
];

const ID_PROOF_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Driving License',
  'Voter ID',
  'Passport',
  'Company ID',
] as const;

export const VisitorManagementModule: React.FC<VisitorManagementModuleProps> = ({
  visitors,
  currentUser,
  onCheckInVisitor,
  onCheckOutVisitor,
  onOpenVoucher,
}) => {
  const [activeView, setActiveView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Inside Factory' | 'Checked Out'>(() => (peekListPreset('visitor')?.status as any) ?? 'ALL');

  // Duplicate Warning Modal
  const [duplicateWarning, setDuplicateWarning] = useState<VisitorEntry | null>(null);
  const [pendingFormPayload, setPendingFormPayload] = useState<any>(null);

  // Check-Out Modal with Exit Date & Exit Time
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<VisitorEntry | null>(null);

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [checkoutExitDate, setCheckoutExitDate] = useState(defaultDate);
  const [checkoutExitTime, setCheckoutExitTime] = useState(defaultTime);

  const [formData, setFormData] = useState({
    visitorName: '',
    companyName: '',
    mobileNumber: '',
    address: 'Ahmedabad, Gujarat',
    idProofType: 'Aadhaar Card' as const,
    idProofNumber: '',
    visitorPhotoUrl: '',
    idProofUploadUrl: '',
    purposeOfVisit: 'Technical Consultation & Extrusion Sample Review',
    personToMeet: 'Hitesh Panchal (Technical Head)',
    department: 'Quality & Extrusion Dept',
    visitorType: 'Customer' as VisitorType,
    vehicleNumber: '',
    entryDate: defaultDate,
    entryTime: defaultTime,
    exitDate: '',
    exitTime: '',
    remarks: 'Safety helmet issued. Visitor escorted.',
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.visitorName || !formData.mobileNumber) {
      alertDialog('Please fill Visitor Name and Mobile Number');
      return;
    }
    const insideMobiles = visitors.filter((v) => v.status === 'Inside Factory').map((v) => v.mobileNumber);
    if (!(await confirmMobile(formData.mobileNumber, insideMobiles))) return;
    if (formData.vehicleNumber && !(await confirmVehicle(formData.vehicleNumber))) return;

    const payload = {
      ...formData,
      mobileNumber: normalizeMobile(formData.mobileNumber),
      vehicleNumber: formData.vehicleNumber ? normalizeVehicle(formData.vehicleNumber) : formData.vehicleNumber,
      securityStaffName: currentUser.name,
      exitDate: formData.exitDate || undefined,
      exitTime: formData.exitTime || undefined,
    };

    const res = onCheckInVisitor(payload, false);
    if (!res.success && res.duplicate) {
      // Show Duplicate Override Modal
      setDuplicateWarning(res.duplicate);
      setPendingFormPayload(payload);
    } else {
      setActiveView('LIST');
      // Reset form
      setFormData({
        visitorName: '',
        companyName: '',
        mobileNumber: '',
        address: '',
        idProofType: 'Aadhaar Card',
        idProofNumber: '',
        visitorPhotoUrl: '',
        idProofUploadUrl: '',
        purposeOfVisit: '',
        personToMeet: '',
        department: '',
        visitorType: 'Customer',
        vehicleNumber: '',
        entryDate: defaultDate,
        entryTime: defaultTime,
        exitDate: '',
        exitTime: '',
        remarks: '',
      });
    }
  };

  const handleAuthorizeDuplicateOverride = () => {
    if (pendingFormPayload) {
      onCheckInVisitor(pendingFormPayload, true);
      setDuplicateWarning(null);
      setPendingFormPayload(null);
      setActiveView('LIST');
    }
  };

  const buildExport = () => {
    const headers = [
      'Visitor Pass #',
      'Visitor Name',
      'Company',
      'Mobile',
      'ID Type',
      'ID Number',
      'Type',
      'Person To Meet',
      'Department',
      'Entry Date',
      'Entry Time',
      'Exit Date',
      'Exit Time',
      'Visit Duration',
      'Status',
    ];

    const rows = list.all.map((v) => {
      const duration = v.exitTime
        ? calculateTurnaroundDuration(v.entryDate, v.entryTime, v.exitDate, v.exitTime)
        : 'Inside Plant';
      return [
        v.visitorPassNumber,
        v.visitorName,
        v.companyName,
        v.mobileNumber,
        v.idProofType,
        v.idProofNumber,
        v.visitorType,
        v.personToMeet,
        v.department,
        v.entryDate,
        v.entryTime,
        v.exitDate || '-',
        v.exitTime || '-',
        duration,
        v.status,
      ];
    });

    return { headers, rows };
  };

  const handleExportCSV = () => {
    const { headers, rows } = buildExport();
    downloadCsv(`Raviraja_Visitors_${defaultDate}.csv`, headers, rows);
  };

  const handleExportPdf = () => {
    const { headers, rows } = buildExport();
    exportPdf('Visitor Register', headers, rows, `Raviraja_Visitors_${defaultDate}.pdf`);
  };

  const filteredVisitors = visitors.filter((v) => {
    const matchSearch =
      v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.mobileNumber.includes(searchQuery) ||
      v.visitorPassNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.personToMeet.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportPdf = useExportPdf();
  const list = useListControls(filteredVisitors, {
    module: 'visitor',
    dateOf: (r: any) => `${r.entryDate} ${r.entryTime}`,
    defaultSort: 'date',
    sorters: {
      date: { label: 'Entry date & time', value: (r) => `${r.entryDate} ${r.entryTime}` },
      name: { label: 'Visitor name', value: (r) => r.visitorName },
      company: { label: 'Company', value: (r) => r.companyName },
      host: { label: 'Person to meet', value: (r) => r.personToMeet },
      pass: { label: 'Pass number', value: (r) => r.visitorPassNumber },
      status: { label: 'Status', value: (r) => r.status },
    },
  });

  const currentlyInsideCount = visitors.filter((v) => v.status === 'Inside Factory').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Visitor Entry & Exit Management</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              {currentlyInsideCount} Currently Inside
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Digital visitor badges with QR codes, authorized person verification, active duplicate blocking & quick checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView === 'LIST' ? (
            <>
              <ExportMenu onCsv={handleExportCSV} onPdf={handleExportPdf} />
              <button
                onClick={() => setActiveView('FORM')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Visitor Check-In
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveView('LIST')}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Back to Visitors Register
            </button>
          )}
        </div>
      </div>

      {activeView === 'FORM' ? (
        /* VISITOR CHECK-IN FORM */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                Factory Security Pass
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">New Visitor Registration & Check-In</h2>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Auto Pass: <strong className="text-slate-800">{formatSequenceNumber('VP', visitors.length)}</strong>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6 text-xs">
            {/* Section A: Visitor Details */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  A
                </span>
                Visitor Personal & Identity Verification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Visitor Full Name *</label>
                  <input
                    type="text"
                    value={formData.visitorName}
                    onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                    placeholder="e.g. Rajesh P. Sharma"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Techno Fab Architectural"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="9876543210"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Number (If any)</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. GJ-01-KP-1020"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs uppercase"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Address / City</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">ID Proof Type *</label>
                  <select
                    value={formData.idProofType}
                    onChange={(e) => setFormData({ ...formData, idProofType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {ID_PROOF_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">ID Proof Number</label>
                  <input
                    type="text"
                    value={formData.idProofNumber}
                    onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                    placeholder="4455-6677-8899"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              {/* Photo & ID Proof Snap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="block font-semibold text-slate-700 text-xs mb-1.5">Visitor Photo</span>
                  {formData.visitorPhotoUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.visitorPhotoUrl}
                        alt="Visitor"
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, visitorPhotoUrl: '' })}
                        className="text-rose-600 text-xs hover:underline"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-lg p-2.5 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600 text-xs">Snap / Upload Selfie</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const r = new FileReader();
                              r.onload = () => setFormData({ ...formData, visitorPhotoUrl: r.result as string });
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            visitorPhotoUrl:
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
                          })
                        }
                        className="text-[11px] text-teal-600 hover:underline"
                      >
                        + Use Sample Photo
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="block font-semibold text-slate-700 text-xs mb-1.5">ID Document Scan</span>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-lg p-2.5 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 text-xs">Upload ID Proof</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onload = () => setFormData({ ...formData, idProofUploadUrl: r.result as string });
                            r.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    {formData.idProofUploadUrl && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> ID Uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Visit Details */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
                  B
                </span>
                Visit Purpose & Official Destination
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Visitor Classification</label>
                  <select
                    value={formData.visitorType}
                    onChange={(e) => setFormData({ ...formData, visitorType: e.target.value as VisitorType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {VISITOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Person to Meet *</label>
                  <input
                    type="text"
                    value={formData.personToMeet}
                    onChange={(e) => setFormData({ ...formData, personToMeet: e.target.value })}
                    placeholder="e.g. Rajesh V. Patel / Hitesh Panchal"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Department *</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Production / Quality / Accounts"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Purpose of Visit *</label>
                  <input
                    type="text"
                    value={formData.purposeOfVisit}
                    onChange={(e) => setFormData({ ...formData, purposeOfVisit: e.target.value })}
                    placeholder="e.g. Raw material pricing discussion"
                    required
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

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-600 font-semibold mb-1">Security Remarks / Safety Gear Issued</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Safety helmet & temporary badge issued"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
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
                className="flex items-center gap-1.5 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Issue Visitor Pass & Check-In
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* VISITORS REGISTER TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search visitor pass #, visitor name, company, mobile, person to meet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
              >
                <option value="ALL">All ({visitors.length})</option>
                <option value="Inside Factory">Inside Factory ({currentlyInsideCount})</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <ListExtras list={list} onClearAll={() => { setSearchQuery(''); setStatusFilter('ALL'); }} />
<div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Pass #</th>
                  <th className="p-3.5">Visitor & Company</th>
                  <th className="p-3.5">Contact & ID</th>
                  <th className="p-3.5">Meeting With</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">Gate Entry</th>
                  <th className="p-3.5">Gate Exit & Duration</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.total === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      No visitor records found.
                    </td>
                  </tr>
                ) : (
                  list.pageRows.map((v) => {
                    const isExited = v.status === 'Checked Out' || !!v.exitTime;
                    const duration = isExited
                      ? calculateTurnaroundDuration(v.entryDate, v.entryTime, v.exitDate, v.exitTime)
                      : null;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{v.visitorPassNumber}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{v.visitorName}</p>
                          <p className="text-[11px] text-slate-500">{v.companyName}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-800">{v.mobileNumber}</span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {v.idProofType}: {v.idProofNumber || '-'}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800">{v.personToMeet}</p>
                          <p className="text-[10px] text-slate-500">{v.department}</p>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {v.visitorType}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">{v.entryDate}</span>
                          <p className="font-mono text-slate-500 text-[10px]">{v.entryTime}</p>
                        </td>
                        <td className="p-3.5">
                          {isExited ? (
                            <div>
                              <span className="font-semibold text-slate-800">{v.exitDate || v.entryDate}</span>
                              <p className="font-mono text-slate-500 text-[10px]">{v.exitTime}</p>
                              {duration && (
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded font-mono">
                                  {duration}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                Inside Factory
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              v.status === 'Inside Factory'
                                ? 'bg-teal-100 text-teal-800 border-teal-200 font-bold'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          {/* Print Visitor Badge */}
                          <button
                            onClick={() => onOpenVoucher('Official Visitor Gate Pass', v.visitorPassNumber, 'VISITOR', v)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                            title="Print Visitor Pass"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Check-Out Action Modal Trigger */}
                          {v.status === 'Inside Factory' && (
                            <button
                              onClick={() => {
                                setCheckoutTarget(v);
                                const nowInst = new Date();
                                const todayI = nowInst.toISOString().split('T')[0];
                                const timeI = `${String(nowInst.getHours()).padStart(2, '0')}:${String(nowInst.getMinutes()).padStart(2, '0')}`;
                                setCheckoutExitDate(todayI);
                                setCheckoutExitTime(timeI);
                                setCheckoutModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors inline-flex items-center gap-1"
                              title="Record Visitor Exit / Check-Out"
                            >
                              <LogOut className="w-3 h-3 text-rose-200" />
                              Check-Out
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
          <Pagination list={list} />
        </div>
      )}

      {/* Visitor Check-Out Confirmation Modal */}
      {checkoutModalOpen && checkoutTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
              <LogOut className="w-5 h-5 text-teal-600" />
              <span>Visitor Gate Check-Out</span>
            </div>
            <p className="text-slate-600 mb-4">
              Confirm official factory exit date and time for safety & security records:
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Pass Number:</span>
                <span className="font-mono font-bold text-slate-800">{checkoutTarget.visitorPassNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor:</span>
                <span className="font-bold text-slate-800">{checkoutTarget.visitorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="text-slate-800">{checkoutTarget.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Meeting:</span>
                <span className="text-slate-800">{checkoutTarget.personToMeet} ({checkoutTarget.department})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-500">Checked In:</span>
                <span className="font-mono text-slate-700 font-semibold">{checkoutTarget.entryDate} at {checkoutTarget.entryTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exit Date *</label>
                <input
                  type="date"
                  value={checkoutExitDate}
                  onChange={(e) => setCheckoutExitDate(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exit Time *</label>
                <input
                  type="time"
                  value={checkoutExitTime}
                  onChange={(e) => setCheckoutExitTime(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>
            </div>

            {checkoutExitDate && checkoutExitTime && (
              <div className="p-2.5 bg-teal-50 rounded-lg border border-teal-200 text-teal-800 mb-4 text-[11px] flex items-center justify-between">
                <span>Total Visit Duration:</span>
                <strong className="font-mono text-xs">
                  {calculateTurnaroundDuration(checkoutTarget.entryDate, checkoutTarget.entryTime, checkoutExitDate, checkoutExitTime)}
                </strong>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCheckoutModalOpen(false);
                  setCheckoutTarget(null);
                }}
                className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (checkoutTarget && checkoutExitDate && checkoutExitTime) {
                    onCheckOutVisitor(checkoutTarget.id, checkoutExitDate, checkoutExitTime);
                    setCheckoutModalOpen(false);
                    setCheckoutTarget(null);
                  }
                }}
                disabled={!checkoutExitDate || !checkoutExitTime}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Check-Out & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Active Visitor Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <div className="flex items-center gap-2.5 text-amber-600 font-bold text-sm mb-2">
              <AlertTriangle className="w-6 h-6" />
              <span>Duplicate Active Visitor Alert!</span>
            </div>
            <p className="text-slate-700 leading-relaxed mb-4">
              A visitor with this mobile number / ID proof is currently recorded as <strong>Inside Factory</strong>:
            </p>

            <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 mb-4 space-y-1 text-slate-800">
              <p>
                <strong>Name:</strong> {duplicateWarning.visitorName}
              </p>
              <p>
                <strong>Company:</strong> {duplicateWarning.companyName}
              </p>
              <p>
                <strong>Pass Number:</strong> <span className="font-mono">{duplicateWarning.visitorPassNumber}</span>
              </p>
              <p>
                <strong>Checked In At:</strong> {duplicateWarning.entryDate} at {duplicateWarning.entryTime}
              </p>
              <p>
                <strong>Meeting:</strong> {duplicateWarning.personToMeet} ({duplicateWarning.department})
              </p>
            </div>

            <p className="text-slate-500 mb-5 text-[11px]">
              Standard policy prevents duplicate entries without checkout. If this is an accompanied re-entry or authorized exception, click "Authorize Override".
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDuplicateWarning(null);
                  setPendingFormPayload(null);
                }}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAuthorizeDuplicateOverride}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
              >
                Authorize Override & Check-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
