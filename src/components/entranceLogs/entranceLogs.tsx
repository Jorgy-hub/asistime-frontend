"use client";
import { useEffect, useState, useRef } from "react";
import { subscribeRealtimeEvent, type RealtimeUnsubscribe } from "@/lib/realtime";
import { useAuth } from "@/context/AuthProvider";

type StudentLogged = {
  id: number;
  name: string;
  at: number;
  exit: boolean;
  accepted: boolean;
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleString();
}

// Helper: shorten only when window is narrow
function shortenName(name: string, narrow: boolean) {
  if (!narrow) return name;
  if (name.length <= 14) return name;
  return name.slice(0, 12) + "…";
}

export default function EntranceLogs() {
  const { user } = useAuth();
  const schoolId = String(user?.school_id || "");
  const [logs, setLogs] = useState<StudentLogged[]>([]);
  const [narrow, setNarrow] = useState(false);
  const unlistenRef = useRef<RealtimeUnsubscribe | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const restoredSchoolRef = useRef<string | null>(null);

  useEffect(() => {
    if (!schoolId || restoredSchoolRef.current === schoolId) return;

    restoredSchoolRef.current = schoolId;
    try {
      const stored = localStorage.getItem(`asistime:entrance-logs:${schoolId}`);
      const restored = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(restored)) return;

      setLogs(restored.slice(0, 200));
      restored.forEach((log: StudentLogged) => {
        seenRef.current.add(`${log.id}-${log.at}`);
      });
    } catch {
      setLogs([]);
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || restoredSchoolRef.current !== schoolId) return;
    localStorage.setItem(`asistime:entrance-logs:${schoolId}`, JSON.stringify(logs.slice(0, 200)));
  }, [logs, schoolId]);

  // Track window width
  useEffect(() => {
    const update = () => setNarrow(window.innerWidth < 640); // < sm breakpoint
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const setup = async () => {
      if (unlistenRef.current) return;
      unlistenRef.current = await subscribeRealtimeEvent<StudentLogged>("student:logged", (payload) => {
        const key = `${payload.id}-${payload.at}`;
        if (String((payload as StudentLogged & { schoolId?: string }).schoolId || "") !== schoolId) return;
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);
        if (seenRef.current.size > 1200) {
          const next = new Set<string>();
          logs.slice(0, 200).forEach((l) => next.add(`${l.id}-${l.at}`));
          seenRef.current = next;
        }
        setLogs((prev) => [payload, ...prev].slice(0, 200));
      });
    };
    setup();
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  return (
    <div className="bg-zinc-900 overflow-hidden shadow-lg rounded-md h-full flex flex-col min-h-[18rem] sm:min-h-[20rem] lg:min-h-[22rem]">
      <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold tracking-wide text-zinc-400">
        <span>HISTORIAL DE ENTRADAS</span>
        <span className="text-zinc-500" aria-hidden="true">⋮</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-auto">
        {logs.length === 0 ? (
          <li className="p-4 text-sm text-zinc-400">No hay ninguna actividad de entrada.</li>
        ) : (
          logs.map((l, idx) => {
            // Warning style whenever NOT accepted (both for entradas and salidas)
            const isDenied = !l.accepted;
            const baseBg = idx % 2 === 0 ? "bg-zinc-800" : "bg-zinc-900";
            const rowBg = baseBg;
            const hoverBg = "hover:bg-zinc-700/80";

            // Badge style and text: Denied overrides everything
            const badgeCls = !l.accepted
              ? "bg-amber-600/60"
              : l.exit
              ? "bg-red-600/60"
              : "bg-emerald-600/60";
            const badgeText = !l.accepted ? "Denegado" : l.exit ? "Salida" : "Entrada";

            return (
              <li
                key={`${l.id}-${l.at}-${idx}`}
                className={`flex items-center gap-3 px-4 py-3 opacity-0 animate-fade-slide ${rowBg} ${hoverBg} transition-colors`}
                style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/60 bg-zinc-900 text-xs font-medium text-zinc-300">
                  {String(l.name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium text-white"
                    title={l.name}
                  >
                    {shortenName(l.name, narrow)}
                  </span>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <code className="truncate text-[11px] text-zinc-400">ID {l.id}</code>
                    <code className={`rounded px-1.5 py-0.5 text-[10px] text-zinc-200 ${badgeCls}`}>
                      {badgeText}
                    </code>
                  </div>
                </div>
                <span className="shrink-0 text-right text-[10px] text-zinc-400 whitespace-nowrap">
                  {formatDate(l.at)}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}