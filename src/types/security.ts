export type UserRole = 'ADMIN' | 'SECURITY_SUPERVISOR' | 'SECURITY_STAFF';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  badgeNumber: string;
  avatar?: string;
  department: string;
}

export type MaterialCategory =
  | 'PVC Resin'
  | 'CPE'
  | 'Processing Aid'
  | 'PE Wax'
  | 'Titanium Dioxide'
  | 'Calcium Carbonate'
  | 'Stabilizer'
  | 'Lubricants'
  | 'Granules'
  | 'Gasket'
  | 'Chemicals'
  | 'Packing Materials'
  | 'Hardware'
  | 'Other Materials'
  | (string & {});

export type MaterialUnit = 'KG' | 'Bags' | 'Pieces' | 'Boxes' | 'Ton' | 'Meters';

export type InwardApprovalStatus = 'Pending' | 'Verified' | 'Approved' | 'Rejected';

export interface InwardMaterialItem {
  id: string;
  materialName: string;
  materialCode: string;
  materialCategory: MaterialCategory;
  materialType: string;
  quantityReceived: number;
  unit: MaterialUnit;
  numberOfPackages: number;
  batchNumber: string;
  materialDescription: string;
}

export interface InwardEntry {
  id: string;
  inwardEntryNumber: string; // e.g. INW-2026-0001
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:MM
  exitDate?: string; // YYYY-MM-DD
  exitTime?: string; // HH:MM
  vehicleExitStatus?: 'Inside Factory' | 'Exited';
  supplierName: string;
  supplierCompanyName: string;
  supplierMobileNumber: string;
  supplierAddress: string;
  vehicleNumber: string;
  driverName: string;
  driverMobileNumber: string;
  materials: InwardMaterialItem[];
  invoiceQuantity: number;
  actualReceivedQuantity: number;
  shortageQuantity: number;
  excessQuantity: number;
  differenceRemarks: string;
  verifiedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  status: InwardApprovalStatus;
  isDraft?: boolean;
  documents: {
    invoicePhotoUrl?: string;
    materialPhotoUrl?: string;
    vehiclePhotoUrl?: string;
    weighmentSlipUrl?: string;
    otherDocumentUrl?: string;
  };
  gatePassNumber?: string;
  stockPosted: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type OutwardStatus = 'Pending' | 'Approved' | 'Ready for Dispatch' | 'Dispatched' | 'Rejected';

export interface OutwardMaterialItem {
  id: string;
  materialName: string;
  materialCode: string;
  quantity: number;
  unit: MaterialUnit;
  numberOfPackages: number;
  batchNumber: string;
  description: string;
}

export interface OutwardEntry {
  id: string;
  outwardEntryNumber: string; // OUT-2026-0001
  dispatchDate: string;
  dispatchTime: string;
  customerName: string;
  customerCompanyName: string;
  customerMobileNumber: string;
  customerAddress: string;
  gstNumber: string;
  vehicleNumber: string;
  driverName: string;
  driverMobileNumber: string;
  salesInvoiceNumber: string;
  gatePassNumber: string; // GP-OUT-2026-0001
  dispatchPurpose: string;
  transportName: string;
  destination: string;
  materials: OutwardMaterialItem[];
  invoiceVerification: boolean;
  vehicleNumberVerification: boolean;
  materialQuantityVerification: boolean;
  verifiedBy: string;
  securityRemarks: string;
  status: OutwardStatus;
  isDraft?: boolean;
  documents: {
    salesInvoiceUrl?: string;
    gatePassUrl?: string;
    vehiclePhotoUrl?: string;
    materialLoadingPhotoUrl?: string;
    otherDocumentUrl?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type VisitorType =
  | 'Customer'
  | 'Supplier'
  | 'Dealer'
  | 'Fabricator'
  | 'Contractor'
  | 'Guest'
  | 'Other';

export type VisitorStatus = 'Inside Factory' | 'Checked Out' | 'Cancelled';

export interface VisitorEntry {
  id: string;
  visitorId: string; // VIS-2026-0001
  visitorName: string;
  companyName: string;
  mobileNumber: string;
  address: string;
  idProofType: 'Aadhaar Card' | 'PAN Card' | 'Driving License' | 'Voter ID' | 'Passport' | 'Company ID';
  idProofNumber: string;
  visitorPhotoUrl?: string;
  idProofUploadUrl?: string;
  purposeOfVisit: string;
  personToMeet: string;
  department: string;
  visitorType: VisitorType;
  entryDate: string;
  entryTime: string;
  exitDate?: string;
  exitTime?: string;
  visitorPassNumber: string; // VP-2026-0001
  securityStaffName: string;
  status: VisitorStatus;
  vehicleNumber?: string;
  remarks?: string;
  overrideAuthorized?: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Leave';
export type ShiftType = 'Morning Shift (06:00 - 14:00)' | 'General Shift (09:00 - 18:00)' | 'Evening Shift (14:00 - 22:00)' | 'Night Shift (22:00 - 06:00)';

export interface SecurityStaff {
  id: string;
  employeeId: string; // SEC-EMP-01
  name: string;
  mobileNumber: string;
  designation: 'Security Guard' | 'Head Guard' | 'Security Supervisor' | 'Gate Officer';
  shiftType: ShiftType;
  shiftStartTime: string; // HH:MM
  shiftEndTime: string; // HH:MM
  isActive: boolean;
  photoUrl?: string;
  joinedDate: string;
}

export interface SecurityAttendance {
  id: string;
  staffId: string;
  staffEmployeeId: string;
  staffName: string;
  attendanceDate: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM
  checkOutTime?: string; // HH:MM
  totalWorkingHours?: number; // e.g. 8.5
  status: AttendanceStatus;
  staffPhotoUrl?: string;
  supervisorName: string;
  remarks?: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  isLateEntry?: boolean;
  isEarlyExit?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReturnType = 'Customer Return' | 'Supplier Return' | 'Sales Return' | 'Other';
export type ReturnStockStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Stock Updated';

export interface ReturnMaterialItem {
  id: string;
  materialName: string;
  materialCode: string;
  returnQuantity: number;
  unit: MaterialUnit;
  batchNumber: string;
  materialCondition: 'Good / Unopened' | 'Opened / Partially Used' | 'Damaged' | 'Defective Profile' | 'Quality Issue';
  returnReason: string;
  photoUrl?: string;
}

export interface ReturnEntry {
  id: string;
  returnEntryNumber: string; // RET-2026-0001
  returnDate: string;
  returnTime: string;
  returnType: ReturnType;
  originalInvoiceNumber: string;
  partyName: string; // Customer or Supplier Name
  vehicleNumber: string;
  gatePassNumber: string;
  materials: ReturnMaterialItem[];
  receivedBy: string;
  verifiedBy: string;
  approvedBy?: string;
  qualityVerification: 'Passed' | 'Under Inspection' | 'Failed' | 'Conditional Acceptance';
  approvedQuantity: number;
  rejectedQuantity: number;
  returnAmount: number;
  remarks: string;
  status: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
  stockStatus: ReturnStockStatus;
  stockPosted: boolean;
  stockPostedAt?: string;
  stockPostedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type GatePassType = 'Inward' | 'Outward' | 'Return' | 'Visitor';

export interface GatePass {
  id: string;
  gatePassNumber: string; // GP-2026-0001
  date: string;
  time: string;
  type: GatePassType;
  companyName: string;
  personName: string;
  vehicleNumber: string;
  materialDetails: string;
  quantity: string;
  referenceInvoiceNumber: string;
  securityStaffName: string;
  approvedBy: string;
  remarks: string;
  qrPayload: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  module: 'INWARD' | 'OUTWARD' | 'VISITOR' | 'STAFF' | 'RETURN' | 'GATE_PASS' | 'SETTINGS' | 'STOCK_POSTING';
  action: 'CREATE' | 'UPDATE' | 'VERIFY' | 'APPROVE' | 'REJECT' | 'CHECK_IN' | 'CHECK_OUT' | 'POST_STOCK' | 'DELETE';
  recordId: string;
  recordNumber: string;
  userName: string;
  userRole: UserRole;
  details: string;
  changes?: Record<string, { from: any; to: any }>;
}

export interface SecuritySettings {
  inwardPrefix: string;
  outwardPrefix: string;
  visitorPrefix: string;
  gatePassPrefix: string;
  returnPrefix: string;
  requireSupervisorApprovalForInward: boolean;
  requireSupervisorApprovalForOutward: boolean;
  requireSupervisorApprovalForReturn: boolean;
  preventDuplicateVisitorCheckin: boolean;
  allowCameraCapture: boolean;
  companyName: string;
  plantAddress: string;
  gstNumber: string;
  emergencyContact: string;
}

// CRM Entities for seamless integration
export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory | 'UPVC Profile' | 'UPVC Pipes' | 'Finished Door/Window';
  type: 'Raw Material' | 'Finished Good' | 'Packing' | 'Chemical';
  currentStock: number;
  unit: MaterialUnit;
  reorderLevel: number;
  location: string;
  lastUpdated: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  company: string;
  phone: string;
  address: string;
  gstNumber: string;
  balance: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  company: string;
  phone: string;
  address: string;
  suppliedMaterials: string[];
}
