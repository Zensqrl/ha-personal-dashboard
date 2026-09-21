import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  wallTime,
  dayKey,
  schedule,
  nutrition,
  weatherWindow,
  rankTasks,
  recovery,
  garmin,
  duration,
  buildModel,
} from "../src/model.mjs";
const zone = "America/New_York",
  now = Date.parse("2026-09-21T12:00:00Z");
test("DST gaps and folds are rejected; ordinary HA-local times resolve", () => {
  assert.equal(wallTime("2026-03-08", "02:30", zone), null);
  assert.equal(wallTime("2026-11-01", "01:30", zone), null);
  assert.equal(wallTime("2026-09-21", "08:00", zone), now);
  assert.equal(dayKey(Date.parse("2026-09-22T02:00:00Z"), zone), "2026-09-21");
});
test("overlapping meetings merge, transparent events do not block", () => {
  const start = now,
    end = now + 4 * 3600000;
  const e = (a, b, extra = {}) => ({
    start: new Date(now + a * 3600000).toISOString(),
    end: new Date(now + b * 3600000).toISOString(),
    ...extra,
  });
  const s = schedule(
    [e(1, 2), e(1.5, 3), e(0, 0.5, { transparency: "transparent" })],
    start,
    end,
    zone,
  );
  assert.deepEqual(s.free, [
    { start, end: now + 3600000 },
    { start: now + 3 * 3600000, end },
  ]);
});
test("all-day unknown is uncertainty, failed time is not free", () => {
  assert.equal(
    schedule(
      [{ start: { date: "2026-09-21" }, end: { date: "2026-09-22" } }],
      now,
      now + 3600000,
      zone,
    ).free.length,
    0,
  );
  assert.equal(
    schedule([{ start: "invalid", end: "invalid" }], now, now + 3600000, zone)
      .uncertain,
    true,
  );
});
test("nutrition distinguishes zero, absent, stale, and old day", () => {
  const d = {
    status: "cached",
    stale: false,
    retrieved_at: new Date(now).toISOString(),
    data: {
      day: "2026-09-21",
      nutrition: {
        nutrients: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
        goals: { calories: 2000, protein: 100, carbohydrates: 200, fat: 70 },
      },
    },
  };
  assert.equal(nutrition(d, "2026-09-21", now).complete, true);
  assert.equal(nutrition(d, "2026-09-22", now).fresh, false);
  assert.equal(nutrition(d, "2026-09-21", now + 901000).fresh, false);
  delete d.data.nutrition.nutrients.fat;
  assert.equal(nutrition(d, "2026-09-21", now).rows[3].total, null);
});
test("forecast must cover entire requested duration; zeros are valid", () => {
  const f = {
    datetime: new Date(now).toISOString(),
    precipitation_probability: 0,
    precipitation: 0,
    temperature: 70,
    wind_speed: 5,
  };
  const attrs = { temperature_unit: "°F", wind_speed_unit: "mph" };
  assert.equal(
    weatherWindow([f], now, now + 1800000, attrs, DEFAULTS, {
      dry: true,
      temperature: true,
      wind: true,
    }).ok,
    true,
  );
  assert.equal(
    weatherWindow([f], now, now + 7200000, attrs, DEFAULTS, { dry: true }).ok,
    false,
  );
  assert.equal(
    weatherWindow(
      [{ ...f, precipitation_probability: null }],
      now,
      now + 1800000,
      attrs,
      DEFAULTS,
      { dry: true },
    ).ok,
    false,
  );
});
test("unknown duration never receives a timeline slot; priority is not inverted", () => {
  const tasks = [
    { id: "a", content: "A", priority: 1, labels: [] },
    { id: "b", content: "B", priority: 4, labels: [] },
  ];
  const r = rankTasks(tasks, [{ start: now, end: now + 3600000 }], {
    cfg: DEFAULTS,
    now,
    zone,
    forecast: [],
    weatherAttrs: {},
    states: {},
    rec: { effort: "Moderate effort" },
  });
  assert.equal(r[0].task.id, "b");
  assert.equal(r[0].block, null);
  assert.equal(
    duration({ effective_duration: { amount: 1, unit: "hours" } }),
    60,
  );
});
test("dry-labelled task cannot fit when precipitation is unknown", () => {
  const r = rankTasks(
    [
      {
        id: "a",
        labels: ["dry"],
        effective_duration: { amount: 15, unit: "minutes" },
      },
    ],
    [{ start: now, end: now + 3600000 }],
    {
      cfg: DEFAULTS,
      now,
      zone,
      forecast: [],
      weatherAttrs: {},
      states: {},
      rec: { effort: "Moderate effort" },
    },
  );
  assert.equal(r[0].block, null);
});
test("retained or stale Garmin suppresses stronger recommendation", () => {
  const s = {
    "sensor.garmin_connect_body_battery": {
      state: "80",
      attributes: {
        data_provenance: {
          source_date: "2026-09-21",
          fetched_at: new Date(now).toISOString(),
          outcome: "ok",
          retained: true,
        },
      },
    },
  };
  assert.equal(garmin(s, "body_battery", now, zone, DEFAULTS).fresh, false);
  assert.equal(recovery({}).effort, "Uncertain");
});

test("task minimum temperatures and context requirements are enforced", () => {
  const ctx = {
    cfg: DEFAULTS,
    now,
    zone,
    forecast: [
      { datetime: new Date(now).toISOString(), temperature: 55, wind_speed: 1 },
    ],
    weatherAttrs: { temperature_unit: "°F", wind_speed_unit: "mph" },
    states: {},
    rec: { effort: "Moderate effort" },
  };
  const base = { id: "a", effective_duration: { amount: 15, unit: "minutes" } };
  const free = [{ start: now, end: now + 3600000 }];
  assert.equal(
    rankTasks([{ ...base, labels: ["min-temp:20c"] }], free, ctx)[0].block,
    null,
  );
  assert.equal(
    rankTasks([{ ...base, labels: ["context:office"] }], free, ctx)[0].block,
    null,
  );
  assert.ok(
    rankTasks([{ ...base, labels: ["context:office"] }], free, {
      ...ctx,
      cfg: { ...DEFAULTS, contexts: ["office"] },
    })[0].block,
  );
});

test("tentative allocation does not duplicate tasks and considers later blocks", () => {
  const clock = Date.parse("2026-09-21T12:00:00Z");
  const cache = {
    calendar: {
      ok: true,
      at: clock,
      day: "2026-09-21",
      data: [{ start: "2026-09-21T13:00:00Z", end: "2026-09-21T14:00:00Z" }],
    },
    tasks: {
      ok: true,
      at: clock,
      data: {
        contract_version: 1,
        outcome: "success",
        complete: true,
        stale: false,
        enrichment_complete: true,
        metadata: { outcome: "success", complete: true, stale: false },
        tasks: [
          {
            id: "a",
            labels: [],
            priority: 4,
            effective_duration: { amount: 20, unit: "minutes" },
          },
          {
            id: "b",
            labels: [],
            priority: 3,
            effective_duration: { amount: 20, unit: "minutes" },
          },
        ],
      },
    },
  };
  const m = buildModel(
    { states: {}, config: { time_zone: "UTC" } },
    cache,
    DEFAULTS,
    clock,
  );
  assert.deepEqual(
    [...m.assignments.values()].map((x) => x.task.id),
    ["a", "b"],
  );
  assert.equal(m.training, null);
});
