import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("→ Creando extensiones (postgis, vector, pg_trgm, pgcrypto)...");
    const extensionsSql = readFileSync(path.join(__dirname, "extensions.sql"), "utf-8");
    await client.query(extensionsSql);

    console.log("→ Corriendo migraciones de Drizzle...");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: path.join(__dirname, "../../../../infra/migrations") });

    console.log("→ Aplicando columnas geoespaciales / vectoriales...");
    const postSql = readFileSync(path.join(__dirname, "post-migrate.sql"), "utf-8");
    await client.query(postSql);

    console.log("✓ Base de datos lista.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("✗ Falló la migración:", err);
  process.exit(1);
});
