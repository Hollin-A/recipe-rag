import pg from "pg";
import { databaseUrl } from "./config.ts";

export function createPool(): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl() });
}
