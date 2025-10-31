"use client";
import { useMemo, useState } from "react";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };

interface Props {
  logs: EntranceLog[];
  className?: string;
}

const dowLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function AttendanceCalendar({ logs, className = "" }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthData = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDayTs = new Date(year, month, 1).getTime();
    const nextMonthTs = new Date(year, month + 1, 1).getTime();
    const daysInMonth = (nextMonthTs - firstDayTs) / 86_400_000;

    // Map dayIndex -> count of accepted entries
    const counts = new Array(daysInMonth).fill(0);
    for (const l of logs) {
      if (!l.accepted || l.exit) continue;
      if (l.at < firstDayTs || l.at >= nextMonthTs) continue;
      const dayIdx = Math.floor((l.at - firstDayTs) / 86_400_000);
      if (dayIdx >= 0 && dayIdx < daysInMonth) counts[dayIdx] += 1;
    }

    // Monday-based offset
    const jsFirstDow = new Date(firstDayTs).getDay(); // 0=Sun
    const mondayIndex = (jsFirstDow + 6) % 7; // 0=Mon
    return { year, month, daysInMonth, counts, leadingBlanks: mondayIndex };
  }, [cursor, logs]);

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
  })();

  function colorFor(count: number) {
    if (count === 0) return "bg-zinc-800/40 border-zinc-700";
    if (count === 1) return "bg-emerald-700/30 border-emerald-700/60";
    if (count <= 3) return "bg-emerald-600/50 border-emerald-600/60";
    return "bg-emerald-500/70 border-emerald-500/70";
  }

  const monthName = cursor.toLocaleString("es", { month: "long" });

  return (
    <div className={`bg-zinc-900 p-4 flex flex-col ${className} rounded-md shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-zinc-400 capitalize flex gap-2 items-center">
          Asistencia mensual • {monthName} {monthData.year}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(monthData.year, monthData.month - 1, 1))}
            className="px-2 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="px-2 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
          >
            Hoy
          </button>
          <button
            onClick={() => setCursor(new Date(monthData.year, monthData.month + 1, 1))}
            className="px-2 py-1 text-xs rounded-md bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      {/* Day of week header */}
      <div className="grid grid-cols-7 gap-1 text-[11px] text-zinc-400 mb-1">
        {dowLabels.map(d => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: monthData.leadingBlanks }).map((_, i) => (
          <div key={`b-${i}`} className="h-10"></div>
        ))}
        {Array.from({ length: monthData.daysInMonth }).map((_, i) => {
          const count = monthData.counts[i];
          const dateObj = new Date(monthData.year, monthData.month, i + 1);
          const key = `${monthData.year}-${monthData.month}-${i + 1}`;
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`relative group h-10 flex flex-col items-center justify-center cursor-default ${colorFor(count)} ${isToday ? "ring-2 ring-sky-500/60" : ""}`}
              title={`${i + 1} ${monthName} • ${count} entrada${count === 1 ? "" : "s"}`}
            >
              <span className="text-[11px] leading-none text-zinc-200">{i + 1}</span>
              {count > 0 && (
                <span className="text-[10px] leading-none text-emerald-200 font-medium">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border border-zinc-700 bg-zinc-800/40"></span> 0
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border border-emerald-700/60 bg-emerald-700/30"></span> 1
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border border-emerald-600/60 bg-emerald-600/50"></span> 2–3
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border border-emerald-500/70 bg-emerald-500/70"></span> 4+
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded border ring-2 ring-sky-500/60 bg-transparent"></span> Hoy
        </div>
      </div>

      <div className="mt-2 text-[11px] text-zinc-500">
        Cuenta entradas aceptadas por día. Navega meses con ← →. Semana comienza en Lunes.
      </div>
    </div>
  );
}