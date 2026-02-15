"use client";

import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useAutoAnimate } from "@formkit/auto-animate/react";

type StudentBrief = { id: string; name?: string | null };

export default function GenerateQRCodesButton() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  // Defaults: base URL already including /students
  const [baseUrl, setBaseUrl] = useState("http://api.asistime.cloud/students");
  const [fmt, setFmt] = useState<"png" | "svg">("png");
  const [size, setSize] = useState(512);

  const [loading, setLoading] = useState(false);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentsCount, setStudentsCount] = useState<number | null>(null);
  const [listRef] = useAutoAnimate({ duration: 180 });

  // Progress
  const [progCurrent, setProgCurrent] = useState(0);
  const [progTotal, setProgTotal] = useState(0);
  const [progStatus, setProgStatus] = useState<"idle" | "start" | "progress" | "done">("idle");
  const unlistenRef = useRef<UnlistenFn | null>(null);

  const resetProgress = () => {
    setProgCurrent(0);
    setProgTotal(0);
    setProgStatus("idle");
  };

  const cleanupListener = () => {
    unlistenRef.current?.();
    unlistenRef.current = null;
  };

  const openModal = async () => {
    setError(null);
    setZipPath(null);
    resetProgress();
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
    try {
      const rows = await invoke<any[]>("students_filter", {
        name: null,
        id: null,
        group: null,
        semester: null,
        career: null,
        shift: null,
      });
      setStudentsCount(rows?.length ?? 0);
    } catch {
      setStudentsCount(null);
    }
  };

  const closeModal = () => {
    if (loading) return;
    setVisible(false);
    setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    return () => {
      cleanupListener();
    };
  }, []);

  // Close modal with Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setZipPath(null);
    resetProgress();

    try {
      const rows = await invoke<any[]>("students_filter", {
        name: null,
        id: null,
        group: null,
        semester: null,
        career: null,
        shift: null,
      });
      const students: StudentBrief[] = (rows || []).map((r: any) => ({
        id: String(r.id),
        name: r.name ?? null,
      }));
      if (!students.length) throw new Error("No hay estudiantes.");

      // Listen to progress events
      unlistenRef.current = await listen("qr_zip_progress", (ev) => {
        const p = ev.payload as any;
        if (!p) return;
        if (p.status === "start") {
          setProgStatus("start");
          setProgTotal(Number(p.total) || students.length);
          setProgCurrent(0);
        } else if (p.status === "progress") {
          setProgStatus("progress");
          setProgTotal(Number(p.total) || students.length);
          setProgCurrent(Number(p.current) || 0);
        } else if (p.status === "done") {
          setProgStatus("done");
          setProgTotal(Number(p.total) || students.length);
          setProgCurrent(Number(p.current) || Number(p.total) || students.length);
          if (p.path) setZipPath(String(p.path));
        }
      });

      const path = await invoke<string>("qr_zip_generate", {
        baseUrl,
        students,
        fmt,
        size,
      } as any);

      if (path && !zipPath) setZipPath(path);
    } catch (e: any) {
      setError(e?.message || "No se pudo generar el ZIP.");
    } finally {
      setLoading(false);
      setTimeout(cleanupListener, 200);
    }
  };

  const percent = progTotal > 0 ? Math.min(100, Math.round((progCurrent / progTotal) * 100)) : 0;

  return (
    <>
      <button
        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 shadow-md cursor-pointer"
        onClick={openModal}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M7 12h10M9 19h6" />
        </svg>
        Generar QRs
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-180 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !loading && closeModal()}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className={`relative w-full max-w-lg rounded-xl bg-zinc-900 p-4 shadow-xl transform transition-all duration-180 ${
              visible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-3 sm:scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-100">Generar QRs de estudiantes</h3>
              <button className="text-zinc-400 hover:text-zinc-200" onClick={() => !loading && closeModal()}>
                ✕
              </button>
            </div>

            <div ref={listRef} className="space-y-3">
              <div className="text-[11px] text-zinc-400">
                {studentsCount == null ? "Verificando estudiantes…" : `${studentsCount} estudiante(s) encontrados`}
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Base URL</label>
                <input
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://api.asistime.cloud/students"
                />
                <div className="mt-1 text-[11px] text-zinc-500">
                  La URL final será: {baseUrl.replace(/\/+$/, "")}/{"{id}"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Formato</label>
                  <select
                    value={fmt}
                    onChange={(e) => setFmt(e.target.value as "png" | "svg")}
                    className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Tamaño</label>
                  <input
                    type="number"
                    min={128}
                    step={64}
                    value={size}
                    onChange={(e) => setSize(Math.max(128, Number(e.target.value) || 512))}
                    className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {(loading || progStatus !== "idle") && (
                <div className="mt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Progreso</span>
                    <span>
                      {progCurrent} / {progTotal}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded bg-gradient-to-r from-amber-500 to-amber-600 transition-[width] duration-200"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <div className="text-xs text-rose-400">{error}</div>}
              {zipPath && <div className="text-xs text-emerald-300 break-all">ZIP guardado en: {zipPath}</div>}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700"
                onClick={() => {
                  if (!loading) {
                    cleanupListener();
                    closeModal();
                  }
                }}
                disabled={loading}
              >
                Cerrar
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 disabled:opacity-50"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Generando…" : "Generar ZIP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}