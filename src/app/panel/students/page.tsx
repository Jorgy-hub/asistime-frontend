"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import GenerateQRCodesButton from "@/components/admin/GenerateQRCodes";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };
type StudentLoggedEvent = {
  id: string | number;
  name: string;
  at: number;
  exit: boolean;
  accepted: boolean;
};
type StudentGQL = {
  id: string;
  name: string;
  prev_semester?: string | null;
  semester?: string | null;
  gender?: string | null;
  age?: string | null;
  shift?: string | null;
  prev_group?: string | null;
  group?: string | null;
  logs: EntranceLog[];
};

type Status = "active" | "inactive" | "normal";

const StatusBadge = ({ s }: { s?: Status }) => {
  const text = s === "active" ? "Dentro" : s === "inactive" ? "Fuera" : "Ausente";
  const cls =
    s === "active"
      ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
      : s === "inactive"
        ? "bg-red-600/20 text-red-300 border-red-600/40"
        : "bg-zinc-700/40 text-zinc-300 border-zinc-600/60";
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{text}</span>;
};

const ShiftBadge = ({ value }: { value?: string | null }) => {
  const code = (value || "").trim().toUpperCase();
  let label = "—";
  let cls = "bg-zinc-700/40 text-zinc-300 border-zinc-600/60";
  if (code === "M") {
    label = "Matutino"; cls = "bg-sky-600/20 text-sky-300 border-sky-600/40";
  } else if (code === "V") {
    label = "Vespertino"; cls = "bg-amber-600/20 text-amber-300 border-amber-600/40";
  } else if (code === "N") {
    label = "Nocturno"; cls = "bg-red-600/20 text-red-300 border-red-600/40";
  } else if (value) {
    label = value;
  }
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{label}</span>;
};

function formatDate(ms?: number | null) {
  if (!ms) return "—";
  try { return new Date(ms).toLocaleString(); } catch { return "—"; }
}

