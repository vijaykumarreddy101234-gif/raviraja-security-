import { AppUser, UserProfile, UserRole } from '../types/security';
import { recordAuditLog } from './storage';
import { validatePasswordStrength } from '../utils/permissions';

/**
 * Client-side authentication.
 *
 * IMPORTANT: this app stores all data in the browser (localStorage), so this
 * login protects the UI and gives every action a real user identity in the
 * audit trail, but it cannot stop someone with dev-tools access to the same
 * browser. For true enforcement the data and these checks must move to a server.
 */

const USERS_KEY = 'raviraja_auth_users_v1';
const SESSION_KEY = 'raviraja_auth_session_v1'; // sessionStorage: cleared on tab close
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const PBKDF2_ITERATIONS = 150_000;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

function randomSalt(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return toHex(b.buffer);
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits);
}

function load(): AppUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}
function save(users: AppUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export const toProfile = (u: AppUser): UserProfile => ({
  id: u.id,
  name: u.name,
  role: u.role,
  badgeNumber: u.badgeNumber,
  department: u.department,
});

const SEED: { username: string; name: string; role: UserRole; badge: string; dept: string; pw: string }[] = [
  { username: 'admin', name: 'Rajesh V. Patel (Director / Admin)', role: 'ADMIN', badge: 'RAVI-ADM-01', dept: 'Management', pw: 'Admin@123' },
  { username: 'supervisor', name: 'Sanjay S. Verma (Security Supervisor)', role: 'SECURITY_SUPERVISOR', badge: 'RAVI-SEC-SUP-01', dept: 'Security & Vigilance', pw: 'Super@123' },
  { username: 'guard', name: 'Ramesh K. Singh (Gate Officer)', role: 'SECURITY_STAFF', badge: 'RAVI-SEC-GRD-01', dept: 'Main Gate Security', pw: 'Guard@123' },
];

/** Creates the default accounts on first run. They must change password at first login. */
export async function ensureSeedUsers(): Promise<void> {
  if (load().length > 0) return;
  const users: AppUser[] = [];
  for (const s of SEED) {
    const salt = randomSalt();
    users.push({
      id: `user-${s.username}`,
      username: s.username,
      name: s.name,
      role: s.role,
      badgeNumber: s.badge,
      department: s.dept,
      passwordSalt: salt,
      passwordHash: await hashPassword(s.pw, salt),
      isActive: true,
      mustChangePassword: true,
      failedAttempts: 0,
      createdAt: new Date().toISOString(),
    });
  }
  save(users);
}

export function listUsers(): AppUser[] {
  return load();
}

const profileOf = (u: AppUser) => toProfile(u);

function audit(u: Pick<AppUser, 'id' | 'name' | 'role' | 'username'>, action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE', details: string) {
  recordAuditLog({
    module: 'AUTH',
    action,
    recordId: u.id,
    recordNumber: u.username,
    userName: u.name,
    userRole: u.role,
    details,
  });
}

export type LoginResult =
  | { ok: true; user: AppUser }
  | { ok: false; message: string };

export async function login(username: string, password: string): Promise<LoginResult> {
  const users = load();
  const idx = users.findIndex((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  const generic = 'Invalid username or password.';
  if (idx < 0) return { ok: false, message: generic };
  const u = users[idx];

  if (!u.isActive) return { ok: false, message: 'This account is disabled. Contact the administrator.' };
  if (u.lockedUntil && u.lockedUntil > Date.now()) {
    const mins = Math.ceil((u.lockedUntil - Date.now()) / 60000);
    return { ok: false, message: `Account locked after repeated failures. Try again in ${mins} min.` };
  }

  const hash = await hashPassword(password, u.passwordSalt);
  if (hash !== u.passwordHash) {
    u.failedAttempts += 1;
    let msg = generic;
    if (u.failedAttempts >= MAX_ATTEMPTS) {
      u.lockedUntil = Date.now() + LOCK_MS;
      u.failedAttempts = 0;
      msg = 'Too many failed attempts. Account locked for 5 minutes.';
    }
    save(users);
    audit(u, 'LOGIN_FAILED', `Failed login attempt for "${u.username}".`);
    return { ok: false, message: msg };
  }

  u.failedAttempts = 0;
  u.lockedUntil = undefined;
  u.lastLoginAt = new Date().toISOString();
  save(users);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.id, lastActive: Date.now() }));
  audit(u, 'LOGIN', `User "${u.username}" signed in.`);
  return { ok: true, user: u };
}

export function logout(user?: AppUser | UserProfile, reason = 'signed out') {
  if (user) {
    const full = load().find((x) => x.id === user.id);
    if (full) audit(full, 'LOGOUT', `User "${full.username}" ${reason}.`);
  }
  sessionStorage.removeItem(SESSION_KEY);
}

