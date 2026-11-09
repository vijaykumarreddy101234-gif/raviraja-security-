import { PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';

export type Annot =
  | { id: string; type: 'text'; page: number; x: number; y: number; w: number; h: number; text: string; size: number; color: string }
  | { id: string; type: 'rect' | 'highlight' | 'whiteout'; page: number; x: number; y: number; w: number; h: number; color: string }
  | { id: string; type: 'draw'; page: number; points: { x: number; y: number }[]; color: string; width: number }
  | { id: string; type: 'image'; page: number; x: number; y: number; w: number; h: number; dataUrl: string };

/** Annotation coordinates are in "rendered page points": scale 1, origin top-left, AFTER page rotation. */
export function renderedToUser(
  xr: number,
  yr: number,
  rotation: number,
  w0: number,
  h0: number
): { u: number; v: number } {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { u: yr, v: xr };
    case 180:
      return { u: w0 - xr, v: yr };
    case 270:
      return { u: w0 - yr, v: h0 - xr };
    default:
      return { u: xr, v: h0 - yr };
  }
}

export function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Helvetica only supports WinAnsi. Map ₹ and drop anything that can't be encoded. */
export function toWinAnsi(font: PDFFont, text: string): { text: string; dropped: number } {
  let dropped = 0;
  let out = '';
  for (const ch of text.replace(/₹/g, 'Rs.')) {
    if (ch === '\n') {
      out += ch;
      continue;
    }
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      dropped++;
    }
  }
  return { text: out, dropped };
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

export interface FlattenResult {
  bytes: Uint8Array;
  droppedChars: number;
}

/** Burns annotations into the PDF and returns new bytes. */
export async function flattenAnnotations(src: Uint8Array, annots: Annot[]): Promise<FlattenResult> {
  const doc = await PDFDocument.load(src, { ignoreEncryption: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  let droppedChars = 0;

  for (const a of annots) {
    const page: PDFPage | undefined = pages[a.page];
    if (!page) continue;
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const mb = page.getMediaBox();
    const w0 = mb.width;
    const h0 = mb.height;
    const P = (x: number, y: number) => {
      const { u, v } = renderedToUser(x, y, rot, w0, h0);
      return { x: mb.x + u, y: mb.y + v };
    };

    if (a.type === 'rect' || a.type === 'highlight' || a.type === 'whiteout') {
      const p1 = P(a.x, a.y);
      const p2 = P(a.x + a.w, a.y + a.h);
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);
      if (a.type === 'rect') {
        page.drawRectangle({ x, y, width, height, borderColor: hexToRgb(a.color), borderWidth: 1.5 });
      } else if (a.type === 'highlight') {
        page.drawRectangle({ x, y, width, height, color: hexToRgb(a.color), opacity: 0.35 });
      } else {
        page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
      }
    } else if (a.type === 'draw') {
      const pts = a.points.map((p) => P(p.x, p.y));
      for (let i = 1; i < pts.length; i++) {
        page.drawLine({ start: pts[i - 1], end: pts[i], thickness: a.width, color: hexToRgb(a.color) });
      }
    } else if (a.type === 'text') {
      const { text, dropped } = toWinAnsi(font, a.text);
      droppedChars += dropped;
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        if (!line) return;
        // baseline of line i in rendered coords
        const p = P(a.x, a.y + a.size * (1 + i * 1.2) * 0.98);
        page.drawText(line, { x: p.x, y: p.y, size: a.size, font, color: hexToRgb(a.color), rotate: degrees(rot) });
      });
    } else if (a.type === 'image') {
      const { bytes, mime } = dataUrlToBytes(a.dataUrl);
      const img = mime.includes('png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      // Place by anchoring the rendered top-left and rotating with the page.
      const bl = P(a.x, a.y + a.h);
      page.drawImage(img, { x: bl.x, y: bl.y, width: a.w, height: a.h, rotate: degrees(rot) });
    }
  }

  return { bytes: await doc.save(), droppedChars };
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

export async function rotatePage(bytes: Uint8Array, index: number, delta: 90 | -90): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const p = doc.getPage(index);
  p.setRotation(degrees((((p.getRotation().angle + delta) % 360) + 360) % 360));
  return doc.save();
}

export async function deletePage(bytes: Uint8Array, index: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  if (doc.getPageCount() <= 1) throw new Error('A PDF needs at least one page.');
  doc.removePage(index);
  return doc.save();
}

export async function movePage(bytes: Uint8Array, from: number, to: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const n = doc.getPageCount();
  if (to < 0 || to >= n || from === to) return bytes;
  const order = Array.from({ length: n }, (_, i) => i);
  order.splice(to, 0, order.splice(from, 1)[0]);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, order);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

export async function insertBlankPage(bytes: Uint8Array, after: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const ref = doc.getPage(Math.min(after, doc.getPageCount() - 1));
  const { width, height } = ref.getSize();
  doc.insertPage(after + 1, [width, height]);
  return doc.save();
}

export async function mergePdf(base: Uint8Array, other: Uint8Array): Promise<Uint8Array> {
  const a = await PDFDocument.load(base);
  const b = await PDFDocument.load(other);
  const copied = await a.copyPages(b, b.getPageIndices());
  copied.forEach((p) => a.addPage(p));
  return a.save();
}

export async function extractPage(bytes: Uint8Array, index: number): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const [p] = await out.copyPages(doc, [index]);
  out.addPage(p);
  return out.save();
}

export async function addWatermark(bytes: Uint8Array, text: string): Promise<{ bytes: Uint8Array; dropped: number }> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const { text: clean, dropped } = toWinAnsi(font, text);
  for (const page of doc.getPages()) {
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const mb = page.getMediaBox();
    const size = Math.min(mb.width, mb.height) / Math.max(6, clean.length * 0.55);
    const textW = font.widthOfTextAtSize(clean, size);
    // Center of the page, drawn diagonally; baseline offset keeps text visually centered.
    const cx = mb.x + mb.width / 2;
    const cy = mb.y + mb.height / 2;
    const ang = (45 + rot) * (Math.PI / 180);
    const x = cx - (Math.cos(ang) * textW) / 2 + (Math.sin(ang) * size * 0.3);
    const y = cy - (Math.sin(ang) * textW) / 2 - (Math.cos(ang) * size * 0.3);
    page.drawText(clean, { x, y, size, font, color: rgb(0.6, 0.6, 0.6), opacity: 0.25, rotate: degrees(45 + rot) });
  }
  return { bytes: await doc.save(), dropped };
}

export async function addPageNumbers(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const mb = page.getMediaBox();
    const label = `Page ${i + 1} of ${pages.length}`;
    // bottom-center in *rendered* space
    const W = rot === 90 || rot === 270 ? mb.height : mb.width;
    const H = rot === 90 || rot === 270 ? mb.width : mb.height;
    const tw = font.widthOfTextAtSize(label, 9);
    const { u, v } = renderedToUser(W / 2 - tw / 2, H - 22, rot, mb.width, mb.height);
    page.drawText(label, { x: mb.x + u, y: mb.y + v, size: 9, font, color: rgb(0.3, 0.3, 0.3), rotate: degrees(rot) });
  });
  return doc.save();
}

export async function setMetadata(bytes: Uint8Array, author: string, producer: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  doc.setAuthor(author);
  doc.setProducer(producer);
  doc.setModificationDate(new Date());
  return doc.save();
}
