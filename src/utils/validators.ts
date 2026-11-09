import { confirmDialog, alertDialog } from '../components/common/Dialogs';

/** Stored form: trimmed, single spaces, upper case (keeps the dashes the user typed). */
export const normalizeVehicle = (v: string) => v.trim().replace(/\s+/g, ' ').toUpperCase();
/** Comparison form: "gj 01-ab 1234" -> "GJ01AB1234". */
export const compactVehicle = (v: string) => v.toUpperCase().replace(/[\s-]+/g, '');

/** Standard Indian registration (GJ01AB1234, MH1234567) or Bharat series (22BH1234AA). */
export const isValidVehicle = (v: string) => {
  const n = compactVehicle(v);
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(n) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(n);
};

/** 10-digit Indian mobile, optional +91 / 0 prefix. */
export const normalizeMobile = (m: string) => m.replace(/[\s()-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
export const isValidMobile = (m: string) => /^[6-9]\d{9}$/.test(normalizeMobile(m));

/**
 * Asks before saving a vehicle that looks wrong or is already in the plant / queue.
 * Resolves true to continue saving.
 */
export async function confirmVehicle(vehicle: string, alreadyActive: string[] = [], where = 'the plant'): Promise<boolean> {
  const n = compactVehicle(vehicle);
  if (alreadyActive.some((v) => compactVehicle(v) === n)) {
    if (!(await confirmDialog(`Vehicle ${n} already has an open entry in ${where}.\n\nSave another entry anyway?`))) return false;
  }
  if (!isValidVehicle(vehicle)) {
    if (!(await confirmDialog(`"${vehicle}" does not look like a valid Indian vehicle number (e.g. GJ01AB1234).\n\nSave anyway?`))) return false;
  }
  return true;
}

/** Mobile must be 10 digits; warns if the same number is already inside. */
export async function confirmMobile(mobile: string, alreadyInside: string[] = []): Promise<boolean> {
  if (!isValidMobile(mobile)) {
    await alertDialog('Please enter a valid 10-digit mobile number (starting 6-9).');
    return false;
  }
  const n = normalizeMobile(mobile);
  if (alreadyInside.some((m) => normalizeMobile(m) === n)) {
    return confirmDialog(`A visitor with mobile ${n} is already marked inside the plant.\n\nIssue another pass anyway?`);
  }
  return true;
}
