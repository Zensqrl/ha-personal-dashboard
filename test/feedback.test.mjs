import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  buildModel,
  nutritionAge,
  garmin,
  taskStatus,
  dayKey,
} from "../src/model.mjs";
import { Controller, getController, readError } from "../src/controller.mjs";

globalThis.document = {
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
};
const now = Date.parse("2026-09-21T12:00:00Z");
const taskData = () => ({
  contract_version: 1,
  outcome: "success",
  complete: true,
  stale: false,
  enrichment_complete: true,
  metadata: { outcome: "success", complete: true, stale: false },
  tasks: [],
});

test("nutrition age bands have explicit boundaries and unknown time stays unknown", () => {
  for (const [mins, label] of [
    [0, "within 15 min"],
    [15, "within 15 min"],
    [15.01, ">15 min ago"],
    [29.99, ">15 min ago"],
    [30, ">30 min ago"],
    [59.99, ">30 min ago"],
    [60, ">1 hr ago"],
    [119.99, ">1 hr ago"],
    [120, ">2 hr ago"],
    [400, ">2 hr ago"],
  ])
    assert.equal(
      nutritionAge(new Date(now - mins * 60000).toISOString(), now),
      "Data checked " + label,
    );
  for (const at of [undefined, "invalid", new Date(now + 60000).toISOString()])
    assert.equal(nutritionAge(at, now), "Check time unknown");
});

test("Garmin fallback and retained readings are labeled and not current", () => {
  const p = {
    source_date: "2026-09-21",
    fetched_at: new Date(now).toISOString(),
    outcome: "ok",
  };
  const states = {
    "sensor.garmin_connect_steps": {
      state: "1000",
      attributes: { data_provenance: p },
    },
  };
  assert.equal(garmin(states, "steps", now, "UTC", DEFAULTS).fresh, true);
  p.fallback_used = true;
  assert.equal(
    garmin(states, "steps", now, "UTC", DEFAULTS).reason,
    "Fallback reading",
  );
  assert.equal(garmin(states, "steps", now, "UTC", DEFAULTS).fresh, false);
  p.retained = true;
  assert.equal(
    garmin(states, "steps", now, "UTC", DEFAULTS).reason,
    "Retained reading",
  );
});

test("task failures identify readiness predicates without exposing raw error text", () => {
  const e = { ok: true, at: now, data: taskData() };
  assert.equal(taskStatus(undefined, now).code, "loading");
  assert.equal(taskStatus(e, now).code, "ready");
  assert.equal(taskStatus(e, now + 600000).code, "old");
  e.data.metadata.stale = true;
  assert.equal(taskStatus(e, now).code, "stale");
  e.data.metadata.stale = false;
  e.data.enrichment_complete = false;
  assert.equal(taskStatus(e, now).code, "incomplete");
  for (const [error, category] of [
    [{ code: "unauthorized", message: "SECRET" }, "auth"],
    [{ code: "unknown_command" }, "unavailable"],
    [Error("Timed out"), "timeout"],
    [Error("Invalid task response"), "contract"],
    [Error("SECRET"), "connection"],
  ]) {
    assert.equal(readError(error), category);
    assert.ok(
      !taskStatus({ ok: false, error: category }, now).text.includes("SECRET"),
    );
  }
});

test("dismissals refill rankings and filter timeline, undo and next day reset", () => {
  const hass = { connection: {}, config: { time_zone: "UTC" }, states: {} };
  const c = new Controller(hass, {}),
    other = new Controller(hass, { end_hour: 22 });
  const tasks = ["a", "b", "c", "d"].map((id) => ({
    id,
    content: id,
    priority: 1,
    effective_duration: { amount: 30, unit: "minutes" },
  }));
  const cache = {
    tasks: { ok: true, at: now, data: { ...taskData(), tasks } },
    calendar: { ok: true, at: now, day: "2026-09-21", data: [] },
  };
  c.dismiss("a");
  assert.ok(other.dismissed().has("a"));
  let m = buildModel(hass, cache, DEFAULTS, now, c.session.dismissed);
  assert.deepEqual(
    m.ranked.slice(0, 3).map((x) => x.task.id),
    ["b", "c", "d"],
  );
  assert.ok([...m.assignments.values()].every((x) => x.task.id !== "a"));
  c.undoDismiss();
  m = buildModel(hass, cache, DEFAULTS, now, c.session.dismissed);
  assert.equal(m.ranked[0].task.id, "a");
  c.dismiss("a");
  assert.equal(c.dismissed(Date.now() + 86400000).size, 0);
  assert.deepEqual(
    tasks.map((t) => t.id),
    ["a", "b", "c", "d"],
  );
});

test("time-zone visibility is a card option and does not split controllers", () => {
  const hass = { connection: {}, config: { time_zone: "UTC" } };
  assert.equal(
    getController(hass, { show_time_zone: true }),
    getController(hass, { show_time_zone: false }),
  );
  assert.equal(DEFAULTS.show_time_zone, false);
});

test("manual refresh reports progress, cooldown and partial failure and keeps successful-read time", async () => {
  let fail = false;
  const hass = {
    connection: {},
    config: { time_zone: "UTC" },
    user: { is_admin: true },
    callWS: async (r) => {
      if (fail) throw Error("Timed out");
      return r.type === "todoist_enhanced/tasks"
        ? taskData()
        : { response: { "weather.pirateweather": { forecast: [] } } };
    },
    callApi: async (_m, path) =>
      path.startsWith("calendars/")
        ? []
        : {
            status: "cached",
            stale: false,
            retrieved_at: new Date().toISOString(),
            data: {
              day: dayKey(Date.now(), "UTC"),
              nutrition: {
                nutrients: {
                  calories: 0,
                  protein: 0,
                  carbohydrates: 0,
                  fat: 0,
                },
                goals: {
                  calories: 2000,
                  protein: 100,
                  carbohydrates: 200,
                  fat: 70,
                },
              },
            },
          },
  };
  const c = new Controller(hass, { nutrition_api: "mcp-test" });
  const states = [];
  c.listeners.add(() => states.push(c.refreshState.kind));
  await c.poll(true);
  assert.ok(states.includes("checking"));
  assert.equal(c.refreshState.kind, "success");
  await c.poll(true);
  assert.equal(c.refreshState.kind, "cooldown");
  const last = c.cache.tasks.lastSuccessAt;
  for (const e of Object.values(c.cache)) e.at -= 20000;
  fail = true;
  await c.poll(true);
  assert.equal(c.refreshState.kind, "partial");
  assert.equal(c.cache.tasks.lastSuccessAt, last);
  assert.match(c.refreshState.text, /Todoist tasks/);
  await c.poll(true);
  assert.match(c.refreshState.text, /Retry waiting/);
});
