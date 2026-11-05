import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  InwardEntry,
  OutwardEntry,
  VisitorEntry,
  SecurityStaff,
  SecurityAttendance,
  ReturnEntry,
  GatePass,
  SecurityAuditLog,
  SecuritySettings,
  InventoryItem,
  Customer,
  Supplier,
} from './types/security';
import {
  initializeStorageIfEmpty,
  getActiveUser,
  setActiveUser as persistActiveUser,
  getInwards,
  saveInwardEntry,
  approveInwardEntry,
  verifyInwardEntry,
  rejectInwardEntry,
  recordInwardExit,
  getOutwards,
  saveOutwardEntry,
  updateOutwardStatus,
  getVisitors,
  checkInVisitor,
  checkOutVisitor,
  getSecurityStaff,
  saveSecurityStaffMember,
  getAttendanceRecords,
  recordStaffAttendance,
  approveAttendanceRecord,
  getReturns,
  saveReturnEntry,
  approveReturnEntry,
  postReturnStockToInventory,
  getGatePasses,
  saveGatePass,
  getSecuritySettings,
  saveSecuritySettings,
  getAuditLogs,
  getInventoryItems,
  getCustomers,
  getSuppliers,
} from './services/storage';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SecurityDashboard } from './components/security/SecurityDashboard';
import { InwardEntryModule } from './components/security/InwardEntryModule';
import { OutwardEntryModule } from './components/security/OutwardEntryModule';
import { VisitorManagementModule } from './components/security/VisitorManagementModule';
import { SecurityStaffModule } from './components/security/SecurityStaffModule';
import { ReturnMaterialModule } from './components/security/ReturnMaterialModule';
import { GatePassModule } from './components/security/GatePassModule';
import { SecurityReportsModule } from './components/security/SecurityReportsModule';
import { SecuritySettingsModule } from './components/security/SecuritySettingsModule';
import { AuditLogsView } from './components/security/AuditLogsView';
import { PrintVoucherModal } from './components/common/PrintVoucherModal';

