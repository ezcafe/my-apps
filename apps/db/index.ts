import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Schema = typeof schema;
export type AppDatabase = PostgresJsDatabase<Schema>;

const globalForMoney = globalThis as unknown as {
  __money_pg_client?: ReturnType<typeof postgres>;
  __money_db_instance?: AppDatabase;
};

function getClient() {
  if (!globalForMoney.__money_pg_client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForMoney.__money_pg_client = postgres(connectionString, { max: 10 });
  }
  return globalForMoney.__money_pg_client;
}

function getDbInstance(): AppDatabase {
  if (!globalForMoney.__money_db_instance) {
    globalForMoney.__money_db_instance = drizzle(getClient(), { schema });
  }
  return globalForMoney.__money_db_instance;
}

export const db = new Proxy({} as AppDatabase, {
  get(_, prop, receiver) {
    const instance = getDbInstance();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
