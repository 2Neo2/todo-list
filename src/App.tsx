import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  Download,
  ArrowUpRight,
  Inbox,
  Clock3,
  Leaf,
  Upload,
  LogOut,
} from "lucide-react";
import { useTasks } from "./hooks/useTasks";
import type { User } from "./api";
import { TaskItem, priorityLabels } from "./components/TaskItem";
import {
  dateKey,
  fromKey,
  monthDays,
  taskWord,
  validDate,
} from "./utils/calendar";
import { filterTasks, parseTasks, sortTasks, withUuidIds } from "./utils/tasks";
import type { Sort } from "./utils/tasks";
import { TAGS } from "./utils/tags";
import type { Tag } from "./utils/tags";
import type { Task, Priority, Filter } from "./types/task";
const fullDate = new Intl.DateTimeFormat("ru", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
export default function App({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  const { tasks, commit, error, loading, syncing } = useTasks(onLogout);
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => fromKey(today));
  const [selected, setSelected] = useState<string | null>(today);
  const [mode, setMode] = useState<"day" | "unscheduled" | "overdue">("day");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [dueDate, setDueDate] = useState(today);
  const [tag, setTag] = useState<Tag | "">("");
  const [note, setNote] = useState("");
  const [tagFilter, setTagFilter] = useState<Tag | "">("");
  const [sort, setSort] = useState<Sort>("new");
  const [dropKey, setDropKey] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [deleted, setDeleted] = useState<{ task: Task; index: number } | null>(
    null,
  );
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);
  const prefix = dateKey(month).slice(0, 7);
  const monthTasks = tasks.filter((t) => t.dueDate?.startsWith(prefix));
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < today && !t.completed,
  );
  const unscheduled = tasks.filter((t) => !t.dueDate);
  const filtered = filterTasks(tasks, filter, query).filter(
    (t) => !tagFilter || t.tag === tagFilter,
  );
  const dayTasks = sortTasks(filtered, sort).filter((t) =>
    mode === "unscheduled"
      ? !t.dueDate
      : mode === "overdue"
        ? t.dueDate && t.dueDate < today && !t.completed
        : t.dueDate === selected,
  );
  const done = monthTasks.filter((t) => t.completed).length;
  function choose(key: string, scroll = true) {
    setSelected(key);
    setMode("day");
    setDueDate(key);
    if (scroll)
      requestAnimationFrame(() =>
        panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      );
  }
  function shift(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    setMonth(next);
    choose(dateKey(next), false);
  }
  function current() {
    setMonth(fromKey(today));
    choose(today, false);
  }
  function add() {
    if (!title.trim() || (dueDate && !validDate(dueDate))) return;
    commit([
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate || null,
        ...(tag ? { tag } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      ...tasks,
    ]);
    setTitle("");
    setTag("");
    setNote("");
    setPriority("normal");
    setQuery("");
    setFilter("all");
    if (dueDate) {
      setMonth(fromKey(dueDate));
      choose(dueDate, false);
    } else setMode("unscheduled");
    input.current?.focus();
  }
  function special(next: "unscheduled" | "overdue") {
    setMode(next);
    setDueDate(next === "unscheduled" ? "" : today);
    setQuery("");
    setFilter("all");
  }
  function moveTask(id: string, key: string) {
    if (!tasks.some((t) => t.id === id)) return;
    commit(tasks.map((t) => (t.id === id ? { ...t, dueDate: key } : t)));
  }
  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `forma-tasks-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importTasks(file: File) {
    try {
      const imported = withUuidIds(parseTasks(await file.text()));
      if (confirm(`Заменить текущие задачи (${imported.length} шт.) файлом?`))
        commit(imported);
    } catch {
      alert("Файл не подходит: нужен JSON, экспортированный из Forma.");
    }
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key === "n" || e.key === "т") {
        e.preventDefault();
        input.current?.focus();
      } else if (e.key === "t" || e.key === "е") current();
      else if (e.key === "ArrowLeft") shift(-1);
      else if (e.key === "ArrowRight") shift(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (loading) return <div className="boot">Загрузка задач…</div>;
  return (
    <div className="planner">
      <header className="app-header">
        <a className="brand" href="./">
          <span>f</span>forma<span className="brand-dot">.</span>
        </a>
        <div className="header-divider" />
        <span className="workspace-label">{user.name || user.email}</span>
        <div className="header-right">
          <span className="saved">
            <i />
            {syncing ? "Сохраняю…" : "Сохранено на сервере"}
          </span>
          <div className="header-tools">
            <button
              className="icon-button"
              aria-label="Экспорт задач в файл"
              title="Экспорт в JSON"
              onClick={exportTasks}
            >
              <Download size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Импорт задач из файла"
              title="Импорт из JSON"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={18} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importTasks(f);
                e.target.value = "";
              }}
            />
            <button
              className="icon-button"
              aria-label="Выйти"
              title="Выйти"
              onClick={onLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
          <span className="avatar" title={user.email}>
            {(user.name || user.email)[0].toUpperCase()}
          </span>
        </div>
      </header>
      <main className="main">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <CalendarDays size={16} /> ТВОЙ ПЛАН, ТВОЙ РИТМ
            </div>
            <h1>
              Место для твоих планов<span>.</span>
            </h1>
            <p>
              Сегодня, через неделю или через месяц. У каждого дела — свой день.
            </p>
          </div>
          <button
            className="primary new-task"
            onClick={() => {
              panel.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
              input.current?.focus();
            }}
          >
            <Plus size={20} />
            Новая задача
          </button>
        </div>
        <div className="overview">
          <div className="overview-main">
            <span className="overview-icon">
              <CalendarDays size={22} />
            </span>
            <div>
              <span>В выбранном месяце</span>
              <strong>
                {monthTasks.length} <small>{taskWord(monthTasks.length)}</small>
              </strong>
            </div>
            <div className="month-progress">
              <span>
                {done} из {monthTasks.length} выполнено
              </span>
              <progress
                value={done}
                max={monthTasks.length || 1}
                aria-label="Прогресс месяца"
              />
            </div>
          </div>
          <button
            className={`overview-button ${mode === "overdue" ? "chosen" : ""}`}
            onClick={() => special("overdue")}
          >
            <span className="stat-icon peach">
              <Clock3 size={21} />
            </span>
            <span>
              Просрочено<strong>{overdue.length}</strong>
            </span>
            <ArrowUpRight size={18} />
          </button>
          <button
            className={`overview-button ${mode === "unscheduled" ? "chosen" : ""}`}
            onClick={() => special("unscheduled")}
          >
            <span className="stat-icon lilac">
              <Inbox size={21} />
            </span>
            <span>
              Без даты<strong>{unscheduled.length}</strong>
            </span>
            <ArrowUpRight size={18} />
          </button>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="workspace-grid">
          <section className="calendar-section" aria-label="Календарь задач">
            <div className="calendar-toolbar">
              <div className="month-heading">
                <h2>
                  {new Intl.DateTimeFormat("ru", {
                    month: "long",
                    year: "numeric",
                  })
                    .format(month)
                    .replace(" г.", "")}
                </h2>
                <div className="month-arrows">
                  <button
                    className="icon-button"
                    aria-label="Предыдущий месяц"
                    onClick={() => shift(-1)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Следующий месяц"
                    onClick={() => shift(1)}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="calendar-tools">
                <label className="month-picker">
                  <CalendarDays size={16} />
                  <input
                    type="month"
                    aria-label="Перейти к месяцу"
                    min="1900-01"
                    max="9999-12"
                    value={prefix}
                    onChange={(e) => {
                      if (validDate(e.target.value + "-01")) {
                        const key = e.target.value + "-01";
                        setMonth(fromKey(key));
                        choose(key, false);
                      }
                    }}
                    onInput={(e) => {
                      if (validDate(e.currentTarget.value + "-01")) {
                        const key = e.currentTarget.value + "-01";
                        setMonth(fromKey(key));
                        choose(key, false);
                      }
                    }}
                  />
                </label>
                <button className="secondary" onClick={current}>
                  Сегодня
                </button>
              </div>
            </div>
            <div className="filter-bar">
              <div className="filter-tabs">
                {(
                  [
                    ["all", "Все задачи"],
                    ["active", "В работе"],
                    ["completed", "Выполнено"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className={filter === id ? "active" : ""}
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Поиск задач"
                  placeholder="Найти задачу…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Очистить поиск"
                    onClick={() => setQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
            </div>
            <div className="tag-bar">
              <button
                className={tagFilter === "" ? "active" : ""}
                onClick={() => setTagFilter("")}
              >
                Все категории
              </button>
              {(Object.entries(TAGS) as [Tag, string][]).map(([id, label]) => (
                <button
                  key={id}
                  className={`tag-${id} ${tagFilter === id ? "active" : ""}`}
                  onClick={() => setTagFilter(tagFilter === id ? "" : id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="weekdays" aria-hidden="true">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {monthDays(month).map((date) => {
                const key = dateKey(date);
                const list = filtered.filter((t) => t.dueDate === key);
                const outside = date.getMonth() !== month.getMonth();
                return (
                  <button
                    key={key}
                    className={`day-cell ${outside ? "outside" : ""} ${key === today ? "today" : ""} ${selected === key && mode === "day" ? "selected" : ""} ${dropKey === key ? "drop" : ""}`}
                    aria-label={`${fullDate.format(date)}, ${list.length} ${taskWord(list.length)}`}
                    aria-pressed={selected === key && mode === "day"}
                    onClick={() => choose(key)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropKey(key);
                    }}
                    onDragLeave={() => setDropKey(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropKey(null);
                      moveTask(e.dataTransfer.getData("text/plain"), key);
                    }}
                  >
                    <span className="day-top">
                      <span className="day-number">{date.getDate()}</span>
                      {key === today ? (
                        <span className="today-label">Сегодня</span>
                      ) : (
                        <Plus className="day-plus" size={15} />
                      )}
                    </span>
                    <span className="day-events">
                      {list.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className={`event ${t.priority} ${t.completed ? "done" : ""} ${!t.completed && key < today ? "late" : ""}`}
                        >
                          <i />
                          {t.title}
                        </span>
                      ))}
                      {list.length > 3 && (
                        <span className="more-events">
                          Ещё {list.length - 3}
                        </span>
                      )}
                    </span>
                    <span className="mobile-count">
                      {list.length > 0 && (
                        <>
                          <i />
                          {list.length}
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="calendar-footer">
              <span>
                <i className="legend today-legend" />
                Сегодня
              </span>
              <span>
                <i className="legend high-legend" />
                Высокий приоритет
              </span>
              <span>
                <i className="legend done-legend" />
                Выполнено
              </span>
              <span className="calendar-tip">
                Нажми на день, чтобы добавить задачу
              </span>
            </div>
          </section>
          <aside
            className="day-panel"
            ref={panel}
            aria-label="Задачи выбранного дня"
          >
            <div className="panel-heading">
              <span className="panel-eyebrow">
                {mode === "day" && selected
                  ? new Intl.DateTimeFormat("ru", { weekday: "long" }).format(
                      fromKey(selected),
                    )
                  : "Твои задачи"}
              </span>
              <h2>
                {mode === "unscheduled"
                  ? "Без даты"
                  : mode === "overdue"
                    ? "Просроченные"
                    : selected
                      ? new Intl.DateTimeFormat("ru", {
                          day: "numeric",
                          month: "long",
                        }).format(fromKey(selected))
                      : ""}
                {selected === today && mode === "day" && <span>Сегодня</span>}
              </h2>
              <p>
                {dayTasks.length} {taskWord(dayTasks.length)}
                {query || filter !== "all" ? " по фильтру" : ""} ·{" "}
                {mode === "day"
                  ? "план на этот день"
                  : mode === "unscheduled"
                    ? "назначь удобный день"
                    : "можно перенести дедлайн"}
              </p>
            </div>
            <form
              className="task-form"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <label htmlFor="new-title">Что планируешь?</label>
              <input
                id="new-title"
                ref={input}
                placeholder="Например, отправить проект"
                value={title}
                maxLength={180}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="form-fields">
                <label>
                  Дедлайн
                  <input
                    aria-label="Дедлайн новой задачи"
                    type="date"
                    min="1900-01-01"
                    max="9999-12-31"
                    value={dueDate}
                    onInput={(e) => setDueDate(e.currentTarget.value)}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
                <label>
                  Приоритет
                  <select
                    aria-label="Приоритет новой задачи"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {Object.entries(priorityLabels).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Категория
                <select
                  aria-label="Категория новой задачи"
                  value={tag}
                  onChange={(e) => setTag(e.target.value as Tag | "")}
                >
                  <option value="">Без категории</option>
                  {Object.entries(TAGS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Заметка
                <textarea
                  aria-label="Заметка к задаче"
                  rows={2}
                  maxLength={1000}
                  placeholder="Детали, ссылки, что не забыть…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button className="primary" type="submit">
                <Plus size={18} />
                Добавить задачу
              </button>
            </form>
            <div className="panel-list-heading">
              <span>Задачи {mode === "day" ? "дня" : ""}</span>
              <select
                className="sort-select"
                aria-label="Сортировка задач"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
              >
                <option value="new">Сначала новые</option>
                <option value="priority">По приоритету</option>
                <option value="title">По названию</option>
              </select>
            </div>
            {dayTasks.length ? (
              <ul className="task-list">
                {dayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={(updated) =>
                      commit(
                        tasks.map((t) => (t.id === updated.id ? updated : t)),
                      )
                    }
                    onDelete={() => {
                      setDeleted({
                        task,
                        index: tasks.findIndex((t) => t.id === task.id),
                      });
                      commit(tasks.filter((t) => t.id !== task.id));
                    }}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty">
                <span>
                  <Leaf size={29} strokeWidth={1.4} />
                </span>
                <h3>
                  {query || filter !== "all"
                    ? "Нет задач по фильтру"
                    : "Здесь пока свободно"}
                </h3>
                <p>
                  {query || filter !== "all"
                    ? "Попробуй изменить поиск или статус."
                    : "Оставь время для себя или добавь первое дело на этот день."}
                </p>
              </div>
            )}
            <div className="panel-note">
              <Clock3 size={15} />
              Дедлайн — до конца выбранного дня.
            </div>
          </aside>
        </div>
        <footer>
          Планы могут меняться — перетащи задачу на другой день в календаре.
          <span>N — новая задача · T — сегодня · ← → — месяц</span>
        </footer>
      </main>
      {deleted && (
        <div className="toast">
          <span role="status">Задача удалена</span>
          <button
            onClick={() => {
              const next = [...tasks];
              next.splice(
                Math.min(deleted.index, next.length),
                0,
                deleted.task,
              );
              commit(next);
              setDeleted(null);
            }}
          >
            Отменить
          </button>
          <button
            aria-label="Закрыть уведомление"
            onClick={() => setDeleted(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
