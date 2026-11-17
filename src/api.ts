import type { Task } from "./types/task";

export interface User {
  id: string;
  email: string;
  name: string;
}

const BASE = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "forma.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) =>
  token
    ? localStorage.setItem(TOKEN_KEY, token)
    : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Нет связи с сервером");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || "Ошибка сервера");
  return data as T;
}

interface AuthResult {
  token: string;
  user: User;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResult>("POST", "/auth/register", { email, password, name }),
  login: (email: string, password: string) =>
    request<AuthResult>("POST", "/auth/login", { email, password }),
  me: () => request<{ user: User }>("GET", "/auth/me"),
  listTasks: () => request<Task[]>("GET", "/tasks"),
  createTask: (task: Task) => request<Task>("POST", "/tasks", task),
  updateTask: (task: Task) => request<Task>("PATCH", `/tasks/${task.id}`, task),
  deleteTask: (id: string) => request<void>("DELETE", `/tasks/${id}`),
};
