import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { toWinAnsi } from './pdfOps';
import { calculateTurnaroundDuration } from '../../utils/securityLogic';
import { SecuritySettings } from '../../types/security';

export type VoucherDocType = 'INWARD' | 'OUTWARD' | 'GATE_PASS' | 'VISITOR' | 'RETURN';

interface Args {
  docType: VoucherDocType;
  title: string;
  docNumber: string;
  data: any;
  settings: Pick<SecuritySettings, 'companyName' | 'plantAddress' | 'gstNumber'>;
}

const W = 595.28;
const H = 841.89;
const M = 36;
/** thin outer page frame so printed pages always have a clean outline */
function drawFrame(page: PDFPage, w: number, h: number) {
  page.drawRectangle({ x: 18, y: 18, width: w - 36, height: h - 36, borderColor: rgb(0.2, 0.25, 0.33), borderWidth: 1 });
}
const CW = W - M * 2;
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LINE = rgb(0.8, 0.84, 0.88);
const SOFT = rgb(0.95, 0.96, 0.98);

/**
 * Builds an A4 voucher PDF. The header deliberately leaves the left and right
 * corners empty so the user can drop company logos there in the PDF editor.
 */
export async function buildVoucherPdf({ docType, title, docNumber, data, settings }: Args): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  doc.setTitle(`${docNumber} - ${title}`);
  doc.setSubject(title);

  let page: PDFPage = doc.addPage([W, H]);
  drawFrame(page, W, H);
  let y = H - M;

  const clean = (f: PDFFont, v: unknown) => toWinAnsi(f, String(v ?? '').replace(/\s+/g, ' ')).text;
  const width = (f: PDFFont, s: string, size: number) => f.widthOfTextAtSize(s, size);

  const wrap = (f: PDFFont, v: unknown, size: number, maxW: number): string[] => {
    const words = clean(f, v).split(' ').filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (width(f, test, size) <= maxW) cur = test;
      else {
        if (cur) lines.push(cur);
        // hard-split a single word that is wider than the column
        let rest = w;
        while (width(f, rest, size) > maxW && rest.length > 1) {
          let n = rest.length - 1;
          while (n > 1 && width(f, rest.slice(0, n), size) > maxW) n--;
          lines.push(rest.slice(0, n));
          rest = rest.slice(n);
        }
        cur = rest;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  const text = (s: string, x: number, yy: number, size: number, f: PDFFont = reg, color = INK) => {
    const t = clean(f, s);
    if (t) page.drawText(t, { x, y: yy, size, font: f, color });
  };
  const textRight = (s: string, xRight: number, yy: number, size: number, f: PDFFont = reg, color = INK) => {
    const t = clean(f, s);
    text(t, xRight - width(f, t, size), yy, size, f, color);
  };
  const textCenter = (s: string, cx: number, yy: number, size: number, f: PDFFont = bold, color = INK) => {
    const t = clean(f, s);
    text(t, cx - width(f, t, size) / 2, yy, size, f, color);
  };
  const hline = (yy: number, x1 = M, x2 = W - M, thickness = 0.75, color = LINE) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color });

  const newPage = () => {
    page = doc.addPage([W, H]);
    drawFrame(page, W, H);
    y = H - M;
    text(`${settings.companyName} - ${title}`, M, y - 8, 8, reg, MUTED);
    textRight(`DOC REF: ${docNumber}`, W - M, y - 8, 8, mono, MUTED);
    hline(y - 14);
    y -= 32;
  };
  const ensure = (h: number) => {
    if (y - h < M + 20) newPage();
  };

  /* ---------- header (logo zones are left empty on purpose) ---------- */
  const logoZone = 96;
  const midW = CW - logoZone * 2 - 16;
  const nameLines = wrap(bold, settings.companyName.toUpperCase(), 15, midW);
  const addrLines = wrap(reg, settings.plantAddress, 8, midW);
  let hy = y - 14;
  nameLines.forEach((l) => { textCenter(l, W / 2, hy, 15); hy -= 17; });
  addrLines.forEach((l) => { textCenter(l, W / 2, hy, 8, reg, MUTED); hy -= 10.5; });
  textCenter('ISO 9001:2015 CERTIFIED UPVC PROFILE & POLYMER DIVISION', W / 2, hy - 2, 7.5, bold, rgb(0.28, 0.33, 0.41));
  hy -= 14;
  y = Math.min(hy, y - 70);
  hline(y, M, W - M, 1.6, INK);
  y -= 16;

  text('SECURITY & VIGILANCE GATE PASS', M, y, 7.5, bold, MUTED);
  textRight(`DOC REF: ${docNumber}`, W - M, y, 8.5, mono, INK);
  y -= 11;
  text(`GSTIN: ${settings.gstNumber}`, M, y, 8, reg, MUTED);
  y -= 22;

  const turnaround =
    data.entryDate && data.entryTime && data.exitTime
      ? calculateTurnaroundDuration(data.entryDate, data.entryTime, data.exitDate, data.exitTime)
      : null;
  const entryDate = data.entryDate || data.dispatchDate || data.returnDate || data.date || '';
  const entryTime = data.entryTime || data.dispatchTime || data.returnTime || data.time || '';

  text(title.toUpperCase(), M, y, 13, bold);
  textRight(`Entry: ${entryDate} at ${entryTime}`, W - M, y, 9, mono);
  y -= 13;
  if (data.exitTime) {
    textRight(`Exit: ${data.exitDate || data.entryDate} at ${data.exitTime}${turnaround ? ` (${turnaround})` : ''}`, W - M, y, 9, mono);
  } else if (docType === 'INWARD' || docType === 'VISITOR') {
    textRight('Inside Factory (Active)', W - M, y, 9, bold, rgb(0.71, 0.33, 0.04));
  }
  y -= 16;

  /* ---------- party / logistics boxes ---------- */
  const colW = (CW - 12) / 2;
  const pad = 8;
  const party = data.supplierCompanyName || data.customerCompanyName || data.companyName || data.partyName || 'N/A';
  const person = data.supplierName || data.customerName || data.personName || '';
  const address = data.supplierAddress || data.customerAddress || data.address || '';
  const phone = data.supplierMobileNumber || data.customerMobileNumber || data.mobileNumber || 'N/A';

  const left: { f: PDFFont; size: number; s: string; c?: ReturnType<typeof rgb> }[] = [
    { f: reg, size: 7.5, s: 'Party / Counterparty Details', c: MUTED },
    ...wrap(bold, party, 10.5, colW - pad * 2).map((s) => ({ f: bold, size: 10.5, s })),
    ...(person ? wrap(reg, person, 8.5, colW - pad * 2).map((s) => ({ f: reg, size: 8.5, s })) : []),
    ...(address ? wrap(reg, address, 8, colW - pad * 2).map((s) => ({ f: reg, size: 8, s, c: MUTED })) : []),
    { f: mono, size: 8, s: `Phone: ${phone}` },
    ...(data.gstNumber ? [{ f: reg, size: 8, s: `GST: ${data.gstNumber}`, c: MUTED }] : []),
  ];

  const rows: [string, string][] = [
    ['Vehicle Number', data.vehicleNumber || 'N/A'],
    ['Driver / Visitor', data.driverName || data.personName || data.visitorName || data.securityStaffName || 'N/A'],
    ['Contact Phone', data.driverMobileNumber || data.mobileNumber || 'N/A'],
    ['Gate Pass No', data.gatePassNumber || data.visitorPassNumber || docNumber],
  ];
  if (data.entryDate) rows.push(['Gate Entry', `${data.entryDate} ${data.entryTime || ''}`]);
  rows.push([
    'Gate Exit',
    data.exitDate && data.exitTime ? `${data.exitDate} ${data.exitTime}` : data.exitTime ? `${data.entryDate || ''} ${data.exitTime}` : 'Inside Factory (Active)',
  ]);
  if (turnaround) rows.push(['Total Turnaround', turnaround]);
  if (data.salesInvoiceNumber) rows.push(['Sales Invoice', data.salesInvoiceNumber]);
  if (data.originalInvoiceNumber) rows.push(['Ref Invoice', data.originalInvoiceNumber]);
  if (data.referenceInvoiceNumber) rows.push(['Ref Invoice', data.referenceInvoiceNumber]);

  const labelW = 78;
  const rightRows = rows.map(([k, v]) => ({ k, lines: wrap(mono, v, 8, colW - pad * 2 - labelW) }));
  const leftH = 14 + left.reduce((h, l) => h + l.size + 3.5, 0) - 6;
  const rightH = 22 + rightRows.reduce((h, r) => h + r.lines.length * 10.5 + 2, 0);
  const boxH = Math.max(leftH, rightH, 70);

  ensure(boxH + 10);
  page.drawRectangle({ x: M, y: y - boxH, width: colW, height: boxH, color: SOFT, borderColor: LINE, borderWidth: 0.75 });
  page.drawRectangle({ x: M + colW + 12, y: y - boxH, width: colW, height: boxH, color: SOFT, borderColor: LINE, borderWidth: 0.75 });
  let ly = y - 14;
  left.forEach((l) => { text(l.s, M + pad, ly, l.size, l.f, l.c ?? INK); ly -= l.size + 3.5; });
  let ry = y - 14;
  text('Logistics & Gate Details', M + colW + 12 + pad, ry, 7.5, reg, MUTED);
  ry -= 13;
  rightRows.forEach((r) => {
    text(r.k + ':', M + colW + 12 + pad, ry, 8, bold);
    r.lines.forEach((ln, i) => text(ln, M + colW + 12 + pad + labelW, ry - i * 10.5, 8, mono));
    ry -= r.lines.length * 10.5 + 2;
  });
  y -= boxH + 16;

  /* ---------- materials table ---------- */
  const materials: any[] = Array.isArray(data.materials) ? data.materials : [];
  if (materials.length) {
    ensure(60);
    text('VERIFIED MATERIAL PARTICULARS', M, y, 8.5, bold, rgb(0.28, 0.33, 0.41));
    y -= 10;
    const cols = [
      { h: '#', w: 22, a: 'l' },
      { h: 'MATERIAL DESCRIPTION', w: 186, a: 'l' },
      { h: 'CODE / CATEGORY', w: 96, a: 'l' },
      { h: 'BATCH / LOT', w: 82, a: 'l' },
      { h: 'PKGS', w: 40, a: 'r' },
      { h: 'QUANTITY', w: CW - 22 - 186 - 96 - 82 - 40, a: 'r' },
    ] as const;
    const drawHead = () => {
      page.drawRectangle({ x: M, y: y - 16, width: CW, height: 16, color: rgb(0.9, 0.92, 0.95), borderColor: LINE, borderWidth: 0.75 });
      let x = M;
      cols.forEach((c) => {
        if (c.a === 'r') textRight(c.h, x + c.w - 4, y - 11, 7, bold);
        else text(c.h, x + 4, y - 11, 7, bold);
        x += c.w;
      });
      y -= 16;
    };
    drawHead();
    materials.forEach((m, idx) => {
      const cells = [
        String(idx + 1),
        m.materialName || '-',
        m.materialCode || m.materialCategory || '-',
        m.batchNumber || '-',
        String(m.numberOfPackages || '-'),
        `${m.quantityReceived || m.quantity || m.returnQuantity || 0} ${m.unit || ''}`.trim(),
      ];
      const wrapped = cells.map((c, i) => wrap(i === 1 ? bold : reg, c, 8, cols[i].w - 8));
      const rowH = Math.max(...wrapped.map((l) => l.length)) * 10.5 + 7;
      if (y - rowH < M + 40) { newPage(); drawHead(); }
      let x = M;
      wrapped.forEach((lines, i) => {
        lines.forEach((ln, li) => {
          const yy = y - 11 - li * 10.5;
          if (cols[i].a === 'r') textRight(ln, x + cols[i].w - 4, yy, 8, i === 5 ? bold : reg);
          else text(ln, x + 4, yy, 8, i === 1 ? bold : reg);
        });
        x += cols[i].w;
      });
      y -= rowH;
      hline(y);
    });
    const pk = materials.reduce((s, m) => s + (Number(m.numberOfPackages) || 0), 0);
    const total = data.actualReceivedQuantity ||
      materials.reduce((s, m) => s + (Number(m.quantity || m.returnQuantity || m.quantityReceived) || 0), 0);
    page.drawRectangle({ x: M, y: y - 17, width: CW, height: 17, color: SOFT, borderColor: LINE, borderWidth: 0.75 });
    textRight('TOTAL VERIFIED QUANTITY:', M + CW - (cols[5].w + cols[4].w) - 6, y - 12, 7.5, bold);
    textRight(String(pk || '-'), M + CW - cols[5].w - 4, y - 12, 8, bold);
    textRight(`${total} ${materials[0]?.unit || 'Units'}`, M + CW - 4, y - 12, 8.5, bold, rgb(0.02, 0.37, 0.27));
    y -= 30;
  } else if (data.materialDetails || data.quantity) {
    ensure(40);
    text('MATERIAL DETAILS', M, y, 8.5, bold, rgb(0.28, 0.33, 0.41));
    y -= 12;
    wrap(reg, `${data.materialDetails || ''}${data.quantity ? `  |  Qty: ${data.quantity}` : ''}`, 9, CW).forEach((l) => { text(l, M, y, 9); y -= 11.5; });
    y -= 10;
  }

  /* ---------- inward quantity verification ---------- */
  if (docType === 'INWARD') {
    ensure(70);
    page.drawRectangle({ x: M, y: y - 56, width: CW, height: 56, color: SOFT, borderColor: LINE, borderWidth: 0.75 });
    const items: [string, unknown, ReturnType<typeof rgb>][] = [
      ['Invoice Quantity', `${data.invoiceQuantity} KG`, INK],
      ['Actual Received', `${data.actualReceivedQuantity} KG`, rgb(0.02, 0.37, 0.27)],
      ['Shortage', `${data.shortageQuantity} KG`, data.shortageQuantity > 0 ? rgb(0.88, 0.11, 0.28) : INK],
      ['Excess', `${data.excessQuantity} KG`, data.excessQuantity > 0 ? rgb(0.71, 0.33, 0.04) : INK],
    ];
    items.forEach(([k, v, c], i) => {
      const cx = M + (CW / 4) * i + CW / 8;
      textCenter(k, cx, y - 14, 7.5, reg, MUTED);
      textCenter(String(v), cx, y - 29, 10, bold, c);
    });
    hline(y - 36, M + 8, W - M - 8);
    const rem = wrap(reg, `Verification Remarks: ${data.differenceRemarks || 'All weights verified on main plant weighbridge.'}`, 8, CW - 16);
    text(rem[0], M + 8, y - 48, 8, reg, MUTED);
    y -= 72;
  }

  /* ---------- visitor details ---------- */
  if (docType === 'VISITOR') {
    ensure(100);
    page.drawRectangle({ x: M, y: y - 84, width: CW, height: 84, color: rgb(1, 0.98, 0.92), borderColor: rgb(0.99, 0.9, 0.54), borderWidth: 0.75 });
    const half = CW / 2;
    const cell = (k: string, v: string, cx: number, cy: number) => {
      text(k, cx, cy, 7.5, bold, rgb(0.57, 0.25, 0.05));
      wrap(bold, v, 9, half - 20).slice(0, 2).forEach((l, i) => text(l, cx, cy - 11 - i * 10.5, 9, bold));
    };
    cell('Visiting Officer / Department', `${data.personToMeet || ''} (${data.department || ''})`, M + 10, y - 14);
    cell('Visitor Classification', String(data.visitorType || ''), M + half + 10, y - 14);
    cell('ID Verification', `${data.idProofType || ''}: ${data.idProofNumber || ''}`, M + 10, y - 44);
    cell('Purpose of Factory Visit', String(data.purposeOfVisit || ''), M + half + 10, y - 44);
    text('Notice: Visitor must wear safety helmet and high-visibility jacket inside manufacturing bays. Photography strictly prohibited.', M + 10, y - 78, 6.5, reg, rgb(0.57, 0.25, 0.05));
    y -= 100;
  }

  if (data.remarks && docType !== 'INWARD') {
    ensure(40);
    text('REMARKS', M, y, 8.5, bold, rgb(0.28, 0.33, 0.41));
    y -= 12;
    wrap(reg, data.remarks, 9, CW).slice(0, 4).forEach((l) => { text(l, M, y, 9); y -= 11.5; });
    y -= 8;
  }

  /* ---------- signatures ---------- */
  ensure(110);
  y = Math.min(y - 30, M + 110);
  const sigW = (CW - 36) / 4;
  const sigs: [string, string][] = [
    [data.driverName || data.personName || data.visitorName || 'Driver / Carrier', 'Carrier / Deliverer Signature'],
    [data.verifiedBy || data.securityStaffName || 'Security Staff', 'Security Gate Officer'],
    [data.approvedBy || 'Plant Supervisor', 'Supervisor / QC Approval'],
  ];
  sigs.forEach(([name, role], i) => {
    const x = M + i * (sigW + 12);
    page.drawLine({ start: { x, y }, end: { x: x + sigW, y }, thickness: 0.75, color: MUTED, dashArray: [3, 3] });
    textCenter(wrap(bold, name, 8.5, sigW)[0], x + sigW / 2, y - 12, 8.5, bold);
    textCenter(role, x + sigW / 2, y - 23, 7, reg, MUTED);
  });
  const sx = M + 3 * (sigW + 12);
  page.drawRectangle({ x: sx, y: y - 30, width: sigW, height: 48, borderColor: rgb(0.02, 0.37, 0.27), borderWidth: 1.5 });
  textCenter('RAVIRAJA SECURITY', sx + sigW / 2, y + 2, 8, bold, rgb(0.02, 0.37, 0.27));
  textCenter('GATE INSPECTION PASSED', sx + sigW / 2, y - 10, 6.5, bold, rgb(0.02, 0.37, 0.27));

  text(`Generated ${new Date().toLocaleString('en-IN')}`, M, M - 6, 6.5, reg, MUTED);
  return doc.save();
}

