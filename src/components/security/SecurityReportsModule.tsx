import React, { useState } from 'react';
import {
  FileBarChart2,
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
  Search,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  InwardEntry,
  OutwardEntry,
  VisitorEntry,
  ReturnEntry,
  SecurityAttendance,
  GatePass,
  Supplier,
  Customer,
} from '../../types/security';
import { calculateTurnaroundDuration } from '../../utils/securityLogic';

interface SecurityReportsModuleProps {
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  visitors: VisitorEntry[];
  returns: ReturnEntry[];
  attendance: SecurityAttendance[];
  gatePasses: GatePass[];
  suppliers: Supplier[];
  customers: Customer[];
}

type ReportType =
  | 'DAILY_INWARD'
  | 'MONTHLY_INWARD'
  | 'SUPPLIER_INWARD'
  | 'MATERIAL_INWARD'
  | 'DAILY_OUTWARD'
  | 'MONTHLY_OUTWARD'
  | 'CUSTOMER_OUTWARD'
  | 'VEHICLE_MOVEMENT'
  | 'VISITOR_REGISTER'
  | 'STAFF_ATTENDANCE'
  | 'RETURN_MATERIAL'
  | 'GATE_PASS_REGISTER'
  | 'PENDING_APPROVALS';

export const SecurityReportsModule: React.FC<SecurityReportsModuleProps> = ({
  inwards,
  outwards,
  visitors,
  returns,
  attendance,
  gatePasses,
  suppliers,
  customers,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('DAILY_INWARD');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filters
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [filterParty, setFilterParty] = useState('ALL');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Compute table data based on selected report
  let reportTitle = '';
  let tableHeaders: string[] = [];
  let tableRows: any[][] = [];

  switch (selectedReport) {
    case 'DAILY_INWARD':
    case 'MONTHLY_INWARD':
    case 'SUPPLIER_INWARD':
    case 'MATERIAL_INWARD': {
      reportTitle =
        selectedReport === 'SUPPLIER_INWARD'
          ? 'Supplier-wise Raw Material Inward Report'
          : selectedReport === 'MATERIAL_INWARD'
          ? 'Material-wise Consignment Receiving Report'
          : selectedReport === 'MONTHLY_INWARD'
          ? 'Monthly Inward Register'
          : 'Daily Inward Gate Register';

      tableHeaders = [
        'Inward #',
        'Gate In',
        'Gate Out',
        'Turnaround',
        'Supplier Name',
        'Vehicle #',
        'Material Name',
        'Batch',
        'Invoice Qty',
        'Received Qty',
        'Shortage',
        'Status',
      ];

      const filtered = inwards.filter((i) => {
        const matchFrom = !fromDate || i.entryDate >= fromDate;
        const matchTo = !toDate || i.entryDate <= toDate;
        const matchParty = filterParty === 'ALL' || i.supplierCompanyName === filterParty;
        const matchVehicle = !filterVehicle || i.vehicleNumber.toLowerCase().includes(filterVehicle.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || i.status === filterStatus;
        return matchFrom && matchTo && matchParty && matchVehicle && matchStatus;
      });

      tableRows = filtered.map((i) => [
        i.inwardEntryNumber,
        `${i.entryDate} ${i.entryTime}`,
        i.exitTime ? `${i.exitDate || i.entryDate} ${i.exitTime}` : 'Inside Plant',
        i.exitTime ? calculateTurnaroundDuration(i.entryDate, i.entryTime, i.exitDate, i.exitTime) : 'In Plant',
        i.supplierCompanyName,
        i.vehicleNumber,
        i.materials[0]?.materialName || 'Material',
        i.materials[0]?.batchNumber || '-',
        `${i.invoiceQuantity} KG`,
        `${i.actualReceivedQuantity} KG`,
        `${i.shortageQuantity} KG`,
        i.status,
      ]);
      break;
    }

    case 'DAILY_OUTWARD':
    case 'MONTHLY_OUTWARD':
    case 'CUSTOMER_OUTWARD': {
      reportTitle =
        selectedReport === 'CUSTOMER_OUTWARD'
          ? 'Customer-wise Dispatch & Sales Delivery Report'
          : selectedReport === 'MONTHLY_OUTWARD'
          ? 'Monthly Outward Register'
          : 'Daily Sales Dispatch Register';

      tableHeaders = [
        'Outward #',
        'Date & Time',
        'Customer Name',
        'Vehicle #',
        'Sales Invoice #',
        'Gate Pass #',
        'Total Items',
        'Status',
      ];

      const filtered = outwards.filter((o) => {
        const matchFrom = !fromDate || o.dispatchDate >= fromDate;
        const matchTo = !toDate || o.dispatchDate <= toDate;
        const matchParty = filterParty === 'ALL' || o.customerCompanyName === filterParty;
        const matchVehicle = !filterVehicle || o.vehicleNumber.toLowerCase().includes(filterVehicle.toLowerCase());
        const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
        return matchFrom && matchTo && matchParty && matchVehicle && matchStatus;
      });

      tableRows = filtered.map((o) => [
        o.outwardEntryNumber,
        `${o.dispatchDate} ${o.dispatchTime}`,
        o.customerCompanyName,
        o.vehicleNumber,
        o.salesInvoiceNumber,
        o.gatePassNumber,
        `${o.materials.reduce((s, m) => s + (Number(m.quantity) || 0), 0)} Pcs`,
        o.status,
      ]);
      break;
    }

    case 'VEHICLE_MOVEMENT': {
      reportTitle = 'Consolidated Vehicle Movement & Gate Log';
      tableHeaders = ['Gate Pass #', 'Date & Time', 'Movement Type', 'Vehicle Number', 'Party / Driver', 'Material Details', 'Status'];

      const filtered = gatePasses.filter((gp) => {
        const matchFrom = !fromDate || gp.date >= fromDate;
        const matchTo = !toDate || gp.date <= toDate;
        const matchVehicle = !filterVehicle || gp.vehicleNumber.toLowerCase().includes(filterVehicle.toLowerCase());
        return matchFrom && matchTo && matchVehicle;
      });

      tableRows = filtered.map((gp) => [
        gp.gatePassNumber,
        `${gp.date} ${gp.time}`,
        gp.type,
        gp.vehicleNumber,
        `${gp.companyName} (${gp.personName})`,
        gp.materialDetails,
        gp.status,
      ]);
      break;
    }

    case 'VISITOR_REGISTER': {
      reportTitle = 'Visitor Entry & Exit Register';
      tableHeaders = [
        'Pass #',
        'Visitor Name',
        'Company',
        'Mobile',
        'Person To Meet',
        'Department',
        'Gate In',
        'Gate Out',
        'Visit Duration',
        'Status',
      ];

      const filtered = visitors.filter((v) => {
        const matchFrom = !fromDate || v.entryDate >= fromDate;
        const matchTo = !toDate || v.entryDate <= toDate;
        return matchFrom && matchTo;
      });

      tableRows = filtered.map((v) => [
        v.visitorPassNumber,
        v.visitorName,
        v.companyName,
        v.mobileNumber,
        v.personToMeet,
        v.department,
        `${v.entryDate} ${v.entryTime}`,
        v.exitTime ? `${v.exitDate || v.entryDate} ${v.exitTime}` : 'Inside Factory',
        v.exitTime ? calculateTurnaroundDuration(v.entryDate, v.entryTime, v.exitDate, v.exitTime) : 'Active',
        v.status,
      ]);
      break;
    }

    case 'STAFF_ATTENDANCE': {
      reportTitle = 'Security Staff Attendance & Shift Performance Report';
      tableHeaders = ['Staff Name', 'Emp ID', 'Date', 'In Time', 'Out Time', 'Hours', 'Late Entry', 'Status', 'Supervisor'];

      const filtered = attendance.filter((a) => {
        const matchFrom = !fromDate || a.attendanceDate >= fromDate;
        const matchTo = !toDate || a.attendanceDate <= toDate;
        return matchFrom && matchTo;
      });

      tableRows = filtered.map((a) => [
        a.staffName,
        a.staffEmployeeId,
        a.attendanceDate,
        a.checkInTime,
        a.checkOutTime || '-',
        a.totalWorkingHours ? `${a.totalWorkingHours} hrs` : '-',
        a.isLateEntry ? 'YES' : 'NO',
        a.status,
        a.supervisorName,
      ]);
      break;
    }

    case 'RETURN_MATERIAL': {
      reportTitle = 'Return Material & QC Inspection Register';
      tableHeaders = ['Return #', 'Date', 'Type', 'Party Name', 'Invoice #', 'Vehicle', 'Approved Qty', 'Rejected Qty', 'QC Status', 'Stock Updated'];

      tableRows = returns.map((r) => [
        r.returnEntryNumber,
        r.returnDate,
        r.returnType,
        r.partyName,
        r.originalInvoiceNumber,
        r.vehicleNumber,
        r.approvedQuantity,
        r.rejectedQuantity,
        r.qualityVerification,
        r.stockPosted ? 'YES' : 'NO',
      ]);
      break;
    }

    case 'GATE_PASS_REGISTER': {
      reportTitle = 'Master Gate Pass Register';
      tableHeaders = ['Gate Pass #', 'Date & Time', 'Type', 'Company', 'Vehicle', 'Materials', 'Approved By', 'Status'];

      tableRows = gatePasses.map((gp) => [
        gp.gatePassNumber,
        `${gp.date} ${gp.time}`,
        gp.type,
        gp.companyName,
        gp.vehicleNumber,
        gp.materialDetails,
        gp.approvedBy,
        gp.status,
      ]);
      break;
    }

    case 'PENDING_APPROVALS': {
      reportTitle = 'Pending Security Approvals & Inspection Queue';
      tableHeaders = ['Record #', 'Module', 'Date', 'Party / Counterparty', 'Vehicle #', 'Material / Reason', 'Status'];

      const pendingIn = inwards
        .filter((i) => i.status === 'Pending' || i.status === 'Verified')
        .map((i) => [i.inwardEntryNumber, 'Inward Raw Material', i.entryDate, i.supplierCompanyName, i.vehicleNumber, i.materials[0]?.materialName || 'Material', i.status]);

      const pendingOut = outwards
        .filter((o) => o.status === 'Pending')
        .map((o) => [o.outwardEntryNumber, 'Sales Dispatch', o.dispatchDate, o.customerCompanyName, o.vehicleNumber, 'Finished Goods', o.status]);

      const pendingRet = returns
        .filter((r) => r.status === 'Pending')
        .map((r) => [r.returnEntryNumber, 'Return Material', r.returnDate, r.partyName, r.vehicleNumber, 'QC Inspection Req', r.status]);

      tableRows = [...pendingIn, ...pendingOut, ...pendingRet];
      break;
    }
  }

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [tableHeaders.join(','), ...tableRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raviraja_${selectedReport}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & Gate Pass Reports</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Audit-ready registers for ISO 9001:2015 plant compliance, vehicle logistics & daily vigilance reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
          Select Standard Security Report (13 Types)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'DAILY_INWARD', label: 'Daily Inward Register' },
            { id: 'MONTHLY_INWARD', label: 'Monthly Inward Register' },
            { id: 'SUPPLIER_INWARD', label: 'Supplier-wise Inward' },
            { id: 'MATERIAL_INWARD', label: 'Material-wise Inward' },
            { id: 'DAILY_OUTWARD', label: 'Daily Outward Register' },
            { id: 'MONTHLY_OUTWARD', label: 'Monthly Outward Register' },
            { id: 'CUSTOMER_OUTWARD', label: 'Customer-wise Dispatch' },
            { id: 'VEHICLE_MOVEMENT', label: 'Vehicle Movement Log' },
            { id: 'VISITOR_REGISTER', label: 'Visitor Register' },
            { id: 'STAFF_ATTENDANCE', label: 'Staff Attendance Report' },
            { id: 'RETURN_MATERIAL', label: 'Return Material Report' },
            { id: 'GATE_PASS_REGISTER', label: 'Gate Pass Register' },
            { id: 'PENDING_APPROVALS', label: 'Pending Approvals Queue' },
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id as ReportType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedReport === rep.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
          />
        </div>
        <div>
          <label className="block text-slate-600 font-semibold mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
          />
        </div>
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Vehicle Filter</label>
          <input
            type="text"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            placeholder="e.g. GJ-16"
            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs uppercase"
          />
        </div>
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Status Filter</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
              setFilterVehicle('');
              setFilterStatus('ALL');
              setFilterParty('ALL');
            }}
            className="w-full px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Printable Report View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        {/* Printable Letterhead */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Raviraja Industries • Security Department
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">{reportTitle}</h2>
              <p className="text-slate-500 text-[11px]">
                Showing {tableRows.length} recorded entries {fromDate && toDate ? `(${fromDate} to ${toDate})` : ''}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>Generated: {new Date().toLocaleString()}</p>
              <p className="font-semibold text-slate-700">Naroda Plant Gate 1</p>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
              <tr>
                {tableHeaders.map((head, i) => (
                  <th key={i} className="p-3">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-8 text-center text-slate-400">
                    No matching records found for the selected report filters.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3">
                        <span className="text-slate-800">{cell}</span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
