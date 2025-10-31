"use client";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useRouter } from "next/navigation";

function useCountUp(target: number, duration = 500) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startVal = display;
    const delta = target - startVal;
    if (delta === 0) return;

    // Dynamic duration: faster for small deltas, capped for huge deltas
    const d = Math.min(Math.max(250, Math.abs(delta) * 0.2), duration);

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / d);
      const eased = easeOutCubic(p);
      const val = Math.round(startVal + delta * eased);
      setDisplay(val);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

const icons = {
  total: (
    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  new: (
    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  active: (
    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0V21H4.5v-1.5Z" />
    </svg>
  ),
  inactive: (
    <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

const Card = ({
  title,
  value,
  color,
  icon,
  href,
  router,
}: {
  title: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  href: string;
  router: ReturnType<typeof useRouter>;
}) => (
  <div
    className="relative rounded-md flex items-center gap-4 bg-zinc-900 p-4 shadow-md overflow-hidden cursor-pointer hover:bg-zinc-800 transition"
    onClick={() => router.push(href)}
  >
    <span className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${color} rounded-l-md`} />
    <div className="relative flex items-center justify-center">{icon}</div>
    <div className="flex flex-col">
      <h3 className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">{title}</h3>
      <p className="text-2xl font-bold text-white mt-1 leading-none">{value}</p>
    </div>
  </div>
);

const CardContainer = ({ children }: { children: React.ReactNode }) => (
  <div
    className="
      grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 w-full
      lg:[&>div:not(:last-child)]:border-r lg:[&>div:not(:last-child)]:border-zinc-800
    "
  >
    {children}
  </div>
);

export default function StudentsStats() {
  // raw targets from backend
  const [loggedStudents, setLoggedStudents] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [newStudents, setNewStudents] = useState<number>(0);
  const [outsideStudents, setOutsideStudents] = useState<number>(0);

  // animated display values
  const displayTotal = useCountUp(totalStudents, 500);
  const displayNew = useCountUp(newStudents, 500);
  const displayInside = useCountUp(loggedStudents, 500);
  const displayOutside = useCountUp(outsideStudents, 500);

  const router = useRouter();
  const unsubsRef = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    const setup = async () => {
      try {
        const [inside, total, newCount, outside] = await Promise.all([
          invoke<number>("students_count_currently_inside"),
          invoke<number>("students_count_total"),
          invoke<number>("students_count_new"),
          invoke<number>("students_count_currently_outside"),
        ]);

        setLoggedStudents(typeof inside === "number" ? inside : 0);
        setTotalStudents(typeof total === "number" ? total : 0);
        setNewStudents(typeof newCount === "number" ? newCount : 0);
        setOutsideStudents(typeof outside === "number" ? outside : 0);
      } catch (e) {
        console.error("Failed to load initial counts:", e);
      }

      // subscribe to live count updates (support multiple unsubs)
      const subs = await Promise.all([
        listen("student:count_currently_inside", (event) => {
          const payload = event.payload as { count: number };
          if (typeof payload.count === "number") setLoggedStudents(payload.count);
        }),
        listen("student:count_currently_outside", (event) => {
          const payload = event.payload as { count: number };
          if (typeof payload.count === "number") setOutsideStudents(payload.count);
        }),
      ]);
      unsubsRef.current = subs;
    };

    setup();
    return () => {
      unsubsRef.current.forEach((u) => u());
      unsubsRef.current = [];
    };
  }, []);

  return (
    <CardContainer>
      <Card
        title="Total Alumnos"
        value={displayTotal}
        color="from-indigo-500 to-indigo-600"
        icon={icons.total}
        href="/panel/students"
        router={router}
      />
      <Card
        title="Nuevo Ingreso"
        value={displayNew}
        color="from-amber-500 to-amber-600"
        icon={icons.new}
        href="/panel/students?semester=1"
        router={router}
      />
      <Card
        title="Alumnos Dentro"
        value={displayInside}
        color="from-emerald-500 to-emerald-600"
        icon={icons.active}
        href="/panel/students?status=active"
        router={router}
      />
      <Card
        title="Alumnos Fuera"
        value={displayOutside}
        color="from-rose-500 to-rose-600"
        icon={icons.inactive}
        href="/panel/students?status=inactive"
        router={router}
      />
    </CardContainer>
  );
}