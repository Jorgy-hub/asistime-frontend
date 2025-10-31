"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { invoke } from "@tauri-apps/api/core";
import AttendanceCalendar from "@/components/student/studentAttendanceCalendar";
import StudentLogsPanel from "@/components/student/studentLogs";
import ExcelExporter from "@/components/student/studentExcelExporter";
import StudentAttendanceChart from "@/components/student/studentAttendanceChart";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };
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

  const derived = useMemo(() => deriveStatusAndLast(data?.logs), [data]);

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
      .then((s) => alive && setData(s))
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

  return (
    <div className="px-6 py-5 text-white w-full">
      {/* HEADER */}
      <div className="relative rounded-lg shadow-lg bg-[url(/images/bg2.jpg)] bg-cover bg-center overflow-hidden">
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
        <StudentLogsPanel
          logs={data?.logs || []}
          loading={loading}
          onFilteredChange={(filtered) => setFilteredForExport(filtered)}
        />

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
    </div>
  );
}