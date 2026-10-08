"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { subscribeRealtimeEvent, type RealtimeUnsubscribe } from "@/lib/realtime";
import { getStudentCounts } from "@/services/web/students";
import { useAuth } from "@/context/AuthProvider";

ChartJS.register(ArcElement, Tooltip, Legend);

type Counts = { total: number; inside: number; outside: number };

export default function OccupancyPie() {
  const { user } = useAuth();
  const schoolId = String(user?.school_id || "");
  const [counts, setCounts] = useState<Counts>({ total: 0, inside: 0, outside: 0 });
  const [err, setErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubsRef = useRef<RealtimeUnsubscribe[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
      const counts = isTauri
        ? await Promise.all([
            invoke<number>("students_count_total", { schoolId }),
            invoke<number>("students_count_currently_inside", { schoolId }),
            invoke<number>("students_count_currently_outside", { schoolId }).catch(() => undefined),
          ]).then(([total, inside, outside]) => ({ total, inside, outside }))
        : schoolId ? await getStudentCounts(schoolId) : { total: 0, inside: 0, outside: 0 };
      const { total, inside, outside: outsideRaw } = counts;
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
  }, [schoolId]);

  useEffect(() => {
    load();

    const setup = async () => {
      const names = ["student:logged"];
      const unsubs = await Promise.all(
        names.map((n) =>
          subscribeRealtimeEvent(n, () => {
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
    const labels = ["Dentro", "Fuera"].concat(unknown > 0 ? ["Ausentes"] : []);
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
      <div className="flex h-full min-h-[18rem] flex-col overflow-hidden rounded-md bg-zinc-900 p-4 sm:min-h-[20rem] lg:min-h-[22rem]">
        <div className="mb-3 flex items-center justify-between text-sm font-semibold tracking-wide text-zinc-400">
          <span>DISTRIBUCION ACTUAL</span>
          <span className="text-zinc-500" aria-hidden="true">⋮</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-row items-center justify-center gap-3 sm:gap-8 lg:gap-12">
          <div className="h-32 w-32 shrink-0 cursor-pointer sm:h-64 sm:w-64 lg:h-72 lg:w-72">
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

          <div className="w-full max-w-[170px] space-y-2 text-sm sm:max-w-[260px] sm:space-y-4 sm:text-base">
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500 sm:mb-3 sm:text-sm">Estudiantes</div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400"><span className="h-2 w-2 rounded-full bg-zinc-300 sm:h-2.5 sm:w-2.5" />Total</span>
              <span className="font-semibold tabular-nums text-zinc-100 sm:text-lg">{counts.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400"><span className="h-2 w-2 rounded-full bg-emerald-400 sm:h-2.5 sm:w-2.5" />Dentro</span>
              <span className="font-semibold tabular-nums text-emerald-300 sm:text-lg">{counts.inside}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-400"><span className="h-2 w-2 rounded-full bg-rose-400 sm:h-2.5 sm:w-2.5" />Fuera</span>
              <span className="font-semibold tabular-nums text-rose-300 sm:text-lg">{counts.outside}</span>
            </div>
            {Math.max(counts.total - counts.inside - counts.outside, 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-400"><span className="h-2 w-2 rounded-full bg-zinc-500" />Ausentes</span>
                <span className="font-semibold tabular-nums text-zinc-300">
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