import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSequenceNumber,
  calculateQuantityDifference,
  calculateWorkingHours,
  findActiveDuplicateVisitor,
  applyInwardStockPosting,
  applyReturnStockPosting,
  calculateTurnaroundDuration,
  computeSecurityDashboardStats,
} from './securityLogic';
import { InwardEntry, ReturnEntry, VisitorEntry, InventoryItem } from '../types/security';

test('formatSequenceNumber pads numbers correctly', () => {
  assert.equal(formatSequenceNumber('INW', 0, 2026), 'INW-2026-0001');
  assert.equal(formatSequenceNumber('GP', 99, 2026), 'GP-2026-0100');
  assert.equal(formatSequenceNumber('VIS', 1234, 2026), 'VIS-2026-1235');
});

test('calculateQuantityDifference identifies shortage, excess, and exact matches', () => {
  const match = calculateQuantityDifference(1000, 1000);
  assert.equal(match.shortage, 0);
  assert.equal(match.excess, 0);
  assert.match(match.differenceRemarks, /Exact match/);

  const shortage = calculateQuantityDifference(1000, 950);
  assert.equal(shortage.shortage, 50);
  assert.equal(shortage.excess, 0);
  assert.match(shortage.differenceRemarks, /Shortage of 50 units/);

  const excess = calculateQuantityDifference(1000, 1050);
  assert.equal(excess.shortage, 0);
  assert.equal(excess.excess, 50);
  assert.match(excess.differenceRemarks, /Excess of 50 units/);
});

test('calculateWorkingHours computes hours and flags late entry', () => {
  // On time 09:00 to 18:00
  const normal = calculateWorkingHours('09:00', '18:00', '09:00', '18:00');
  assert.equal(normal.workingHours, 9);
  assert.equal(normal.isLate, false);
  assert.equal(normal.isEarlyExit, false);

  // Late check-in at 09:30
  const late = calculateWorkingHours('09:30', '18:00', '09:00', '18:00');
  assert.equal(late.workingHours, 8.5);
  assert.equal(late.isLate, true);

  // Early exit at 16:00
  const early = calculateWorkingHours('09:00', '16:00', '09:00', '18:00');
  assert.equal(early.workingHours, 7);
  assert.equal(early.isEarlyExit, true);
});

test('findActiveDuplicateVisitor detects visitors currently inside', () => {
  const visitors: VisitorEntry[] = [
    {
      id: 'v1',
      visitorId: 'VIS-2026-0001',
      visitorName: 'Rajesh Sharma',
      companyName: 'Techno Plast',
      mobileNumber: '9876543210',
      address: 'Ahmedabad',
      idProofType: 'Aadhaar Card',
      idProofNumber: '4455-6677-8899',
      purposeOfVisit: 'Vendor Meeting',
      personToMeet: 'Plant Manager',
      department: 'Production',
      visitorType: 'Supplier',
      entryDate: '2026-11-04',
      entryTime: '10:00',
      visitorPassNumber: 'VP-2026-0001',
      securityStaffName: 'Ramesh Singh',
      status: 'Inside Factory',
      createdBy: 'Ramesh Singh',
      createdAt: new Date().toISOString(),
      updatedBy: 'Ramesh Singh',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'v2',
      visitorId: 'VIS-2026-0002',
      visitorName: 'Amit Patel',
      companyName: 'Apex Tools',
      mobileNumber: '9822233344',
      address: 'Surat',
      idProofType: 'PAN Card',
      idProofNumber: 'ABCDE1234F',
      purposeOfVisit: 'Maintenance',
      personToMeet: 'Maintenance Eng',
      department: 'Maintenance',
      visitorType: 'Contractor',
      entryDate: '2026-11-04',
      entryTime: '09:00',
      exitDate: '2026-11-04',
      exitTime: '11:00',
      visitorPassNumber: 'VP-2026-0002',
      securityStaffName: 'Ramesh Singh',
      status: 'Checked Out',
      createdBy: 'Ramesh Singh',
      createdAt: new Date().toISOString(),
      updatedBy: 'Ramesh Singh',
      updatedAt: new Date().toISOString(),
    },
  ];

  // Should detect Rajesh because status is 'Inside Factory'
  const dup1 = findActiveDuplicateVisitor(visitors, '9876543210');
  assert.ok(dup1);
  assert.equal(dup1?.visitorName, 'Rajesh Sharma');

  // Matching ID proof number
  const dup2 = findActiveDuplicateVisitor(visitors, '9999999999', '4455-6677-8899');
  assert.ok(dup2);
  assert.equal(dup2?.visitorName, 'Rajesh Sharma');

  // Amit Patel is 'Checked Out', so re-entering with his number is NOT flagged as active inside
  const dup3 = findActiveDuplicateVisitor(visitors, '9822233344');
  assert.equal(dup3, null);
});