/** Restores a session if it exists and hasn't idled out. */
export function restoreSession(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId, lastActive } = JSON.parse(raw);
    if (Date.now() - lastActive > IDLE_TIMEOUT_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const u = load().find((x) => x.id === userId);
    return u && u.isActive ? u : null;
  } catch {
    return null;
  }
}

export function touchSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    s.lastActive = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string | null,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  const weak = validatePasswordStrength(newPassword);
  if (weak) return { ok: false, message: weak };
  const users = load();
  const u = users.find((x) => x.id === userId);
  if (!u) return { ok: false, message: 'User not found.' };
  if (currentPassword !== null) {
    if ((await hashPassword(currentPassword, u.passwordSalt)) !== u.passwordHash)
      return { ok: false, message: 'Current password is incorrect.' };
    if (currentPassword === newPassword) return { ok: false, message: 'New password must differ from the current one.' };
  }
  u.passwordSalt = randomSalt();
  u.passwordHash = await hashPassword(newPassword, u.passwordSalt);
  u.mustChangePassword = false;
  save(users);
  audit(u, 'PASSWORD_CHANGE', `Password changed for "${u.username}".`);
  return { ok: true, message: 'Password updated.' };
}

// ---- Admin operations (callers must hold users.manage) ---------------------
function auditAdmin(actor: UserProfile, action: 'CREATE' | 'UPDATE' | 'DELETE', target: string, details: string) {
  recordAuditLog({
    module: 'USER_MGMT',
    action,
    recordId: target,
    recordNumber: target,
    userName: actor.name,
    userRole: actor.role,
    details,
  });
}

export async function createUser(
  actor: UserProfile,
  data: { username: string; name: string; role: UserRole; badgeNumber: string; department: string; password: string }
): Promise<{ ok: boolean; message: string }> {
  const username = data.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { ok: false, message: 'Username: 3-30 chars (a-z, 0-9, . _ -).' };
  if (!data.name.trim()) return { ok: false, message: 'Full name is required.' };
  const weak = validatePasswordStrength(data.password);
  if (weak) return { ok: false, message: weak };
  const users = load();
  if (users.some((u) => u.username === username)) return { ok: false, message: 'Username already exists.' };
  const salt = randomSalt();
  users.push({
    id: `user-${Date.now()}`,
    username,
    name: data.name.trim(),
    role: data.role,
    badgeNumber: data.badgeNumber.trim() || '-',
    department: data.department.trim() || '-',
    passwordSalt: salt,
    passwordHash: await hashPassword(data.password, salt),
    isActive: true,
    mustChangePassword: true,
    failedAttempts: 0,
    createdAt: new Date().toISOString(),
  });
  save(users);
  auditAdmin(actor, 'CREATE', username, `Created user "${username}" with role ${data.role}.`);
  return { ok: true, message: `User "${username}" created.` };
}

function adminCount(users: AppUser[]) {
  return users.filter((u) => u.role === 'ADMIN' && u.isActive).length;
}

export function updateUser(
  actor: UserProfile,
  id: string,
  patch: Partial<Pick<AppUser, 'role' | 'isActive' | 'name' | 'department' | 'badgeNumber'>>
): { ok: boolean; message: string } {
  const users = load();
  const u = users.find((x) => x.id === id);
  if (!u) return { ok: false, message: 'User not found.' };
  const next = { ...u, ...patch };
  const wasAdmin = u.role === 'ADMIN' && u.isActive;
  const stillAdmin = next.role === 'ADMIN' && next.isActive;
  if (wasAdmin && !stillAdmin && adminCount(users) <= 1)
    return { ok: false, message: 'At least one active Admin must remain.' };
  const changes = Object.keys(patch).map((k) => `${k}: ${(u as any)[k]} → ${(patch as any)[k]}`).join(', ');
  Object.assign(u, patch);
  save(users);
  auditAdmin(actor, 'UPDATE', u.username, `Updated "${u.username}" (${changes}).`);
  return { ok: true, message: `User "${u.username}" updated.` };
}

export async function adminResetPassword(actor: UserProfile, id: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
  const weak = validatePasswordStrength(newPassword);
  if (weak) return { ok: false, message: weak };
  const users = load();
  const u = users.find((x) => x.id === id);
  if (!u) return { ok: false, message: 'User not found.' };
  u.passwordSalt = randomSalt();
  u.passwordHash = await hashPassword(newPassword, u.passwordSalt);
  u.mustChangePassword = true;
  u.failedAttempts = 0;
  u.lockedUntil = undefined;
  save(users);
  auditAdmin(actor, 'UPDATE', u.username, `Password reset for "${u.username}" (must change at next login).`);
  return { ok: true, message: `Password reset for "${u.username}".` };
}

export { profileOf };
