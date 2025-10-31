"use client";

import { useMemo, useState } from "react";
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
type Range = "week" | "month" | "semester";

// lightweight 3-point smoothing like TodayActivityBar
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

export default function StudentAttendanceChart({
  logs,
  className,
  title = "Asistencia por día",
}: {
  logs: EntranceLog[];
  className?: string;
  title?: string;
}) {
  const [range, setRange] = useState<Range>("week");

  const dayMs = 86_400_000;
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const startOfWeekMonday = (ms: number) => {
    const d = new Date(ms);
    const day = (d.getDay() + 6) % 7;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  };
  const startOfMonthTs = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  };
  const startOfNextMonthTs = (ms: number) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  };
  const startOfSemesterTs = (ms: number) => {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = d.getMonth();
    return m < 6 ? new Date(y, 0, 1).getTime() : new Date(y, 6, 1).getTime();
  };
  const endOfSemesterTs = (ms: number) => {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = d.getMonth();
    return m < 6 ? new Date(y, 6, 1).getTime() : new Date(y + 1, 0, 1).getTime();
  };
  const dowShortEs = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const chart = useMemo<ChartData<"line", number[], string>>(() => {
    const now = Date.now();
    let start = 0;
    let end = 0;
    let days = 0;
    let labels: string[] = [];

    if (range === "week") {
      start = startOfWeekMonday(now);
      end = start + 7 * dayMs;
      days = 7;
      labels = dowShortEs.slice();
    } else if (range === "month") {
      start = startOfMonthTs(now);
      end = startOfNextMonthTs(now);
      days = Math.round((end - start) / dayMs);
      labels = Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, "0"));
    } else {
      start = startOfSemesterTs(now);
      end = endOfSemesterTs(now);
      days = Math.round((end - start) / dayMs);
      labels = Array.from({ length: days }, (_, i) => {
        const d = new Date(start + i * dayMs);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      });
    }

    const counts = Array(days).fill(0) as number[];
    for (const l of logs || []) {
      if (!l.accepted || l.exit) continue;
      if (l.at < start || l.at >= end) continue;
      const bucket = Math.floor((startOfDay(l.at) - start) / dayMs);
      if (bucket >= 0 && bucket < days) counts[bucket] += 1;
    }

    const dataSmooth = smooth(counts);

    const datasets: ChartDataset<"line", number[]>[] = [
      {
        label: "Entradas (aceptadas)",
        data: dataSmooth,
        fill: true,
        borderColor: "#10b981",
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 8,
        tension: 0.65,
        cubicInterpolationMode: "monotone",
        spanGaps: true,
        backgroundColor: (ctx: ScriptableContext<"line">) => {
          const { ctx: c, chartArea } = ctx.chart;
          if (!chartArea) return "rgba(16,185,129,0.2)";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(16,185,129,0.35)");
          g.addColorStop(1, "rgba(16,185,129,0.05)");
          return g;
        },
      },
    ];

    return { labels, datasets };
  }, [logs, range]);

  const maxTicks = useMemo(() => {
    const len = chart.labels?.length ?? 0;
    if (len <= 10) return 10;
    if (len <= 14) return 14;
    if (len <= 31) return 12;
    return 10;
  }, [chart.labels]);

  return (
    <div className={`bg-zinc-900 p-4 flex flex-col ${className || ""} rounded-lg shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-zinc-400">{title}</div>
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md">
          <button
            className={`px-2 py-1 text-xs rounded-md ${range === "week" ? "bg-zinc-800 text-zinc-100" : "bg-zinc-950 text-zinc-400"}`}
            onClick={() => setRange("week")}
          >
            Semana
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${range === "month" ? "bg-zinc-800 text-zinc-100" : "bg-zinc-950 text-zinc-400"}`}
            onClick={() => setRange("month")}
          >
            Mes
          </button>
          <button
            className={`px-2 py-1 text-xs rounded-md ${range === "semester" ? "bg-zinc-800 text-zinc-100" : "bg-zinc-950 text-zinc-400"}`}
            onClick={() => setRange("semester")}
          >
            Semestre
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-64 sm:h-72">
          <Line
            data={chart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: 0 },
              interaction: { mode: "index", intersect: false },
              scales: {
                x: {
                  ticks: { color: "#e5e7eb", maxRotation: 0, autoSkip: true, maxTicksLimit: maxTicks },
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

      <div className="mt-2 text-[11px] text-zinc-500">
        Semana: Lun–Dom. Mes: desde el día 1. Semestre: Ene–Jun o Jul–Dic. Solo entradas aceptadas.
      </div>
    </div>
  );
}