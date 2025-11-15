import { useEffect, useMemo, useRef, useState } from "react";

export type Report = {
  reason: string;
  at: number;
  reported_by: string;
  due_date: number;
  suspended: boolean;
};

export default function ReportModal({
  open,
  onClose,
  onSubmit,
  defaultReportedBy, // provided by parent (logged user name)
  studentName,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (report: Report) => Promise<void> | void;
  defaultReportedBy?: string;
  studentName?: string;
}) {
  const nowIso = useMemo(() => {
    const d = new Date();
    const off = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(off).toISOString().slice(0, 16);
  }, []);
  const weekIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const off = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(off).toISOString().slice(0, 16);
  }, []);

  const [reason, setReason] = useState("");
  const [atLocal, setAtLocal] = useState(nowIso);
  const [dueLocal, setDueLocal] = useState(weekIso);
  const [reportedBy, setReportedBy] = useState(defaultReportedBy || "");
  const [suspended, setSuspended] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(false);
  const DURATION = 180;

  const dueWrapRef = useRef<HTMLDivElement | null>(null);
  const [dueHeight, setDueHeight] = useState(0);

  // Keep reportedBy synced if parent changes user
  useEffect(() => {
    setReportedBy(defaultReportedBy || "");
  }, [defaultReportedBy]);

  useEffect(() => {
    if (open) {
      setReason("");
      setAtLocal(nowIso);
      setDueLocal(weekIso);
      setSuspended(false);
      setError(null);
      setSubmitting(false); // reset when opening
      requestAnimationFrame(() => setVisible(true));
    }
  }, [open, nowIso, weekIso]);

  useEffect(() => {
    if (suspended && dueWrapRef.current) {
      const h = dueWrapRef.current.scrollHeight;
      setDueHeight(h);
    } else {
      setDueHeight(0);
    }
  }, [suspended]);

  const requestClose = () => {
    setVisible(false);
    setTimeout(() => onClose(), DURATION);
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        e.stopPropagation();
        if (!submitting) requestClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  const toEpoch = (local: string) => new Date(local).getTime();

  const handleSubmit = async () => {
    setError(null);
    if (!reason.trim()) return setError("Ingresa un motivo.");
    if (!reportedBy.trim()) return setError("Usuario inválido.");
    const at = toEpoch(atLocal);
    const due = toEpoch(dueLocal || nowIso);
    if (!Number.isFinite(at)) return setError("Fecha/hora inválida.");
    if (suspended && !Number.isFinite(due)) return setError("Fecha límite inválida.");

    try {
      setSubmitting(true);
      await onSubmit({
        reason: reason.trim(),
        at,
        reported_by: reportedBy.trim(),
        due_date: suspended ? due : 0,
        suspended,
      });
      requestClose(); // close on success
    } catch (e: any) {
      setError(e?.message || "No se pudo crear el reporte.");
    } finally {
      setSubmitting(false); // always re-enable the button
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        className={[
          "fixed inset-0 z-[90] bg-black/50 transition-opacity",
          visible ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ transitionDuration: `${DURATION}ms` }}
        onClick={requestClose}
        aria-label="Cerrar modal"
      />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
        <div
          className={[
            "w-full max-w-lg rounded-xl bg-zinc-900 shadow-2xl",
            "transition-all transform-gpu",
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-1 scale-95",
          ].join(" ")}
          style={{ transitionDuration: `${DURATION}ms` }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="text-sm font-semibold text-zinc-100">
              Nuevo reporte{studentName ? ` • ${studentName}` : ""}
            </div>
            <button className="text-zinc-400 hover:text-zinc-200" onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="p-4 space-y-4">
            {error && <div className="text-xs text-rose-400">{error}</div>}

            <div>
              <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Motivo</label>
              <textarea
                className="w-full min-h-[88px] bg-zinc-950 rounded-lg px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Describe el motivo del reporte…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Ocurrió</label>
              <input
                type="datetime-local"
                value={atLocal}
                onChange={(e) => setAtLocal(e.target.value)}
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                style={{ appearance: "auto" }}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={suspended}
                onChange={(e) => setSuspended(e.target.checked)}
                className="accent-amber-500"
              />
              Suspender acceso
            </label>

            <div
              ref={dueWrapRef}
              className="overflow-hidden transition-all"
              style={{
                maxHeight: suspended ? dueHeight : 0,
                opacity: suspended ? 1 : 0,
                transform: `translateY(${suspended ? "0" : "-4px"})`,
                transitionDuration: `${DURATION}ms`,
              }}
            >
              <div className="mt-1">
                <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Fecha límite</label>
                <input
                  type="datetime-local"
                  value={dueLocal}
                  onChange={(e) => setDueLocal(e.target.value)}
                  className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                  style={{ appearance: "auto" }}
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700"
              onClick={requestClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Guardando…" : "Crear reporte"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}