import "server-only";
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "liga_szkolna",
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: false,
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params: (string | number | Date | null)[] = [],
): Promise<T[]> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T[];
}

export async function withTransaction<T>(
  fn: (run: (sql: string, params?: (string | number | Date | null)[]) => Promise<void>) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const run = async (sql: string, params: (string | number | Date | null)[] = []) => {
      await conn.execute(sql, params);
    };
    const result = await fn(run);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  ).slice(0, 24);
}
