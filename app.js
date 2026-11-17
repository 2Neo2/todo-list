"use strict";

const STORAGE_KEY = "forma.tasks.v1";

const priorities = {
  high: "Высокий",
  normal: "Обычный",
  low: "Низкий",
};

const filterTitles = {
  all: "Все задачи",
  active: "В работе",
  completed: "Выполнено",
};

const elements = {
  form: document.querySelector("#task-form"),
  input: document.querySelector("#task-input"),
  priority: document.querySelector("#priority-input"),
  search: document.querySelector("#search-input"),
  list: document.querySelector("#task-list"),
  template: document.querySelector("#task-template"),
  filters: document.querySelectorAll("[data-filter]"),
  title: document.querySelector("#page-title"),
  visibleCount: document.querySelector("#visible-count"),
  countAll: document.querySelector("#count-all"),
  countActive: document.querySelector("#count-active"),
  countCompleted: document.querySelector("#count-completed"),
  progress: document.querySelector("#progress"),
  progressValue: document.querySelector("#progress-value"),
  progressText: document.querySelector("#progress-text"),
  empty: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyDescription: document.querySelector("#empty-description"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  undoButton: document.querySelector("#undo-button"),
};

let tasks = [];
let currentFilter = "all";
let searchQuery = "";
let deletedTask = null;
let toastTimer;
let loadWarning = "";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

function isValidTask(task) {
  return (
    task !== null &&
    typeof task === "object" &&
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    task.title.length <= 180 &&
    typeof task.completed === "boolean" &&
    Object.hasOwn(priorities, task.priority) &&
    typeof task.createdAt === "string" &&
    Number.isFinite(Date.parse(task.createdAt))
  );
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === null) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("Некорректный формат списка");
    }

    const ids = new Set();

    const validTasks = parsed.filter((task) => {
      if (!isValidTask(task) || ids.has(task.id)) return false;

      ids.add(task.id);
      return true;
    });

    if (validTasks.length !== parsed.length) {
      loadWarning = "Некоторые сохранённые задачи повреждены и не отображаются.";
    }

    return validTasks;
  } catch {
    loadWarning =
      "Не удалось загрузить задачи. Проверь доступ к хранилищу браузера.";

    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    showToast("Не удалось сохранить изменения. Они исчезнут после перезагрузки.");
    return false;
  }
}

function showToast(message, canUndo = false) {
  clearTimeout(toastTimer);

  elements.toastMessage.textContent = message;
  elements.undoButton.hidden = !canUndo;
  elements.toast.hidden = false;

  if (!canUndo) deletedTask = null;

  toastTimer = setTimeout(() => {
    // Не убираем кнопку из-под клавиатурного фокуса.
    if (elements.toast.contains(document.activeElement)) return;

    elements.toast.hidden = true;
    deletedTask = null;
  }, 6000);
}

function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    const matchesSearch = task.title
      .toLocaleLowerCase("ru-RU")
      .includes(searchQuery);

    return matchesFilter && matchesSearch;
  });
}

function renderStats() {
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  elements.countAll.textContent = total;
  elements.countActive.textContent = total - completed;
  elements.countCompleted.textContent = completed;

  elements.progress.value = percentage;
  elements.progress.textContent = `${percentage}%`;
  elements.progressValue.textContent = `${percentage}%`;

  if (total === 0) {
    elements.progressText.textContent = "Добавь первую задачу, чтобы начать.";
  } else if (completed === total) {
    elements.progressText.textContent = "Всё готово. Можно немного выдохнуть.";
  } else {
    elements.progressText.textContent =
      `Выполнено ${completed} из ${total}. Двигайся в своём темпе.`;
  }
}

function renderEmptyState(visibleTasks) {
  elements.empty.hidden = visibleTasks.length > 0;

  if (searchQuery) {
    elements.emptyTitle.textContent = "Ничего не нашлось";
    elements.emptyDescription.textContent =
      "Попробуй другое название или выбери другой раздел.";
  } else if (currentFilter === "completed") {
    elements.emptyTitle.textContent = "Первые победы ещё впереди";
    elements.emptyDescription.textContent =
      "Выполненные задачи будут появляться здесь.";
  } else if (currentFilter === "active" && tasks.length > 0) {
    elements.emptyTitle.textContent = "Всё под контролем";
    elements.emptyDescription.textContent =
      "Открытых задач нет. Хороший момент для перерыва.";
  } else {
    elements.emptyTitle.textContent = "Здесь начинается порядок";
    elements.emptyDescription.textContent =
      "Добавь первую задачу — и станет немного яснее.";
  }
}

function createTaskRow(task, newTaskId) {
  const row = elements.template.content.firstElementChild.cloneNode(true);

  row.dataset.id = task.id;
  row.classList.toggle("completed", task.completed);
  row.classList.toggle("is-new", task.id === newTaskId);

  const checkbox = row.querySelector(".task-checkbox");

  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `${task.completed ? "Вернуть в работу" : "Выполнить"}: ${task.title}`
  );

  // textContent отображает пользовательский ввод как текст, а не HTML.
  row.querySelector(".task-title").textContent = task.title;
  row.querySelector(".task-meta").textContent =
    `Создано ${dateFormatter.format(new Date(task.createdAt))}`;

  const badge = row.querySelector(".priority-badge");

  badge.textContent = priorities[task.priority];
  badge.classList.add(task.priority);

  row.querySelector(".edit-button").setAttribute(
    "aria-label",
    `Редактировать: ${task.title}`
  );

  row.querySelector(".delete-button").setAttribute(
    "aria-label",
    `Удалить: ${task.title}`
  );

  return row;
}

