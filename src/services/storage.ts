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
  UserRole,
} from '../types/security';
import {
  INITIAL_USER_PROFILES,
  INITIAL_SETTINGS,
  INITIAL_INVENTORY,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_SECURITY_STAFF,
  INITIAL_ATTENDANCE,
  INITIAL_INWARD_ENTRIES,
  INITIAL_OUTWARD_ENTRIES,
  INITIAL_VISITORS,
  INITIAL_RETURNS,
  INITIAL_GATE_PASSES,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import {
  formatSequenceNumber,
  findActiveDuplicateVisitor,
  applyInwardStockPosting,
  applyReturnStockPosting,
} from '../utils/securityLogic';

const STORAGE_KEYS = {
  USERS: 'raviraja_users_v1',
  CURRENT_USER: 'raviraja_active_user_v1',
  SETTINGS: 'raviraja_settings_v1',
  INVENTORY: 'raviraja_inventory_v1',
  CUSTOMERS: 'raviraja_customers_v1',
  SUPPLIERS: 'raviraja_suppliers_v1',
  SECURITY_STAFF: 'raviraja_sec_staff_v1',
  ATTENDANCE: 'raviraja_sec_attendance_v1',
  INWARDS: 'raviraja_inwards_v1',
  OUTWARDS: 'raviraja_outwards_v1',
  VISITORS: 'raviraja_visitors_v1',
  RETURNS: 'raviraja_returns_v1',
  GATE_PASSES: 'raviraja_gate_passes_v1',
  AUDIT_LOGS: 'raviraja_audit_logs_v1',
  MATERIAL_CATEGORIES: 'raviraja_material_categories_v1',
};

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    return JSON.parse(val);
  } catch (err) {
    console.error(`Error loading storage key ${key}`, err);
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving storage key ${key}`, err);
  }
}

// Initialize default storage on first load
export function initializeStorageIfEmpty(): void {
  if (!localStorage.getItem(STORAGE_KEYS.INWARDS)) {
    setStorageItem(STORAGE_KEYS.USERS, INITIAL_USER_PROFILES);
    setStorageItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USER_PROFILES[0]);
    setStorageItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    setStorageItem(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
    setStorageItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setStorageItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    setStorageItem(STORAGE_KEYS.SECURITY_STAFF, INITIAL_SECURITY_STAFF);
    setStorageItem(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    setStorageItem(STORAGE_KEYS.INWARDS, INITIAL_INWARD_ENTRIES);
    setStorageItem(STORAGE_KEYS.OUTWARDS, INITIAL_OUTWARD_ENTRIES);
    setStorageItem(STORAGE_KEYS.VISITORS, INITIAL_VISITORS);
    setStorageItem(STORAGE_KEYS.RETURNS, INITIAL_RETURNS);
    setStorageItem(STORAGE_KEYS.GATE_PASSES, INITIAL_GATE_PASSES);
    setStorageItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }
}

export function resetToDemoData(): void {
  localStorage.clear();
  initializeStorageIfEmpty();
  window.location.reload();
}

// User Profiles & Active Session
export function getUserProfiles(): UserProfile[] {
  return getStorageItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USER_PROFILES);
}

export function getActiveUser(): UserProfile {
  return getStorageItem<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USER_PROFILES[0]);
}

export function setActiveUser(user: UserProfile): void {
  setStorageItem(STORAGE_KEYS.CURRENT_USER, user);
}

// Audit Logs
export function getAuditLogs(): SecurityAuditLog[] {
  return getStorageItem<SecurityAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}

export function recordAuditLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
  const currentLogs = getAuditLogs();
  const newLog: SecurityAuditLog = {
    ...log,
    id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
  };
  setStorageItem(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...currentLogs]);
}

// Settings
export function getSecuritySettings(): SecuritySettings {
  return getStorageItem<SecuritySettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
}

export function saveSecuritySettings(settings: SecuritySettings, user: UserProfile): void {
  setStorageItem(STORAGE_KEYS.SETTINGS, settings);
  recordAuditLog({
    module: 'SETTINGS',
    action: 'UPDATE',
    recordId: 'settings-1',
    recordNumber: 'SYS-SETTINGS',
    userName: user.name,
    userRole: user.role,
    details: 'Security system prefixes and approval rules updated.',
  });
}

// Inventory
export function getInventoryItems(): InventoryItem[] {
  return getStorageItem<InventoryItem[]>(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
}

export function saveInventoryItems(items: InventoryItem[]): void {
  setStorageItem(STORAGE_KEYS.INVENTORY, items);
}

// Customers & Suppliers
export function getCustomers(): Customer[] {
  return getStorageItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
}

export function getSuppliers(): Supplier[] {
  return getStorageItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
}

// Gate Passes
export function getGatePasses(): GatePass[] {
  return getStorageItem<GatePass[]>(STORAGE_KEYS.GATE_PASSES, INITIAL_GATE_PASSES);
}

export function saveGatePass(pass: Omit<GatePass, 'id' | 'createdAt'>, user: UserProfile): GatePass {
  const passes = getGatePasses();
  const newPass: GatePass = {
    ...pass,
    id: `gp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  setStorageItem(STORAGE_KEYS.GATE_PASSES, [newPass, ...passes]);
  recordAuditLog({
    module: 'GATE_PASS',
    action: 'CREATE',
    recordId: newPass.id,
    recordNumber: newPass.gatePassNumber,
    userName: user.name,
    userRole: user.role,
    details: `Gate Pass ${newPass.gatePassNumber} created for ${newPass.companyName} (${newPass.type}).`,
  });
  return newPass;
}

