"use client";

import { useEffect, useMemo, useState } from "react";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };

function formatDate(ms?: number | null) {
  if (!ms) return "—";
  try {
    const s = new Date(ms).toLocaleString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return "—";
  }
}

export interface StudentLogsPanelProps {
  logs: EntranceLog[];
  loading?: boolean;
  onFilteredChange?: (filtered: EntranceLog[], meta: {
    total: number;
    page: number;
    pageCount: number;
    showingFrom: number;
    showingTo: number;
    startDate?: string;
    endDate?: string;
    showEntries: boolean;
    showExits: boolean;
    includeDenied: boolean;
  }) => void;
}

export default function StudentLogsPanel({ logs: inputLogs, loading, onFilteredChange }: StudentLogsPanelProps) {
  const logs = useMemo(() => (inputLogs || []).slice().sort((a, b) => b.at - a.at), [inputLogs]);

  // Filters
  const [startDate, setStartDate] = useState<string>(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>("");
  const [showEntries, setShowEntries] = useState(true);
  const [showExits, setShowExits] = useState(true);
  const [includeDenied, setIncludeDenied] = useState(true);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const startMs = startDate ? new Date(startDate + "T00:00:00").getTime() : -Infinity;
    const endMs = endDate ? new Date(endDate + "T23:59:59.999").getTime() : Infinity;

    return logs.filter((l) => {
      if (l.at < startMs || l.at > endMs) return false;

      // Rechazados: no aplicar Entradas/Salidas, solo respetar includeDenied
      if (l.accepted === false) {
        return includeDenied;
      }

      // Aceptados: aplicar Entradas/Salidas
      if (l.exit) {
        return showExits;
      } else {
        return showEntries;
      }
    });
  }, [logs, startDate, endDate, showEntries, showExits, includeDenied]);

  // Pagination
  const PAGE_SIZE = 17;
  const [page, setPage] = useState(1);
  const totalLogs = filteredLogs.length;
  const pageCount = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [totalLogs, startDate, endDate, showEntries, showExits, includeDenied]);
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalLogs);
  const pagedLogs = useMemo(() => filteredLogs.slice(startIdx, endIdx), [filteredLogs, startIdx, endIdx]);

  // Notify parent for exports
  useEffect(() => {
    onFilteredChange?.(filteredLogs, {
      total: totalLogs,
      page,
      pageCount,
      showingFrom: totalLogs === 0 ? 0 : startIdx + 1,
      showingTo: endIdx,
      startDate,
      endDate,
      showEntries,
      showExits,
      includeDenied,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLogs, totalLogs, page, pageCount, startIdx, endIdx, startDate, endDate, showEntries, showExits, includeDenied]);

  return (
    <div className="bg-zinc-900 flex flex-col rounded-lg shadow-lg overflow-visible">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <span className="text-xs text-zinc-400">Actividad</span>
        <span className="text-[11px] text-zinc-500">
          {loading ? "Cargando…" : `${totalLogs} coincidencia${totalLogs === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Filters */}
      <div className="px-4 pb-3 space-y-3 border-b border-zinc-800">
        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-950 rounded-md px-2 py-1 text-xs"
              style={{ appearance: "auto" }}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-zinc-950 rounded-md px-2 py-1 text-xs"
              style={{ appearance: "auto" }}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-4 text-[11px] text-zinc-300">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEntries}
              onChange={(e) => setShowEntries(e.target.checked)}
              className="accent-emerald-500"
            />
            Entradas
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showExits}
              onChange={(e) => setShowExits(e.target.checked)}
              className="accent-rose-500"
            />
            Salidas
          </label>
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDenied}
              onChange={(e) => setIncludeDenied(e.target.checked)}
              className="accent-amber-500"
            />
            Rechazados
          </label>
        </div>

        <div>
          <button
            onClick={clearFilters}
            className="px-2 py-1 text-[11px] rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-zinc-800">
        {loading && (
          <>
            <li className="px-4 py-3 text-sm bg-zinc-900/40 animate-pulse">Cargando…</li>
            <li className="px-4 py-3 text-sm bg-zinc-900/40 animate-pulse">Cargando…</li>
          </>
        )}
        {!loading && pagedLogs.length === 0 && (
          <li className="px-4 py-3 text-sm text-zinc-400">Sin registros</li>
        )}
        {!loading &&
          pagedLogs.map((l, i) => {
            const isDenied = l.accepted === false;
            const baseBadge = "inline-flex items-center justify-center w-16 whitespace-nowrap px-2 py-0.5 rounded-md border text-[11px] font-medium";
            const colorCls = isDenied
              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
              : l.exit
              ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
            const badgeText = isDenied ? "Rechazado" : l.exit ? "Salida" : "Entrada";

            const rowBg = (i + 1) % 2 ? "bg-zinc-950/30" : "bg-zinc-900";
            return (
              <li key={`${l.at}-${i}`} className={`px-4 py-3 text-sm flex items-center justify-between ${rowBg}`}>
                <span className={`${baseBadge} ${colorCls}`}>{badgeText}</span>
                <span className="text-xs text-zinc-400">{formatDate(l.at)}</span>
              </li>
            );
          })}
      </ul>

      {/* Pagination */}
      {!loading && totalLogs > 0 && (
        <div className="px-4 py-2 flex items-center justify-between border-t border-zinc-800 text-xs">
          <div className="text-zinc-400">
            Mostrando {totalLogs === 0 ? 0 : startIdx + 1}–{endIdx} de {totalLogs}
          </div>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded-md bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="Primero"
            >«</button>
            <button
              className="px-2 py-1 rounded-md bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >Anterior</button>
            <span className="px-2 text-zinc-300">{page} / {pageCount}</span>
            <button
              className="px-2 py-1 rounded-md bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >Siguiente</button>
            <button
              className="px-2 py-1 rounded-md bg-zinc-800 disabled:opacity-40"
              onClick={() => setPage(pageCount)}
              disabled={page === pageCount}
              title="Último"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}