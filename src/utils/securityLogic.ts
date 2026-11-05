import {
  InwardEntry,
  OutwardEntry,
  VisitorEntry,
  ReturnEntry,
  SecurityAttendance,
  InventoryItem,
  InwardMaterialItem,
  ReturnMaterialItem,
} from '../types/security';

/**
 * Format sequence numbers like INW-2026-0001, GP-2026-0042
 */
export function formatSequenceNumber(prefix: string, currentCount: number, year: number = new Date().getFullYear()): string {
  const nextNumber = currentCount + 1;
  const padded = String(nextNumber).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

/**
 * Calculate quantity differences between invoice and actual received goods
 */
export function calculateQuantityDifference(invoiceQty: number, actualReceivedQty: number): {
  shortage: number;
  excess: number;
  differenceRemarks: string;
} {
  const inv = Number(invoiceQty) || 0;
  const actual = Number(actualReceivedQty) || 0;
  const diff = actual - inv;

  if (diff < 0) {
    const shortage = Math.abs(diff);
    return {
      shortage,
      excess: 0,
      differenceRemarks: `Shortage of ${shortage} units detected compared to invoice.`,
    };
  } else if (diff > 0) {
    return {
      shortage: 0,
      excess: diff,
      differenceRemarks: `Excess of ${diff} units detected over invoiced quantity.`,
    };
  } else {
    return {
      shortage: 0,
      excess: 0,
      differenceRemarks: 'Exact match: Received quantity matches invoice quantity.',
    };
  }
}

/**
 * Calculate attendance working hours and whether entry was late or early exit
 */
export function calculateWorkingHours(
  checkInTime: string,
  checkOutTime?: string,
  scheduledStartTime: string = '09:00',
  scheduledEndTime: string = '18:00'
): {
  workingHours: number;
  isLate: boolean;
  isEarlyExit: boolean;
} {
  if (!checkInTime) {
    return { workingHours: 0, isLate: false, isEarlyExit: false };
  }

  const [inH, inM] = checkInTime.split(':').map(Number);
  const [schedInH, schedInM] = scheduledStartTime.split(':').map(Number);

  const inMinutes = inH * 60 + inM;
  const schedInMinutes = schedInH * 60 + schedInM;

  // Late by more than 15 minutes grace period
  const isLate = inMinutes > schedInMinutes + 15;

  if (!checkOutTime) {
    return { workingHours: 0, isLate, isEarlyExit: false };
  }

  const [outH, outM] = checkOutTime.split(':').map(Number);
  const [schedOutH, schedOutM] = scheduledEndTime.split(':').map(Number);

  let outMinutes = outH * 60 + outM;
  // Handle overnight shift crossing midnight
  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60;
  }

  const schedOutMinutes = schedOutH * 60 + schedOutM;
  const isEarlyExit = outMinutes < schedOutMinutes - 15;

  const totalMinutes = Math.max(0, outMinutes - inMinutes);
  const workingHours = Number((totalMinutes / 60).toFixed(2));

  return { workingHours, isLate, isEarlyExit };
}

/**
 * Calculate total turnaround time (duration) between entry and exit
 */
