import { useState } from "react";
import {
  Check,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  StickyNote,
} from "lucide-react";
import type { Task, Priority } from "../types/task";
import { dateKey, fromKey, validDate } from "../utils/calendar";
import { TAGS } from "../utils/tags";
import type { Tag } from "../utils/tags";
export const priorityLabels = {
  high: "Высокий",
  normal: "Обычный",
  low: "Низкий",
};
interface Props {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: () => void;
}
export function TaskItem({ task, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [date, setDate] = useState(task.dueDate || "");
  const [tag, setTag] = useState<Tag | "">(task.tag || "");
  const [note, setNote] = useState(task.note || "");
  const overdue =
    !task.completed && !!task.dueDate && task.dueDate < dateKey(new Date());
  return (
    <li
      className={`task-card ${task.completed ? "completed" : ""}`}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      {editing ? (
        <form
          className="edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && (!date || validDate(date))) {
              onUpdate({
                ...task,
                title: title.trim(),
                priority,
                dueDate: date || null,
                tag: tag || null,
                note: note.trim() || undefined,
              });
              setEditing(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        >
          <label>
            Название
            <input
              autoFocus
              required
              maxLength={180}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Дедлайн
            <input
              type="date"
              min="1900-01-01"
              max="9999-12-31"
              value={date}
              onInput={(e) => setDate(e.currentTarget.value)}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Приоритет
            <select
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
          <label>
            Категория
            <select
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
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="edit-actions">
            <button className="primary" type="submit">
              <Check size={16} /> Сохранить
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(false)}
            >
              <X size={16} /> Отмена
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="task-top">
            <button
              className="checkbox"
              role="checkbox"
              aria-checked={task.completed}
              aria-label={`${task.completed ? "Вернуть в работу" : "Выполнить"}: ${task.title}`}
              onClick={() => onUpdate({ ...task, completed: !task.completed })}
            >
              {task.completed && <Check size={16} />}
            </button>
            <span className="task-title">{task.title}</span>
          </div>
          {task.note && (
            <p className="task-note">
              <StickyNote size={13} />
              {task.note}
            </p>
          )}
          <div className="task-info">
            <span className={`priority ${task.priority}`}>
              <i />
              {priorityLabels[task.priority]}
            </span>
            {task.tag && (
              <span className={`tag-chip tag-${task.tag}`}>
                {TAGS[task.tag]}
              </span>
            )}
            {overdue && <span className="overdue-label">Просрочено</span>}
            <div className="task-actions">
              <button
                className="icon-button"
                aria-label={`Редактировать: ${task.title}`}
                onClick={() => {
                  setTitle(task.title);
                  setPriority(task.priority);
                  setDate(task.dueDate || "");
                  setTag(task.tag || "");
                  setNote(task.note || "");
                  setEditing(true);
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                className="icon-button delete"
                aria-label={`Удалить: ${task.title}`}
                onClick={onDelete}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="task-date">
            <CalendarDays size={13} />
            {task.dueDate
              ? `До ${new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", year: "numeric" }).format(fromKey(task.dueDate))}`
              : "Дедлайн не назначен"}
          </div>
        </>
      )}
    </li>
  );
}