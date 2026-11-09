import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, FilterX } from 'lucide-react';
import { getSecuritySettings } from '../../services/storage';

/* ------------------------------------------------------------------ files */
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  // legacy callers pre-quoted some cells; unwrap so we never double-quote
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
};

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(name: string, headers: string[], rows: unknown[][]) {
  const body = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  saveBlob(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }), name);
}

/* ---------------------------------------------------------- pdf bridge */
interface PdfBridgeValue { openPdf?: (bytes: Uint8Array, name: string) => void }
export const PdfBridge = createContext<PdfBridgeValue>({});

/** Builds a landscape table PDF and opens it in the PDF editor (or downloads it if the editor isn't available). */
export function useExportPdf() {
  const bridge = useContext(PdfBridge);
  return async (title: string, headers: string[], rows: unknown[][], fileName: string) => {
    const { buildTablePdf } = await import('../pdf/voucherPdf');
    const bytes = await buildTablePdf({ title, headers, rows, settings: getSecuritySettings() });
    if (bridge.openPdf) bridge.openPdf(bytes, fileName);
    else saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), fileName);
  };
}

/* ------------------------------------------------- dashboard -> list presets */
export interface ListPreset { status?: string; range?: 'today' | '7d' | 'month' }
const presets = new Map<string, ListPreset>();
export const setListPreset = (module: string, p: ListPreset) => presets.set(module, p);
export const peekListPreset = (module: string): ListPreset | undefined => presets.get(module);
export const consumeListPreset = (module: string): ListPreset | undefined => {
  const p = presets.get(module);
  presets.delete(module);
  return p;
};

/* ------------------------------------------------------------- controls */
const iso = (d: Date) => d.toLocaleDateString('en-CA');
type Range = 'all' | 'today' | '7d' | 'month';
function rangeDates(r: Range): { from: string; to: string } {
  const now = new Date();
  if (r === 'today') return { from: iso(now), to: iso(now) };
  if (r === '7d') return { from: iso(new Date(now.getTime() - 6 * 86400000)), to: iso(now) };
  if (r === 'month') return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
  return { from: '', to: '' };
}

export interface ListOptions<T> {
  module: string;
  /** date (yyyy-mm-dd, optionally followed by time) used by the date filter */
  dateOf?: (row: T) => string | undefined;
  sorters: Record<string, { label: string; value: (row: T) => string | number }>;
  defaultSort: string;
}

export function useListControls<T>(rows: T[], opts: ListOptions<T>) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [quick, setQuick] = useState<Range>('all');
  const [sortKey, setSortKey] = useState(opts.defaultSort);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // apply a preset coming from a dashboard card (once, on first mount)
  useEffect(() => {
    const p = consumeListPreset(opts.module);
    if (p?.range) applyQuick(p.range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyQuick = (r: Range) => {
    const d = rangeDates(r);
    setQuick(r); setFrom(d.from); setTo(d.to); setPage(1);
  };

  const all = useMemo(() => {
    let list = rows;
    if ((from || to) && opts.dateOf) {
      list = list.filter((r) => {
        const day = (opts.dateOf!(r) || '').slice(0, 10);
        return !!day && (!from || day >= from) && (!to || day <= to);
      });
    }
    const s = opts.sorters[sortKey];
    if (s) {
      const sign = dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = s.value(a), y = s.value(b);
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sign;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, from, to, sortKey, dir]);

  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageRows = useMemo(() => all.slice((safePage - 1) * pageSize, safePage * pageSize), [all, safePage, pageSize]);
  useEffect(() => { setPage(1); }, [rows.length, pageSize]);

  return {
    all, pageRows, total: all.length, rawTotal: rows.length, page: safePage, pages, pageSize,
    from, to, quick, sortKey, dir, sorters: opts.sorters, hasDate: !!opts.dateOf,
    setFrom: (v: string) => { setFrom(v); setQuick('all'); setPage(1); },
    setTo: (v: string) => { setTo(v); setQuick('all'); setPage(1); },
    applyQuick, setSortKey: (k: string) => { setSortKey(k); setPage(1); }, setDir, setPageSize, setPage,
    filtersActive: !!(from || to),
    clearDates: () => applyQuick('all'),
  };
}
export type ListControls<T = any> = ReturnType<typeof useListControls<T>>;

/* ------------------------------------------------------------------- UI */
const chip = (active: boolean) =>
  `px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
    active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
  }`;

export function ListExtras({ list, onClearAll }: { list: ListControls; onClearAll?: () => void }) {
  const inp = 'px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700';
  return (
    <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      {list.hasDate && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-medium">Date:</span>
          {([['all', 'All'], ['today', 'Today'], ['7d', 'Last 7 days'], ['month', 'This month']] as [Range, string][]).map(([k, l]) => (
            <button key={k} onClick={() => list.applyQuick(k)} className={chip(list.quick === k && !list.filtersActive ? true : list.quick === k)}>{l}</button>
          ))}
          <input type="date" value={list.from} onChange={(e) => list.setFrom(e.target.value)} aria-label="From date" className={inp} />
          <span className="text-slate-400">→</span>
          <input type="date" value={list.to} onChange={(e) => list.setTo(e.target.value)} aria-label="To date" className={inp} />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 font-medium">Sort:</span>
        <select value={list.sortKey} onChange={(e) => list.setSortKey(e.target.value)} className={inp}>
          {Object.entries(list.sorters).map(([k, s]) => <option key={k} value={k}>{(s as any).label}</option>)}
        </select>
        <button
          onClick={() => list.setDir(list.dir === 'asc' ? 'desc' : 'asc')}
          title={list.dir === 'asc' ? 'Ascending' : 'Descending'}
          className="p-1 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 text-slate-600"
        >
          {list.dir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 font-medium">Rows:</span>
        <select value={list.pageSize} onChange={(e) => list.setPageSize(+e.target.value)} className={inp}>
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {(list.filtersActive || onClearAll) && (
        <button onClick={() => { list.clearDates(); onClearAll?.(); }} className="flex items-center gap-1 text-rose-600 hover:underline font-semibold">
          <FilterX className="w-3.5 h-3.5" /> Clear filters
        </button>
      )}
      <span className="ml-auto text-slate-500">
        {list.total === list.rawTotal ? `${list.total} record${list.total === 1 ? '' : 's'}` : `${list.total} of ${list.rawTotal} records`}
      </span>
    </div>
  );
}

export function Pagination({ list }: { list: ListControls }) {
  if (list.pages <= 1) return null;
  const start = (list.page - 1) * list.pageSize + 1;
  const end = Math.min(list.total, list.page * list.pageSize);
  const b = 'p-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white';
  return (
    <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
      <span>Showing {start}–{end} of {list.total}</span>
      <div className="flex items-center gap-2">
        <button className={b} disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
        <span className="font-semibold">Page {list.page} / {list.pages}</span>
        <button className={b} disabled={list.page >= list.pages} onClick={() => list.setPage(list.page + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function ExportMenu({ onCsv, onPdf }: { onCsv: () => void; onPdf: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onCsv} title="Exports the rows matching your current search and filters" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors">
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        Export CSV
      </button>
      <button onClick={onPdf} title="Opens the filtered register as a PDF in the PDF editor" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors">
        <FileText className="w-4 h-4 text-rose-600" />
        PDF
      </button>
    </div>
  );
}
