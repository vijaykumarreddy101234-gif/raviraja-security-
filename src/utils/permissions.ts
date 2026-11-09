import { Permission, UserRole } from '../types/security';

export const ALL_PERMISSIONS: { id: Permission; label: string }[] = [
  { id: 'dashboard.view', label: 'Security dashboard' },
  { id: 'inward.manage', label: 'Inward entries (create / verify)' },
  { id: 'outward.manage', label: 'Outward dispatch' },
  { id: 'visitor.manage', label: 'Visitor management' },
  { id: 'staff.manage', label: 'Staff & attendance' },
  { id: 'return.manage', label: 'Return material' },
  { id: 'gatepass.manage', label: 'Gate pass register' },
  { id: 'reports.view', label: 'Security reports' },
  { id: 'crm.view', label: 'CRM modules' },
  { id: 'settings.manage', label: 'Security settings' },
  { id: 'audit.view', label: 'Audit trail' },
  { id: 'pdf.edit', label: 'PDF Editor Premium' },
  { id: 'users.manage', label: 'User & role management' },
];

const ALL: Permission[] = ALL_PERMISSIONS.map((p) => p.id);

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: ALL,
  SECURITY_SUPERVISOR: ALL.filter((p) => p !== 'users.manage'),
  SECURITY_STAFF: [
    'dashboard.view',
    'inward.manage',
    'outward.manage',
    'visitor.manage',
    'staff.manage',
    'return.manage',
    'gatepass.manage',
    'reports.view',
    'crm.view',
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  SECURITY_SUPERVISOR: 'Security Supervisor',
  SECURITY_STAFF: 'Security Staff',
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Which permission is required to open each sidebar tab. */
export const TAB_PERMISSION: Record<string, Permission> = {
  'security-dashboard': 'dashboard.view',
  'inward-entry': 'inward.manage',
  'outward-entry': 'outward.manage',
  'visitor-management': 'visitor.manage',
  'security-staff': 'staff.manage',
  'return-material': 'return.manage',
  'gate-pass': 'gatepass.manage',
  'security-reports': 'reports.view',
  'security-settings': 'settings.manage',
  'audit-logs': 'audit.view',
  'crm-overview': 'crm.view',
  'crm-inventory': 'crm.view',
  'crm-customers': 'crm.view',
  'crm-sales': 'crm.view',
  'pdf-editor': 'pdf.edit',
  'user-management': 'users.manage',
};

export function canAccessTab(role: UserRole, tab: string): boolean {
  const needed = TAB_PERMISSION[tab];
  return needed ? hasPermission(role, needed) : false;
}

// ---- Password policy -------------------------------------------------------
export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) return 'Use both upper and lower case letters.';
  if (!/[0-9]/.test(pw)) return 'Include at least one number.';
  return null;
}