function deriveStatusAndLast(logs?: EntranceLog[]): { lastSeen: number | null; status: Status } {
  if (!logs || logs.length === 0) return { lastSeen: null, status: "normal" };
  const lastSeen = logs.reduce((m, l) => (l.at > m ? l.at : m), 0) || null;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 86400000;
  const todays = logs
    .filter((l) => l.at >= startOfDay && l.at < endOfDay && (l.accepted ?? true))
    .sort((a, b) => a.at - b.at);
  if (todays.length === 0) return { lastSeen, status: "normal" };
  let open = 0;
  for (const l of todays) {
    if (!l.exit) open += 1;
    else if (open > 0) open -= 1;
  }
  return { lastSeen, status: open > 0 ? "active" : "inactive" };
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [nameQ, setNameQ] = useState(() => searchParams.get("name") ?? "");
  const [idQ, setIdQ] = useState(() => searchParams.get("id") ?? "");
  const [group, setGroup] = useState(() => searchParams.get("group") ?? "");
  const [semester, setSemester] = useState(() => searchParams.get("semester") ?? "");
  const [shift, setShift] = useState(() => searchParams.get("shift") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>(() => {
    const v = (searchParams.get("status") || "").toLowerCase();
    return v === "active" || v === "inactive" || v === "normal" ? (v as Status) : "all";
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const unsubsRef = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [sort, setSort] = useState<"name_asc" | "name_desc" | "seen_desc">("seen_desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [allItems, setAllItems] = useState<(StudentGQL & { lastSeen: number | null; status: Status })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debouncedName, setDebouncedName] = useState(nameQ);
  const [debouncedId, setDebouncedId] = useState(idQ);
  const reqSeqRef = useRef(0);

  useEffect(() => {
    const t1 = setTimeout(() => setDebouncedName(nameQ), 300);
    const t2 = setTimeout(() => setDebouncedId(idQ), 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nameQ, idQ]);

  useEffect(() => { setPage(1); }, [debouncedName, debouncedId, group, semester, shift, statusFilter, pageSize, sort]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (k: string, v?: string | null) => {
      if (v && v.trim() !== "") params.set(k, v); else params.delete(k);
    };
    setOrDel("name", debouncedName);
    setOrDel("id", debouncedId);
    setOrDel("group", group);
    setOrDel("semester", semester);
    setOrDel("shift", shift);
    setOrDel("status", statusFilter === "all" ? "" : statusFilter);
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
    }
  }, [debouncedName, debouncedId, group, semester, shift, statusFilter, pathname, router, searchParams]);

  useEffect(() => {
    const run = async () => {
      const mySeq = ++reqSeqRef.current;
      setLoading(true); setError(null);
      try {
        const rows = await invoke<StudentGQL[]>("students_filter", {
          name: debouncedName || null,
          id: debouncedId || null,
          group: group || null,
          semester: semester || null,
          career: null,
          shift: shift?.toUpperCase() || null,
        });
        if (mySeq !== reqSeqRef.current) return;
        const withDerived = rows.map((s) => {
          const d = deriveStatusAndLast(s.logs);
          return { ...s, lastSeen: d.lastSeen, status: d.status };
        });
        setAllItems(withDerived);
      } catch (e: any) {
        if (mySeq !== reqSeqRef.current) return;
        setError(e?.message || "Sin resultados");
        console.error(e);
      } finally {
        if (mySeq === reqSeqRef.current) setLoading(false);
      }
    };
    run();
  }, [debouncedName, debouncedId, group, semester, shift]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return allItems;
    return allItems.filter((s) => s.status === statusFilter);
  }, [allItems, statusFilter]);

  // Realtime updates
  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      const un = await listen<StudentLoggedEvent>("student:logged", (ev) => {
        if (!mounted) return;
        const e = ev.payload;
        const key = `${e.id}-${e.at}-${e.exit ? "x" : "e"}`;
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);
        setAllItems((prev) => {
          let changed = false;
            const next = prev.map((s) => {
              if (String(s.id) !== String(e.id)) return s;
              const logs = [...(s.logs || []), { at: e.at, exit: e.exit, accepted: e.accepted }];
              logs.sort((a, b) => b.at - a.at);
              const derived = deriveStatusAndLast(logs);
              changed = true;
              return { ...s, logs, lastSeen: derived.lastSeen, status: derived.status };
            });
          return changed ? next : prev;
        });
      });
      unsubsRef.current.push(un);
    };
    setup();
    return () => {
      mounted = false;
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];
    };
  }, []);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "name_asc") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name_desc") arr.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "seen_desc") arr.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
    return arr;
  }, [filtered, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  const activeFilterCount =
    (idQ ? 1 : 0) +
    (group ? 1 : 0) +
    (semester ? 1 : 0) +
    (shift ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const [listRef] = useAutoAnimate({ duration: 220, easing: "ease-in-out" });

  return (
    <div className="px-6 py-5 text-white w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Estudiantes</h1>
          <p className="text-xs text-zinc-400">
            {loading ? "Cargando…" : `${total} resultado${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateQRCodesButton />
          <div className="relative">
            <select
              className="appearance-none bg-zinc-900 text-zinc-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              title="Sort"
            >
              <option value="seen_desc">Visto última vez ↓</option>
              <option value="name_asc">Nombre A–Z</option>
              <option value="name_desc">Nombre Z–A</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-2.5 text-zinc-400">▾</span>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2 text-sm hover:border-zinc-600 cursor-pointer"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
            >
              <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12m-9 7h6" />
              </svg>
              Filtros
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center text-xs px-1.5 rounded bg-amber-600/20 text-amber-300 border border-amber-600/40">
                  {activeFilterCount}
                </span>
              )}
              <span className={`ml-1 text-zinc-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`} aria-hidden>
                ▾
              </span>
            </button>

            {filtersOpen && (
              <button
                className="fixed inset-0 z-40 bg-black/0 cursor-default"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters backdrop"
              />
            )}

            <div
              className={[
                "absolute right-0 z-50 mt-2 w-80 rounded-xl border border-zinc-700/70 bg-zinc-900/95 backdrop-blur p-3 shadow-xl",
                "origin-top transform-gpu overflow-hidden transition-all duration-200 ease-out",
                filtersOpen
                  ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-y-95 -translate-y-1 pointer-events-none",
              ].join(" ")}
              role="dialog"
              aria-label="Filters"
            >
              <div className="text-sm font-medium text-zinc-200 mb-2">Filtros</div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-zinc-400">Matricula</label>
                  <input
                    className="mt-1 w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    placeholder="Matricula"
                    value={idQ}
                    onChange={(e) => setIdQ(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-zinc-400">Grupo</label>
                    <input
                      className="mt-1 w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="Grupo"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-zinc-400">Semestre</label>
                    <input
                      className="mt-1 w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      placeholder="Semestre"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-zinc-400">Turno</label>
                    <select
                      className="mt-1 w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      value={shift.toUpperCase()}
                      onChange={(e) => setShift(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="M">Matutino (M)</option>
                      <option value="V">Vespertino (V)</option>
                      <option value="N">Nocturno (N)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-zinc-400">Estado</label>
                    <select
                      className="mt-1 w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                    >
                      <option value="all">Todos</option>
                      <option value="active">Dentro</option>
                      <option value="inactive">Fuera</option>
                      <option value="normal">Ausente</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    className="text-xs text-zinc-300 hover:text-zinc-100 underline underline-offset-4"
                    onClick={() => {
                      setIdQ(""); setGroup(""); setSemester(""); setShift(""); setStatusFilter("all");
                    }}
                  >
                    Reestablecer
                  </button>
                  <button
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md px-3 py-1.5"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 mb-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
          </span>
          <input
            className="w-full pl-9 pr-10 py-2.5 rounded-full bg-zinc-950 placeholder-zinc-500 text-sm focus:outline-none focus:ring-0"
            placeholder="Buscar por nombres…"
            value={nameQ}
            onChange={(e) => setNameQ(e.target.value)}
          />
          {nameQ && (
            <button
              aria-label="Clear"
              className="absolute inset-y-0 right-2 px-2 text-zinc-400 hover:text-zinc-200"
              onClick={() => setNameQ("")}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl">
        <ul ref={listRef} className="divide-y divide-zinc-800">
          {loading && pageItems.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="grid grid-cols-[1fr,180px,220px] gap-3 px-4 py-3 bg-zinc-900 animate-pulse">
                <div className="h-4 w-2/3 bg-zinc-700/60 rounded" />
                <div className="h-4 w-24 bg-zinc-700/60 rounded" />
                <div className="h-4 w-32 bg-zinc-700/60 rounded" />
              </li>
            ))}

          {!loading && pageItems.length === 0 && (
            <li className="px-4 py-6 text-sm text-zinc-400 bg-zinc-900">No students found</li>
          )}

          {pageItems.map((s, idx) => {
            const rowBg = idx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-900/70";
            const accent =
              s.status === "active"
                ? "from-emerald-500 to-emerald-600"
                : s.status === "inactive"
                  ? "from-red-500 to-red-600"
                  : "from-zinc-600 to-zinc-700";
            return (
              <li key={s.id} className="relative">
                <Link
                  href={`/panel/student?id=${encodeURIComponent(s.id)}`}
                  className={`relative grid grid-cols-[1fr,180px,220px] gap-3 px-4 py-3 ${rowBg} hover:bg-zinc-800/80 transition-colors cursor-pointer block`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent}`} />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700/60 text-xs text-zinc-200">
                      {String(s.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name || "Unnamed"}</div>
                      <div className="text-xs text-zinc-400 truncate">
                        ID: {s.id}{s.group ? ` • ${s.group}` : ""}{s.semester ? ` • ${s.semester}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShiftBadge value={s.shift} />
                    <StatusBadge s={s.status as Status} />
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-zinc-400">Última vez: {formatDate(s.lastSeen)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          className="px-3 py-3 rounded-full bg-zinc-700 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-xs text-zinc-400">Page {page} / {totalPages}</div>
        <button
          className="px-3 py-3 rounded-full bg-zinc-700 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {error && <div className="mt-4 text-xs text-red-400">{error}</div>}
    </div>
  );
}