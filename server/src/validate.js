const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIORITIES = ["low", "normal", "high"];
const TAGS = ["work", "study", "personal", "health"];

export const isUuid = (value) => typeof value === "string" && UUID.test(value);

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  if (value < "1900-01-01" || value > "9999-12-31") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Возвращает очищенную задачу или null, если данные некорректны
export function parseTask(body) {
  if (!body || typeof body !== "object") return null;
  if (!isUuid(body.id)) return null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 180) return null;
  if (typeof body.completed !== "boolean") return null;
  if (!PRIORITIES.includes(body.priority)) return null;
  const dueDate = body.dueDate ?? null;
  if (dueDate !== null && !validDate(dueDate)) return null;
  const tag = body.tag ?? null;
  if (tag !== null && !TAGS.includes(tag)) return null;
  const note = body.note ?? null;
  if (note !== null && (typeof note !== "string" || note.length > 1000))
    return null;
  const created = Date.parse(body.createdAt);
  return {
    id: body.id.toLowerCase(),
    title,
    completed: body.completed,
    priority: body.priority,
    dueDate,
    tag,
    note: note && note.trim() ? note.trim() : null,
    createdAt: new Date(Number.isFinite(created) ? created : Date.now()),
  };
}

export function parseCredentials(body) {
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim().slice(0, 60);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Введите корректный email" };
  // bcrypt учитывает только первые 72 байта, а кириллица занимает 2 байта на букву
  if (password.length < 8 || Buffer.byteLength(password) > 72)
    return { error: "Пароль: от 8 символов, не больше 72 байт (около 36 русских букв)" };
  return { email, password, name };
}