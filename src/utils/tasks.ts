import { TAG_IDS } from "./tags.ts";
import { validDate } from "./calendar.ts";
import type { Task, Filter } from "../types/task.ts";
export const STORAGE_KEY = "forma.tasks.v1";
export function parseTasks(raw: string | null): Task[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Invalid task storage");
  const ids = new Set<string>();
  return data.map((task: unknown) => {
    if (!task || typeof task !== "object") throw new Error("Invalid task");
    const t = task as Task;
    if (
      typeof t.id !== "string" ||
      !t.id ||
      ids.has(t.id) ||
      typeof t.title !== "string" ||
      !t.title.trim() ||
      t.title.length > 180 ||
      typeof t.completed !== "boolean" ||
      !["low", "normal", "high"].includes(t.priority) ||
      typeof t.createdAt !== "string" ||
      !Number.isFinite(Date.parse(t.createdAt)) ||
      (t.dueDate != null && !validDate(t.dueDate)) ||
      (t.tag != null && !TAG_IDS.includes(t.tag)) ||
      (t.note !== undefined &&
        (typeof t.note !== "string" || t.note.length > 1000))
    )
      throw new Error("Invalid task");
    ids.add(t.id);
    return {
      id: t.id,
      title: t.title,
      completed: t.completed,
      priority: t.priority,
      createdAt: t.createdAt,
      ...(t.dueDate !== undefined ? { dueDate: t.dueDate } : {}),
      ...(t.tag ? { tag: t.tag } : {}),
      ...(t.note ? { note: t.note } : {}),
    };
  });
}
export function filterTasks(tasks: Task[], filter: Filter, query: string) {
  return tasks.filter(
    (t) =>
      (filter === "all" ||
        (filter === "completed" ? t.completed : !t.completed)) &&
      t.title
        .toLocaleLowerCase("ru")
        .includes(query.trim().toLocaleLowerCase("ru")),
  );
}
export type Sort = "new" | "priority" | "title";
const weight = { high: 0, normal: 1, low: 2 };
export function sortTasks(tasks: Task[], sort: Sort): Task[] {
  if (sort === "new") return tasks;
  return [...tasks].sort((a, b) =>
    sort === "priority"
      ? weight[a.priority] - weight[b.priority]
      : a.title.localeCompare(b.title, "ru"),
  );
}