import { useEffect, useRef, useState } from "react";
import type { Task } from "../types/task";
import { api, ApiError } from "../api";

export function useTasks(onUnauthorized: () => void) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");
  const latest = useRef<Task[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  function fail(e: unknown) {
    if (e instanceof ApiError && e.status === 401) return onUnauthorized();
    setError(
      (e instanceof ApiError ? e.message : "Нет связи с сервером") +
        ". Последние изменения не сохранены.",
    );
  }

  async function reload() {
    try {
      const list = await api.listTasks();
      latest.current = list;
      setTasks(list);
    } catch {
      /* оставляем то, что есть на экране */
    }
  }

  useEffect(() => {
    api
      .listTasks()
      .then((list) => {
        latest.current = list;
        setTasks(list);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, []);

  // Принимает новый список целиком (как раньше), сравнивает со старым
  // и отправляет на сервер только отличия.
  function commit(next: Task[]) {
    const prev = new Map(latest.current.map((t) => [t.id, t]));
    const ids = new Set(next.map((t) => t.id));
    const jobs: Array<() => Promise<unknown>> = [];
    for (const id of prev.keys()) {
      if (!ids.has(id)) jobs.push(() => api.deleteTask(id));
    }
    for (const task of next) {
      const old = prev.get(task.id);
      if (!old) jobs.push(() => api.createTask(task));
      else if (JSON.stringify(old) !== JSON.stringify(task))
        jobs.push(() => api.updateTask(task));
    }
    latest.current = next;
    setTasks(next);
    if (!jobs.length) return;
    setPending((n) => n + 1);
    queue.current = queue.current.then(async () => {
      try {
        for (const job of jobs) await job();
        setError("");
      } catch (e) {
        fail(e);
        await reload();
      } finally {
        setPending((n) => n - 1);
      }
    });
  }

  return { tasks, commit, error, loading, syncing: pending > 0 };
}