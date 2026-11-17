import { useState } from "react";
import type { FormEvent } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { ApiError } from "../api";

interface Props {
  onSubmit: (
    kind: "login" | "register",
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
}

export function AuthScreen({ onSubmit }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const register = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit(mode, email, password, name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Что-то пошло не так");
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand">
          <span>f</span>forma<span className="brand-dot">.</span>
        </div>
        <h1>{register ? "Создай аккаунт" : "С возвращением"}</h1>
        <p>
          {register
            ? "У каждого пользователя свой список задач."
            : "Войди, чтобы открыть свои задачи."}
        </p>
        {register && (
          <label>
            Имя
            <input
              value={name}
              maxLength={60}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            autoComplete={register ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {register ? <UserPlus size={18} /> : <LogIn size={18} />}
          {busy ? "Подождите…" : register ? "Зарегистрироваться" : "Войти"}
        </button>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(register ? "login" : "register");
            setError("");
          }}
        >
          {register ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
        </button>
      </form>
    </div>
  );
}