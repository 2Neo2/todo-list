import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthScreen } from "./components/AuthScreen";
import { useAuth } from "./hooks/useAuth";
import "./styles.css";
import "./theme.css";

function Root() {
  const { user, checking, notice, enter, logout } = useAuth();
  if (checking) return <div className="boot">Загрузка…</div>;
  if (!user) return <AuthScreen onSubmit={enter} notice={notice} />;
  return <App key={user.id} user={user} onLogout={logout} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