test('applyInwardStockPosting updates stock atomically and rejects unapproved or duplicate postings', () => {
  const initialInventory: InventoryItem[] = [
    {
      id: 'inv-1',
      code: 'RM-PVC-K67',
      name: 'PVC Resin Grade K-67',
      category: 'PVC Resin',
      type: 'Raw Material',
      currentStock: 10000,
      unit: 'KG',
      reorderLevel: 3000,
      location: 'Silo A1',
      lastUpdated: '2026-11-01T00:00:00.000Z',
    },
  ];

  const approvedEntry: InwardEntry = {
    id: 'inw-1',
    inwardEntryNumber: 'INW-2026-0001',
    entryDate: '2026-11-04',
    entryTime: '11:00',
    supplierName: 'Reliance Polymers',
    supplierCompanyName: 'Reliance Industries Ltd',
    supplierMobileNumber: '9988776655',
    supplierAddress: 'Dahej Plant',
    vehicleNumber: 'GJ-16-AB-1234',
    driverName: 'Mohan Kumar',
    driverMobileNumber: '9123456789',
    materials: [
      {
        id: 'mat-1',
        materialName: 'PVC Resin Grade K-67',
        materialCode: 'RM-PVC-K67',
        materialCategory: 'PVC Resin',
        materialType: 'Virgin Powder',
        quantityReceived: 5000,
        unit: 'KG',
        numberOfPackages: 200,
        batchNumber: 'B-2611-99',
        materialDescription: '5000kg virgin PVC resin bags',
      },
    ],
    invoiceQuantity: 5000,
    actualReceivedQuantity: 5000,
    shortageQuantity: 0,
    excessQuantity: 0,
    differenceRemarks: 'Exact match',
    verifiedBy: 'Sanjay Sharma',
    status: 'Approved',
    stockPosted: false,
    documents: {},
    createdBy: 'Sanjay Sharma',
    createdAt: '2026-11-04T11:00:00.000Z',
    updatedBy: 'Sanjay Sharma',
    updatedAt: '2026-11-04T11:30:00.000Z',
  };

  const res = applyInwardStockPosting(approvedEntry, initialInventory);
  assert.equal(res.success, true);
  const updatedItem = res.updatedInventory.find((i) => i.code === 'RM-PVC-K67');
  assert.equal(updatedItem?.currentStock, 15000);

  // If already posted, should fail
  const duplicatePosting = applyInwardStockPosting({ ...approvedEntry, stockPosted: true }, initialInventory);
  assert.equal(duplicatePosting.success, false);
  assert.match(duplicatePosting.error || '', /already been posted/);

  // If pending, should fail
  const pendingPosting = applyInwardStockPosting({ ...approvedEntry, status: 'Pending' }, initialInventory);
  assert.equal(pendingPosting.success, false);
  assert.match(pendingPosting.error || '', /non-approved/);
});

test('applyReturnStockPosting only adds approved quantity to inventory', () => {
  const initialInventory: InventoryItem[] = [
    {
      id: 'inv-gasket',
      code: 'RM-GSK-EPDM',
      name: 'EPDM Rubber Gasket',
      category: 'Gasket',
      type: 'Raw Material',
      currentStock: 1000,
      unit: 'KG',
      reorderLevel: 200,
      location: 'Rack G-2',
      lastUpdated: '2026-11-01T00:00:00.000Z',
    },
  ];

  const returnEntry: ReturnEntry = {
    id: 'ret-1',
    returnEntryNumber: 'RET-2026-0001',
    returnDate: '2026-11-04',
    returnTime: '14:00',
    returnType: 'Customer Return',
    originalInvoiceNumber: 'INV-2026-888',
    partyName: 'Star Window Systems',
    vehicleNumber: 'MH-04-AZ-9988',
    gatePassNumber: 'GP-RET-0001',
    materials: [
      {
        id: 'rm-1',
        materialName: 'EPDM Rubber Gasket',
        materialCode: 'RM-GSK-EPDM',
        returnQuantity: 200,
        unit: 'KG',
        batchNumber: 'B-77',
        materialCondition: 'Opened / Partially Used',
        returnReason: 'Color shade difference',
      },
    ],
    receivedBy: 'Ramesh Guard',
    verifiedBy: 'Sanjay Supervisor',
    qualityVerification: 'Passed',
    approvedQuantity: 150, // Only 150 accepted, 50 rejected
    rejectedQuantity: 50,
    returnAmount: 18000,
    remarks: '150kg reusable, 50kg damaged scrap',
    status: 'Approved',
    stockStatus: 'Approved',
    stockPosted: false,
    createdBy: 'Ramesh Guard',
    createdAt: '2026-11-04T14:00:00.000Z',
    updatedBy: 'Sanjay Supervisor',
    updatedAt: '2026-11-04T14:30:00.000Z',
  };

  const res = applyReturnStockPosting(returnEntry, initialInventory);
  assert.equal(res.success, true);
  const updatedItem = res.updatedInventory.find((i) => i.code === 'RM-GSK-EPDM');
  assert.equal(updatedItem?.currentStock, 1150); // 1000 + 150 approved
});

test('calculateTurnaroundDuration calculates elapsed time or in plant status', () => {
  assert.equal(calculateTurnaroundDuration('2026-11-04', '09:00', '2026-11-04', '11:30'), '2h 30m');
  assert.equal(calculateTurnaroundDuration('2026-11-04', '10:00', '2026-11-04', '10:45'), '45m');
  assert.equal(calculateTurnaroundDuration('2026-11-04', '10:00'), 'In Plant');
});