export function calculateTurnaroundDuration(
  entryDate: string,
  entryTime: string,
  exitDate?: string,
  exitTime?: string
): string {
  if (!entryDate || !entryTime || !exitTime) {
    return 'In Plant';
  }

  const effectiveExitDate = exitDate || entryDate;
  const start = new Date(`${entryDate}T${entryTime}:00`);
  const end = new Date(`${effectiveExitDate}T${exitTime}:00`);

  const diffMs = end.getTime() - start.getTime();
  if (isNaN(diffMs) || diffMs < 0) {
    return `${exitTime} (Departed)`;
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Check if a visitor is currently inside the factory (active duplicate)
 */
export function findActiveDuplicateVisitor(
  visitors: VisitorEntry[],
  mobileNumber: string,
  idProofNumber?: string
): VisitorEntry | null {
  const cleanMobile = mobileNumber.trim();
  const cleanId = idProofNumber?.trim().toLowerCase();

  const found = visitors.find((v) => {
    if (v.status !== 'Inside Factory') return false;
    const matchMobile = v.mobileNumber.trim() === cleanMobile;
    const matchId = cleanId && v.idProofNumber?.trim().toLowerCase() === cleanId;
    return matchMobile || matchId;
  });

  return found || null;
}

/**
 * Pure stock posting evaluation for Inward entries:
 * Returns updated inventory items or errors if duplicate or unapproved.
 */
export function applyInwardStockPosting(
  entry: InwardEntry,
  currentInventory: InventoryItem[]
): {
  success: boolean;
  updatedInventory: InventoryItem[];
  error?: string;
} {
  if (entry.stockPosted) {
    return { success: false, updatedInventory: currentInventory, error: 'Stock has already been posted for this inward entry.' };
  }

  if (entry.status !== 'Approved') {
    return { success: false, updatedInventory: currentInventory, error: 'Cannot post stock for non-approved entry.' };
  }

  const inventoryMap = new Map(currentInventory.map((item) => [item.code.toLowerCase(), { ...item }]));

  for (const mat of entry.materials) {
    const key = mat.materialCode.toLowerCase();
    const existing = inventoryMap.get(key);
    const qtyToAdd = Number(mat.quantityReceived) || 0;

    if (existing) {
      existing.currentStock = Number((existing.currentStock + qtyToAdd).toFixed(2));
      existing.lastUpdated = new Date().toISOString();
    } else {
      // Create new inventory item
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        code: mat.materialCode,
        name: mat.materialName,
        category: mat.materialCategory,
        type: 'Raw Material',
        currentStock: qtyToAdd,
        unit: mat.unit,
        reorderLevel: 500,
        location: 'Raw Material Bay 1',
        lastUpdated: new Date().toISOString(),
      };
      inventoryMap.set(key, newItem);
    }
  }

  return {
    success: true,
    updatedInventory: Array.from(inventoryMap.values()),
  };
}

/**
 * Pure stock posting evaluation for Return entries:
 * Only approved quantity is added back to stock.
 */
export function applyReturnStockPosting(
  entry: ReturnEntry,
  currentInventory: InventoryItem[]
): {
  success: boolean;
  updatedInventory: InventoryItem[];
  error?: string;
} {
  if (entry.stockPosted) {
    return { success: false, updatedInventory: currentInventory, error: 'Stock has already been posted for this return entry.' };
  }

  if (entry.status !== 'Approved') {
    return { success: false, updatedInventory: currentInventory, error: 'Return entry must be Approved before stock posting.' };
  }

  if (entry.approvedQuantity <= 0) {
    return { success: false, updatedInventory: currentInventory, error: 'No approved quantity to post to stock.' };
  }

  const inventoryMap = new Map(currentInventory.map((item) => [item.code.toLowerCase(), { ...item }]));

  // Ratio of approved vs total return quantity
  const totalReturnQty = entry.materials.reduce((sum, m) => sum + (Number(m.returnQuantity) || 0), 0);
  const ratio = totalReturnQty > 0 ? entry.approvedQuantity / totalReturnQty : 1;

  for (const mat of entry.materials) {
    const key = mat.materialCode.toLowerCase();
    const existing = inventoryMap.get(key);
    const approvedPortion = Number(((Number(mat.returnQuantity) || 0) * ratio).toFixed(2));

    if (existing) {
      existing.currentStock = Number((existing.currentStock + approvedPortion).toFixed(2));
      existing.lastUpdated = new Date().toISOString();
    } else {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        code: mat.materialCode,
        name: mat.materialName,
        category: 'Other Materials',
        type: 'Raw Material',
        currentStock: approvedPortion,
        unit: mat.unit,
        reorderLevel: 100,
        location: 'Return Inspection Bay',
        lastUpdated: new Date().toISOString(),
      };
      inventoryMap.set(key, newItem);
    }
  }

  return {
    success: true,
    updatedInventory: Array.from(inventoryMap.values()),
  };
}

/**
 * Aggregate Security Dashboard Metrics
 */
export function computeSecurityDashboardStats(
  inwards: InwardEntry[],
  outwards: OutwardEntry[],
  visitors: VisitorEntry[],
  returns: ReturnEntry[],
  staffList: SecurityAttendance[],
  todayStr: string = new Date().toISOString().split('T')[0]
) {
  const todayInwards = inwards.filter((i) => i.entryDate === todayStr);
  const todayOutwards = outwards.filter((o) => o.dispatchDate === todayStr);

  const visitorsCurrentlyInside = visitors.filter((v) => v.status === 'Inside Factory').length;
  const totalVisitorsToday = visitors.filter((v) => v.entryDate === todayStr).length;

  const staffPresentToday = staffList.filter(
    (s) => s.attendanceDate === todayStr && (s.status === 'Present' || s.status === 'Half Day')
  ).length;

  const pendingInwardApprovals = inwards.filter((i) => i.status === 'Pending' || i.status === 'Verified').length;
  const pendingOutwardApprovals = outwards.filter((o) => o.status === 'Pending').length;
  const pendingReturnApprovals = returns.filter((r) => r.status === 'Pending' || r.status === 'Verified').length;

  const totalMaterialReceivedToday = todayInwards.reduce((acc, curr) => acc + (Number(curr.actualReceivedQuantity) || 0), 0);
  const totalMaterialDispatchedToday = todayOutwards.reduce((acc, curr) => {
    const rowSum = curr.materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    return acc + rowSum;
  }, 0);

  return {
    todayInwardCount: todayInwards.length,
    todayOutwardCount: todayOutwards.length,
    visitorsCurrentlyInside,
    totalVisitorsToday,
    staffPresentToday,
    pendingInwardApprovals,
    pendingOutwardApprovals,
    pendingReturnApprovals,
    totalMaterialReceivedToday,
    totalMaterialDispatchedToday,
  };
}
