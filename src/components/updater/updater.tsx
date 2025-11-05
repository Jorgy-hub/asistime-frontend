"use client";
import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
    return (err as any).message as string;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function shouldIgnore(err: unknown): boolean {
  const m = getErrorMessage(err).toLowerCase();
  // Missing platform entry in latest.json
  if (m.includes("platform") && m.includes("not found") && m.includes("platforms")) return true;
  // No updater endpoints / 404 / offline can be silenced too
  if (m.includes("not found") && m.includes("latest.json")) return true;
  if (m.includes("network") || m.includes("failed to fetch")) return true;
  // Permission issues in dev (capabilities)
  if (m.includes("updater.check not allowed")) return true;
  return false;
}

export default function Updater() {
  const [show, setShow] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<{ pct?: number }>();
  const [totalBytes, setTotalBytes] = useState<number | undefined>();
  const [downloadedBytes, setDownloadedBytes] = useState(0);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    (async () => {
      try {
        const u = await check();
        if (u && u.available) {
          setUpdate(u);
          setTimeout(() => setShow(true), 50);
        }
      } catch (e) {
        if (shouldIgnore(e)) {
          // Quietly skip when the running arch is not present in latest.json (or other benign cases)
          console.debug("[Updater] skipped:", getErrorMessage(e));
          return;
        }
        // Unexpected issue: still log but don’t show UI
        console.error("[Updater] check error:", e);
      }
    })();
  }, []);

  const onInstall = async () => {
    if (!update) return;
    try {
      await update.downloadAndInstall((e) => {
        if (e.event === "Started") {
          const { contentLength } = e.data as { contentLength?: number };
          if (typeof contentLength === "number") {
            setTotalBytes(contentLength);
            setDownloadedBytes(0);
            setProgress({ pct: 0 });
          }
        } else if (e.event === "Progress") {
          const { chunkLength } = e.data as { chunkLength: number };
          setDownloadedBytes((prev) => {
            const next = prev + chunkLength;
            if (totalBytes) setProgress({ pct: Math.round((next / totalBytes) * 100) });
            return next;
          });
        } else if (e.event === "Finished") {
          setProgress({ pct: 100 });
        }
      });
      await relaunch();
    } catch {
      // optional: toast/log
    }
  };

  return (
    <div
      role="alert"
      className={[
        "p-4 mb-4 mr-4 rounded-lg bg-zinc-800 text-green-400 fixed w-[500px] max-w-[92vw] bottom-0 right-0 z-50 shadow-lg border border-zinc-700/60",
        "transform transition-all duration-300 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      ].join(" ")}
    >
      <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-green-500 to-green-600 rounded-l-md" />
      <div className="flex items-center">
        <svg className="shrink-0 w-4 h-4 mr-2" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <h3 className="text-lg font-bold text-zinc-100">
          Update {update?.version ? `v${update.version} ` : ""}available
        </h3>
      </div>

      <div className="mt-2 mb-3 text-sm text-white">
        Nueva versión detectada. Instálala ahora para aplicar mejoras y correcciones.
      </div>

      {progress?.pct !== undefined && (
        <div className="mb-3">
          <div className="w-full h-2 bg-zinc-700 rounded">
            <div className="h-2 bg-emerald-500 rounded" style={{ width: `${progress.pct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">{progress.pct}%</div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded-md bg-zinc-700 hover:bg-zinc-600 text-white"
          onClick={() => setShow(false)}
        >
          Después
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded-md bg-green-500 hover:bg-green-600 text-white"
          onClick={onInstall}
        >
          Instalar y reiniciar
        </button>
      </div>
    </div>
  );
}