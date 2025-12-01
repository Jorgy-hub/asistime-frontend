"use client";

import { useAuth } from "@/context/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminUsersManager from "../../../components/admin/AdminUsersManager";
import StudentsExcelImporter from "@/components/admin/StudentsExcelImporter";
import { invoke } from "@tauri-apps/api/core";

const APP_ID = "prepa3" as const;

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  // QR Redirect URI state
  const [uri, setUri] = useState("");
  const [prevUri, setPrevUri] = useState<string>("");
  const [loadingUri, setLoadingUri] = useState(false);
  const [savingUri, setSavingUri] = useState(false);
  const [uriMsg, setUriMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.admin) router.replace("/panel");
  }, [user, router]);

  // Load current URI for fixed app id
  useEffect(() => {
    const load = async () => {
      if (!user?.admin) return;
      setLoadingUri(true);
      setUriMsg(null);
      try {
        const current = await invoke<string>("app_get_uri", { id: APP_ID });
        setPrevUri(current || "");
        setUri(current || "");
      } catch (e: any) {
        setPrevUri("");
        setUri("");
        setUriMsg(e?.message || "No se pudo obtener el URI");
      } finally {
        setLoadingUri(false);
      }
    };
    load();
  }, [user?.admin]);

  const saveUri = async () => {
    setSavingUri(true);
    setUriMsg(null);
    try {
      await invoke("app_update_uri", {
        id: "prepa3",
        newRedirectUri: uri, 
      });
      setPrevUri(uri);
      setUriMsg("URI actualizado correctamente.");
    } catch (e: any) {
      console.log(e);
      setUriMsg(e?.message || "No se pudo actualizar el URI");
    } finally {
      setSavingUri(false);
    }
  };

  if (!user?.admin || !token) return null;

  return (
    <div className="px-2 py-1 text-white space-y-6">
      <div className="p-2">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Actualizar URI de QR</h1>

        <div className="rounded-lg bg-zinc-900 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">App ID</label>
              <input
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                value={APP_ID}
                disabled
              />
              <div className="mt-1 text-[11px] text-zinc-500">Fijo para esta app.</div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Redirect URI</label>
              <input
                className="w-full bg-zinc-950 rounded-lg px-3 py-2 text-sm"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder={prevUri || "https://tu-dominio.com/students/{id}"}
              />
              <div className="mt-1 text-[11px] text-zinc-500">
                Usa {"{id}"} para el ID del alumno. Ej: https://api.midominio.com/students/{`{id}`}
              </div>
              {prevUri && (
                <div className="mt-1 text-[11px] text-zinc-500">
                  Anterior: <span className="text-zinc-300 break-all">{prevUri}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveUri}
              disabled={savingUri || !uri}
              className="px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white disabled:opacity-50"
            >
              {savingUri ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={async () => {
                setLoadingUri(true);
                setUriMsg(null);
                try {
                  const current = await invoke<string>("app_get_uri", { id: APP_ID });
                  setPrevUri(current || "");
                  setUri(current || "");
                } catch (e: any) {
                  setUriMsg(e?.message || "No se pudo obtener el URI");
                } finally {
                  setLoadingUri(false);
                }
              }}
              className="px-3 py-1.5 rounded-md text-xs bg-zinc-800 hover:bg-zinc-700"
            >
              {loadingUri ? "Cargando…" : "Recargar"}
            </button>
            {uriMsg && <span className="text-[11px] text-zinc-400">{uriMsg}</span>}
          </div>
        </div>
      </div>

      <div className="p-2">
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">Importar Estudiantes</h1>
        <StudentsExcelImporter />
      </div>

      <AdminUsersManager token={token} />
    </div>
  );
}