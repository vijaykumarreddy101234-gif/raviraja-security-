import React, { useMemo, useState } from 'react';
import {
  UserCheck,
  Plus,
  Clock,
  Camera,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Search,
  Users,
  Shield,
  Calendar,
} from 'lucide-react';
import {
  SecurityStaff,
  SecurityAttendance,
  AttendanceStatus,
  ShiftType,
  UserProfile,
} from '../../types/security';
import { calculateWorkingHours } from '../../utils/securityLogic';
import { alertDialog, confirmDialog } from '../common/Dialogs';
import { isValidMobile, normalizeMobile } from '../../utils/validators';
import { useListControls, ListExtras, Pagination, ExportMenu, useExportPdf, downloadCsv } from '../common/listKit';

interface SecurityStaffModuleProps {
  staffList: SecurityStaff[];
  attendanceRecords: SecurityAttendance[];
  currentUser: UserProfile;
  onSaveStaff: (staffData: any) => void;
  onRecordAttendance: (recordData: any) => void;
  onApproveAttendance: (id: string) => void;
}

const SHIFTS: ShiftType[] = [
  'Morning Shift (06:00 - 14:00)',
  'General Shift (09:00 - 18:00)',
  'Evening Shift (14:00 - 22:00)',
  'Night Shift (22:00 - 06:00)',
];

