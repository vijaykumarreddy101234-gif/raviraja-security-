import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  UserProfile,
  AppUser,
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
  recordAuditLog,
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
import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { DialogHost } from './components/common/Dialogs';
import { PdfBridge } from './components/common/listKit';
import { LoginScreen } from './components/auth/LoginScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { UserManagement } from './components/auth/UserManagement';
import {
  ensureSeedUsers,
  restoreSession,
  touchSession,
  logout,
  listUsers,
  toProfile,
  IDLE_TIMEOUT_MS,
} from './services/auth';
import { canAccessTab, hasPermission } from './utils/permissions';

const PdfEditor = lazy(() => import('./components/pdf/PdfEditor'));

export default function App() {
  // Initialize storage on first render
  const [isLoaded, setIsLoaded] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [account, setAccount] = useState<AppUser | null>(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  // Handlers below only run after the login gate, so currentUser is always set when used.
  const currentUser = (account ? toProfile(account) : null) as UserProfile;
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

  // PDF handed to the PDF editor (e.g. a voucher), and where "Back" should return to
  const [pdfDraft, setPdfDraft] = useState<{ bytes: Uint8Array; name: string; returnTab: string } | null>(null);

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
    (async () => {
      await ensureSeedUsers();
      initializeStorageIfEmpty();
      refreshAllData();
      setAppUsers(listUsers());
      setAccount(restoreSession());
      setAuthReady(true);
      setIsLoaded(true);
    })();
  }, []);

  const handleLoggedIn = (u: AppUser) => {
    setSessionNotice('');
    setActiveTab('security-dashboard');
    setAccount(u);
    refreshAllData();
    setAppUsers(listUsers());
  };

  const handleLogout = useCallback((reason = 'signed out', notice = '') => {
    logout(account ?? undefined, reason);
    setAccount(null);
    setSessionNotice(notice);
    setShowChangePw(false);
    refreshAllData();
  }, [account]);

  // Auto sign-out after inactivity
  useEffect(() => {
    if (!account) return;
    let last = Date.now();
    const bump = () => {
      if (Date.now() - last > 5000) touchSession();
      last = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - last > IDLE_TIMEOUT_MS) {
        handleLogout('was signed out (inactivity)', 'You were signed out after 30 minutes of inactivity.');
      }
    }, 30000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [account, handleLogout]);

  // Record blocked navigation attempts
  useEffect(() => {
    if (account && !canAccessTab(account.role, activeTab)) {
      recordAuditLog({
        module: 'AUTH',
        action: 'ACCESS_DENIED',
        recordId: account.id,
        recordNumber: account.username,
        userName: account.name,
        userRole: account.role,
        details: `Blocked access to "${activeTab}" (role ${account.role}).`,
      });
      refreshAllData();
    }
  }, [activeTab, account]);

  const handleEditVoucherAsPdf = (bytes: Uint8Array, name: string) => {
    setPdfDraft({ bytes, name, returnTab: activeTab === 'pdf-editor' ? 'security-dashboard' : activeTab });
    setVoucherModal((v) => ({ ...v, isOpen: false }));
    setActiveTab('pdf-editor');
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
    if (!hasPermission(currentUser.role, 'settings.manage')) {
      showToast('You do not have permission to change settings.', 'error');
      return;
    }
    saveSecuritySettings(newSettings, currentUser);
    refreshAllData();
    showToast('Security settings and policies updated.');
  };

  if (!isLoaded || !authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white text-sm">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold tracking-wide">Loading Raviraja Security Management System...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <>
        <LoginScreen onLoggedIn={handleLoggedIn} sessionNotice={sessionNotice} />
        <DialogHost />
      </>
    );
  }

  // Pending counts for sidebar badges
  const pendingInwardCount = inwards.filter((i) => i.status === 'Pending' || i.status === 'Verified').length;
  const pendingOutwardCount = outwards.filter((o) => o.status === 'Pending').length;
  const visitorsInsideCount = visitors.filter((v) => v.status === 'Inside Factory').length;
  const pendingReturnCount = returns.filter((r) => r.status === 'Pending' || r.status === 'Verified').length;

  return (
    <PdfBridge.Provider value={{ openPdf: canAccessTab(currentUser.role, 'pdf-editor') ? handleEditVoucherAsPdf : undefined }}>
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={() => handleLogout()}
        onChangePassword={() => setShowChangePw(true)}
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

          {!canAccessTab(currentUser.role, activeTab) && (
            <div className="max-w-md mx-auto mt-16 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-xs">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
              <h2 className="mt-3 text-lg font-extrabold text-slate-900">Access denied</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your role ({currentUser.role.replace('_', ' ')}) does not have permission to open this section. The attempt has been logged.
              </p>
              <button onClick={() => setActiveTab('security-dashboard')} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">
                Back to dashboard
              </button>
            </div>
          )}

          {/* SECURITY MODULE SCREENS */}
          {activeTab === 'security-dashboard' && canAccessTab(currentUser.role, 'security-dashboard') && (
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

          {activeTab === 'inward-entry' && canAccessTab(currentUser.role, 'inward-entry') && (
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

          {activeTab === 'outward-entry' && canAccessTab(currentUser.role, 'outward-entry') && (
            <OutwardEntryModule
              outwards={outwards}
              customers={customers}
              currentUser={currentUser}
              onSaveOutward={handleSaveOutward}
              onUpdateStatus={handleUpdateOutwardStatus}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'visitor-management' && canAccessTab(currentUser.role, 'visitor-management') && (
            <VisitorManagementModule
              visitors={visitors}
              currentUser={currentUser}
              onCheckInVisitor={handleCheckInVisitor}
              onCheckOutVisitor={handleCheckOutVisitor}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'security-staff' && canAccessTab(currentUser.role, 'security-staff') && (
            <SecurityStaffModule
              staffList={staffList}
              attendanceRecords={attendance}
              currentUser={currentUser}
              onSaveStaff={handleSaveStaff}
              onRecordAttendance={handleRecordAttendance}
              onApproveAttendance={handleApproveAttendance}
            />
          )}

          {activeTab === 'return-material' && canAccessTab(currentUser.role, 'return-material') && (
            <ReturnMaterialModule
              returns={returns}
              currentUser={currentUser}
              onSaveReturn={handleSaveReturn}
              onApproveReturn={handleApproveReturn}
              onPostStock={handlePostReturnStock}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'gate-pass' && canAccessTab(currentUser.role, 'gate-pass') && (
            <GatePassModule
              gatePasses={gatePasses}
              currentUser={currentUser}
              onSaveGatePass={handleSaveGatePass}
              onOpenVoucher={handleOpenVoucher}
            />
          )}

          {activeTab === 'security-reports' && canAccessTab(currentUser.role, 'security-reports') && (
            <SecurityReportsModule
              inwards={inwards}
              outwards={outwards}
              visitors={visitors}
              returns={returns}
              attendance={attendance}
              gatePasses={gatePasses}
              suppliers={suppliers}
              customers={customers}
              onEditPdf={canAccessTab(currentUser.role, 'pdf-editor') ? handleEditVoucherAsPdf : undefined}
            />
          )}

          {activeTab === 'security-settings' && canAccessTab(currentUser.role, 'security-settings') && (
            <SecuritySettingsModule
              settings={settings}
              currentUser={currentUser}
              onSaveSettings={handleSaveSettings}
            />
          )}

          {activeTab === 'audit-logs' && canAccessTab(currentUser.role, 'audit-logs') && (
            <AuditLogsView
              logs={auditLogs}
              onExported={(n) => {
                recordAuditLog({
                  module: 'AUTH',
                  action: 'EXPORT',
                  recordId: currentUser.id,
                  recordNumber: 'AUDIT-CSV',
                  userName: currentUser.name,
                  userRole: currentUser.role,
                  details: `Exported ${n} audit record(s) to CSV.`,
                });
                refreshAllData();
              }}
            />
          )}

          {/* CRM CORE MODULE SCREENS */}
          {activeTab === 'crm-overview' && canAccessTab(currentUser.role, 'crm-overview') && (
            <CrmOverview
              customers={customers}
              inventory={inventory}
              inwards={inwards}
              outwards={outwards}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'crm-inventory' && canAccessTab(currentUser.role, 'crm-inventory') && (
            <CrmInventory inventory={inventory} onNavigateToSecurity={setActiveTab} />
          )}

          {activeTab === 'crm-customers' && canAccessTab(currentUser.role, 'crm-customers') && (
            <CrmCustomers customers={customers} onNavigateToSecurity={setActiveTab} />
          )}

          {activeTab === 'crm-sales' && canAccessTab(currentUser.role, 'crm-sales') && (
            <CrmSales
              outwards={outwards}
              customers={customers}
              onNavigateToSecurity={setActiveTab}
            />
          )}

          {activeTab === 'pdf-editor' && canAccessTab(currentUser.role, 'pdf-editor') && (
            <Suspense fallback={<div className="p-10 text-center text-xs text-slate-500">Loading PDF editor…</div>}>
              <PdfEditor
                currentUser={currentUser}
                companyName={settings.companyName}
                initialPdf={pdfDraft}
                onInitialPdfLoaded={() => setPdfDraft(null)}
                onBack={(tab) => setActiveTab(tab)}
                onAudit={(details) => {
                  recordAuditLog({
                    module: 'PDF_EDITOR',
                    action: 'EXPORT',
                    recordId: 'pdf',
                    recordNumber: 'PDF',
                    userName: currentUser.name,
                    userRole: currentUser.role,
                    details,
                  });
                  refreshAllData();
                }}
                notify={showToast}
              />
            </Suspense>
          )}

          {activeTab === 'user-management' && canAccessTab(currentUser.role, 'user-management') && (
            <UserManagement
              users={appUsers}
              currentUser={currentUser}
              onChanged={() => {
                setAppUsers(listUsers());
                refreshAllData();
              }}
              notify={showToast}
            />
          )}
        </main>
      </div>

      {(account.mustChangePassword || showChangePw) && (
        <ChangePasswordModal
          userId={account.id}
          forced={account.mustChangePassword}
          onCancel={() => setShowChangePw(false)}
          onDone={() => {
            const fresh = listUsers().find((u) => u.id === account.id);
            if (fresh) setAccount(fresh);
            setAppUsers(listUsers());
            setShowChangePw(false);
            refreshAllData();
            showToast('Password updated.');
          }}
        />
      )}

      <DialogHost />

      {/* Printable Voucher & Gate Pass Modal */}
      <PrintVoucherModal
        isOpen={voucherModal.isOpen}
        onClose={() => setVoucherModal({ ...voucherModal, isOpen: false })}
        onEditPdf={canAccessTab(currentUser.role, 'pdf-editor') ? handleEditVoucherAsPdf : undefined}
        title={voucherModal.title}
        docNumber={voucherModal.docNumber}
        docType={voucherModal.docType}
        data={voucherModal.data}
      />
    </div>
    </PdfBridge.Provider>
  );
}
