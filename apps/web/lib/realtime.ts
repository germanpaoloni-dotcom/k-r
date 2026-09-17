import { API_URL, getSession } from "./api";

export interface RealtimeEvent {
  kind: "notification";
  notification: unknown;
  unreadCount: number;
}

type Listener = (event: RealtimeEvent) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function connect() {
  const session = getSession();
  if (!session || typeof window === "undefined") return;
  const wsUrl = `${API_URL.replace(/^http/, "ws")}/api/v1/realtime?token=${encodeURIComponent(session.accessToken)}`;
  socket = new WebSocket(wsUrl);

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as RealtimeEvent;
      listeners.forEach((l) => l(data));
    } catch {
      // mensaje no parseable — se ignora, no vale la pena romper la conexión por esto
    }
  };

  socket.onclose = () => {
    socket = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (listeners.size > 0) reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = () => socket?.close();
}

/** Se suscribe a eventos en tiempo real (notificaciones, mensajes). Abre la
 * conexión al primer suscriptor y la cierra cuando el último se va. */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  if (!socket) connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && socket) {
      socket.close();
      socket = null;
    }
  };
}
