"use client";
import { useEffect, useState, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

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
  const [logs, setLogs] = useState<StudentLogged[]>([]);
  const [narrow, setNarrow] = useState(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

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
      unlistenRef.current = await listen("student:logged", (event) => {
        const payload = event.payload as StudentLogged;
        const key = `${payload.id}-${payload.at}`;
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
  }, []);

  return (
    <div className="mt-8 bg-zinc-900 overflow-hidden shadow-lg rounded-md">
      <div className="px-4 py-3 text-sm font-semibold tracking-wide text-zinc-400">
        HISTORIAL DE ENTRADAS
      </div>
      <ul className="max-h-80 overflow-auto">
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
                className={`px-4 py-3 text-sm flex items-center justify-between opacity-0 animate-fade-slide ${rowBg} ${hoverBg} transition-colors`}
                style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}
              >
                <div className="flex items-baseline gap-3 min-w-0">
                  <span
                    className="font-medium text-white truncate max-w-[110px] sm:max-w-[220px] whitespace-nowrap"
                    title={l.name}
                  >
                    {shortenName(l.name, narrow)}
                  </span>
                  <code className="text-xs text-zinc-300 bg-zinc-600/60 px-2 py-0.5 rounded truncate max-w-[80px]">
                    {l.id}
                  </code>
                  <code className={`text-xs text-zinc-200 px-2 py-0.5 rounded ${badgeCls}`}>
                    {badgeText}
                  </code>
                </div>
                <span className="text-xs text-zinc-400 whitespace-nowrap">
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