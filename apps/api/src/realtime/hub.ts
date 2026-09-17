import type { WebSocket } from "ws";

/**
 * Registro en memoria de sockets por usuario. Alcanza para un solo proceso de
 * API (el caso actual) — si en algún momento hay más de una instancia detrás
 * de un balanceador, esto necesita mudarse a algo compartido (Redis pub/sub).
 */
const socketsByUser = new Map<string, Set<WebSocket>>();

export function registerSocket(userId: string, socket: WebSocket) {
  let set = socketsByUser.get(userId);
  if (!set) {
    set = new Set();
    socketsByUser.set(userId, set);
  }
  set.add(socket);
}

export function unregisterSocket(userId: string, socket: WebSocket) {
  const set = socketsByUser.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) socketsByUser.delete(userId);
}

export function pushToUser(userId: string, event: Record<string, unknown>) {
  const set = socketsByUser.get(userId);
  if (!set || set.size === 0) return;
  const message = JSON.stringify(event);
  for (const socket of set) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}
