import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  MousePointer2, Type, Highlighter, Square, Eraser, Pencil, PenTool, Image as ImageIcon, Stamp,
  Undo2, Download, FilePlus2, FileUp, RotateCcw, RotateCw, Trash2, ArrowUp, ArrowDown, ZoomIn, ZoomOut,
  Droplets, Hash, Scissors, Crown, FileText, ArrowLeft, Maximize2, ImagePlus, Info,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { UserProfile } from '../../types/security';
import { confirmDialog, promptDialog } from '../common/Dialogs';
import {
  Annot, flattenAnnotations, rotatePage, deletePage, movePage, insertBlankPage, mergePdf,
  addWatermark, addPageNumbers, extractPage, setMetadata,
} from './pdfOps';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Tool = 'select' | 'text' | 'highlight' | 'rect' | 'whiteout' | 'draw';
interface Snapshot { bytes: Uint8Array; annots: Annot[] }
interface Props {
  /** A PDF handed over by another screen (e.g. a voucher). Loaded once, then cleared via onInitialPdfLoaded. */
  initialPdf?: { bytes: Uint8Array; name: string; returnTab: string } | null;
  onInitialPdfLoaded?: () => void;
  onBack?: (tab: string) => void;
  currentUser: UserProfile;
  companyName: string;
  onAudit: (details: string) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const MAX_BYTES = 50 * 1024 * 1024;
const uid = () => `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const isPdf = (b: Uint8Array) => b.length > 4 && String.fromCharCode(b[0], b[1], b[2], b[3]) === '%PDF';

function download(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- thumbnail ---------- */
const Thumb: React.FC<{ doc: pdfjs.PDFDocumentProxy; index: number }> = ({ doc, index }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: pdfjs.RenderTask | null = null;
    let dead = false;
    (async () => {
      let page: pdfjs.PDFPageProxy;
      try { page = await doc.getPage(index + 1); } catch { return; }
      if (dead || !ref.current) return;
      const vp = page.getViewport({ scale: 0.22 });
      const c = ref.current;
      c.width = vp.width;
      c.height = vp.height;
      task = page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => { dead = true; task?.cancel(); };
  }, [doc, index]);
  return <canvas ref={ref} className="w-full h-auto bg-white shadow-xs border border-slate-200" />;
};

/* ---------- signature pad ---------- */
const SignaturePad: React.FC<{ onSave: (dataUrl: string) => void; onClose: () => void }> = ({ onSave, onClose }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 480, y: ((e.clientY - r.top) / r.height) * 180 };
  };
  const down = (e: React.PointerEvent) => {
    drawing.current = true;
    ref.current!.setPointerCapture(e.pointerId);
    const ctx = ref.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827';
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext('2d')!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    setEmpty(false);
  };
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg space-y-3">
        <p className="font-bold text-slate-900 text-sm">Draw your signature</p>
        <canvas
          ref={ref} width={480} height={180}
          onPointerDown={down} onPointerMove={move} onPointerUp={() => (drawing.current = false)}
          className="w-full border border-dashed border-slate-300 rounded-lg touch-none bg-slate-50 cursor-crosshair"
        />
        <div className="flex justify-between">
          <button onClick={() => { ref.current!.getContext('2d')!.clearRect(0, 0, 480, 180); setEmpty(true); }} className="text-xs font-semibold text-slate-600 px-3 py-2 hover:bg-slate-100 rounded-lg">Clear</button>
          <div className="space-x-2">
            <button onClick={onClose} className="text-xs font-semibold text-slate-600 px-3 py-2 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button disabled={empty} onClick={() => onSave(ref.current!.toDataURL('image/png'))} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-40">Place on page</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- main editor ---------- */
const LOGO_KEY = 'raviraja_pdf_logo_v1';
interface Logo { url: string; w: number; h: number }
const loadLogo = (): Logo | null => {
  try { return JSON.parse(localStorage.getItem(LOGO_KEY) || 'null'); } catch { return null; }
};
const TAB_NAMES: Record<string, string> = {
  'inward-entry': 'Inward Entry', 'outward-entry': 'Outward Dispatch', 'visitor-management': 'Visitor Management',
  'return-material': 'Return Material', 'gate-pass': 'Gate Pass Register', 'security-dashboard': 'Dashboard',
  'security-reports': 'Reports',
};
const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

export default function PdfEditor({ currentUser, companyName, onAudit, notify, initialPdf, onInitialPdfLoaded, onBack }: Props) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState('document.pdf');
  const [annots, setAnnots] = useState<Annot[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [zoom, setZoom] = useState(1.25);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#dc2626');
  const [fontSize, setFontSize] = useState(14);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Annot | null>(null);
  const [busy, setBusy] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [returnTab, setReturnTab] = useState<string | null>(null);
  const [keepName, setKeepName] = useState(false);
  const [logo, setLogo] = useState<Logo | null>(loadLogo);
  const pendingLogoSide = useRef<'left' | 'right' | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const drag = useRef<null | { mode: 'move' | 'resize' | 'draw' | 'box'; id?: string; sx: number; sy: number; orig?: Annot }>(null);

  const numPages = doc?.numPages ?? 0;
  const pageAnnots = annots.filter((a) => a.page === pageIdx);

  const pushHistory = useCallback(() => {
    if (!bytes) return;
    setHistory((h) => [...h.slice(-19), { bytes, annots }]);
  }, [bytes, annots]);

  /* open a PDF handed over from a voucher / report */
  useEffect(() => {
    if (!initialPdf) return;
    setBytes(initialPdf.bytes);
    setFileName(initialPdf.name);
    setKeepName(true);
    setReturnTab(initialPdf.returnTab);
    setAnnots([]); setHistory([]); setPageIdx(0); setSelectedId(null);
    onInitialPdfLoaded?.();
  }, [initialPdf, onInitialPdfLoaded]);

  /* load pdf.js document whenever bytes change */
  useEffect(() => {
    if (!bytes) { setDoc(null); return; }
    let dead = false;
    const task = pdfjs.getDocument({ data: bytes.slice() });
    task.promise.then((d) => { if (!dead) setDoc(d); })
      .catch(() => notify('Could not read this PDF (it may be corrupt or password-protected).', 'error'));
    return () => { dead = true; task.destroy().catch(() => {}); };
  }, [bytes, notify]);

  /* render current page */
  useEffect(() => {
    if (!doc) return;
    let task: pdfjs.RenderTask | null = null;
    let dead = false;
    (async () => {
      const idx = Math.min(pageIdx, doc.numPages - 1);
      let page: pdfjs.PDFPageProxy;
      try { page = await doc.getPage(idx + 1); } catch { return; }
      if (dead || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      setPageSize({ w: base.width, h: base.height });
      const dpr = window.devicePixelRatio || 1;
      const vp = page.getViewport({ scale: zoom * dpr });
      const c = canvasRef.current;
      c.width = vp.width; c.height = vp.height;
      c.style.width = `${base.width * zoom}px`; c.style.height = `${base.height * zoom}px`;
      task = page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => { dead = true; task?.cancel(); };
  }, [doc, pageIdx, zoom]);

  useEffect(() => { if (doc && pageIdx >= doc.numPages) setPageIdx(doc.numPages - 1); }, [doc, pageIdx]);

  /* ---- file open ---- */
  const readFile = async (f: File): Promise<Uint8Array | null> => {
    if (f.size > MAX_BYTES) { notify('File is larger than 50 MB.', 'error'); return null; }
    const b = new Uint8Array(await f.arrayBuffer());
    if (!isPdf(b)) { notify('That file is not a PDF.', 'error'); return null; }
    return b;
  };
  const openFile = async (f?: File) => {
    if (!f) return;
    const b = await readFile(f);
    if (!b) return;
    try {
      await extractPage(b, 0); // validates it can be parsed (rejects encrypted/corrupt)
    } catch {
      notify('This PDF is encrypted or damaged and cannot be edited.', 'error');
      return;
    }
    setBytes(b); setFileName(f.name); setKeepName(false); setAnnots([]); setHistory([]); setPageIdx(0); setSelectedId(null);
  };
  const newBlank = async () => {
    const d = await PDFDocument.create();
    d.addPage([595.28, 841.89]);
    setBytes(await d.save()); setFileName('blank.pdf'); setAnnots([]); setHistory([]); setPageIdx(0);
  };

  /* ---- page ops: annotations are burned in first so page numbers stay consistent ---- */
  const pageOp = async (fn: (b: Uint8Array) => Promise<Uint8Array>, nextPage?: (n: number) => number) => {
    if (!bytes) return;
    setBusy(true);
    try {
      pushHistory();
      let b = bytes;
      if (annots.length) b = (await flattenAnnotations(b, annots)).bytes;
      b = await fn(b);
      setBytes(b); setAnnots([]); setSelectedId(null);
      if (nextPage) setPageIdx((p) => nextPage(p));
    } catch (e: any) {
      notify(e?.message || 'Operation failed.', 'error');
    } finally { setBusy(false); }
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setBytes(last.bytes); setAnnots(last.annots); setSelectedId(null); setEditingId(null);
  };

  const exportPdf = async () => {
    if (!bytes) return;
    setBusy(true);
    try {
      const flat = annots.length ? await flattenAnnotations(bytes, annots) : { bytes, droppedChars: 0 };
      const out = await setMetadata(flat.bytes, currentUser.name, `${companyName} PDF Editor`);
      const name = keepName ? fileName : fileName.replace(/\.pdf$/i, '') + '-edited.pdf';
      download(out, name);
      onAudit(`Exported "${name}" (${numPages} pages, ${annots.length} edits).`);
      notify(flat.droppedChars ? `Exported. ${flat.droppedChars} unsupported character(s) were skipped (standard fonts only).` : 'PDF exported.');
    } catch (e: any) {
      notify(e?.message || 'Export failed.', 'error');
    } finally { setBusy(false); }
  };

  /* ---- annotation interactions ---- */
  const pt = (e: React.PointerEvent) => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  };
  const update = (id: string, patch: Partial<Annot>) =>
    setAnnots((list) => list.map((a) => (a.id === id ? ({ ...a, ...patch } as Annot) : a)));

  const onOverlayDown = (e: React.PointerEvent) => {
    if (!bytes || e.target !== overlayRef.current) return;
    const p = pt(e);
    setSelectedId(null); setEditingId(null);
    if (tool === 'highlight' || tool === 'rect' || tool === 'whiteout') {
      overlayRef.current!.setPointerCapture(e.pointerId);
      drag.current = { mode: 'box', sx: p.x, sy: p.y };
      setDraft({ id: 'draft', type: tool, page: pageIdx, x: p.x, y: p.y, w: 0, h: 0, color: tool === 'highlight' && color === '#dc2626' ? '#facc15' : color });
    } else if (tool === 'draw') {
      overlayRef.current!.setPointerCapture(e.pointerId);
      drag.current = { mode: 'draw', sx: p.x, sy: p.y };
      setDraft({ id: 'draft', type: 'draw', page: pageIdx, points: [p], color, width: 2 });
    }
  };

  // Text boxes are created on click (after mouse-up) so the browser's mouse-down focus
  // change cannot blur the new textarea and delete it as empty.
  const onOverlayClick = (e: React.MouseEvent) => {
    if (!bytes || tool !== 'text' || e.target !== overlayRef.current) return;
    const r = overlayRef.current!.getBoundingClientRect();
    pushHistory();
    const a: Annot = { id: uid(), type: 'text', page: pageIdx, x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom, w: 180, h: fontSize * 1.4, text: '', size: fontSize, color };
    setAnnots((l) => [...l, a]); setSelectedId(a.id); setEditingId(a.id); setTool('select');
  };

  const startMove = (e: React.PointerEvent, a: Annot, mode: 'move' | 'resize') => {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelectedId(a.id);
    if (editingId === a.id && mode === 'move') return;
    overlayRef.current!.setPointerCapture(e.pointerId);
    const p = pt(e);
    pushHistory();
    drag.current = { mode, id: a.id, sx: p.x, sy: p.y, orig: a };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = pt(e);
    if (d.mode === 'box' && draft && draft.type !== 'draw' && draft.type !== 'image' && draft.type !== 'text') {
      setDraft({ ...draft, x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) });
    } else if (d.mode === 'draw' && draft?.type === 'draw') {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else if (d.mode === 'move' && d.orig) {
      const dx = p.x - d.sx, dy = p.y - d.sy, o = d.orig;
      if (o.type === 'draw') update(o.id, { points: o.points.map((q) => ({ x: q.x + dx, y: q.y + dy })) } as Partial<Annot>);
      else update(o.id, { x: o.x + dx, y: o.y + dy } as Partial<Annot>);
    } else if (d.mode === 'resize' && d.orig && d.orig.type !== 'draw') {
      const o = d.orig;
      const w = Math.max(8, o.w + (p.x - d.sx));
      const h = o.type === 'image' ? w * (o.h / o.w) : Math.max(8, o.h + (p.y - d.sy));
      update(o.id, { w, h } as Partial<Annot>);
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !draft) { setDraft(null); return; }
    if (d.mode === 'box' && draft.type !== 'draw' && draft.type !== 'image' && draft.type !== 'text' && draft.w > 4 && draft.h > 4) {
      pushHistory();
      setAnnots((l) => [...l, { ...draft, id: uid() } as Annot]);
    } else if (d.mode === 'draw' && draft.type === 'draw' && draft.points.length > 1) {
      pushHistory();
      setAnnots((l) => [...l, { ...draft, id: uid() } as Annot]);
    }
    setDraft(null);
  };

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory();
    setAnnots((l) => l.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); removeSelected(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if (selectedId && e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setAnnots((l) => l.map((a) => {
          if (a.id !== selectedId) return a;
          if (a.type === 'draw') return { ...a, points: a.points.map((q) => ({ x: q.x + dx, y: q.y + dy })) };
          return { ...a, x: a.x + dx, y: a.y + dy };
        }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const placeImage = (dataUrl: string, width: number, height: number) => {
    pushHistory();
    const w = Math.min(200, width), h = (height / width) * w;
    const a: Annot = { id: uid(), type: 'image', page: pageIdx, x: Math.max(10, pageSize.w / 2 - w / 2), y: Math.max(10, pageSize.h / 2 - h / 2), w, h, dataUrl };
    setAnnots((l) => [...l, a]); setSelectedId(a.id); setTool('select');
  };
  const onImageFile = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return notify('Only PNG or JPG images are supported.', 'error');
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result);
      const img = new Image();
      img.onload = () => placeImage(url, img.width, img.height);
      img.src = url;
    };
    r.readAsDataURL(f);
  };
  /* ---- company logo: upload once (kept in this browser), then place left / right and move freely ---- */
  const saveLogoFile = (f?: File) => {
    const side = pendingLogoSide.current;
    pendingLogoSide.current = null;
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return notify('Logo must be a PNG, JPG or WebP image.', 'error');
    if (f.size > 5 * 1024 * 1024) return notify('Logo is larger than 5 MB.', 'error');
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 400 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const next: Logo = { url: c.toDataURL('image/png'), w: c.width, h: c.height };
        try { localStorage.setItem(LOGO_KEY, JSON.stringify(next)); } catch { /* storage blocked: logo lasts for this visit */ }
        setLogo(next);
        if (side) placeLogoWith(next, side);
        else notify('Logo saved. Use Logo Left / Logo Right to place it.');
      };
      img.onerror = () => notify('Could not read that image.', 'error');
      img.src = String(r.result);
    };
    r.readAsDataURL(f);
  };
  const placeLogoWith = (l: Logo, side: 'left' | 'right') => {
    if (!bytes) return;
    pushHistory();
    const w = 90, h = (l.h / l.w) * w;
    const a: Annot = { id: uid(), type: 'image', page: pageIdx, x: side === 'left' ? 36 : Math.max(36, pageSize.w - 36 - w), y: 24, w, h, dataUrl: l.url };
    setAnnots((list) => [...list, a]); setSelectedId(a.id); setTool('select');
  };
  const placeLogo = (side: 'left' | 'right') => {
    if (logo) return placeLogoWith(logo, side);
    pendingLogoSide.current = side;
    logoRef.current?.click();
  };
  const fitWidth = () => {
    const el = scrollRef.current;
    if (!el || !pageSize.w) return;
    setZoom(Math.max(0.5, Math.min(3, +((el.clientWidth - 32) / pageSize.w).toFixed(2))));
  };

  const addStamp = () => {
    pushHistory();
    const text = `APPROVED\n${currentUser.name.split('(')[0].trim()}\n${new Date().toLocaleDateString('en-IN')}`;
    const a: Annot = { id: uid(), type: 'text', page: pageIdx, x: 40, y: 40, w: 180, h: 14 * 1.4 * 3, text, size: 14, color: '#059669' };
    setAnnots((l) => [...l, a]); setSelectedId(a.id); setTool('select');
  };

  /* ---- render helpers ---- */
  const renderAnnot = (a: Annot, isDraft = false) => {
    const sel = a.id === selectedId;
    const common = 'absolute ' + (tool === 'select' && !isDraft ? 'cursor-move ' : 'pointer-events-none ') + (sel ? 'outline outline-2 outline-emerald-500 outline-offset-1 ' : '');
    if (a.type === 'draw') {
      const xs = a.points.map((p) => p.x), ys = a.points.map((p) => p.y);
      return (
        <svg key={a.id} className="absolute inset-0 pointer-events-none" width={pageSize.w * zoom} height={pageSize.h * zoom}>
          <polyline points={a.points.map((p) => `${p.x * zoom},${p.y * zoom}`).join(' ')} fill="none" stroke={a.color} strokeWidth={a.width * zoom} strokeLinecap="round" strokeLinejoin="round" />
          {tool === 'select' && !isDraft && (
            <rect x={Math.min(...xs) * zoom - 4} y={Math.min(...ys) * zoom - 4} width={(Math.max(...xs) - Math.min(...xs)) * zoom + 8} height={(Math.max(...ys) - Math.min(...ys)) * zoom + 8}
              fill="transparent" stroke={sel ? '#10b981' : 'none'} strokeWidth={2} className="pointer-events-auto cursor-move"
              onPointerDown={(e) => startMove(e, a, 'move')} />
          )}
        </svg>
      );
    }
    const style: React.CSSProperties = { left: a.x * zoom, top: a.y * zoom, width: a.w * zoom, height: a.h * zoom };
    const handle = sel && !isDraft && a.type !== 'text' && (
      <span onPointerDown={(e) => startMove(e, a, 'resize')} className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-emerald-500 rounded-full cursor-nwse-resize pointer-events-auto" />
    );
    if (a.type === 'text') {
      const editing = editingId === a.id;
      const ts: React.CSSProperties = { left: a.x * zoom, top: a.y * zoom, fontSize: a.size * zoom, lineHeight: 1.2, color: a.color, fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'pre', minWidth: 20 * zoom };
      return editing ? (
        <textarea key={a.id} autoFocus value={a.text} rows={Math.max(1, a.text.split('\n').length)}
          cols={Math.max(8, ...a.text.split('\n').map((l) => l.length + 1))}
          onChange={(e) => update(a.id, { text: e.target.value } as Partial<Annot>)}
          onBlur={() => { setEditingId(null); if (!a.text.trim()) setAnnots((l) => l.filter((x) => x.id !== a.id)); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bg-white/70 outline outline-2 outline-emerald-500 resize-none overflow-hidden p-0 m-0 border-0" style={ts} />
      ) : (
        <div key={a.id} className={common} style={ts} onPointerDown={(e) => startMove(e, a, 'move')} onDoubleClick={() => tool === 'select' && setEditingId(a.id)}>{a.text}</div>
      );
    }
    const bg: React.CSSProperties =
      a.type === 'rect' ? { border: `${1.5 * zoom}px solid ${a.color}` }
      : a.type === 'highlight' ? { background: a.color, opacity: 0.35 }
      : a.type === 'whiteout' ? { background: '#fff', outline: sel || isDraft ? '1px dashed #94a3b8' : 'none' }
      : {};
    return (
      <div key={a.id} className={common} style={{ ...style, ...bg }} onPointerDown={(e) => startMove(e, a, 'move')}>
        {a.type === 'image' && <img src={a.dataUrl} alt="" draggable={false} className="w-full h-full select-none" />}
        {handle}
      </div>
    );
  };

  const tools: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select / move' },
    { id: 'text', icon: Type, label: 'Add text' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'whiteout', icon: Eraser, label: 'Whiteout (cover content)' },
    { id: 'draw', icon: Pencil, label: 'Freehand draw' },
  ];
  const btn = 'p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent';
  const sel = (a: Annot | undefined) => a;
  void sel;

  return (
    <div className="space-y-4 text-xs">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-extrabold tracking-tight">PDF Editor</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold"><Crown className="w-3 h-3" />PREMIUM</span>
          </div>
          <p className="text-slate-400 mt-1">Annotate, sign, redact, reorder, merge and stamp invoices, gate passes and certificates. Files stay in your browser — nothing is uploaded.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnTab && onBack && (
            <button onClick={() => onBack(returnTab)} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"><ArrowLeft className="w-4 h-4" />Back to {TAB_NAMES[returnTab] || 'previous screen'}</button>
          )}
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"><FileUp className="w-4 h-4" />Open PDF</button>
          <button onClick={newBlank} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold"><FilePlus2 className="w-4 h-4" />Blank page</button>
          <button disabled={!bytes || busy} onClick={exportPdf} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-bold"><Download className="w-4 h-4" />Download</button>
        </div>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={mergeRef} type="file" accept="application/pdf,.pdf" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          const other = await readFile(f);
          if (other) await pageOp((b) => mergePdf(b, other));
        }} />
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { saveLogoFile(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={imgRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { onImageFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {inFrame && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>This app is open inside a preview frame, and many previews block file downloads. If <b>Download</b> does nothing, open the app from its own web address (or run it locally) to save PDFs.</span>
        </div>
      )}

      {!bytes ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); openFile(e.dataTransfer.files?.[0]); }}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white rounded-xl p-16 text-center"
        >
          <FileUp className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="mt-3 font-bold text-slate-800 text-sm">Drop a PDF here or click to browse</p>
          <p className="text-slate-500 mt-1">Up to 50 MB. Password-protected files are not supported.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[150px_1fr] gap-4 items-start">
          {/* pages */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-2 max-h-[75vh] overflow-y-auto sticky top-20">
            {doc && Array.from({ length: numPages }, (_, i) => (
              <div key={`${i}-${doc.fingerprints[0]}-${numPages}`} onClick={() => setPageIdx(i)}
                className={`cursor-pointer rounded-md p-1 ${i === pageIdx ? 'ring-2 ring-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'}`}>
                <Thumb doc={doc} index={i} />
                <p className="text-center text-[10px] text-slate-500 mt-0.5">{i + 1}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 min-w-0">
            {/* toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center gap-1">
              {tools.map((t) => (
                <button key={t.id} title={t.label} onClick={() => setTool(t.id)} className={`${btn} ${tool === t.id ? '!bg-emerald-100 !text-emerald-700' : ''}`}><t.icon className="w-4 h-4" /></button>
              ))}
              <button title="Sign (draw signature)" onClick={() => setSigOpen(true)} className={btn}><PenTool className="w-4 h-4" /></button>
              <button title="Insert image (PNG/JPG)" onClick={() => imgRef.current?.click()} className={btn}><ImageIcon className="w-4 h-4" /></button>
              <button title="Approval stamp" onClick={addStamp} className={btn}><Stamp className="w-4 h-4" /></button>
              <span className="w-px h-6 bg-slate-200 mx-1" />
              <button title="Place company logo at top-left" onClick={() => placeLogo('left')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700"><ImagePlus className="w-4 h-4" />Logo Left</button>
              <button title="Place company logo at top-right" onClick={() => placeLogo('right')} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700"><ImagePlus className="w-4 h-4" />Logo Right</button>
              <button title={logo ? 'Replace saved logo' : 'Upload logo'} onClick={() => { pendingLogoSide.current = null; logoRef.current?.click(); }} className="px-2 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-medium">{logo ? 'Change logo' : 'Upload logo'}</button>
              <span className="w-px h-6 bg-slate-200 mx-1" />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Colour" className="w-7 h-7 rounded cursor-pointer border border-slate-200" />
              <select value={fontSize} onChange={(e) => setFontSize(+e.target.value)} title="Text size" className="border border-slate-200 rounded-md px-1 py-1">
                {[10, 12, 14, 18, 24, 32].map((s) => <option key={s} value={s}>{s}pt</option>)}
              </select>
              <span className="w-px h-6 bg-slate-200 mx-1" />
              <button title="Undo (Ctrl+Z)" disabled={!history.length} onClick={undo} className={btn}><Undo2 className="w-4 h-4" /></button>
              <button title="Delete selected" disabled={!selectedId} onClick={removeSelected} className={btn}><Trash2 className="w-4 h-4" /></button>
              <span className="w-px h-6 bg-slate-200 mx-1" />
              <button title="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className={btn}><ZoomOut className="w-4 h-4" /></button>
              <span className="w-10 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
              <button title="Zoom in" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className={btn}><ZoomIn className="w-4 h-4" /></button>
              <button title="Fit page to width" onClick={fitWidth} className={btn}><Maximize2 className="w-4 h-4" /></button>
            </div>

            {/* page tools */}
            <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center gap-1">
              <span className="px-2 font-bold text-slate-500 uppercase text-[10px]">Page {pageIdx + 1}/{numPages}</span>
              <button disabled={busy} title="Rotate left" onClick={() => pageOp((b) => rotatePage(b, pageIdx, -90))} className={btn}><RotateCcw className="w-4 h-4" /></button>
              <button disabled={busy} title="Rotate right" onClick={() => pageOp((b) => rotatePage(b, pageIdx, 90))} className={btn}><RotateCw className="w-4 h-4" /></button>
              <button disabled={busy || pageIdx === 0} title="Move up" onClick={() => pageOp((b) => movePage(b, pageIdx, pageIdx - 1), (p) => p - 1)} className={btn}><ArrowUp className="w-4 h-4" /></button>
              <button disabled={busy || pageIdx >= numPages - 1} title="Move down" onClick={() => pageOp((b) => movePage(b, pageIdx, pageIdx + 1), (p) => p + 1)} className={btn}><ArrowDown className="w-4 h-4" /></button>
              <button disabled={busy} title="Insert blank page after" onClick={() => pageOp((b) => insertBlankPage(b, pageIdx), (p) => p + 1)} className={btn}><FilePlus2 className="w-4 h-4" /></button>
              <button disabled={busy || numPages <= 1} title="Delete page" onClick={async () => { if (await confirmDialog(`Delete page ${pageIdx + 1}?`)) pageOp((b) => deletePage(b, pageIdx), (p) => Math.max(0, p - 1)); }} className={`${btn} !text-rose-600`}><Trash2 className="w-4 h-4" /></button>
              <span className="w-px h-6 bg-slate-200 mx-1" />
              <button disabled={busy} onClick={() => mergeRef.current?.click()} className="px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700">Merge PDF…</button>
              <button disabled={busy} onClick={async () => {
                if (!bytes) return;
                const src = annots.length ? (await flattenAnnotations(bytes, annots)).bytes : bytes;
                download(await extractPage(src, pageIdx), fileName.replace(/\.pdf$/i, '') + `-p${pageIdx + 1}.pdf`);
                onAudit(`Extracted page ${pageIdx + 1} of "${fileName}".`);
              }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700"><Scissors className="w-3.5 h-3.5" />Extract page</button>
              <button disabled={busy} onClick={async () => {
                const t = await promptDialog('Watermark text (applied to every page):', 'CONFIDENTIAL');
                if (t?.trim()) pageOp(async (b) => { const r = await addWatermark(b, t.trim()); if (r.dropped) notify(`${r.dropped} unsupported character(s) skipped.`, 'error'); return r.bytes; });
              }} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700"><Droplets className="w-3.5 h-3.5" />Watermark</button>
              <button disabled={busy} onClick={() => pageOp(addPageNumbers)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700"><Hash className="w-3.5 h-3.5" />Page numbers</button>
            </div>

            {/* canvas */}
            <div ref={scrollRef} onWheel={(e) => { if (e.ctrlKey) { e.preventDefault(); setZoom((z) => Math.min(3, Math.max(0.5, +(z + (e.deltaY < 0 ? 0.1 : -0.1)).toFixed(2)))); } }} className="bg-slate-300/60 rounded-xl p-4 overflow-auto max-h-[75vh]">
              <div className="relative mx-auto shadow-lg bg-white" style={{ width: pageSize.w * zoom, height: pageSize.h * zoom }}>
                <canvas ref={canvasRef} className="block" />
                <div
                  ref={overlayRef}
                  onPointerDown={onOverlayDown} onClick={onOverlayClick} onPointerMove={onMove} onPointerUp={onUp}
                  className="absolute inset-0 touch-none"
                  style={{ cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair' }}
                >
                  {pageAnnots.map((a) => renderAnnot(a))}
                  {draft && renderAnnot(draft, true)}
                </div>
              </div>
            </div>
            <p className="text-slate-500">Tip: drag to move · arrow keys nudge (Shift = 10×) · green dot resizes · double-click text to edit · Delete removes · Ctrl+Z undoes · Ctrl+scroll zooms. Page operations (rotate, move, merge…) apply your edits to the PDF first.</p>
          </div>
        </div>
      )}

      {sigOpen && <SignaturePad onClose={() => setSigOpen(false)} onSave={(url) => { setSigOpen(false); const img = new Image(); img.onload = () => placeImage(url, img.width, img.height); img.src = url; }} />}
    </div>
  );
}