/** Landscape A4 table PDF for the Reports screen. */
export async function buildTablePdf(args: {
  title: string;
  headers: string[];
  rows: unknown[][];
  settings: Pick<SecuritySettings, 'companyName' | 'plantAddress' | 'gstNumber'>;
}): Promise<Uint8Array> {
  const { title, headers, rows, settings } = args;
  const PW = H; // landscape
  const PH = W;
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(title);
  const cw = PW - M * 2;
  const clean = (f: PDFFont, v: unknown) => toWinAnsi(f, String(v ?? '').replace(/\s+/g, ' ')).text;

  // equal-ish column widths, widest header/content gets more space
  const sample = [headers, ...rows.slice(0, 60).map((r) => r.map(String))];
  const natural = headers.map((_, i) => Math.min(150, Math.max(40, ...sample.map((r) => reg.widthOfTextAtSize(clean(reg, r[i]), 7) + 8))));
  const sum = natural.reduce((a, b) => a + b, 0);
  const widths = natural.map((n) => (n / sum) * cw);

  const wrap = (f: PDFFont, v: unknown, size: number, maxW: number) => {
    const words = clean(f, v).split(' ').filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(t, size) <= maxW) cur = t;
      else {
        if (cur) lines.push(cur);
        let rest = w;
        while (f.widthOfTextAtSize(rest, size) > maxW && rest.length > 1) {
          let n = rest.length - 1;
          while (n > 1 && f.widthOfTextAtSize(rest.slice(0, n), size) > maxW) n--;
          lines.push(rest.slice(0, n));
          rest = rest.slice(n);
        }
        cur = rest;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  let page = doc.addPage([PW, PH]);
  drawFrame(page, PW, PH);
  let y = PH - M;
  const drawHeader = (first: boolean) => {
    if (first) {
      const nm = clean(bold, settings.companyName.toUpperCase());
      page.drawText(nm, { x: PW / 2 - bold.widthOfTextAtSize(nm, 15) / 2, y: y - 14, size: 15, font: bold, color: INK });
      const ad = clean(reg, settings.plantAddress);
      page.drawText(ad, { x: PW / 2 - reg.widthOfTextAtSize(ad, 8) / 2, y: y - 27, size: 8, font: reg, color: MUTED });
      page.drawLine({ start: { x: M, y: y - 36 }, end: { x: PW - M, y: y - 36 }, thickness: 1.5, color: INK });
      page.drawText(clean(bold, title), { x: M, y: y - 54, size: 12, font: bold, color: INK });
      const gen = `Generated ${new Date().toLocaleString('en-IN')}  |  GSTIN ${settings.gstNumber}`;
      page.drawText(clean(reg, gen), { x: PW - M - reg.widthOfTextAtSize(clean(reg, gen), 7.5), y: y - 54, size: 7.5, font: reg, color: MUTED });
      y -= 66;
    }
    page.drawRectangle({ x: M, y: y - 16, width: cw, height: 16, color: rgb(0.9, 0.92, 0.95), borderColor: LINE, borderWidth: 0.75 });
    let x = M;
    headers.forEach((h, i) => {
      page.drawText(wrap(bold, h, 6.5, widths[i] - 6)[0], { x: x + 3, y: y - 11, size: 6.5, font: bold, color: INK });
      x += widths[i];
    });
    y -= 16;
  };
  drawHeader(true);

  rows.forEach((r) => {
    const cells = headers.map((_, i) => wrap(reg, r[i], 7, widths[i] - 6));
    const rh = Math.max(...cells.map((c) => c.length)) * 9 + 6;
    if (y - rh < M) {
      page = doc.addPage([PW, PH]);
      drawFrame(page, PW, PH);
      y = PH - M;
      drawHeader(false);
    }
    let x = M;
    cells.forEach((lines, i) => {
      lines.forEach((ln, li) => ln && page.drawText(ln, { x: x + 3, y: y - 9 - li * 9, size: 7, font: reg, color: INK }));
      x += widths[i];
    });
    y -= rh;
    page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.5, color: LINE });
  });
  if (!rows.length) page.drawText('No records for this report.', { x: M, y: y - 16, size: 9, font: reg, color: MUTED });
  return doc.save();
}