// Material Categories
export const DEFAULT_MATERIAL_CATEGORIES: string[] = [
  'PVC Resin',
  'CPE',
  'Processing Aid',
  'PE Wax',
  'Titanium Dioxide',
  'Calcium Carbonate',
  'Stabilizer',
  'Lubricants',
  'Granules',
  'Gasket',
  'Chemicals',
  'Packing Materials',
  'Hardware',
  'Other Materials',
];

export function getMaterialCategories(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.MATERIAL_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES);
}

export function saveMaterialCategory(newCategory: string, user?: UserProfile): string[] {
  const current = getMaterialCategories();
  const trimmed = newCategory.trim();
  if (!trimmed) return current;
  if (!current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    const updated = [...current, trimmed];
    setStorageItem(STORAGE_KEYS.MATERIAL_CATEGORIES, updated);
    if (user) {
      recordAuditLog({
        module: 'SETTINGS',
        action: 'CREATE',
        recordId: `cat-${Date.now()}`,
        recordNumber: trimmed,
        userName: user.name,
        userRole: user.role,
        details: `Added new raw material category "${trimmed}".`,
      });
    }
    return updated;
  }
  return current;
}

// Inward Module
export function getInwards(): InwardEntry[] {
  return getStorageItem<InwardEntry[]>(STORAGE_KEYS.INWARDS, INITIAL_INWARD_ENTRIES);
}

