import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

type Schema = typeof schema;
export type AppDatabase = PostgresJsDatabase<Schema>;

const globalForMoney = globalThis as unknown as {
  __money_pg_client?: ReturnType<typeof postgres>;
  __money_db_instance?: AppDatabase;
};
const workspaceDbStorage = new AsyncLocalStorage<AppDatabase>();

function getClient() {
  if (!globalForMoney.__money_pg_client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const max = Number(process.env.PG_POOL_MAX ?? 10);
    const startupTimeoutsEnabled = process.env.PG_STARTUP_TIMEOUTS !== "0";
    globalForMoney.__money_pg_client = postgres(connectionString, {
      max,
      prepare: false,
      idle_timeout: 30,
      connect_timeout: 5,
      max_lifetime: 60 * 30,
      connection: {
        application_name: "apps-money",
        ...(startupTimeoutsEnabled
          ? {
              statement_timeout: 5_000,
              lock_timeout: 2_000,
              idle_in_transaction_session_timeout: 10_000,
            }
          : {}),
      },
    });
  }
  return globalForMoney.__money_pg_client;
}

function getDbInstance(): AppDatabase {
  if (!globalForMoney.__money_db_instance) {
    globalForMoney.__money_db_instance = drizzle(getClient(), { schema });
  }
  return globalForMoney.__money_db_instance;
}

function currentDb(): AppDatabase {
  return workspaceDbStorage.getStore() ?? getDbInstance();
}

export const db = new Proxy({} as AppDatabase, {
  get(_, prop, receiver) {
    const instance = currentDb();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Runs a callback with `app.workspace_id` set in the transaction scope.
 * Use this wrapper when enabling strict Postgres RLS in runtime paths.
 */
export async function withWorkspaceRls<T>(
  workspaceId: string,
  run: (tx: Parameters<Parameters<AppDatabase["transaction"]>[0]>[0]) => Promise<T>,
): Promise<T> {
  return getDbInstance().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
    return workspaceDbStorage.run(tx as AppDatabase, () => run(tx));
  });
}

export const runInWorkspace = withWorkspaceRls;

/** Set `app.workspace_id` on the current transaction (must already be inside one). */
export async function setWorkspaceRlsConfig(workspaceId: string): Promise<void> {
  await db.execute(
    sql`SELECT set_config('app.workspace_id', ${workspaceId}, true)`,
  );
}

/**
 * Run cross-tenant work (cron scans) under the `money_cron` BYPASSRLS role when
 * available; otherwise fall back to `SET LOCAL row_security = off` (superuser/owner).
 */
export async function withBypassRls<T>(run: () => Promise<T>): Promise<T> {
  return getDbInstance().transaction(async (tx) => {
    return workspaceDbStorage.run(tx as AppDatabase, async () => {
      try {
        await tx.execute(sql`SET LOCAL ROLE money_cron`);
      } catch {
        await tx.execute(sql`SET LOCAL row_security = off`);
      }
      return run();
    });
  });
}

/** Top-level DB transaction that binds `db` proxy to the tx via ALS. */
export async function withDbTransaction<T>(
  run: () => Promise<T>,
): Promise<T> {
  return getDbInstance().transaction(async (tx) => {
    return workspaceDbStorage.run(tx as AppDatabase, () => run());
  });
}
