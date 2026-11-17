import { test } from "node:test";
import assert from "node:assert/strict";
import { dateKey, fromKey, validDate, monthDays } from "./calendar.ts";
import { parseTasks } from "./tasks.ts";
test("calendar starts Monday and includes leap day", () => {
  const days = monthDays(new Date(2024, 1, 1));
  assert.equal(days[0].getDay(), 1);
  assert.equal(days.length % 7, 0);
  assert.ok(days.some((d) => dateKey(d) === "2024-02-29"));
});
test("December calendar includes next year", () => {
  assert.ok(
    monthDays(new Date(2026, 11, 1)).some((d) => dateKey(d) === "2027-01-01"),
  );
});
test("date parsing uses local date and rejects impossible dates", () => {
  assert.equal(dateKey(fromKey("2026-12-31")), "2026-12-31");
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-13-01"), false);
});
test("legacy tasks remain unscheduled and dates survive storage", () => {
  const old = {
    id: "1",
    title: "Task",
    priority: "normal",
    completed: false,
    createdAt: "2026-11-17T12:00:00Z",
  };
  assert.equal(parseTasks(JSON.stringify([old]))[0].dueDate, undefined);
  assert.equal(
    parseTasks(JSON.stringify([{ ...old, dueDate: "2026-12-17" }]))[0].dueDate,
    "2026-12-17",
  );
  assert.throws(() =>
    parseTasks(JSON.stringify([{ ...old, dueDate: "2026-02-30" }])),
  );
});
