import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pool, initDb } from "./db.js";
import { isUuid, parseCredentials, parseTask } from "./validate.js";

const { JWT_SECRET, DATABASE_URL, PORT = 3001 } = process.env;
if (!DATABASE_URL) {
  console.error("Не задан DATABASE_URL (см. server/.env.example)");
  process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("Задайте JWT_SECRET длиной от 16 символов (см. server/.env.example)");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

const sign = (user) =>
  jwt.sign({ sub: user.id }, JWT_SECRET, { algorithm: "HS256", expiresIn: "7d" });
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });
// Express 4 сам не ловит ошибки async-обработчиков, поэтому оборачиваем
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

function auth(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "Нужно войти" });
  try {
    req.userId = jwt.verify(match[1], JWT_SECRET, { algorithms: ["HS256"] }).sub;
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла, войдите заново" });
  }
}

const api = express.Router();

api.get("/health", (req, res) => res.json({ ok: true }));

/* ---------- авторизация ---------- */
api.post(
  "/auth/register",
  wrap(async (req, res) => {
    const data = parseCredentials(req.body);
    if (data.error) return res.status(400).json({ error: data.error });
    const hash = await bcrypt.hash(data.password, 12);
    try {
      const { rows } = await pool.query(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name",
        [data.email, data.name, hash],
      );
      res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
    } catch (e) {
      if (e.code === "23505")
        return res.status(409).json({ error: "Этот email уже зарегистрирован" });
      throw e;
    }
  }),
);

api.post(
  "/auth/login",
  wrap(async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: "Неверный email или пароль" });
    res.json({ token: sign(user), user: publicUser(user) });
  }),
);

api.get(
  "/auth/me",
  auth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, email, name FROM users WHERE id = $1",
      [req.userId],
    );
    if (!rows[0]) return res.status(401).json({ error: "Пользователь не найден" });
    res.json({ user: publicUser(rows[0]) });
  }),
);

/* ---------- задачи (только свои) ---------- */
const COLUMNS = "id, title, completed, priority, due_date, tag, note, created_at";
const toTask = (r) => ({
  id: r.id,
  title: r.title,
  completed: r.completed,
  priority: r.priority,
  dueDate: r.due_date,
  tag: r.tag,
  ...(r.note ? { note: r.note } : {}),
  createdAt: r.created_at,
});

api.get(
  "/tasks",
  auth,
  wrap(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    );
    res.json(rows.map(toTask));
  }),
);

api.post(
  "/tasks",
  auth,
  wrap(async (req, res) => {
    const t = parseTask(req.body);
    if (!t) return res.status(400).json({ error: "Некорректные данные задачи" });
    try {
      const { rows } = await pool.query(
        `INSERT INTO tasks (id, user_id, title, completed, priority, due_date, tag, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${COLUMNS}`,
        [t.id, req.userId, t.title, t.completed, t.priority, t.dueDate, t.tag, t.note, t.createdAt],
      );
      res.status(201).json(toTask(rows[0]));
    } catch (e) {
      if (e.code === "23505")
        return res.status(409).json({ error: "Задача с таким id уже есть" });
      throw e;
    }
  }),
);

api.patch(
  "/tasks/:id",
  auth,
  wrap(async (req, res) => {
    const t = parseTask({ ...req.body, id: req.params.id });
    if (!t) return res.status(400).json({ error: "Некорректные данные задачи" });
    const { rows } = await pool.query(
      `UPDATE tasks SET title = $3, completed = $4, priority = $5, due_date = $6, tag = $7, note = $8
       WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      [t.id, req.userId, t.title, t.completed, t.priority, t.dueDate, t.tag, t.note],
    );
    if (!rows[0]) return res.status(404).json({ error: "Задача не найдена" });
    res.json(toTask(rows[0]));
  }),
);

api.delete(
  "/tasks/:id",
  auth,
  wrap(async (req, res) => {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: "Задача не найдена" });
    await pool.query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.userId,
    ]);
    res.status(204).end();
  }),
);

app.use("/api", api);
app.use("/api", (req, res) => res.status(404).json({ error: "Не найдено" }));

// В продакшене сервер сам отдаёт собранный фронтенд из ../dist
const dist = path.resolve(fileURLToPath(new URL("../../dist", import.meta.url)));
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Ошибка сервера" });
});

await initDb();
app.listen(PORT, () => console.log(`Forma API: http://localhost:${PORT}`));