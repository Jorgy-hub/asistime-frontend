"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { invoke } from "@tauri-apps/api/core";
import AttendanceCalendar from "@/components/student/studentAttendanceCalendar";
import StudentLogsPanel from "@/components/student/studentLogs";
import ExcelExporter from "@/components/student/studentExcelExporter";
import StudentAttendanceChart from "@/components/student/studentAttendanceChart";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import StudentReportsPanel from "@/components/student/studentReportPanel";
import ReportModal, { type Report } from "@/components/modals/report.modal";
import { useAuth } from "@/context/AuthProvider";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };
type StudentLoggedEvent = {
  id: string | number;
  name: string;
  at: number;
  exit: boolean;
  accepted: boolean;
};
type StudentDetail = {
  id: string | number;
  name: string;
  career?: string | null;
  prev_semester?: string | null;
  semester?: string | null;
  gender?: string | null;
  age?: string | null;
  shift?: string | null;
  prev_group?: string | null;
  group?: string | null;
  logs: EntranceLog[];
  reports?: Report[];
};

type Status = "active" | "inactive" | "normal";

function deriveStatusAndLast(logs?: EntranceLog[]): { lastSeen: number | null; status: Status } {
  if (!logs || logs.length === 0) return { lastSeen: null, status: "normal" };
  const lastSeen = logs.reduce((m, l) => (l.at > m ? l.at : m), 0) || null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86_400_000;

  const todays = (logs || [])
    .filter((l) => l.at >= start && l.at < end && (l.accepted ?? true))
    .sort((a, b) => a.at - b.at);

  if (todays.length === 0) return { lastSeen, status: "normal" };

  let open = 0;
  for (const l of todays) open += l.exit ? -1 : 1;
  return { lastSeen, status: open > 0 ? "active" : "inactive" };
}

const ShiftBadge = ({ value }: { value?: string | null }) => {
  const code = (value || "").trim().toUpperCase();
  const map: Record<string, { t: string; cls: string }> = {
    M: { t: "Matutino", cls: "bg-sky-600/20 text-sky-300 border-sky-600/40" },
    V: { t: "Vespertino", cls: "bg-amber-600/20 text-amber-300 border-amber-600/40" },
    N: { t: "Nocturno", cls: "bg-red-600/20 text-red-300 border-red-600/40" },
  };
  const cfg = map[code];
  const txt = cfg ? cfg.t : value || "—";
  const cls = cfg ? cfg.cls : "bg-zinc-700/40 text-zinc-300 border-zinc-600/60";
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{txt}</span>;
};

