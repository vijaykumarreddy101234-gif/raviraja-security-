import React, { useState } from 'react';
import {
  Settings,
  Save,
  ShieldAlert,
  Clock,
  Key,
  CheckCircle2,
  Building,
  Lock,
} from 'lucide-react';
import { SecuritySettings, UserProfile } from '../../types/security';

interface SecuritySettingsModuleProps {
  settings: SecuritySettings;
  currentUser: UserProfile;
  onSaveSettings: (settings: SecuritySettings) => void;
}

export const SecuritySettingsModule: React.FC<SecuritySettingsModuleProps> = ({
  settings,
  currentUser,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<SecuritySettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const isRestricted = currentUser.role === 'SECURITY_STAFF';

  return (
    <div className="space-y-6 text-xs max-w-5xl">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security System Settings & Policy</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Number prefix configurations, shift standards, dual-approval requirements & role privilege matrix.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            Settings Saved
          </span>
        )}
      </div>

      {isRestricted ? (
        <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3 text-amber-900">
          <Lock className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Restricted Configuration Area</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Only Security Supervisors and Admins have permission to modify security number prefixes and gate policies.
              Switch role in the top-right navbar to test editing.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prefix Settings */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Key className="w-4 h-4 text-emerald-600" />
              Document Sequence Prefixes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Inward Prefix</label>
                <input
                  type="text"
                  value={formData.inwardPrefix}
                  onChange={(e) => setFormData({ ...formData, inwardPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. INW-2026-XXXX</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Outward Prefix</label>
                <input
                  type="text"
                  value={formData.outwardPrefix}
                  onChange={(e) => setFormData({ ...formData, outwardPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. OUT-2026-XXXX</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Gate Pass Prefix</label>
                <input
                  type="text"
                  value={formData.gatePassPrefix}
                  onChange={(e) => setFormData({ ...formData, gatePassPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. GP-2026-XXXX</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Visitor Pass Prefix</label>
                <input
                  type="text"
                  value={formData.visitorPrefix}
                  onChange={(e) => setFormData({ ...formData, visitorPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. VP-2026-XXXX</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Return Prefix</label>
                <input
                  type="text"
                  value={formData.returnPrefix}
                  onChange={(e) => setFormData({ ...formData, returnPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-800 uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">e.g. RET-2026-XXXX</span>
              </div>
            </div>
          </div>

          {/* Plant Identity */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building className="w-4 h-4 text-blue-600" />
              Plant Gate Identity & Letterhead Header
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Plant Location & Address</label>
                <input
                  type="text"
                  value={formData.plantAddress}
                  onChange={(e) => setFormData({ ...formData, plantAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Security Gate Rules & Policies */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              Gate Policies & Strict Enforcement Rules
            </h2>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireSupervisorApprovalForInward}
                  onChange={(e) => setFormData({ ...formData, requireSupervisorApprovalForInward: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Require Supervisor Approval for Inward Entries</span>
                  <span className="text-slate-500 text-[11px]">
                    Raw materials are only posted to CRM inventory once verified and approved by a Security Supervisor or Admin.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preventDuplicateVisitorCheckin}
                  onChange={(e) => setFormData({ ...formData, preventDuplicateVisitorCheckin: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Prevent Duplicate Active Visitor Check-In</span>
                  <span className="text-slate-500 text-[11px]">
                    Alerts security staff if a visitor with the same phone or ID is already marked "Inside Factory" without checkout.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireSupervisorApprovalForReturn}
                  onChange={(e) => setFormData({ ...formData, requireSupervisorApprovalForReturn: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Enforce Quality Inspection for Returns</span>
                  <span className="text-slate-500 text-[11px]">
                    Only approved and accepted return quantities can be committed to the inventory balance.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Security Configuration
            </button>
          </div>
        </form>
      )}

      {/* Role Permissions Matrix Reference */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          User Role & Permissions Matrix
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Module Capability</th>
                <th className="p-2.5 text-center">Security Staff</th>
                <th className="p-2.5 text-center">Security Supervisor</th>
                <th className="p-2.5 text-center">Admin / Director</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Create Inward / Outward Entries</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Verify Materials & Physical Checks</td>
                <td className="p-2.5 text-center text-slate-400">View Only</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Approve / Reject Inward & Outward</td>
                <td className="p-2.5 text-center text-rose-500 font-bold">✗ Restricted</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Authorized</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Direct Inventory Stock Alteration</td>
                <td className="p-2.5 text-center text-rose-500 font-bold">✗ Blocked</td>
                <td className="p-2.5 text-center text-slate-500">Via Inward Approval</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Manage Staff Attendance & Approvals</td>
                <td className="p-2.5 text-center text-slate-600">Self Check-In</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Approve</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-900">Modify Security Settings & Prefixes</td>
                <td className="p-2.5 text-center text-rose-500 font-bold">✗ Blocked</td>
                <td className="p-2.5 text-center text-slate-400">View Only</td>
                <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