export const SecurityStaffModule: React.FC<SecurityStaffModuleProps> = ({
  staffList,
  attendanceRecords,
  currentUser,
  onSaveStaff,
  onRecordAttendance,
  onApproveAttendance,
}) => {
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'ROSTER' | 'REPORTS'>('ATTENDANCE');
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [newStaffModalOpen, setNewStaffModalOpen] = useState(false);

  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Attendance Form
  const [attFormData, setAttFormData] = useState({
    staffId: staffList[0]?.id || '',
    attendanceDate: defaultDate,
    checkInTime: defaultTime,
    checkOutTime: '',
    status: 'Present' as AttendanceStatus,
    staffPhotoUrl: '',
    remarks: 'On duty at Main Gate & Scale 1',
  });

  // New Staff Form
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    mobileNumber: '',
    designation: 'Security Guard' as const,
    shiftType: 'General Shift (09:00 - 18:00)' as ShiftType,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
  });

  const handleMarkAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === attFormData.staffId);
    if (!staff) {
      alertDialog('Please select staff member');
      return;
    }

    if (attFormData.attendanceDate > defaultDate) {
      alertDialog('Attendance date cannot be in the future.');
      return;
    }
    if (attFormData.checkOutTime && attFormData.checkOutTime <= attFormData.checkInTime && !staff.shiftType.startsWith('Night')) {
      alertDialog('Check-out time must be after check-in time.');
      return;
    }
    const dup = attendanceRecords.find((a) => a.staffId === staff.id && a.attendanceDate === attFormData.attendanceDate);
    if (dup && !(await confirmDialog(`${staff.name} already has an attendance entry (${dup.status}) for ${dup.attendanceDate}. Save another entry anyway?`))) {
      return;
    }

    const { workingHours, isLate, isEarlyExit } = calculateWorkingHours(
      attFormData.checkInTime,
      attFormData.checkOutTime || undefined,
      staff.shiftStartTime,
      staff.shiftEndTime
    );

    const recordPayload = {
      staffId: staff.id,
      staffEmployeeId: staff.employeeId,
      staffName: staff.name,
      attendanceDate: attFormData.attendanceDate,
      checkInTime: attFormData.checkInTime,
      checkOutTime: attFormData.checkOutTime || undefined,
      totalWorkingHours: workingHours > 0 ? workingHours : undefined,
      status: attFormData.status,
      staffPhotoUrl: attFormData.staffPhotoUrl,
      supervisorName: currentUser.name,
      remarks: attFormData.remarks,
      isLateEntry: isLate,
      isEarlyExit,
    };

    onRecordAttendance(recordPayload);
    setAttendanceModalOpen(false);
    setAttFormData((f) => ({ ...f, checkOutTime: '', staffPhotoUrl: '' }));
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name.trim() || !staffFormData.mobileNumber.trim()) {
      alertDialog('Please fill Name and Mobile Number');
      return;
    }
    if (!isValidMobile(staffFormData.mobileNumber)) {
      alertDialog('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
      return;
    }
    const m = normalizeMobile(staffFormData.mobileNumber);
    const clash = staffList.find((s) => normalizeMobile(s.mobileNumber) === m);
    if (clash) {
      alertDialog(`This mobile number already belongs to ${clash.name} (${clash.employeeId}).`);
      return;
    }
    const times: Record<string, [string, string]> = {
      'Morning Shift (06:00 - 14:00)': ['06:00', '14:00'],
      'General Shift (09:00 - 18:00)': ['09:00', '18:00'],
      'Evening Shift (14:00 - 22:00)': ['14:00', '22:00'],
      'Night Shift (22:00 - 06:00)': ['22:00', '06:00'],
    };
    const [st, en] = times[staffFormData.shiftType] || [staffFormData.shiftStartTime, staffFormData.shiftEndTime];

    onSaveStaff({ ...staffFormData, name: staffFormData.name.trim(), mobileNumber: m, shiftStartTime: st, shiftEndTime: en, isActive: true });
    setNewStaffModalOpen(false);
    setStaffFormData({
      name: '',
      mobileNumber: '',
      designation: 'Security Guard',
      shiftType: 'General Shift (09:00 - 18:00)',
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
    });
  };


  /* ------------------------------------------------ advanced attendance */
  const exportPdf = useExportPdf();
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [lateOnly, setLateOnly] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterShift, setRosterShift] = useState('ALL');
  const [rosterDesig, setRosterDesig] = useState('ALL');
  const [month, setMonth] = useState(defaultDate.slice(0, 7));
  const canApprove = currentUser.role !== 'SECURITY_STAFF';

  const filteredAtt = attendanceRecords.filter((a) => {
    const q = search.trim().toLowerCase();
    const okQ = !q || a.staffName.toLowerCase().includes(q) || a.staffEmployeeId.toLowerCase().includes(q) || (a.remarks || '').toLowerCase().includes(q);
    return (
      okQ &&
      (staffFilter === 'ALL' || a.staffId === staffFilter) &&
      (statusFilter === 'ALL' || a.status === statusFilter) &&
      (approvalFilter === 'ALL' || a.approvalStatus === approvalFilter) &&
      (!lateOnly || a.isLateEntry || a.isEarlyExit)
    );
  });

  const attList = useListControls(filteredAtt, {
    module: 'attendance',
    dateOf: (a) => a.attendanceDate,
    defaultSort: 'date',
    sorters: {
      date: { label: 'Date & check-in', value: (a) => `${a.attendanceDate} ${a.checkInTime}` },
      name: { label: 'Staff name', value: (a) => a.staffName },
      emp: { label: 'Employee ID', value: (a) => a.staffEmployeeId },
      hours: { label: 'Working hours', value: (a) => a.totalWorkingHours || 0 },
      status: { label: 'Status', value: (a) => a.status },
      approval: { label: 'Approval', value: (a) => a.approvalStatus },
    },
  });

  const clearAttFilters = () => {
    setSearch(''); setStaffFilter('ALL'); setStatusFilter('ALL'); setApprovalFilter('ALL'); setLateOnly(false);
  };

  const buildAttExport = () => ({
    headers: ['Emp ID', 'Staff Name', 'Date', 'Check-In', 'Check-Out', 'Hours', 'Status', 'Late', 'Early Exit', 'Supervisor', 'Approval', 'Remarks'],
    rows: attList.all.map((a) => [
      a.staffEmployeeId, a.staffName, a.attendanceDate, a.checkInTime, a.checkOutTime || 'On Duty',
      a.totalWorkingHours ?? '', a.status, a.isLateEntry ? 'YES' : 'NO', a.isEarlyExit ? 'YES' : 'NO',
      a.supervisorName, a.approvalStatus, a.remarks || '',
    ]),
  });
  const handleExportAttendanceCSV = () => {
    const { headers, rows } = buildAttExport();
    downloadCsv(`Raviraja_Security_Attendance_${defaultDate}.csv`, headers, rows);
  };
  const handleExportAttendancePdf = () => {
    const { headers, rows } = buildAttExport();
    exportPdf('Security Staff Attendance Register', headers, rows, `Raviraja_Security_Attendance_${defaultDate}.pdf`);
  };

  const pendingFiltered = attList.all.filter((a) => a.approvalStatus === 'Pending');
  const approveAllPending = async () => {
    if (!pendingFiltered.length) return;
    if (!(await confirmDialog(`Approve ${pendingFiltered.length} pending attendance record(s) currently shown?`))) return;
    pendingFiltered.forEach((a) => onApproveAttendance(a.id));
  };

  // today's snapshot
  const activeStaff = staffList.filter((s) => s.isActive !== false);
  const todayRecs = attendanceRecords.filter((a) => a.attendanceDate === defaultDate);
  const markedToday = new Set(todayRecs.map((a) => a.staffId));
  const notMarked = activeStaff.filter((s) => !markedToday.has(s.id));
  const onDuty = todayRecs.filter((a) => !a.checkOutTime && (a.status === 'Present' || a.status === 'Half Day'));
  const pendingAll = attendanceRecords.filter((a) => a.approvalStatus === 'Pending').length;
  const lateToday = todayRecs.filter((a) => a.isLateEntry).length;

  // monthly summary per staff
  const monthly = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrent = month === defaultDate.slice(0, 7);
    const elapsed = isCurrent ? Number(defaultDate.slice(8, 10)) : daysInMonth;
    return staffList.map((s) => {
      const recs = attendanceRecords.filter((a) => a.staffId === s.id && a.attendanceDate.startsWith(month));
      const days = (st: string) => new Set(recs.filter((r) => r.status === st).map((r) => r.attendanceDate)).size;
      const present = days('Present'), half = days('Half Day'), absent = days('Absent'), leave = days('Leave');
      const totalHrs = recs.reduce((t, r) => t + (r.totalWorkingHours || 0), 0);
      const withHrs = recs.filter((r) => r.totalWorkingHours).length;
      const credited = present + half * 0.5;
      return {
        s, present, half, absent, leave,
        late: recs.filter((r) => r.isLateEntry).length,
        early: recs.filter((r) => r.isEarlyExit).length,
        totalHrs: Math.round(totalHrs * 100) / 100,
        avgHrs: withHrs ? Math.round((totalHrs / withHrs) * 100) / 100 : 0,
        pct: elapsed ? Math.round((credited / elapsed) * 100) : 0,
      };
    });
  }, [attendanceRecords, staffList, month, defaultDate]);

  const buildMonthlyExport = () => ({
    headers: ['Emp ID', 'Name', 'Designation', 'Present', 'Half Day', 'Absent', 'Leave', 'Late', 'Early Exit', 'Total Hrs', 'Avg Hrs/Day', 'Attendance %'],
    rows: monthly.map((r) => [r.s.employeeId, r.s.name, r.s.designation, r.present, r.half, r.absent, r.leave, r.late, r.early, r.totalHrs, r.avgHrs, `${r.pct}%`]),
  });

  const filteredRoster = staffList.filter((s) => {
    const q = rosterSearch.trim().toLowerCase();
    return (
      (!q || s.name.toLowerCase().includes(q) || s.employeeId.toLowerCase().includes(q) || s.mobileNumber.includes(q)) &&
      (rosterShift === 'ALL' || s.shiftType === rosterShift) &&
      (rosterDesig === 'ALL' || s.designation === rosterDesig)
    );
  });
  const buildRosterExport = () => ({
    headers: ['Emp ID', 'Name', 'Designation', 'Mobile', 'Shift', 'Timing', 'Joined', 'Present Today'],
    rows: filteredRoster.map((s) => [s.employeeId, s.name, s.designation, s.mobileNumber, s.shiftType, `${s.shiftStartTime}-${s.shiftEndTime}`, s.joinedDate, markedToday.has(s.id) ? 'YES' : 'NO']),
  });

  const sel = 'px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white';
  const stat = (label: string, value: React.ReactNode, tone: string, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border ${tone} ${onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'} transition-shadow`}
    >
      <span className="text-[11px] font-semibold uppercase opacity-80">{label}</span>
      <p className="text-2xl font-black mt-1">{value}</p>
    </button>
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Security Staff & Attendance</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Roster, daily attendance register, approvals, late / early-exit tracking and monthly summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAttendanceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Clock className="w-4 h-4" />
            Mark Attendance / Check-In
          </button>
          {canApprove && (
            <button
              onClick={() => setNewStaffModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Security Guard
            </button>
          )}
        </div>
      </div>

      {/* Today snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stat('Guards (active)', activeStaff.length, 'bg-purple-50 border-purple-200 text-purple-900', () => setActiveTab('ROSTER'))}
        {stat('Marked today', `${markedToday.size}/${activeStaff.length}`, 'bg-emerald-50 border-emerald-200 text-emerald-900', () => { setActiveTab('ATTENDANCE'); attList.applyQuick('today'); })}
        {stat('Not marked today', notMarked.length, notMarked.length ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700', () => setActiveTab('REPORTS'))}
        {stat('Late / early today', lateToday + todayRecs.filter((a) => a.isEarlyExit).length, 'bg-rose-50 border-rose-200 text-rose-900', () => { setActiveTab('ATTENDANCE'); setLateOnly(true); attList.applyQuick('today'); })}
        {stat('Pending approval', pendingAll, pendingAll ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-slate-50 border-slate-200 text-slate-700', () => { setActiveTab('ATTENDANCE'); setApprovalFilter('Pending'); })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {([
          ['ATTENDANCE', `Daily Attendance Register (${attendanceRecords.length})`],
          ['ROSTER', `Security Staff Roster (${staffList.length})`],
          ['REPORTS', 'Monthly Summary & Reports'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`px-4 py-2 font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === k ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, emp ID, remarks"
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-56"
              />
            </div>
            <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className={sel} aria-label="Staff filter">
              <option value="ALL">All staff</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.employeeId} - {s.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={sel} aria-label="Status filter">
              <option value="ALL">All status</option>
              {['Present', 'Half Day', 'Absent', 'Leave'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className={sel} aria-label="Approval filter">
              <option value="ALL">All approvals</option>
              {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-slate-700 font-medium">
              <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} />
              Late / early exit only
            </label>
            <div className="ml-auto flex items-center gap-2">
              {canApprove && pendingFiltered.length > 0 && (
                <button onClick={approveAllPending} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve all shown ({pendingFiltered.length})
                </button>
              )}
              <ExportMenu onCsv={handleExportAttendanceCSV} onPdf={handleExportAttendancePdf} />
            </div>
          </div>

          <ListExtras list={attList} onClearAll={clearAttFilters} />

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Emp ID</th>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                  <th className="p-3">Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Punctuality</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attList.pageRows.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500">No attendance records match the current filters.</td></tr>
                )}
                {attList.pageRows.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{att.staffEmployeeId}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        {att.staffPhotoUrl ? (
                          <img src={att.staffPhotoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                        ) : null}
                        {att.staffName}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{att.attendanceDate}</td>
                    <td className="p-3 font-mono font-semibold text-slate-900">{att.checkInTime}</td>
                    <td className="p-3 font-mono text-slate-600">{att.checkOutTime || 'On Duty'}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{att.totalWorkingHours ? `${att.totalWorkingHours} hrs` : '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        att.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : att.status === 'Half Day' ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : att.status === 'Leave' ? 'bg-sky-100 text-sky-800 border-sky-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}>{att.status}</span>
                    </td>
                    <td className="p-3 space-y-0.5">
                      {att.isLateEntry ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Late</span>
                      ) : (
                        <span className="text-emerald-600 font-medium block">On Time</span>
                      )}
                      {att.isEarlyExit && <span className="text-amber-600 font-semibold block">Early exit</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        att.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : att.approvalStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>{att.approvalStatus}</span>
                    </td>
                    <td className="p-3 text-right">
                      {att.approvalStatus !== 'Approved' && canApprove && (
                        <button
                          onClick={() => onApproveAttendance(att.id)}
                          className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination list={attList} />
        </div>
      )}

      {activeTab === 'ROSTER' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} placeholder="Search name, emp ID, mobile" className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-56" />
            </div>
            <select value={rosterShift} onChange={(e) => setRosterShift(e.target.value)} className={sel} aria-label="Shift filter">
              <option value="ALL">All shifts</option>
              {SHIFTS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={rosterDesig} onChange={(e) => setRosterDesig(e.target.value)} className={sel} aria-label="Designation filter">
              <option value="ALL">All designations</option>
              {['Security Guard', 'Head Guard', 'Security Supervisor', 'Gate Officer'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <span className="text-slate-500">{filteredRoster.length} of {staffList.length}</span>
            <div className="ml-auto">
              <ExportMenu
                onCsv={() => { const e = buildRosterExport(); downloadCsv(`Raviraja_Security_Roster_${defaultDate}.csv`, e.headers, e.rows); }}
                onPdf={() => { const e = buildRosterExport(); exportPdf('Security Staff Roster', e.headers, e.rows, `Raviraja_Security_Roster_${defaultDate}.pdf`); }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRoster.length === 0 && <p className="text-slate-500 col-span-full text-center p-8">No staff match the filters.</p>}
            {filteredRoster.map((staff) => {
              const rec = todayRecs.find((a) => a.staffId === staff.id);
              return (
                <div key={staff.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-purple-700 text-[10px]">{staff.employeeId}</span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5">{staff.name}</h3>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{staff.designation}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold">{staff.name.charAt(0)}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                    <p><strong>Mobile:</strong> <span className="font-mono">{staff.mobileNumber}</span></p>
                    <p><strong>Shift:</strong> {staff.shiftType}</p>
                    <p><strong>Timing:</strong> <span className="font-mono">{staff.shiftStartTime} - {staff.shiftEndTime}</span></p>
                    <p><strong>Joined:</strong> {staff.joinedDate}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    {rec ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rec.status === 'Present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                        Today: {rec.status} {rec.checkInTime}{rec.isLateEntry ? ' (late)' : ''}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Today: not marked</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'REPORTS' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-purple-600" /> Monthly attendance summary</h2>
              <input type="month" value={month} max={defaultDate.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Summary month" className={sel} />
              <div className="ml-auto">
                <ExportMenu
                  onCsv={() => { const e = buildMonthlyExport(); downloadCsv(`Raviraja_Attendance_Summary_${month}.csv`, e.headers, e.rows); }}
                  onPdf={() => { const e = buildMonthlyExport(); exportPdf(`Attendance Summary ${month}`, e.headers, e.rows, `Raviraja_Attendance_Summary_${month}.pdf`); }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Emp ID</th><th className="p-3">Name</th>
                    <th className="p-3">Present</th><th className="p-3">Half</th><th className="p-3">Absent</th><th className="p-3">Leave</th>
                    <th className="p-3">Late</th><th className="p-3">Early</th><th className="p-3">Total hrs</th><th className="p-3">Avg hrs</th><th className="p-3">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.map((r) => (
                    <tr key={r.s.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold">{r.s.employeeId}</td>
                      <td className="p-3 font-bold text-slate-900">{r.s.name}</td>
                      <td className="p-3">{r.present}</td><td className="p-3">{r.half}</td><td className="p-3">{r.absent}</td><td className="p-3">{r.leave}</td>
                      <td className={`p-3 ${r.late ? 'text-rose-600 font-bold' : ''}`}>{r.late}</td>
                      <td className={`p-3 ${r.early ? 'text-amber-600 font-bold' : ''}`}>{r.early}</td>
                      <td className="p-3 font-mono">{r.totalHrs}</td><td className="p-3 font-mono">{r.avgHrs}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${r.pct >= 90 ? 'bg-emerald-500' : r.pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, r.pct)}%` }} /></div>
                          <span className="font-semibold">{r.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500">Attendance % counts Present as 1 day and Half Day as 0.5, over the days elapsed in the month.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="font-bold text-slate-800 mb-2">Not marked today ({defaultDate})</h2>
            {notMarked.length === 0 ? (
              <p className="text-emerald-700 font-medium">Everyone has an attendance entry for today.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {notMarked.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setAttFormData((f) => ({ ...f, staffId: s.id })); setAttendanceModalOpen(true); }}
                    className="px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-semibold hover:bg-amber-100"
                    title="Mark attendance"
                  >
                    {s.employeeId} · {s.name}
                  </button>
                ))}
              </div>
            )}
            {onDuty.length > 0 && <p className="mt-3 text-slate-600">Currently on duty (no check-out yet): {onDuty.map((a) => a.staffName).join(', ')}</p>}
          </div>
        </div>
      )}

      {/* Attendance Check-In Modal */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Mark Security Staff Attendance</h2>
            <form onSubmit={handleMarkAttendanceSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Select Security Staff Member *</label>
                <select
                  value={attFormData.staffId}
                  onChange={(e) => setAttFormData({ ...attFormData, staffId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.employeeId} - {s.name} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={attFormData.attendanceDate}
                    onChange={(e) => setAttFormData({ ...attFormData, attendanceDate: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={attFormData.status}
                    onChange={(e) => setAttFormData({ ...attFormData, status: e.target.value as AttendanceStatus })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Present">Present</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Check-In Time *</label>
                  <input
                    type="time"
                    value={attFormData.checkInTime}
                    onChange={(e) => setAttFormData({ ...attFormData, checkInTime: e.target.value })}
                    required
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Check-Out Time (Optional)</label>
                  <input
                    type="time"
                    value={attFormData.checkOutTime}
                    onChange={(e) => setAttFormData({ ...attFormData, checkOutTime: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Staff Photo / Selfie Verification</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer border border-dashed border-slate-300 hover:border-purple-500 rounded p-2 text-slate-600 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span>Upload Guard Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const r = new FileReader();
                          r.onload = () => setAttFormData({ ...attFormData, staffPhotoUrl: r.result as string });
                          r.readAsDataURL(f);
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAttFormData({
                        ...attFormData,
                        staffPhotoUrl:
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60',
                      })
                    }
                    className="text-[10px] text-purple-600 hover:underline"
                  >
                    + Sample Photo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Remarks</label>
                <input
                  type="text"
                  value={attFormData.remarks}
                  onChange={(e) => setAttFormData({ ...attFormData, remarks: e.target.value })}
                  placeholder="Gate 1 Weighbridge Shift"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {newStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Add Security Staff Member</h2>
            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Guard Full Name *</label>
                <input
                  type="text"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  placeholder="e.g. Vikram Rathore"
                  required
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={staffFormData.mobileNumber}
                  onChange={(e) => setStaffFormData({ ...staffFormData, mobileNumber: e.target.value })}
                  placeholder="96012 34567"
                  required
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designation</label>
                <select
                  value={staffFormData.designation}
                  onChange={(e) => setStaffFormData({ ...staffFormData, designation: e.target.value as any })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Security Guard">Security Guard</option>
                  <option value="Head Guard">Head Guard</option>
                  <option value="Security Supervisor">Security Supervisor</option>
                  <option value="Gate Officer">Gate Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Shift Type</label>
                <select
                  value={staffFormData.shiftType}
                  onChange={(e) => setStaffFormData({ ...staffFormData, shiftType: e.target.value as ShiftType })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewStaffModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                >
                  Add Guard to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
