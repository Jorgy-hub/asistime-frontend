import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

export type Report = {
  reason: string;
  at: number;
  reported_by: string;
  due_date: number;
  suspended: boolean;
};

function fmt(ms?: number) {
  if (!ms || ms <= 0) return "—";
  try { return new Date(ms).toLocaleString(); } catch { return "—"; }
}

export default function StudentReportsPanel({
  reports,
  loading,
  onUpdate,
  onDelete,
  disabled,
}: {
  reports: Report[];
  loading?: boolean;
  onUpdate?: (at: number, next: Report) => Promise<void> | void;
  onDelete?: (at: number) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [listRef] = useAutoAnimate({ duration: 200 });
  const sorted = useMemo(() => [...reports].sort((a, b) => b.at - a.at), [reports]);

  // edit modal state
  const [editingAt, setEditingAt] = useState<number | null>(null);
  const editingReport = sorted.find(r => r.at === editingAt) || null;
  const [editVisible, setEditVisible] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editSuspended, setEditSuspended] = useState(false);
  const [editDueLocal, setEditDueLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const EDIT_DURATION = 180;
  const editDueWrapRef = useRef<HTMLDivElement | null>(null);
  const [editDueHeight, setEditDueHeight] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);

  // delete confirm
  const [confirmAt, setConfirmAt] = useState<number | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // open edit
  const openEdit = (r: Report) => {
    setEditingAt(r.at);
    setEditReason(r.reason);
    setEditSuspended(r.suspended);
    setEditDueLocal(toLocalInputValue(r.due_date || Date.now() + 7 * 86400000));
    setTimeout(() => setEditVisible(true), 10);
  };
  const closeEdit = () => {
    setEditVisible(false);
    setTimeout(() => {
      setEditingAt(null);
      setEditError(null);
    }, EDIT_DURATION);
  };

  // esc close edit
  useEffect(() => {
    if (!editingAt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!saving) closeEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingAt, saving]);

  // measure due height
  useEffect(() => {
    if (editSuspended && editDueWrapRef.current) {
      setEditDueHeight(editDueWrapRef.current.scrollHeight);
    } else {
      setEditDueHeight(0);
    }
  }, [editSuspended, editDueLocal]);

  const toLocalInputValue = (ms: number) => {
    const d = new Date(ms);
    const off = d.getTime() - d.getTimezoneOffset() * 60000;
    return new Date(off).toISOString().slice(0, 16);
  };
  const fromLocalInputValue = (s: string) => new Date(s).getTime();

  const onSaveEdit = async () => {
    if (!editingReport) return;
    setEditError(null);
    if (!editReason.trim()) {
      setEditError("Motivo requerido");
      return;
    }
    const due = editSuspended ? fromLocalInputValue(editDueLocal) : 0;
    if (editSuspended && !Number.isFinite(due)) {
      setEditError("Fecha límite inválida");
      return;
    }
    const next: Report = {
      reason: editReason.trim(),
      at: editingReport.at, // immutable key
      reported_by: editingReport.reported_by,
      due_date: due,
      suspended: editSuspended,
    };
    try {
      setSaving(true);
      await onUpdate?.(editingReport.at, next);
      closeEdit();
    } catch (e: any) {
      setEditError(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // open delete
  const openDelete = (r: Report) => {
    setConfirmAt(r.at);
    setTimeout(() => setConfirmVisible(true), 10);
  };
  const closeDelete = () => {
    setConfirmVisible(false);
    setTimeout(() => setConfirmAt(null), 180);
  };
  useEffect(() => {
    if (!confirmAt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!deleting) closeDelete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmAt, deleting]);

  const onConfirmDelete = async () => {
    if (confirmAt == null) return;
    try {
      setDeleting(true);
      await onDelete?.(confirmAt);
      closeDelete();
    } catch {
      // ignore or surface error
      closeDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="text-sm font-medium">Reportes</div>
          <div className="text-[11px] text-zinc-400">
            {loading ? "Cargando…" : `${sorted.length} registro${sorted.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <ul ref={listRef} className="divide-y divide-zinc-800">
          {loading && sorted.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 py-3 animate-pulse">
                <div className="h-4 w-2/3 bg-zinc-700/50 rounded mb-2" />
                <div className="h-3 w-1/3 bg-zinc-700/40 rounded" />
              </li>
            ))}
          {!loading && sorted.length === 0 && (
            <li className="px-4 py-5 text-xs text-zinc-400">Sin reportes</li>
          )}
          {sorted.map((r, i) => {
            const accent = r.suspended ? "from-amber-500 to-amber-600" : "from-zinc-600 to-zinc-700";
            return (
              <li
                key={`${r.at}-${i}`}
                className="relative px-4 py-3 bg-zinc-900 hover:bg-zinc-800/70 transition-colors"
              >
                <span className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${accent}`} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium mb-1 truncate">{r.reason}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                      <span>Ocurrió: {fmt(r.at)}</span>
                      {r.suspended && <span>Límite: {fmt(r.due_date)}</span>}
                      <span>Por: {r.reported_by || "—"}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md border text-[10px] ${
                          r.suspended
                            ? "border-amber-600/40 bg-amber-600/15 text-amber-300"
                            : "border-zinc-600/50 bg-zinc-700/30 text-zinc-300"
                        }`}
                      >
                        {r.suspended ? "Suspendido" : "Activo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={disabled}
                      onClick={() => openEdit(r)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
                      title="Editar"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.622 19.09 4.5 19.5l.41-4.123L16.862 4.487Z" />
                      </svg>
                    </button>
                    <button
                      disabled={disabled}
                      onClick={() => openDelete(r)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-rose-300 disabled:opacity-40"
                      title="Eliminar"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2m-7 0l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Edit modal */}
      {editingAt != null && editingReport && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-${EDIT_DURATION} ${editVisible ? "opacity-100" : "opacity-0"}`}
          onClick={() => !saving && closeEdit()}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className={`relative w-full max-w-md rounded-2xl bg-zinc-900 p-5 shadow-xl transform transition-all duration-${EDIT_DURATION} ${
              editVisible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-3 sm:scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-zinc-100">Editar reporte</h3>
              <button onClick={() => !saving && closeEdit()} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>
            {editError && <div className="mb-2 text-xs text-rose-400">{editError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Motivo</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-amber-500/30 outline-none"
                  rows={4}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-amber-500"
                  checked={editSuspended}
                  onChange={(e) => setEditSuspended(e.target.checked)}
                />
                Suspender acceso
              </label>
              <div
                ref={editDueWrapRef}
                className="overflow-hidden transition-all"
                style={{
                  maxHeight: editSuspended ? editDueHeight : 0,
                  opacity: editSuspended ? 1 : 0,
                  transform: `translateY(${editSuspended ? "0" : "-4px"})`,
                  transitionDuration: `${EDIT_DURATION}ms`,
                }}
              >
                <div className="mt-1">
                  <label className="block text-[11px] text-zinc-400 mb-1">Fecha límite</label>
                  <input
                    type="datetime-local"
                    value={editDueLocal}
                    onChange={(e) => setEditDueLocal(e.target.value)}
                    className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/30 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !saving && closeEdit()}
                className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmAt != null && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-180 ${confirmVisible ? "opacity-100" : "opacity-0"}`}
          onClick={() => !deleting && closeDelete()}
        >
          <div className="absolute inset-0 bg-black/60" />
            <div
              className={`relative w-full max-w-sm rounded-2xl bg-zinc-900 p-5 shadow-xl transform transition-all duration-180 ${
                confirmVisible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-3 sm:scale-95"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-zinc-100">Eliminar reporte</h3>
              <p className="mt-2 text-sm text-zinc-300">
                ¿Eliminar este reporte? Esta acción no se puede deshacer.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !deleting && closeDelete()}
                  className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-sm text-white disabled:opacity-50"
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
        </div>
      )}
    </>
  );
}