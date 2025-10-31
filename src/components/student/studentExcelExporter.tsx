"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

type EntranceLog = { at: number; exit: boolean; accepted: boolean };
type StudentLike = { id: string; name: string; career?: string | null; semester?: string | null; prev_semester?: string | null; };

interface Props {
  student?: StudentLike | null;
  logsAll: EntranceLog[];
  logsFiltered: EntranceLog[];
  filenameBase?: string;
}

export default function ExcelExporter({ student, logsAll, logsFiltered, filenameBase }: Props) {
  const [busy, setBusy] = useState<"all" | "filtered" | null>(null);
  const base = useMemo(() => filenameBase || `asistencia_${student?.id || "alumno"}`, [student?.id, filenameBase]);

  function buildWorkbook(targetLogs: EntranceLog[], s?: StudentLike | null) {
    const sorted = [...(targetLogs || [])].sort((a, b) => a.at - b.at);

    const rows = sorted.map((l) => {
      const d = new Date(l.at);
      return {
        Fecha: d.toLocaleDateString("es-MX"),
        Hora: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        Tipo: l.accepted ? (l.exit ? "Salida" : "Entrada") : "Rechazado",
        Aceptado: l.accepted ? "Sí" : "No",
        EsSalida: l.exit ? "Sí" : "No",
        Timestamp: l.at,
      };
    });

    // Resumen por día
    const dayMap: Record<
      string,
      {
        fecha: string;
        entradas: number;
        salidas: number;
        rechazados: number;
        primeraEntrada: string | null;
        ultimaSalida: string | null;
        presente: "Sí" | "No";
      }
    > = {};

    for (const l of sorted) {
      const d = new Date(l.at);
      const key = d.toISOString().slice(0, 10);
      if (!dayMap[key]) {
        dayMap[key] = {
          fecha: d.toLocaleDateString("es-MX"),
          entradas: 0,
          salidas: 0,
          rechazados: 0,
          primeraEntrada: null,
          ultimaSalida: null,
          presente: "No",
        };
      }
      const rec = dayMap[key];
      if (!l.accepted) rec.rechazados++;
      else if (l.exit) {
        rec.salidas++;
        rec.ultimaSalida = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      } else {
        rec.entradas++;
        rec.presente = "Sí";
        if (!rec.primeraEntrada) {
          rec.primeraEntrada = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    const summaryRows = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const wb = XLSX.utils.book_new();

    // Siempre agregar al menos una hoja
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Logs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Resumen Diario");

    if (s) {
      const meta = [
        ["ID", s.id],
        ["Nombre", s.name],
        ["Carrera", s.career || ""],
        ["Semestre", s.semester || s.prev_semester || ""],
        ["Generado", new Date().toLocaleString("es-MX")],
        ["Total logs", rows.length],
        ["Días con asistencia", summaryRows.filter((r) => r.presente === "Sí").length],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), "Meta");
    }

    return wb;
  }

  function isTauriEnv() {
    if (typeof window === "undefined") return false;
    // Only trust Tauri globals (don’t rely on UA)
    return Boolean((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
  }

  async function tryTauriSave(bytes: ArrayBuffer, filename: string): Promise<boolean> {
    try {
      // Use normal dynamic imports so Next resolves chunks at build time
      const dialog = await import("@tauri-apps/plugin-dialog");
      const fs = await import("@tauri-apps/plugin-fs");
      const path = await dialog.save({
        defaultPath: filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (path) {
        await fs.writeFile(path, new Uint8Array(bytes));
        return true;
      }
      return false; // canceled
    } catch (e) {
      console.warn("Tauri save not available:", e);
      return false;
    }
  }

  async function tryWebPicker(bytes: ArrayBuffer, filename: string): Promise<boolean> {
    try {
      // File System Access API (Chromium)
      // @ts-ignore
      if ("showSaveFilePicker" in window) {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
          types: [{ description: "Excel", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] } }],
        });
        const stream = await handle.createWritable();
        await stream.write(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
        await stream.close();
        return true;
      }
      return false;
    } catch (e) {
      console.warn("Web picker failed:", e);
      return false;
    }
  }

  function webAnchorDownload(bytes: ArrayBuffer, filename: string): boolean {
    try {
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);

      // Try anchor download first
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Safari fallback: open in a new tab if no download happened
      setTimeout(() => {
        URL.revokeObjectURL(url);
        // Heuristic: if still on same page and Safari blocked download, open new tab
        window.open(url, "_blank");
      }, 50);

      return true;
    } catch (e) {
      console.error("Anchor download failed:", e);
      return false;
    }
  }

    async function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
    // Evitar "Workbook is empty" por cualquier motivo
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[""]]), "Hoja1");
    }

    let bytes: ArrayBuffer;
    try {
      bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    } catch (e) {
      console.error("Error generando XLSX:", e);
      throw e;
    }

    if (isTauriEnv()) {
      const ok = await tryTauriSave(bytes, filename);
      if (ok) return true;
    }

    const okPicker = await tryWebPicker(bytes, filename);
    if (okPicker) return true;
    return webAnchorDownload(bytes, filename);
  }

  const exportFiltered = async () => {
    if (!student) return;
    setBusy("filtered");
    try {
      const wb = buildWorkbook(logsFiltered, student);
      await saveWorkbook(wb, `${base}_filtrado.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  const exportAll = async () => {
    if (!student) return;
    setBusy("all");
    try {
      const wb = buildWorkbook(logsAll, student);
      await saveWorkbook(wb, `${base}_todos.xlsx`);
    } finally {
      setBusy(null);
    }
  };

  const inTauri = isTauriEnv();

  return (
    <div className="bg-zinc-900 p-4 rounded-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-zinc-400">Exportar Excel</h3>
        <span className="text-[10px] text-zinc-500">{logsFiltered.length} fila{logsFiltered.length === 1 ? "" : "s"}</span>
      </div>
      {!inTauri && <div className="text-[10px] text-amber-400">No estás en Tauri: usando método del navegador.</div>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={exportFiltered} disabled={!student || logsFiltered.length === 0 || busy !== null} className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40">
          {busy === "filtered" ? "Generando…" : "Descargar (Filtrado)"}
        </button>
        <button onClick={exportAll} disabled={!student || logsAll.length === 0 || busy !== null} className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40">
          {busy === "all" ? "Generando…" : "Descargar (Todos)"}
        </button>
      </div>
      <div className="text-[10px] text-zinc-500">Formato XLSX. Tiempos en hora local.</div>
    </div>
  );
}