const StatusBadge = ({ s }: { s?: Status }) => {
  const map: Record<Status, string> = {
    active: "bg-emerald-600/20 text-emerald-300 border-emerald-600/40",
    inactive: "bg-red-600/20 text-red-300 border-red-600/40",
    normal: "bg-zinc-700/40 text-zinc-300 border-zinc-600/60",
  };
  const txt = s === "active" ? "Dentro" : s === "inactive" ? "Fuera" : "Ausente";
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${map[s ?? "normal"]}`}>{txt}</span>;
};

const SemesterBadge = ({ semester, prevSemester }: { semester?: string | null; prevSemester?: string | null }) => {
  const sem = (semester || "").trim().toUpperCase();
  const prev = (prevSemester || "").trim().toUpperCase();
  const txt = sem || prev ? (sem ? sem : `${prev}*`) : "—";
  const cls =
    sem ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40" :
      prev ? "bg-amber-600/20 text-amber-300 border-amber-600/40" :
        "bg-zinc-700/40 text-zinc-300 border-zinc-600/60";
  return <span className={`px-2 py-0.5 text-xs rounded-md border ${cls}`}>{txt}</span>;
};

export default function StudentDetailPage() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filteredForExport, setFilteredForExport] = useState<EntranceLog[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const unsubsRef = useRef<UnlistenFn[]>([]);
  const derived = useMemo(() => deriveStatusAndLast(data?.logs), [data]);

  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  // Load student detail (including reports) once
  useEffect(() => {
    let alive = true;
    if (!id) {
      setErr("Falta el parámetro id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    invoke<StudentDetail>("student_detail", { id })
      .then((s) => {
        if (!alive) return;
        setData(s);
        setReports(s.reports ?? []); // take reports directly from detail
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = typeof e === "string" ? e : (e as { message?: string })?.message || "Error";
        setErr(msg);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // Live logs updates
  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const setup = async () => {
      const unsub = await listen("student:logged", (ev) => {
        if (!mounted) return;
        const payload = ev.payload as StudentLoggedEvent;
        if (String(payload.id) !== String(id)) return;

        const key = `${payload.at}-${payload.exit ? "x" : "e"}`;
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);

        setData((prev) => {
          if (!prev) return prev;
          const nextLogs = [...prev.logs, { at: payload.at, exit: payload.exit, accepted: payload.accepted }];
          nextLogs.sort((a, b) => b.at - a.at);
          return { ...prev, logs: nextLogs };
        });
      });
      unsubsRef.current.push(unsub);
    };

    setup();

    return () => {
      mounted = false;
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];
    };
  }, [id]);

  // Create report handler
  const handleCreateReport = async (r: Report) => {
    if (!data) return;
    setSavingReport(true);
    try {
      await invoke("student_report_create", {
        id: String(data.id),
        report: r,
      });
      // Optimistically append new report
      setReports((prev) => [
        ...prev,
        {
          reason: r.reason,
          at: r.at,
          reported_by: r.reported_by,
          due_date: r.due_date,
          suspended: r.suspended,
        },
      ]);
    } finally {
      setSavingReport(false);
    }
  };

  const handleUpdateReport = async (at: number, next: Report) => {
    if (!data) return;
    await invoke("student_report_update", { id: String(data.id), at, report: next });
    setReports(r => r.map(x => (x.at === at ? next : x)));
  };

  const handleDeleteReport = async (at: number) => {
    if (!data) return;
    await invoke("student_report_delete", { id: String(data.id), at });
    setReports(r => r.filter(x => x.at !== at));
  };

  return (
    <div className="px-6 py-5 text-white w-full">
      {/* HEADER */}
      <div className="relative rounded-lg shadow-lg bg-[url(/images/bg2.jpg)] bg-cover bg-center overflow-hidden">
        <div className="absolute top-3 right-3 z-10">
          <button
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 shadow-md cursor-pointer select-none"
            onClick={() => setReportOpen(true)}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Nuevo reporte
          </button>
        </div>

        <div className="h-40 sm:h-48 rounded-t-lg" />
        <div className="pt-16 pb-6 px-6 sm:px-4 flex flex-col md:flex-row gap-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex-row pl-2">
            <h1 className="text-2xl font-semibold">
              {data?.name || (err ? "Error" : loading ? "Cargando…" : "Desconocido")}
            </h1>
            {data?.career && <span className="text-sm text-zinc-400"> # {data.id} - {data.career}</span>}
          </div>
          <div className="absolute top-20 sm:top-24 left-6 translate-y-1/2">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-black ring-4 ring-zinc-900/70 flex items-center justify-center text-2xl font-semibold">
              {String(data?.name || "?").slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div className="flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <ShiftBadge value={data?.shift} />
              <StatusBadge s={derived.status} />
              <SemesterBadge semester={data?.semester} prevSemester={data?.prev_semester} />
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(520px,1fr)_minmax(380px,480px)] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <StudentLogsPanel
            logs={data?.logs || []}
            loading={loading}
            onFilteredChange={(filtered) => setFilteredForExport(filtered)}
          />
          <StudentReportsPanel
            reports={reports}
            loading={loading}
            onUpdate={handleUpdateReport}
            onDelete={handleDeleteReport}
          />
        </div>
        <div className="flex flex-col gap-4">
          <AttendanceCalendar logs={data?.logs || []} />
          <StudentAttendanceChart logs={data?.logs || []} />
          <ExcelExporter
            student={data ? { ...data, id: String(data.id) } : undefined}
            logsAll={data?.logs || []}
            logsFiltered={filteredForExport}
          />
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-rose-400">Error: {err}</div>}

      {/* Report modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)} // was: () => !savingReport && setReportOpen(false)
        onSubmit={handleCreateReport}
        defaultReportedBy={user?.username || ""}
        studentName={data?.name}
      />
    </div>
  );
}