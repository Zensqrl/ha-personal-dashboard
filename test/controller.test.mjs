import test from "node:test";
import assert from "node:assert/strict";
import { getController, Controller } from "../src/controller.mjs";
import { dayKey, DEFAULTS, buildModel } from "../src/model.mjs";
globalThis.document = {
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
};
test("different card types share exactly one HA controller", () => {
  const hass = { connection: {} };
  assert.equal(
    getController(hass, {
      type: "custom:personal-signals",
      nutrition_api: "mcp-test",
    }),
    getController(hass, {
      nutrition_api: "mcp-test",
      type: "custom:personal-day-brief",
      grid_options: { columns: 12 },
    }),
  );
});
test("four read interfaces populate once; repeated reads reuse cache", async () => {
  const calls = [];
  const hass = {
    connection: {},
    user: { is_admin: true },
    config: { time_zone: "UTC" },
    callWS: async (req) => {
      calls.push(req.type);
      return req.type === "call_service"
        ? {
            response: {
              "weather.pirateweather": {
                forecast: [{ datetime: new Date().toISOString() }],
              },
            },
          }
        : {
            contract_version: 1,
            outcome: "success",
            complete: true,
            stale: false,
            metadata: { stale: false, complete: true, outcome: "success" },
            enrichment_complete: true,
            tasks: [],
          };
    },
    callApi: async (method, path) => {
      calls.push(path);
      return path.startsWith("calendars/")
        ? []
        : { status: "not_cached", day: dayKey(Date.now(), "UTC") };
    },
  };
  const c = new Controller(hass, { nutrition_api: "mcp-test" });
  c.listeners.add(() => {});
  await c.poll();
  assert.equal(calls.length, 4);
  assert.equal(c.cache.weather.data.length, 1);
  assert.equal(c.cache.calendar.ok, true);
  await c.poll();
  assert.equal(calls.length, 4);
});
test("failed task read does not become empty success and nutrition failures isolate", async () => {
  const c = new Controller({}, {});
  c.cache.tasks = { data: { tasks: [{ id: "a" }] }, ok: true };
  await c.read("tasks", () => Promise.reject(Error("offline")), "2026-09-21");
  assert.equal(c.cache.tasks.ok, false);
  assert.equal(c.cache.tasks.data.tasks.length, 1);
  assert.equal(c.cache.tasks.failures, 1);
});
test("stale metadata prevents task recommendations and failed calendar prevents free time", () => {
  const now = Date.parse("2026-09-21T16:00:00Z");
  const h = { states: {}, config: { time_zone: "UTC" } };
  const cache = {
    tasks: {
      ok: true,
      at: now,
      data: {
        contract_version: 1,
        outcome: "success",
        complete: true,
        stale: false,
        enrichment_complete: true,
        metadata: { stale: true },
        tasks: [{ id: "a" }],
      },
    },
    calendar: { ok: false, at: now, day: "2026-09-21", data: [] },
  };
  const m = buildModel(h, cache, DEFAULTS, now);
  assert.equal(m.taskOk, false);
  assert.equal(m.sc.free.length, 0);
  assert.equal(m.ranked.length, 0);
});
