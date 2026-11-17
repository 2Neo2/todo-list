import pg from "pg";
import { readFileSync } from "node:fs";

// Тип date возвращаем строкой «2026-11-17», без сдвигов часовых поясов
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Без этого обработчика обрыв соединения с БД может уронить процесс
pool.on("error", (err) => console.error("Ошибка соединения с БД:", err.message));

// Создаёт таблицы при запуске, если их ещё нет
export async function initDb() {
  const sql = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
}
