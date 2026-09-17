/**
 * Qué Orbes ya viste — client-side a propósito (igual que el resto del
 * motor de Orbes/mascotas). Una vez que abrís el Orbe de alguien, sus items
 * actuales dejan de contar como "sin ver"; si esa persona publica algo
 * nuevo, vuelve a aparecer en la barra.
 */
const KEY = "gossip.orbes.seen";

function readSeenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeenSet(set: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // localStorage lleno o bloqueado — no es crítico, el Orbe simplemente no se marca
  }
}

export function markOrbesSeen(itemIds: string[]) {
  if (itemIds.length === 0) return;
  const set = readSeenSet();
  itemIds.forEach((id) => set.add(id));
  writeSeenSet(set);
}

/** true si TODOS los items pasados ya fueron vistos (el autor no tiene nada nuevo). */
export function allOrbesSeen(itemIds: string[]): boolean {
  const set = readSeenSet();
  return itemIds.every((id) => set.has(id));
}
