import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  renderedToUser,
  flattenAnnotations,
  rotatePage,
  deletePage,
  movePage,
  insertBlankPage,
  mergePdf,
  addWatermark,
  addPageNumbers,
  toWinAnsi,
  pageCount,
  Annot,
} from './pdfOps';
import { StandardFonts } from 'pdf-lib';

async function makePdf(pages = 2, rotation = 0) {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = d.addPage([600, 800]);
    p.setRotation(degrees(rotation));
  }
  return d.save();
}

test('renderedToUser maps the rendered top-left corner correctly for each rotation (600x800 page)', () => {
  // rotation 0: top-left => (0, 800)
  assert.deepEqual(renderedToUser(0, 0, 0, 600, 800), { u: 0, v: 800 });
  // rotation 90: rendered is 800 wide x 600 tall; its top-left is the user's bottom-left (0,0)
  assert.deepEqual(renderedToUser(0, 0, 90, 600, 800), { u: 0, v: 0 });
  // rotation 180: top-left => bottom-right (600, 0)
  assert.deepEqual(renderedToUser(0, 0, 180, 600, 800), { u: 600, v: 0 });
  // rotation 270: top-left => top-right (600, 800)
  assert.deepEqual(renderedToUser(0, 0, 270, 600, 800), { u: 600, v: 800 });
});

test('renderedToUser: rendered bottom-right corner lands on the opposite user corner', () => {
  assert.deepEqual(renderedToUser(600, 800, 0, 600, 800), { u: 600, v: 0 });
  assert.deepEqual(renderedToUser(800, 600, 90, 600, 800), { u: 600, v: 800 });
  assert.deepEqual(renderedToUser(600, 800, 180, 600, 800), { u: 0, v: 800 });
  assert.deepEqual(renderedToUser(800, 600, 270, 600, 800), { u: 0, v: 0 });
});

test('flattenAnnotations works on every rotation and keeps page count', async () => {
  const annots = (page: number): Annot[] => [
    { id: '1', type: 'text', page, x: 50, y: 50, w: 100, h: 20, text: 'Hello ₹500 नमस्ते', size: 14, color: '#ff0000' },
    { id: '2', type: 'rect', page, x: 10, y: 10, w: 100, h: 50, color: '#0000ff' },
    { id: '3', type: 'highlight', page, x: 20, y: 20, w: 100, h: 20, color: '#ffff00' },
    { id: '4', type: 'whiteout', page, x: 30, y: 30, w: 40, h: 40, color: '#ffffff' },
    { id: '5', type: 'draw', page, points: [{ x: 1, y: 1 }, { x: 40, y: 40 }], color: '#000000', width: 2 },
  ];
  for (const rot of [0, 90, 180, 270]) {
    const src = await makePdf(2, rot);
    const out = await flattenAnnotations(src, annots(1));
    assert.equal(await pageCount(out.bytes), 2);
    assert.equal(out.droppedChars, 6); // the six Devanagari code points in 'नमस्ते'
  }
});

test('toWinAnsi maps rupee sign and drops unsupported glyphs', async () => {
  const d = await PDFDocument.create();
  const f = await d.embedFont(StandardFonts.Helvetica);
  assert.equal(toWinAnsi(f, '₹100').text, 'Rs.100');
  const r = toWinAnsi(f, 'ok 日本');
  assert.equal(r.text, 'ok ');
  assert.equal(r.dropped, 2);
});

test('page operations', async () => {
  let b = await makePdf(3);
  b = await rotatePage(b, 0, 90);
  assert.equal((await PDFDocument.load(b)).getPage(0).getRotation().angle, 90);
  b = await rotatePage(b, 0, -90);
  b = await rotatePage(b, 0, -90);
  assert.equal((await PDFDocument.load(b)).getPage(0).getRotation().angle, 270);
  b = await deletePage(b, 1);
  assert.equal(await pageCount(b), 2);
  b = await insertBlankPage(b, 0);
  assert.equal(await pageCount(b), 3);
  // move keeps rotation of the moved page (page 0 had 270)
  b = await movePage(b, 0, 2);
  assert.equal((await PDFDocument.load(b)).getPage(2).getRotation().angle, 270);
  const merged = await mergePdf(b, await makePdf(2));
  assert.equal(await pageCount(merged), 5);
  const single = await makePdf(1);
  await assert.rejects(() => deletePage(single, 0));
});

test('watermark and page numbers keep page count and work on rotated pages', async () => {
  const src = await makePdf(2, 90);
  const w = await addWatermark(src, 'CONFIDENTIAL');
  assert.equal(await pageCount(w.bytes), 2);
  const n = await addPageNumbers(w.bytes);
  assert.equal(await pageCount(n), 2);
});

import { buildVoucherPdf } from './voucherPdf';

test('buildVoucherPdf creates a PDF for every voucher type, even with long text and many rows', async () => {
  const settings = { companyName: 'RAVIRAJA INDUSTRIES PRIVATE LIMITED', plantAddress: 'Plot 42, GIDC, Naroda, Ahmedabad', gstNumber: '24AAACR1234F1Z8' };
  const mats = Array.from({ length: 40 }, (_, i) => ({ id: String(i), materialName: 'PVC Resin SG-5 very long material description '.repeat(3), materialCode: 'PVC-001', batchNumber: 'B' + i, numberOfPackages: 10, quantityReceived: 1000, unit: 'KG' }));
  const base = { entryDate: '2026-11-09', entryTime: '09:10', vehicleNumber: 'GJ01AB1234', driverName: 'Ramesh ₹', materials: mats, invoiceQuantity: 40000, actualReceivedQuantity: 40000, shortageQuantity: 0, excessQuantity: 0 };
  for (const t of ['INWARD', 'OUTWARD', 'GATE_PASS', 'VISITOR', 'RETURN'] as const) {
    const bytes = await buildVoucherPdf({ docType: t, title: 'Test', docNumber: 'X-1', data: { ...base, personToMeet: 'A', department: 'B', visitorType: 'Guest', idProofType: 'PAN', idProofNumber: '1', purposeOfVisit: 'Meet' }, settings });
    assert.ok((await pageCount(bytes)) >= 1);
  }
  const multi = await buildVoucherPdf({ docType: 'INWARD', title: 'T', docNumber: 'X', data: base, settings });
  assert.ok((await pageCount(multi)) > 1, 'many rows paginate');
  const empty = await buildVoucherPdf({ docType: 'GATE_PASS', title: 'T', docNumber: 'G-1', data: { date: '2026-11-09', time: '10:00' }, settings });
  assert.equal(await pageCount(empty), 1);
});
