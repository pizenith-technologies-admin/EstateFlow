import pg from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/** Standard PostgreSQL (Docker Compose, local, RDS, …). Neon's serverless driver is only for Neon cloud. */
function useNativePg(): boolean {
  if (process.env.USE_PG_DRIVER === "true") return true;
  if (process.env.USE_PG_DRIVER === "false") return false;
  const raw = process.env.DATABASE_URL || "";
  // Neon cloud URLs need the WebSocket-based driver
  if (/neon\.tech|\.neon\./i.test(raw)) return false;
  return true;
}

const connectionString = process.env.DATABASE_URL;
const nativePg = useNativePg();

export const pool: pg.Pool | NeonPool = nativePg
  ? new pg.Pool({ connectionString })
  : (() => {
      neonConfig.webSocketConstructor = ws;
      return new NeonPool({ connectionString });
    })();

export const db = nativePg
  ? drizzlePg(pool as pg.Pool, { schema })
  : drizzleNeon({ client: pool as NeonPool, schema });