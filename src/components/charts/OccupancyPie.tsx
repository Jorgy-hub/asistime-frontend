"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

ChartJS.register(ArcElement, Tooltip, Legend);

type Counts = { total: number; inside: number; outside: number };

export default function OccupancyPie() {
  const [counts, setCounts] = useState<Counts>({ total: 0, inside: 0, outside: 0 });
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubsRef = useRef<UnlistenFn[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [total, inside, outsideRaw] = await Promise.all([
        invoke<number>("students_count_total"),
        invoke<number>("students_count_currently_inside"),
        invoke<number>("students_count_currently_outside").catch(() => undefined as unknown as number),
      ]);
      const outside =
        typeof outsideRaw === "number" && !Number.isNaN(outsideRaw)
          ? outsideRaw
          : Math.max(total - inside, 0);
      setCounts({
        total,
        inside: Math.min(inside, total),
        outside: Math.min(outside, total),
      });
    } catch (e: any) {
      setErr(typeof e === "string" ? e : e?.message || "Error");
      setCounts({ total: 0, inside: 0, outside: 0 });
    }
  }, []);

  useEffect(() => {
    load();

    const setup = async () => {
      const names = ["student:logged"];
      const unsubs = await Promise.all(
        names.map((n) =>
          listen(n, () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => load(), 200);
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
  }, [load]);

  const chartData = useMemo(() => {
    const unknown = Math.max(counts.total - counts.inside - counts.outside, 0);
    const labels = ["Dentro", "Fuera"].concat(unknown > 0 ? ["Desconocido"] : []);
    const vals = [counts.inside, counts.outside].concat(unknown > 0 ? [unknown] : []);
    const colors = ["#10b981", "#f43f5e"].concat(unknown > 0 ? ["#a1a1aa"] : []);
    return {
      labels,
      datasets: [
        {
          label: "Estudiantes",
          data: vals,
          backgroundColor: colors.map((c) => `${c}CC`),
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  }, [counts]);

  return (
    <div className="w-full h-full">
      {/* Card */}
      <div className="rounded-md bg-zinc-900 p-4 h-full min-h-[26rem] sm:min-h-[28rem] lg:min-h-[30rem] flex flex-col overflow-hidden">
        <div className="text-sm font-semibold tracking-wide text-zinc-400 mb-4">
          DISTRIBUCION ACTUAL
        </div>

        {/* Stack: pie on top, numbers below (centered) */}
        <div className="flex-1 min-h-0 flex flex-col items-center gap-4">
          {/* Pie size matches bar heights */}
          <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80">
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",
                plugins: { legend: { display: false } },
                layout: { padding: 0 },
                animation: { animateRotate: true, animateScale: true },
              }}
            />
          </div>

          {/* Numbers below, constrained and centered */}
          <div className="w-full max-w-[320px] px-2 space-y-2 text-sm lg:text-base">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="text-zinc-100 tabular-nums">{counts.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Dentro</span>
              <span className="text-emerald-300 tabular-nums">{counts.inside}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Fuera</span>
              <span className="text-rose-300 tabular-nums">{counts.outside}</span>
            </div>
            {Math.max(counts.total - counts.inside - counts.outside, 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Desconocido</span>
                <span className="text-zinc-300 tabular-nums">
                  {Math.max(counts.total - counts.inside - counts.outside, 0)}
                </span>
              </div>
            )}
            {err && <div className="pt-1 text-xs text-rose-400">{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}