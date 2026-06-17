"use client";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Summary = {
    inserted?: number;
    updated?: number;
    deleted?: number;
    totalIncoming?: number;
};

function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const result = r.result as string;
            // result is data:...;base64,XXXX
            const comma = result.indexOf(",");
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
    });
}

export default function StudentsExcelImporter() {
    const [newFile, setNewFile] = useState<File | null>(null);
    const [updateFile, setUpdateFile] = useState<File | null>(null);
    const [resNew, setResNew] = useState<Summary | null>(null);
    const [resUpdate, setResUpdate] = useState<Summary | null>(null);
    const [loadingNew, setLoadingNew] = useState(false);
    const [loadingUpdate, setLoadingUpdate] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNew = async () => {
        if (!newFile) return;
        setLoadingNew(true);
        setError(null);
        setResNew(null);
        try {
            const b64 = await fileToBase64(newFile);
            const summary = await invoke<Summary>("students_import_new", {
                excelBase64: b64,
            });
            setResNew(summary);
        } catch (e: any) {
            setError(e?.message || "Error importando nuevos.");
        } finally {
            setLoadingNew(false);
        }
    };

    const handleUpdate = async () => {
        if (!updateFile) return;
        setLoadingUpdate(true);
        setError(null);
        setResUpdate(null);
        try {
            const b64 = await fileToBase64(updateFile);
            const summary = await invoke<Summary>("students_import_update", {
                excelBase64: b64,
            });
            setResUpdate(summary);
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "Error actualizando existentes.");
        } finally {
            setLoadingUpdate(false);
        }
    };

    return (
        <div className="rounded-lg bg-zinc-900 p-6 space-y-6">
            <h3 className="text-sm font-semibold">Importar Excel Estudiantes</h3>
            {error && <div className="text-xs text-rose-400">{error}</div>}

            <div className="space-y-2 space-x-2">
                <label className="block text-[11px] uppercase tracking-wide text-zinc-400">
                    Importar Sabana para ingreso o actualización (si el ID ya existe, se actualiza; si no, se inserta)
                </label>
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="text-xs bg-zinc-950 px-2 py-2 rounded-full"
                />
                <button
                    onClick={handleNew}
                    disabled={!newFile || loadingNew}
                    className="px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white disabled:opacity-40"
                >
                    {loadingNew ? "Importando…" : "Importar nuevos"}
                </button>
                {resNew && (
                    <pre className="mt-2 text-[10px] bg-zinc-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(resNew, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}