export function saveInwardEntry(
  entryData: Omit<InwardEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'inwardEntryNumber' | 'stockPosted'> & {
    id?: string;
    inwardEntryNumber?: string;
  },
  user: UserProfile
): InwardEntry {
  const currentInwards = getInwards();
  const settings = getSecuritySettings();
  const now = new Date().toISOString();

  let entry: InwardEntry;

  if (entryData.id) {
    // Edit existing entry
    const index = currentInwards.findIndex((i) => i.id === entryData.id);
    if (index === -1) throw new Error('Inward entry not found');

    const existing = currentInwards[index];
    if (existing.status === 'Approved' && user.role === 'SECURITY_STAFF') {
      throw new Error('Security Staff cannot modify an approved inward entry.');
    }

    entry = {
      ...existing,
      ...entryData,
      id: existing.id,
      inwardEntryNumber: existing.inwardEntryNumber,
      stockPosted: existing.stockPosted,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentInwards[index] = entry;

    recordAuditLog({
      module: 'INWARD',
      action: 'UPDATE',
      recordId: entry.id,
      recordNumber: entry.inwardEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Updated inward entry details for ${entry.supplierCompanyName}.`,
    });
  } else {
    // Create new
    const nextNum = formatSequenceNumber(settings.inwardPrefix, currentInwards.length);
    const gatePassNum = formatSequenceNumber(settings.gatePassPrefix, getGatePasses().length);

    entry = {
      ...entryData,
      id: `inw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      inwardEntryNumber: nextNum,
      gatePassNumber: gatePassNum,
      stockPosted: false,
      exitDate: entryData.exitDate || undefined,
      exitTime: entryData.exitTime || undefined,
      vehicleExitStatus: entryData.exitTime ? 'Exited' : (entryData.vehicleExitStatus || 'Inside Factory'),
      createdBy: user.name,
      createdAt: now,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentInwards.unshift(entry);

    // Auto-create matching Inward Gate Pass
    const primaryMat = entry.materials.map((m) => `${m.materialName} (${m.quantityReceived} ${m.unit})`).join(', ');
    saveGatePass(
      {
        gatePassNumber: gatePassNum,
        date: entry.entryDate,
        time: entry.entryTime,
        type: 'Inward',
        companyName: entry.supplierCompanyName,
        personName: `${entry.driverName} (Driver)`,
        vehicleNumber: entry.vehicleNumber,
        materialDetails: primaryMat || 'Raw Material Inward',
        quantity: `${entry.actualReceivedQuantity} KG Total`,
        referenceInvoiceNumber: `INV-${entry.inwardEntryNumber}`,
        securityStaffName: user.name,
        approvedBy: entry.status === 'Approved' ? user.name : 'Pending Verification',
        remarks: entry.differenceRemarks,
        qrPayload: `RAVIRAJA-GP|${nextNum}|${entry.vehicleNumber}|${entry.actualReceivedQuantity}KG`,
        status: 'Active',
      },
      user
    );

    recordAuditLog({
      module: 'INWARD',
      action: 'CREATE',
      recordId: entry.id,
      recordNumber: entry.inwardEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Created new inward entry for supplier ${entry.supplierCompanyName} with ${entry.materials.length} material items.`,
    });
  }

  setStorageItem(STORAGE_KEYS.INWARDS, currentInwards);
  return entry;
}

export function approveInwardEntry(id: string, user: UserProfile): { success: boolean; message: string } {
  if (user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Security Staff is not authorized to approve inward entries.' };
  }

  const currentInwards = getInwards();
  const entryIndex = currentInwards.findIndex((i) => i.id === id);
  if (entryIndex === -1) return { success: false, message: 'Inward entry not found.' };

  const entry = currentInwards[entryIndex];
  if (entry.status === 'Approved') {
    return { success: false, message: 'Inward entry is already approved.' };
  }

  entry.status = 'Approved';
  entry.approvedBy = user.name;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  // Atomically update inventory
  const inventory = getInventoryItems();
  const stockResult = applyInwardStockPosting(entry, inventory);
  if (stockResult.success) {
    saveInventoryItems(stockResult.updatedInventory);
    entry.stockPosted = true;
  }

  currentInwards[entryIndex] = entry;
  setStorageItem(STORAGE_KEYS.INWARDS, currentInwards);

  recordAuditLog({
    module: 'INWARD',
    action: 'APPROVE',
    recordId: entry.id,
    recordNumber: entry.inwardEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Inward entry ${entry.inwardEntryNumber} approved by ${user.name}. Raw material inventory updated atomically.`,
  });

  return { success: true, message: `Inward entry ${entry.inwardEntryNumber} approved and stock posted to inventory successfully.` };
}

export function verifyInwardEntry(id: string, user: UserProfile): { success: boolean; message: string } {
  const currentInwards = getInwards();
  const entryIndex = currentInwards.findIndex((i) => i.id === id);
  if (entryIndex === -1) return { success: false, message: 'Inward entry not found.' };

  const entry = currentInwards[entryIndex];
  entry.status = 'Verified';
  entry.verifiedBy = user.name;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentInwards[entryIndex] = entry;
  setStorageItem(STORAGE_KEYS.INWARDS, currentInwards);

  recordAuditLog({
    module: 'INWARD',
    action: 'VERIFY',
    recordId: entry.id,
    recordNumber: entry.inwardEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Inward entry ${entry.inwardEntryNumber} verified by ${user.name}. Ready for approval.`,
  });

  return { success: true, message: `Inward entry ${entry.inwardEntryNumber} verified.` };
}

export function rejectInwardEntry(id: string, reason: string, user: UserProfile): { success: boolean; message: string } {
  if (user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Security Staff is not authorized to reject inward entries.' };
  }

  const currentInwards = getInwards();
  const entryIndex = currentInwards.findIndex((i) => i.id === id);
  if (entryIndex === -1) return { success: false, message: 'Inward entry not found.' };

  const entry = currentInwards[entryIndex];
  entry.status = 'Rejected';
  entry.rejectionReason = reason;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentInwards[entryIndex] = entry;
  setStorageItem(STORAGE_KEYS.INWARDS, currentInwards);

  recordAuditLog({
    module: 'INWARD',
    action: 'REJECT',
    recordId: entry.id,
    recordNumber: entry.inwardEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Inward entry ${entry.inwardEntryNumber} rejected by ${user.name}. Reason: ${reason}`,
  });

  return { success: true, message: `Inward entry ${entry.inwardEntryNumber} rejected.` };
}

export function recordInwardExit(
  id: string,
  exitDate: string,
  exitTime: string,
  user: UserProfile
): { success: boolean; message: string } {
  const currentInwards = getInwards();
  const entryIndex = currentInwards.findIndex((i) => i.id === id);
  if (entryIndex === -1) return { success: false, message: 'Inward entry not found.' };

  const entry = currentInwards[entryIndex];
  entry.exitDate = exitDate;
  entry.exitTime = exitTime;
  entry.vehicleExitStatus = 'Exited';
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentInwards[entryIndex] = entry;
  setStorageItem(STORAGE_KEYS.INWARDS, currentInwards);

  recordAuditLog({
    module: 'INWARD',
    action: 'UPDATE',
    recordId: entry.id,
    recordNumber: entry.inwardEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Vehicle ${entry.vehicleNumber} (Inward #${entry.inwardEntryNumber}) completed unloading and cleared gate exit at ${exitTime} on ${exitDate}.`,
  });

  return { success: true, message: `Vehicle ${entry.vehicleNumber} exit recorded at ${exitTime} on ${exitDate}.` };
}

// Outward Module
export function getOutwards(): OutwardEntry[] {
  return getStorageItem<OutwardEntry[]>(STORAGE_KEYS.OUTWARDS, INITIAL_OUTWARD_ENTRIES);
}

export function saveOutwardEntry(
  entryData: Omit<OutwardEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'outwardEntryNumber' | 'gatePassNumber'> & {
    id?: string;
    outwardEntryNumber?: string;
    gatePassNumber?: string;
  },
  user: UserProfile
): OutwardEntry {
  const currentOutwards = getOutwards();
  const settings = getSecuritySettings();
  const now = new Date().toISOString();

  let entry: OutwardEntry;

  if (entryData.id) {
    const index = currentOutwards.findIndex((o) => o.id === entryData.id);
    if (index === -1) throw new Error('Outward entry not found');

    const existing = currentOutwards[index];
    if (existing.status === 'Dispatched' && user.role === 'SECURITY_STAFF') {
      throw new Error('Security Staff cannot modify a dispatched outward entry.');
    }

    entry = {
      ...existing,
      ...entryData,
      id: existing.id,
      outwardEntryNumber: existing.outwardEntryNumber,
      gatePassNumber: existing.gatePassNumber,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentOutwards[index] = entry;

    recordAuditLog({
      module: 'OUTWARD',
      action: 'UPDATE',
      recordId: entry.id,
      recordNumber: entry.outwardEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Updated outward sales dispatch for ${entry.customerCompanyName}.`,
    });
  } else {
    const nextNum = formatSequenceNumber(settings.outwardPrefix, currentOutwards.length);
    const gatePassNum = formatSequenceNumber(settings.gatePassPrefix, getGatePasses().length);

    entry = {
      ...entryData,
      id: `out-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      outwardEntryNumber: nextNum,
      gatePassNumber: gatePassNum,
      createdBy: user.name,
      createdAt: now,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentOutwards.unshift(entry);

    // Auto-create Outward Gate Pass
    const primaryMat = entry.materials.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join(', ');
    saveGatePass(
      {
        gatePassNumber: gatePassNum,
        date: entry.dispatchDate,
        time: entry.dispatchTime,
        type: 'Outward',
        companyName: entry.customerCompanyName,
        personName: `${entry.driverName} (Driver)`,
        vehicleNumber: entry.vehicleNumber,
        materialDetails: primaryMat || 'Finished Goods Dispatch',
        quantity: `${entry.materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)} items`,
        referenceInvoiceNumber: entry.salesInvoiceNumber,
        securityStaffName: user.name,
        approvedBy: user.name,
        remarks: entry.securityRemarks,
        qrPayload: `RAVIRAJA-GP|${nextNum}|${entry.vehicleNumber}|${entry.salesInvoiceNumber}`,
        status: 'Active',
      },
      user
    );

    recordAuditLog({
      module: 'OUTWARD',
      action: 'CREATE',
      recordId: entry.id,
      recordNumber: entry.outwardEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Created new outward sales dispatch ${nextNum} for ${entry.customerCompanyName}.`,
    });
  }

  setStorageItem(STORAGE_KEYS.OUTWARDS, currentOutwards);
  return entry;
}

export function updateOutwardStatus(
  id: string,
  newStatus: OutwardEntry['status'],
  user: UserProfile,
  remarks?: string
): { success: boolean; message: string } {
  const currentOutwards = getOutwards();
  const index = currentOutwards.findIndex((o) => o.id === id);
  if (index === -1) return { success: false, message: 'Outward entry not found' };

  const entry = currentOutwards[index];
  if (newStatus === 'Approved' && user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Supervisor or Admin authorization is required to approve dispatch.' };
  }

  entry.status = newStatus;
  if (remarks) entry.securityRemarks = remarks;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentOutwards[index] = entry;
  setStorageItem(STORAGE_KEYS.OUTWARDS, currentOutwards);

  recordAuditLog({
    module: 'OUTWARD',
    action: newStatus === 'Approved' ? 'APPROVE' : newStatus === 'Rejected' ? 'REJECT' : 'UPDATE',
    recordId: entry.id,
    recordNumber: entry.outwardEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Outward entry status transitioned to "${newStatus}" by ${user.name}.`,
  });

  return { success: true, message: `Outward status updated to ${newStatus}.` };
}

// Visitor Module
export function getVisitors(): VisitorEntry[] {
  return getStorageItem<VisitorEntry[]>(STORAGE_KEYS.VISITORS, INITIAL_VISITORS);
}

export function checkInVisitor(
  visitorData: Omit<VisitorEntry, 'id' | 'visitorId' | 'visitorPassNumber' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  user: UserProfile,
  allowOverride: boolean = false
): { success: boolean; visitor?: VisitorEntry; duplicate?: VisitorEntry; message?: string } {
  const currentVisitors = getVisitors();
  const settings = getSecuritySettings();

  // Check duplicate active visitor
  if (settings.preventDuplicateVisitorCheckin && !allowOverride) {
    const activeDuplicate = findActiveDuplicateVisitor(currentVisitors, visitorData.mobileNumber, visitorData.idProofNumber);
    if (activeDuplicate) {
      return {
        success: false,
        duplicate: activeDuplicate,
        message: `Active visitor found: "${activeDuplicate.visitorName}" from "${activeDuplicate.companyName}" checked in at ${activeDuplicate.entryTime} is still inside the factory.`,
      };
    }
  }

  const nextVisId = formatSequenceNumber('VIS', currentVisitors.length);
  const nextPassNum = formatSequenceNumber(settings.visitorPrefix, currentVisitors.length);
  const now = new Date().toISOString();

  const newVisitor: VisitorEntry = {
    ...visitorData,
    id: `vis-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    visitorId: nextVisId,
    visitorPassNumber: nextPassNum,
    status: 'Inside Factory',
    overrideAuthorized: allowOverride,
    createdBy: user.name,
    createdAt: now,
    updatedBy: user.name,
    updatedAt: now,
  };

  currentVisitors.unshift(newVisitor);
  setStorageItem(STORAGE_KEYS.VISITORS, currentVisitors);

  // Also create a Gate Pass for the visitor
  const gatePassNum = formatSequenceNumber(settings.gatePassPrefix, getGatePasses().length);
  saveGatePass(
    {
      gatePassNumber: gatePassNum,
      date: newVisitor.entryDate,
      time: newVisitor.entryTime,
      type: 'Visitor',
      companyName: newVisitor.companyName,
      personName: newVisitor.visitorName,
      vehicleNumber: newVisitor.vehicleNumber || 'On Foot',
      materialDetails: `Visitor Gate Pass - Meeting ${newVisitor.personToMeet} (${newVisitor.department})`,
      quantity: '1 Person',
      referenceInvoiceNumber: newVisitor.visitorPassNumber,
      securityStaffName: user.name,
      approvedBy: newVisitor.personToMeet,
      remarks: newVisitor.purposeOfVisit,
      qrPayload: `RAVIRAJA-VIS|${newVisitor.visitorPassNumber}|${newVisitor.visitorName}|${newVisitor.companyName}`,
      status: 'Active',
    },
    user
  );

  recordAuditLog({
    module: 'VISITOR',
    action: 'CHECK_IN',
    recordId: newVisitor.id,
    recordNumber: newVisitor.visitorPassNumber,
    userName: user.name,
    userRole: user.role,
    details: `Visitor ${newVisitor.visitorName} (${newVisitor.companyName}) checked in to meet ${newVisitor.personToMeet}.${allowOverride ? ' [DUPLICATE OVERRIDE AUTHORIZED]' : ''}`,
  });

  return { success: true, visitor: newVisitor, message: `Visitor pass ${newVisitor.visitorPassNumber} generated successfully.` };
}

export function checkOutVisitor(
  id: string,
  user: UserProfile,
  customExitDate?: string,
  customExitTime?: string
): { success: boolean; message: string } {
  const currentVisitors = getVisitors();
  const index = currentVisitors.findIndex((v) => v.id === id);
  if (index === -1) return { success: false, message: 'Visitor not found' };

  const visitor = currentVisitors[index];
  if (visitor.status === 'Checked Out') {
    return { success: false, message: 'Visitor is already checked out.' };
  }

  const now = new Date();
  const todayStr = customExitDate || now.toISOString().split('T')[0];
  const timeStr = customExitTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  visitor.status = 'Checked Out';
  visitor.exitDate = todayStr;
  visitor.exitTime = timeStr;
  visitor.updatedBy = user.name;
  visitor.updatedAt = now.toISOString();

  currentVisitors[index] = visitor;
  setStorageItem(STORAGE_KEYS.VISITORS, currentVisitors);

  recordAuditLog({
    module: 'VISITOR',
    action: 'CHECK_OUT',
    recordId: visitor.id,
    recordNumber: visitor.visitorPassNumber,
    userName: user.name,
    userRole: user.role,
    details: `Visitor ${visitor.visitorName} checked out at ${timeStr}. Pass surrendered.`,
  });

  return { success: true, message: `Visitor ${visitor.visitorName} successfully checked out at ${timeStr}.` };
}

// Security Staff & Attendance Module
export function getSecurityStaff(): SecurityStaff[] {
  return getStorageItem<SecurityStaff[]>(STORAGE_KEYS.SECURITY_STAFF, INITIAL_SECURITY_STAFF);
}

export function saveSecurityStaffMember(staffData: Omit<SecurityStaff, 'id' | 'employeeId'> & { id?: string; employeeId?: string }, user: UserProfile): SecurityStaff {
  const currentStaff = getSecurityStaff();
  let staff: SecurityStaff;

  if (staffData.id) {
    const idx = currentStaff.findIndex((s) => s.id === staffData.id);
    if (idx === -1) throw new Error('Staff member not found');
    staff = {
      ...currentStaff[idx],
      ...staffData,
    };
    currentStaff[idx] = staff;
  } else {
    const nextEmpId = `SEC-EMP-${String(currentStaff.length + 1).padStart(2, '0')}`;
    staff = {
      ...staffData,
      id: `staff-${Date.now()}`,
      employeeId: nextEmpId,
      isActive: true,
      joinedDate: new Date().toISOString().split('T')[0],
    };
    currentStaff.push(staff);
  }

  setStorageItem(STORAGE_KEYS.SECURITY_STAFF, currentStaff);
  recordAuditLog({
    module: 'STAFF',
    action: staffData.id ? 'UPDATE' : 'CREATE',
    recordId: staff.id,
    recordNumber: staff.employeeId,
    userName: user.name,
    userRole: user.role,
    details: `Security staff roster updated for ${staff.name} (${staff.designation}).`,
  });

  return staff;
}

export function getAttendanceRecords(): SecurityAttendance[] {
  return getStorageItem<SecurityAttendance[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
}

export function recordStaffAttendance(
  record: Omit<SecurityAttendance, 'id' | 'createdAt' | 'updatedAt' | 'approvalStatus'>,
  user: UserProfile
): SecurityAttendance {
  const currentAttendance = getAttendanceRecords();
  const now = new Date().toISOString();

  const newRecord: SecurityAttendance = {
    ...record,
    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    approvalStatus: 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  currentAttendance.unshift(newRecord);
  setStorageItem(STORAGE_KEYS.ATTENDANCE, currentAttendance);

  recordAuditLog({
    module: 'STAFF',
    action: 'CREATE',
    recordId: newRecord.id,
    recordNumber: newRecord.staffEmployeeId,
    userName: user.name,
    userRole: user.role,
    details: `Attendance marked for ${newRecord.staffName} (${newRecord.status}) on ${newRecord.attendanceDate}.`,
  });

  return newRecord;
}

export function approveAttendanceRecord(id: string, user: UserProfile): { success: boolean; message: string } {
  if (user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Security Staff cannot approve attendance records.' };
  }

  const currentAttendance = getAttendanceRecords();
  const idx = currentAttendance.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, message: 'Attendance record not found' };

  currentAttendance[idx].approvalStatus = 'Approved';
  currentAttendance[idx].supervisorName = user.name;
  currentAttendance[idx].updatedAt = new Date().toISOString();

  setStorageItem(STORAGE_KEYS.ATTENDANCE, currentAttendance);

  recordAuditLog({
    module: 'STAFF',
    action: 'APPROVE',
    recordId: currentAttendance[idx].id,
    recordNumber: currentAttendance[idx].staffEmployeeId,
    userName: user.name,
    userRole: user.role,
    details: `Attendance for ${currentAttendance[idx].staffName} approved by supervisor ${user.name}.`,
  });

  return { success: true, message: 'Attendance record approved.' };
}

// Return Material Module
export function getReturns(): ReturnEntry[] {
  return getStorageItem<ReturnEntry[]>(STORAGE_KEYS.RETURNS, INITIAL_RETURNS);
}

export function saveReturnEntry(
  entryData: Omit<ReturnEntry, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'returnEntryNumber' | 'stockPosted' | 'stockStatus'> & {
    id?: string;
    returnEntryNumber?: string;
  },
  user: UserProfile
): ReturnEntry {
  const currentReturns = getReturns();
  const settings = getSecuritySettings();
  const now = new Date().toISOString();

  let entry: ReturnEntry;

  if (entryData.id) {
    const idx = currentReturns.findIndex((r) => r.id === entryData.id);
    if (idx === -1) throw new Error('Return entry not found');

    const existing = currentReturns[idx];
    if (existing.stockPosted) {
      throw new Error('Cannot edit return entry after stock has been posted.');
    }

    entry = {
      ...existing,
      ...entryData,
      id: existing.id,
      returnEntryNumber: existing.returnEntryNumber,
      stockPosted: existing.stockPosted,
      stockStatus: existing.stockStatus,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentReturns[idx] = entry;

    recordAuditLog({
      module: 'RETURN',
      action: 'UPDATE',
      recordId: entry.id,
      recordNumber: entry.returnEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Updated return material inspection for ${entry.partyName}.`,
    });
  } else {
    const nextNum = formatSequenceNumber(settings.returnPrefix, currentReturns.length);
    const gatePassNum = formatSequenceNumber(settings.gatePassPrefix, getGatePasses().length);

    entry = {
      ...entryData,
      id: `ret-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      returnEntryNumber: nextNum,
      gatePassNumber: gatePassNum,
      stockPosted: false,
      stockStatus: 'Pending Approval',
      createdBy: user.name,
      createdAt: now,
      updatedBy: user.name,
      updatedAt: now,
    };
    currentReturns.unshift(entry);

    // Auto-create Return Gate Pass
    const primaryMat = entry.materials.map((m) => `${m.materialName} (${m.returnQuantity} ${m.unit})`).join(', ');
    saveGatePass(
      {
        gatePassNumber: gatePassNum,
        date: entry.returnDate,
        time: entry.returnTime,
        type: 'Return',
        companyName: entry.partyName,
        personName: entry.receivedBy,
        vehicleNumber: entry.vehicleNumber,
        materialDetails: primaryMat,
        quantity: `${entry.materials.reduce((sum, m) => sum + (Number(m.returnQuantity) || 0), 0)} units`,
        referenceInvoiceNumber: entry.originalInvoiceNumber,
        securityStaffName: user.name,
        approvedBy: 'Pending QC Verification',
        remarks: entry.remarks,
        qrPayload: `RAVIRAJA-RET|${nextNum}|${entry.vehicleNumber}|${entry.returnType}`,
        status: 'Active',
      },
      user
    );

    recordAuditLog({
      module: 'RETURN',
      action: 'CREATE',
      recordId: entry.id,
      recordNumber: entry.returnEntryNumber,
      userName: user.name,
      userRole: user.role,
      details: `Created return material entry ${nextNum} (${entry.returnType}) from ${entry.partyName}.`,
    });
  }

  setStorageItem(STORAGE_KEYS.RETURNS, currentReturns);
  return entry;
}

export function approveReturnEntry(
  id: string,
  approvedQty: number,
  rejectedQty: number,
  qualityStatus: ReturnEntry['qualityVerification'],
  user: UserProfile
): { success: boolean; message: string } {
  if (user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Security Staff cannot approve return material inspections.' };
  }

  const currentReturns = getReturns();
  const idx = currentReturns.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, message: 'Return entry not found' };

  const entry = currentReturns[idx];
  entry.status = 'Approved';
  entry.stockStatus = 'Approved';
  entry.approvedBy = user.name;
  entry.approvedQuantity = Number(approvedQty) || 0;
  entry.rejectedQuantity = Number(rejectedQty) || 0;
  entry.qualityVerification = qualityStatus;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentReturns[idx] = entry;
  setStorageItem(STORAGE_KEYS.RETURNS, currentReturns);

  recordAuditLog({
    module: 'RETURN',
    action: 'APPROVE',
    recordId: entry.id,
    recordNumber: entry.returnEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Return entry ${entry.returnEntryNumber} approved by ${user.name}. Approved Qty: ${entry.approvedQuantity}, Rejected Qty: ${entry.rejectedQuantity}. Ready for stock posting.`,
  });

  return { success: true, message: `Return entry ${entry.returnEntryNumber} approved.` };
}

export function postReturnStockToInventory(id: string, user: UserProfile): { success: boolean; message: string } {
  if (user.role === 'SECURITY_STAFF') {
    return { success: false, message: 'Security Staff cannot post stock to CRM inventory.' };
  }

  const currentReturns = getReturns();
  const idx = currentReturns.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, message: 'Return entry not found' };

  const entry = currentReturns[idx];
  if (entry.stockPosted) {
    return { success: false, message: 'Stock has already been posted for this return entry. Duplicate posting prevented.' };
  }

  if (entry.status !== 'Approved') {
    return { success: false, message: 'Return entry must be Approved before posting to inventory.' };
  }

  const inventory = getInventoryItems();
  const result = applyReturnStockPosting(entry, inventory);

  if (!result.success) {
    return { success: false, message: result.error || 'Failed to post stock.' };
  }

  saveInventoryItems(result.updatedInventory);

  entry.stockPosted = true;
  entry.stockStatus = 'Stock Updated';
  entry.stockPostedAt = new Date().toISOString();
  entry.stockPostedBy = user.name;
  entry.updatedBy = user.name;
  entry.updatedAt = new Date().toISOString();

  currentReturns[idx] = entry;
  setStorageItem(STORAGE_KEYS.RETURNS, currentReturns);

  recordAuditLog({
    module: 'STOCK_POSTING',
    action: 'POST_STOCK',
    recordId: entry.id,
    recordNumber: entry.returnEntryNumber,
    userName: user.name,
    userRole: user.role,
    details: `Posted ${entry.approvedQuantity} approved units from return ${entry.returnEntryNumber} into CRM inventory.`,
  });

  return { success: true, message: `Stock of ${entry.approvedQuantity} units successfully posted to CRM Inventory.` };
}
