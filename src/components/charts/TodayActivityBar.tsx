"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartData, ChartDataset, ScriptableContext } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type EntranceLog = { at: number; exit: boolean; accepted: boolean };
type Student = { id: string | number; logs: EntranceLog[] };

const hours = Array.from({ length: 24 }, (_, h) => h.toString().padStart(2, "0") + ":00");

// Last 14 days (today at index 0)
function buildLastDays(count = 14) {
  const days: { key: string; dayNum: string; week: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayNum = d.getDate().toString().padStart(2, "0");
    const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    days.push({ key, dayNum, week, date: d });
  }
  return days;
}

// Lightweight 3-point smoothing to soften sharp changes
function smooth(arr: number[]) {
  if (!arr || arr.length < 3) return arr;
  const w = [0.2, 0.6, 0.2];
  return arr.map((_, i) => {
    let v = 0,
      n = 0;
    for (let k = -1; k <= 1; k++) {
      const j = i + k;
      if (j >= 0 && j < arr.length) {
        v += arr[j] * w[k + 1];
        n += w[k + 1];
      }
    }
    return v / (n || 1);
  });
}

export default function TodayActivityBar() {
  const [entries, setEntries] = useState<number[]>(() => Array(24).fill(0));
  const [exits, setExits] = useState<number[]>(() => Array(24).fill(0));
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Day selection
  const days = useMemo(() => buildLastDays(14), []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedDay = days[selectedIdx];

  // listeners
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubsRef = useRef<UnlistenFn[]>([]);

  const fetchForDate = useCallback(async (date: Date) => {
    try {
      setErr(null);
      const students = await invoke<Student[]>("students_filter", {
        name: null,
        id: null,
        group: null,
        semester: null,
        career: null,
        shift: null,
      });

      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const end = start + 86_400_000;

      const inBuckets = Array(24).fill(0) as number[];
      const outBuckets = Array(24).fill(0) as number[];

      for (const s of students || []) {
        for (const l of s.logs || []) {
          if (!l || typeof l.at !== "number") continue;
          if (l.at < start || l.at >= end) continue;
          if (!l.accepted) continue;
          const h = new Date(l.at).getHours();
          if (l.exit) outBuckets[h] += 1;
          else inBuckets[h] += 1;
        }
      }

      setEntries(inBuckets);
      setExits(outBuckets);
      setLastUpdated(Date.now());
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message || "Error";
      setErr(msg);
      setEntries(Array(24).fill(0));
      setExits(Array(24).fill(0));
    }
  }, []);

  useEffect(() => {
    fetchForDate(selectedDay.date);
  }, [fetchForDate, selectedDay.key]);

  useEffect(() => {
    // refresh live only when viewing today (index 0)
    const setup = async () => {
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];

      if (selectedIdx !== 0) return;

      const names = ["student:logged"];
      const unsubs = await Promise.all(
        names.map((n) =>
          listen(n, () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => fetchForDate(new Date()), 200);
          })
        )
      );
      unsubsRef.current = unsubs;
    };
    setup();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];
    };
  }, [selectedIdx, fetchForDate]);

  const totalIn = useMemo(() => entries.reduce((a, b) => a + b, 0), [entries]);
  const totalOut = useMemo(() => exits.reduce((a, b) => a + b, 0), [exits]);

  const eSmooth = useMemo(() => smooth(entries), [entries]);
  const xSmooth = useMemo(() => smooth(exits), [exits]);

  const datasets = useMemo<ChartDataset<"line", number[]>[]>(
    () => [
      {
        label: "Entradas",
        data: eSmooth,
        fill: true,
        borderColor: "#10b981",
        pointRadius: 0,
        pointHitRadius: 8,
        tension: 0.65,
        cubicInterpolationMode: "monotone",
        spanGaps: true,
        borderWidth: 2,
        backgroundColor: (ctx: ScriptableContext<"line">) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return "rgba(16,185,129,0.2)";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(16, 185, 129, 0.35)");
          g.addColorStop(1, "rgba(16, 185, 129, 0.05)");
          return g;
        },
      },
      {
        label: "Salidas",
        data: xSmooth,
        fill: false,
        borderColor: "#ef4444",
        borderDash: [6, 6],
        pointRadius: 0,
        pointHitRadius: 8,
        tension: 0.65,
        cubicInterpolationMode: "monotone",
        spanGaps: true,
        borderWidth: 2,
      },
    ],
    [eSmooth, xSmooth]
  );

  const data = useMemo<ChartData<"line", number[], string>>(
    () => ({
      labels: hours,
      datasets,
    }),
    [datasets]
  );

  return (
    <div className="w-full h-full">
      <div className="rounded-md bg-zinc-900 p-4 h-full min-h-[26rem] sm:min-h-[28rem] lg:min-h-[30rem] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold tracking-wide text-zinc-400">ACTIVIDAD</div>
          <div className="text-xs text-zinc-400">
            In: {totalIn} • Out: {totalOut}
            {lastUpdated ? ` • ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
          </div>
        </div>

        {/* Day selector */}
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pr-1 -mr-1">
          {days.map((d, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={d.key}
                onClick={() => setSelectedIdx(i)}
                className={[
                  "flex flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[56px] border cursor-pointer",
                  active
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                    : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-700/60",
                ].join(" ")}
              >
                <span className="text-xs font-medium">{d.dayNum}</span>
                <span className="text-[10px] opacity-75">{d.week}</span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <div className="h-full min-h-[16rem] lg:min-h-[18rem]">
            <Line
              key={`activity-${selectedIdx}-emerald`} // force fresh canvas when switching days/theme
              data={data}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: 0 },
                interaction: { mode: "index", intersect: false },
                scales: {
                  x: {
                    ticks: { color: "#e5e7eb", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                    grid: { color: "rgba(255,255,255,0.06)" },
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { color: "#e5e7eb", precision: 0 },
                    grid: { color: "rgba(255,255,255,0.06)" },
                  },
                },
                plugins: {
                  legend: {
                    labels: { color: "#e5e7eb", boxWidth: 12, usePointStyle: true, pointStyle: "line" },
                  },
                  tooltip: { mode: "index", intersect: false },
                },
              }}
            />
          </div>
        </div>

        <div className="mt-2 text-[11px] text-zinc-500">Solo eventos aceptados. Vista por hora. Cambia el día arriba.</div>
        {err && <div className="mt-2 text-xs text-rose-400">Error: {err}</div>}
      </div>
    </div>
  );
}