import { CrmOverview } from './components/crm/CrmOverview';
import { CrmInventory } from './components/crm/CrmInventory';
import { CrmCustomers } from './components/crm/CrmCustomers';
import { CrmSales } from './components/crm/CrmSales';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Initialize storage on first render
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getActiveUser);
  const [activeTab, setActiveTab] = useState<string>('security-dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live Data State
  const [inwards, setInwards] = useState<InwardEntry[]>([]);
  const [outwards, setOutwards] = useState<OutwardEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [staffList, setStaffList] = useState<SecurityStaff[]>([]);
  const [attendance, setAttendance] = useState<SecurityAttendance[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>(getSecuritySettings);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Voucher / Print Modal State
  const [voucherModal, setVoucherModal] = useState<{
    isOpen: boolean;
    title: string;
    docNumber: string;
    docType: 'INWARD' | 'OUTWARD' | 'GATE_PASS' | 'VISITOR' | 'RETURN';
    data: any;
  }>({
    isOpen: false,
    title: '',
    docNumber: '',
    docType: 'GATE_PASS',
    data: null,
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const refreshAllData = () => {
    setInwards(getInwards());
    setOutwards(getOutwards());
    setVisitors(getVisitors());
    setReturns(getReturns());
    setStaffList(getSecurityStaff());
    setAttendance(getAttendanceRecords());
    setGatePasses(getGatePasses());
    setAuditLogs(getAuditLogs());
    setSettings(getSecuritySettings());
    setInventory(getInventoryItems());
    setCustomers(getCustomers());
    setSuppliers(getSuppliers());
  };

  useEffect(() => {
    initializeStorageIfEmpty();
    refreshAllData();
    setIsLoaded(true);
  }, []);

  const handleUserChange = (newUser: UserProfile) => {
    setCurrentUser(newUser);
    persistActiveUser(newUser);
    showToast(`Switched active profile to ${newUser.name} (${newUser.role.replace('_', ' ')})`);
  };

  const handleOpenVoucher = (
    title: string,
    docNumber: string,
    docType: 'INWARD' | 'OUTWARD' | 'GATE_PASS' | 'VISITOR' | 'RETURN',
    data: any
  ) => {
    setVoucherModal({
      isOpen: true,
      title,
      docNumber,
      docType,
      data,
    });
  };

  // Inward Actions
  const handleSaveInward = (entryData: any) => {
    try {
      const saved = saveInwardEntry(entryData, currentUser);
      refreshAllData();
      showToast(`Inward entry ${saved.inwardEntryNumber} saved successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save inward', 'error');
    }
  };

  const handleApproveInward = (id: string) => {
    const res = approveInwardEntry(id, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleVerifyInward = (id: string) => {
    const res = verifyInwardEntry(id, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRejectInward = (id: string, reason: string) => {
    const res = rejectInwardEntry(id, reason, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleRecordInwardExit = (id: string, exitDate: string, exitTime: string) => {
    const res = recordInwardExit(id, exitDate, exitTime, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Outward Actions
  const handleSaveOutward = (entryData: any) => {
    try {
      const saved = saveOutwardEntry(entryData, currentUser);
      refreshAllData();
      showToast(`Outward dispatch ${saved.outwardEntryNumber} saved with Gate Pass.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save outward', 'error');
    }
  };

  const handleUpdateOutwardStatus = (id: string, status: any, remarks?: string) => {
    const res = updateOutwardStatus(id, status, currentUser, remarks);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Visitor Actions
  const handleCheckInVisitor = (visitorData: any, allowOverride: boolean = false) => {
    const res = checkInVisitor(visitorData, currentUser, allowOverride);
    if (res.success) {
      refreshAllData();
      showToast(res.message || 'Visitor pass issued.');
    }
    return res;
  };

  const handleCheckOutVisitor = (id: string, exitDate?: string, exitTime?: string) => {
    const res = checkOutVisitor(id, currentUser, exitDate, exitTime);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Staff Actions
  const handleSaveStaff = (staffData: any) => {
    try {
      const saved = saveSecurityStaffMember(staffData, currentUser);
      refreshAllData();
      showToast(`Security staff ${saved.name} added to roster.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRecordAttendance = (recordData: any) => {
    try {
      recordStaffAttendance(recordData, currentUser);
      refreshAllData();
      showToast('Attendance recorded.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveAttendance = (id: string) => {
    const res = approveAttendanceRecord(id, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Return Actions
  const handleSaveReturn = (entryData: any) => {
    try {
      const saved = saveReturnEntry(entryData, currentUser);
      refreshAllData();
      showToast(`Return material entry ${saved.returnEntryNumber} submitted.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveReturn = (
    id: string,
    approvedQty: number,
    rejectedQty: number,
    qualityStatus: ReturnEntry['qualityVerification']
  ) => {
    const res = approveReturnEntry(id, approvedQty, rejectedQty, qualityStatus, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handlePostReturnStock = (id: string) => {
    const res = postReturnStockToInventory(id, currentUser);
    if (res.success) {
      refreshAllData();
      showToast(res.message);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Gate Pass Actions
  const handleSaveGatePass = (passData: any) => {
    try {
      const saved = saveGatePass(passData, currentUser);
      refreshAllData();
      showToast(`Gate Pass ${saved.gatePassNumber} issued.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Settings Actions
  const handleSaveSettings = (newSettings: SecuritySettings) => {
    saveSecuritySettings(newSettings, currentUser);
    refreshAllData();
    showToast('Security settings and policies updated.');
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-sm">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold tracking-wide">Loading Raviraja Security Management System...</p>
        </div>
      </div>
    );
  }

  // Pending counts for sidebar badges
  const pendingInwardCount = inwards.filter((i) => i.status === 'Pending' || i.status === 'Verified').length;
  const pendingOutwardCount = outwards.filter((o) => o.status === 'Pending').length;
  const visitorsInsideCount = visitors.filter((v) => v.status === 'Inside Factory').length;
  const pendingReturnCount = returns.filter((r) => r.status === 'Pending' || r.status === 'Verified').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isOpen={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          userRole={currentUser.role}
          pendingInwardCount={pendingInwardCount}
          pendingOutwardCount={pendingOutwardCount}
          visitorsInsideCount={visitorsInsideCount}
          pendingReturnCount={pendingReturnCount}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Toast Notification Alert */}
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white animate-bounce ${
                toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* SECURITY MODULE SCREENS */}
          {activeTab === 'security-dashboard' && (
            <SecurityDashboard
              inwards={inwards}
              outwards={outwards}
              visitors={visitors}
              returns={returns}
              attendance={attendance}
              auditLogs={auditLogs}
              currentUser={currentUser}
              onNavigate={setActiveTab}
              onOpenVoucher={handleOpenVoucher}
              onCheckOutVisitor={handleCheckOutVisitor}
              onApproveInward={handleApproveInward}
            />
          )}

          {activeTab === 'inward-entry' && (
            <InwardEntryModule
              inwards={inwards}
              suppliers={suppliers}
              currentUser={currentUser}
              onSaveInward={handleSaveInward}
              onApproveInward={handleApproveInward}
              onVerifyInward={handleVerifyInward}
              onRejectInward={handleRejectInward}
              onRecordExit={handleRecordInwardExit}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'outward-entry' && (
            <OutwardEntryModule
              outwards={outwards}
              customers={customers}
              currentUser={currentUser}
              onSaveOutward={handleSaveOutward}
              onUpdateStatus={handleUpdateOutwardStatus}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'visitor-management' && (
            <VisitorManagementModule
              visitors={visitors}
              currentUser={currentUser}
              onCheckInVisitor={handleCheckInVisitor}
              onCheckOutVisitor={handleCheckOutVisitor}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'security-staff' && (
            <SecurityStaffModule
              staffList={staffList}
              attendanceRecords={attendance}
              currentUser={currentUser}
              onSaveStaff={handleSaveStaff}
              onRecordAttendance={handleRecordAttendance}
              onApproveAttendance={handleApproveAttendance}
            />
          )}

          {activeTab === 'return-material' && (
            <ReturnMaterialModule
              returns={returns}
              currentUser={currentUser}
              onSaveReturn={handleSaveReturn}
              onApproveReturn={handleApproveReturn}
              onPostStock={handlePostReturnStock}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'gate-pass' && (
            <GatePassModule
              gatePasses={gatePasses}
              currentUser={currentUser}
              onSaveGatePass={handleSaveGatePass}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'security-reports' && (
            <SecurityReportsModule
              inwards={inwards}
              outwards={outwards}
              visitors={visitors}
              returns={returns}
              attendance={attendance}
              gatePasses={gatePasses}
              suppliers={suppliers}
              customers={customers}
            />
          )}

          {activeTab === 'security-settings' && (
            <SecuritySettingsModule
              settings={settings}
              currentUser={currentUser}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'audit-logs' && <AuditLogsView logs={auditLogs} />}

          {/* CRM CORE MODULE SCREENS */}
          {activeTab === 'crm-overview' && (
            <CrmOverview
              customers={customers}
              inventory={inventory}
              inwards={inwards}
              outwards={outwards}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'crm-inventory' && (
            <CrmInventory inventory={inventory} onNavigateToSecurity={setActiveTab} />
          )}

          {activeTab === 'crm-customers' && (
            <CrmCustomers customers={customers} onNavigateToSecurity={setActiveTab} />
          )}

          {activeTab === 'crm-sales' && (
            <CrmSales
              outwards={outwards}
              customers={customers}
              onNavigateToSecurity={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* Printable Voucher & Gate Pass Modal */}
      <PrintVoucherModal
        isOpen={voucherModal.isOpen}
        onClose={() => setVoucherModal({ ...voucherModal, isOpen: false })}
        title={voucherModal.title}
        docNumber={voucherModal.docNumber}
        docType={voucherModal.docType}
        data={voucherModal.data}
      />
    </div>
  );
}
