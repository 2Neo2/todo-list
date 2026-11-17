import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks, filterTasks } from "./tasks.ts";
const task = {
  id: "1",
  title: "Подготовить проект",
  completed: false,
  priority: "high" as const,
  createdAt: "2026-11-17T10:00:00.000Z",
};
test("saved tasks round trip without losing state", () =>
  assert.deepEqual(
    parseTasks(
      JSON.stringify(
        [task, { ...task, id: "2", completed: true }].map((t) => t),
      ),
    ),
    [task, { ...task, id: "2", completed: true }],
  ));
test("first launch is empty", () => assert.deepEqual(parseTasks(null), []));
test("corrupt data is rejected rather than silently erased", () => {
  for (const raw of [
    "{",
    "{}",
    JSON.stringify([{ ...task, completed: "yes" }]),
    JSON.stringify([task, task]),
    JSON.stringify([{ ...task, createdAt: "bad" }]),
  ])
    assert.throws(() => parseTasks(raw));
});
test("search and status filter compose", () => {
  const data = [
    task,
    { ...task, id: "2", title: "Купить книгу", completed: true },
  ];
  assert.equal(filterTasks(data, "active", " ПРОЕКТ ").length, 1);
  assert.equal(filterTasks(data, "completed", "проект").length, 0);
  assert.equal(filterTasks(data, "completed", "КНИГУ").length, 1);
});