function render(newTaskId = null) {
  const visibleTasks = getVisibleTasks();
  const fragment = document.createDocumentFragment();

  for (const task of visibleTasks) {
    fragment.append(createTaskRow(task, newTaskId));
  }

  elements.list.replaceChildren(fragment);
  elements.visibleCount.textContent = visibleTasks.length;
  elements.title.textContent = filterTitles[currentFilter];

  elements.filters.forEach((button) => {
    const active = button.dataset.filter === currentFilter;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderStats();
  renderEmptyState(visibleTasks);
}

// После перерисовки возвращаем фокус на задачу или ближайшую строку.
function focusTaskControl(taskId, selector, previousIndex = 0) {
  const rows = [...elements.list.children];
  const row =
    rows.find((item) => item.dataset.id === taskId) ||
    rows[Math.min(previousIndex, rows.length - 1)];

  if (row) {
    row.querySelector(selector).focus();
  } else {
    elements.input.focus();
  }
}

function addTask(event) {
  event.preventDefault();

  const title = elements.input.value.trim();

  if (!title) {
    elements.input.setCustomValidity("Напиши название задачи.");
    elements.input.reportValidity();
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    priority: elements.priority.value,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(task);

  // Новая задача должна сразу появиться, даже если открыт другой фильтр.
  currentFilter = "all";
  searchQuery = "";
  elements.search.value = "";

  elements.form.reset();
  render(task.id);

  if (saveTasks()) showToast("Задача добавлена");

  elements.input.focus();
}

function toggleTask(taskId, previousIndex) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task) return;

  task.completed = !task.completed;

  render();
  saveTasks();
  focusTaskControl(taskId, ".task-checkbox", previousIndex);
}

function removeTask(taskId, previousIndex) {
  const index = tasks.findIndex((task) => task.id === taskId);

  if (index === -1) return;

  const [task] = tasks.splice(index, 1);
  deletedTask = { task, index };

  render();

  if (saveTasks()) showToast("Задача удалена", true);

  focusTaskControl(taskId, ".delete-button", previousIndex);
}

function undoDelete() {
  if (!deletedTask) return;

  const { task, index } = deletedTask;

  tasks.splice(Math.min(index, tasks.length), 0, task);
  deletedTask = null;

  // Показываем восстановленную задачу независимо от текущего поиска.
  currentFilter = "all";
  searchQuery = "";
  elements.search.value = "";

  render(task.id);

  if (saveTasks()) showToast("Задача восстановлена");

  focusTaskControl(task.id, ".task-checkbox");
}

function startEditing(row, task) {
  if (row.querySelector(".edit-input")) return;

  const titleElement = row.querySelector(".task-title");
  const input = document.createElement("input");

  input.className = "edit-input";
  input.type = "text";
  input.value = task.title;
  input.maxLength = 180;
  input.setAttribute("aria-label", "Новое название задачи");
  input.title = "Enter — сохранить, Escape — отменить";

  titleElement.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;

  function finishEditing(shouldSave, restoreFocus) {
    if (finished) return;
    finished = true;

    const title = input.value.trim();
    const changed = shouldSave && title && title !== task.title;

    if (changed) task.title = title;

    const replacement = document.createElement("span");
    replacement.className = "task-title";
    replacement.textContent = task.title;

    input.replaceWith(replacement);

    // При уходе фокуса не перестраиваем весь список:
    // это позволяет нажать соседнюю кнопку с первого раза.
    row.querySelector(".task-checkbox").setAttribute(
      "aria-label",
      `${task.completed ? "Вернуть в работу" : "Выполнить"}: ${task.title}`
    );
    row.querySelector(".edit-button").setAttribute(
      "aria-label",
      `Редактировать: ${task.title}`
    );
    row.querySelector(".delete-button").setAttribute(
      "aria-label",
      `Удалить: ${task.title}`
    );

    if (changed && saveTasks()) showToast("Название обновлено");

    if (restoreFocus) {
      render();
      focusTaskControl(task.id, ".edit-button");
    }
  }

  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      finishEditing(true, true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finishEditing(false, true);
    }
  });

  input.addEventListener("blur", () => {
    finishEditing(true, false);
  });
}

elements.form.addEventListener("submit", addTask);

elements.input.addEventListener("input", () => {
  elements.input.setCustomValidity("");
});

elements.filters.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

elements.search.addEventListener("input", (event) => {
  searchQuery = event.target.value.trim().toLocaleLowerCase("ru-RU");
  render();
});

elements.list.addEventListener("change", (event) => {
  if (!event.target.matches(".task-checkbox")) return;

  const row = event.target.closest(".task-row");
  const index = [...elements.list.children].indexOf(row);

  toggleTask(row.dataset.id, index);
});

elements.list.addEventListener("click", (event) => {
  const row = event.target.closest(".task-row");

  if (!row) return;

  const task = tasks.find((item) => item.id === row.dataset.id);
  if (!task) return;

  const index = [...elements.list.children].indexOf(row);

  if (event.target.closest(".delete-button")) {
    removeTask(task.id, index);
  }

  if (event.target.closest(".edit-button")) {
    startEditing(row, task);
  }
});

elements.undoButton.addEventListener("click", undoDelete);

const today = new Date();
const timeElement = document.querySelector("#today");

timeElement.dateTime = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

timeElement.textContent = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
}).format(today);

tasks = loadTasks();
render();

if (loadWarning) showToast(loadWarning);