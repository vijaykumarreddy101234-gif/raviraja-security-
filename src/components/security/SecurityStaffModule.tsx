import React, { useState } from 'react';
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
import { alertDialog } from '../common/Dialogs';

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

  const handleMarkAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffList.find((s) => s.id === attFormData.staffId);
    if (!staff) {
      alertDialog('Please select staff member');
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
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.name || !staffFormData.mobileNumber) {
      alertDialog('Please fill Name and Mobile Number');
      return;
    }

    onSaveStaff(staffFormData);
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

  const handleExportAttendanceCSV = () => {
    const headers = [
      'Emp ID',
      'Staff Name',
      'Date',
      'Check-In',
      'Check-Out',
      'Working Hours',
      'Status',
      'Late Entry',
      'Supervisor',
      'Approval',
    ];

    const rows = attendanceRecords.map((a) => [
      a.staffEmployeeId,
      `"${a.staffName}"`,
      a.attendanceDate,
      a.checkInTime,
      a.checkOutTime || '-',
      a.totalWorkingHours || '-',
      a.status,
      a.isLateEntry ? 'YES' : 'NO',
      `"${a.supervisorName}"`,
      a.approvalStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raviraja_Security_Attendance_${defaultDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Roster management, shift attendance with selfie/camera photo verification, working hours & late tracking.
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
          {currentUser.role !== 'SECURITY_STAFF' && (
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === 'ATTENDANCE'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Attendance Register ({attendanceRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('ROSTER')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === 'ROSTER'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Security Staff Roster ({staffList.length})
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === 'REPORTS'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Attendance Summary & Late Reports
        </button>
      </div>

      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="font-bold text-slate-800">Guard Shift Attendance Log</h2>
            <button
              onClick={handleExportAttendanceCSV}
              className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Emp ID</th>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check-In</th>
                  <th className="p-3">Check-Out</th>
                  <th className="p-3">Total Working Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Late Entry</th>
                  <th className="p-3">Supervisor Approval</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{att.staffEmployeeId}</td>
                    <td className="p-3 font-bold text-slate-900">{att.staffName}</td>
                    <td className="p-3 text-slate-700">{att.attendanceDate}</td>
                    <td className="p-3 font-mono font-semibold text-slate-900">{att.checkInTime}</td>
                    <td className="p-3 font-mono text-slate-600">{att.checkOutTime || 'On Duty'}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {att.totalWorkingHours ? `${att.totalWorkingHours} hrs` : '-'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          att.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : att.status === 'Half Day'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {att.isLateEntry ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Late
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">On Time</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          att.approvalStatus === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {att.approvalStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {att.approvalStatus !== 'Approved' && currentUser.role !== 'SECURITY_STAFF' && (
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
        </div>
      )}

      {activeTab === 'ROSTER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffList.map((staff) => (
            <div key={staff.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-purple-700 text-[10px]">{staff.employeeId}</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{staff.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {staff.designation}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  {staff.name.charAt(0)}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                <p>
                  <strong>Mobile:</strong> <span className="font-mono">{staff.mobileNumber}</span>
                </p>
                <p>
                  <strong>Shift:</strong> {staff.shiftType}
                </p>
                <p>
                  <strong>Timing:</strong> <span className="font-mono">{staff.shiftStartTime} - {staff.shiftEndTime}</span>
                </p>
                <p>
                  <strong>Joined:</strong> {staff.joinedDate}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'REPORTS' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase">Total Present Today</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">
                {attendanceRecords.filter((a) => a.status === 'Present').length} Staff
              </p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-800 uppercase">Late Entry Cases</span>
              <p className="text-2xl font-black text-rose-900 mt-1">
                {attendanceRecords.filter((a) => a.isLateEntry).length} Case
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-[11px] font-semibold text-purple-800 uppercase">Total Guard Strength</span>
              <p className="text-2xl font-black text-purple-900 mt-1">{staffList.length} Guards</p>
            </div>
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
                  placeholder="+91 96012 34567"
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
