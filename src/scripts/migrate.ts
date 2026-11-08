// Applies each file in db/migrations once, in filename order, and records it.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPool } from "../db.ts";

const directory = join(import.meta.dirname, "../../db/migrations");
const pool = createPool();

await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)");
const { rows } = await pool.query<{ name: string }>("SELECT name FROM schema_migrations");
const applied = new Set(rows.map((r) => r.name));

const files = (await readdir(directory)).filter((f) => f.endsWith(".sql")).toSorted();
for (const file of files) {
  if (applied.has(file)) continue;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(await readFile(join(directory, file), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    await client.query("COMMIT");
    console.log(`applied ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

console.log(`${files.length} migrations, all applied.`);
await pool.end();
