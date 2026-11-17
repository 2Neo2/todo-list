import { useEffect, useState } from "react";
import { api, ApiError, getToken, setToken } from "../api";
import type { User } from "../api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => !!getToken());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setToken(null);
        else setNotice("Не удалось связаться с сервером. Попробуйте позже.");
      })
      .finally(() => setChecking(false));
  }, []);

  async function enter(
    kind: "login" | "register",
    email: string,
    password: string,
    name: string,
  ) {
    const r =
      kind === "login"
        ? await api.login(email, password)
        : await api.register(email, password, name);
    setToken(r.token);
    setUser(r.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return { user, checking, notice, enter, logout };
}
