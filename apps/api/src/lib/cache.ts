/**
 * Cache genérico con TTL corto, pensado para servicios de agregación
 * computados (como Orbes) que no son entidades de base de datos y se
 * recalculan cada `ttlSeconds`. Usa Redis si REDIS_URL está configurado y
 * conecta; si no, cae a un Map en memoria del proceso. En ambos casos el
 * caller nunca ve la diferencia ni se rompe si Redis no está disponible.
 */
import { Redis } from "ioredis";
import { config } from "../config.js";

let redis: InstanceType<typeof Redis> | null = null;
let redisFailed = false;

function getRedis(): InstanceType<typeof Redis> | null {
  if (!config.REDIS_URL || redisFailed) return null;
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null, // no reintentar indefinidamente
    });
    redis.on("error", () => {
      redisFailed = true;
    });
  }
  return redis;
}

const memory = new Map<string, { value: unknown; expiresAt: number }>();

export async function getOrCompute<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const client = getRedis();

  if (client) {
    try {
      if (client.status === "wait") await client.connect();
      const cached = await client.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
      const value = await compute();
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return value;
    } catch {
      redisFailed = true; // esta y futuras llamadas usan memoria hasta reiniciar
    }
  }

  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await compute();
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}
