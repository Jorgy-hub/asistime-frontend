"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { healthCheck } from "@/lib/health";

export default function ServerDownPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const retry = async () => {
    setLoading(true);
    setErr(null);
    try {
      await healthCheck({ timeoutMs: 4000 });
      router.replace("/");
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setErr(e?.message || "Sigue sin responder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-200 px-4">
      <div className="max-w-sm w-full space-y-5 text-center">
        <h1 className="text-xl font-semibold">Servidor no disponible</h1>
        <p className="text-sm text-zinc-400">
          No se pudo establecer conexión con el backend. Puede estar en mantenimiento o caído.
        </p>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <div className="flex flex-col gap-2">
          <button
            disabled={loading}
            onClick={retry}
            className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "Verificando..." : "Reintentar"}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500">
            Si el problema persiste, contacte al administrador.
        </p>
      </div>
    </div>
  );
}