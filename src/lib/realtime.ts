import { io, type Socket } from "socket.io-client";

export type RealtimeHandler<T> = (payload: T) => void;
export type RealtimeUnsubscribe = () => void;

let socket: Socket | null = null;

const isTauri = () =>
  typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);

const getSocket = () => {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SOCKET_URL no está configurada");

  socket = io(url, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect_error", (error) => {
    console.error("Realtime connection error:", error.message);
  });

  return socket;
};

export async function subscribeRealtimeEvent<T>(
  event: string,
  handler: RealtimeHandler<T>
): Promise<RealtimeUnsubscribe> {
  if (isTauri()) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen<T>(event, (eventPayload) => handler(eventPayload.payload));
  }

  const client = getSocket();
  const listener = (payload: T) => handler(payload);
  client.on(event, listener);
  return () => client.off(event, listener);
}