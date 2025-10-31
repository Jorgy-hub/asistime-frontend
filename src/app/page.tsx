"use client";
import { useAuth } from "../context/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { healthCheck } from "@/lib/health";

export default function Home() {
  const { token } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await healthCheck({ timeoutMs: 4000 });
        if (!alive) return;
        router.replace(token ? "/panel" : "/login");
      } catch {
        if (!alive) return;
        router.replace("/server-down");
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-300">
      {checking && (
        <div className="text-sm text-zinc-400 animate-pulse">
          Verificando servidor…
        </div>
      )}
    </div>
  );
}