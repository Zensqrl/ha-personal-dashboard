export const VERSION = "0.1.0";
export const DEFAULTS = Object.freeze({
  calendar: null,
  weather: "weather.pirateweather",
  start_hour: 8,
  end_hour: 21,
  rain_probability: 30,
  min_temp_c: 10,
  max_temp_c: 30,
  max_wind_kmh: 30,
  training_minutes: 30,
  buffer_minutes: 10,
  garmin_max_age_minutes: 120,
  contexts: [],
  labels: {
    outdoor: ["outdoor", "outside"],
    indoor: ["indoor", "indoors"],
    dry: ["dry"],
    daylight: ["daylight"],
    physical: ["physical", "high-physical"],
    focus: ["focus", "high-focus"],
  },
});
export const number = (x) =>
  (typeof x === "number" || (typeof x === "string" && x.trim() !== "")) &&
  Number.isFinite(Number(x))
    ? Number(x)
    : null;
export function dayKey(time, zone) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(time));
  return ["year", "month", "day"]
    .map((k) => p.find((x) => x.type === k).value)
    .join("-");
}
// Resolve a wall clock by enumerating possible offsets; reject DST gaps and folds.
export function wallTime(date, time, zone) {
  const target = `${date}T${time.length === 5 ? time + ":00" : time}`;
  const naive = Date.parse(target + "Z");
  if (!Number.isFinite(naive)) return null;
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const found = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const t = naive + offset * 60000;
    if (fmt.format(new Date(t)).replace(" ", "T") === target) found.push(t);
  }
  return found.length === 1 ? found[0] : null;
}
export function instant(value, zone) {
  if (!value) return null;
  const s = typeof value === "string" ? value : (value.dateTime ?? value.date);
  if (!s || /^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  if (/(?:Z|[+-]\d{2}:\d{2})$/i.test(s))
    return Number.isFinite(Date.parse(s)) ? Date.parse(s) : null;
  return wallTime(s.slice(0, 10), s.slice(11, 19), zone);
}
export function nextDay(date) {
  return new Date(Date.parse(date + "T12:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
}
export function bounds(now, zone, cfg) {
  const day = dayKey(now, zone);
  return {
    day,
    from: wallTime(day, `${String(cfg.start_hour).padStart(2, "0")}:00`, zone),
    to: wallTime(day, `${String(cfg.end_hour).padStart(2, "0")}:00`, zone),
    midnight: wallTime(day, "00:00", zone),
    next: wallTime(nextDay(day), "00:00", zone),
  };
}
export function schedule(events, from, to, zone) {
  const busy = [],
    allDay = [];
  let uncertain = false;
  for (const e of events) {
    const raw =
      typeof e.start === "object"
        ? (e.start.date ?? e.start.dateTime)
        : e.start;
    const transparent = e.transparency === "transparent" || e.busy === false;
    if (e.status === "cancelled" || transparent) continue;
    if (e.all_day || /^\d{4}-\d{2}-\d{2}$/.test(raw ?? "")) {
      allDay.push(e);
      if (e.transparency === "opaque" || e.busy === true)
        busy.push({ start: from, end: to });
      else uncertain = true;
      continue;
    }
    const start = instant(e.start, zone),
      end = instant(e.end, zone);
    if (start === null || end === null || end <= start) {
      uncertain = true;
      continue;
    }
    if (start < to && end > from)
      busy.push({ start: Math.max(from, start), end: Math.min(to, end) });
  }
  busy.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const b of busy) {
    const last = merged.at(-1);
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }
  const free = [];
  let cursor = from;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) free.push({ start: cursor, end: to });
  return { busy: merged, free: uncertain ? [] : free, allDay, uncertain };
}
export function garmin(states, key, now, zone, cfg) {
  const s = states[`sensor.garmin_connect_${key}`],
    p = s?.attributes?.data_provenance;
  const value = number(s?.state);
  const age = now - Date.parse(p?.fetched_at);
  const fresh =
    !!p &&
    ["ok", "success"].includes(p.latest_outcome ?? p.outcome) &&
    !p.retained &&
    p.coordinator_available !== false &&
    p.source_date === dayKey(now, zone) &&
    age >= 0 &&
    age <= cfg.garmin_max_age_minutes * 60000;
  return {
    value,
    text: s?.state,
    unit: s?.attributes?.unit_of_measurement ?? "",
    fresh,
    sourceDate: p?.source_date,
    at: p?.fetched_at,
    reason: !s
      ? "Not available"
      : !fresh
        ? "Older or unverified observation"
        : "Current source data",
  };
}
export function recovery(g) {
  const keys = [
    "body_battery",
    "sleep_score",
    "hrv_last_night_average",
    "hrv_balanced_range_lower",
    "hrv_balanced_range_upper",
  ];
  const ready = keys.every((k) => g[k]?.fresh && g[k].value !== null);
  if (!ready)
    return {
      title: "Check your signals",
      effort: "Uncertain",
      tone: "muted",
      training: "Easy movement",
      reasons: [
        "Recovery inputs are missing, older or unverified; effort guidance is limited.",
      ],
    };
  const reasons = [];
  if (g.body_battery.value < 35) reasons.push("Body Battery is below 35");
  if (g.sleep_score.value < 60) reasons.push("Sleep score is below 60");
  if (g.hrv_last_night_average.value < g.hrv_balanced_range_lower.value)
    reasons.push("HRV is below your Garmin balanced range");
  if (g.hrv_last_night_average.value > g.hrv_balanced_range_upper.value)
    reasons.push("HRV is above your Garmin balanced range");
  if (
    g.training_readiness?.fresh &&
    g.training_readiness.value !== null &&
    g.training_readiness.value < 40
  )
    reasons.push("Training readiness is below 40");
  if (g.recovery_time?.fresh && g.recovery_time.value > 0)
    reasons.push("Garmin reports recovery time remaining");
  return reasons.length
    ? {
        title: "Make room for recovery",
        effort: "Low effort",
        tone: "amber",
        training: "Easy walk / mobility",
        reasons,
      }
    : {
        title: "Capacity for a steady day",
        effort: "Moderate effort",
        tone: "teal",
        training: "Easy / base session",
        reasons: [
          "Body Battery, sleep and HRV support a steady day",
          "Easy training is a dashboard policy suggestion, not a load-focus deficit diagnosis",
        ],
      };
}
export function unpack(value) {
  for (let i = 0; i < 8; i++) {
    if (!value || typeof value !== "object" || value.error || value.isError)
      throw Error("Read failed");
    if (value.jsonrpc) {
      value = value.result;
      continue;
    }
    if (value.structuredContent) {
      value = value.structuredContent;
      continue;
    }
    if (Array.isArray(value.content)) {
      value = JSON.parse(
        value.content.find((x) => x.type === "text")?.text ?? "null",
      );
      continue;
    }
    return value;
  }
  throw Error("Invalid response");
}
export function nutrition(data, day, now) {
  const n = data?.data?.nutrition ?? {},
    totals = n.nutrients ?? {},
    goals = n.goals ?? {};
  const rows = [
    ["Calories", "calories", "calories", "kcal"],
    ["Protein", "protein", "protein", "g"],
    ["Carbs", "carbohydrates", "carbs", "g"],
    ["Fat", "fat", "fat", "g"],
  ].map(([label, key, alias, unit]) => {
    const t = number(totals[key] ?? totals[alias] ?? n[alias]),
      g = number(
        goals[key] ??
          goals[alias] ??
          (key === "calories" ? n.goal_calories : null),
      );
    return {
      label,
      unit,
      total: t !== null && t >= 0 ? t : null,
      target: g !== null && g >= 0 ? g : null,
    };
  });
  const age = now - Date.parse(data?.retrieved_at),
    date = data?.data?.day ?? data?.day;
  const fresh =
    data?.status === "cached" &&
    data.stale === false &&
    date === day &&
    age >= 0 &&
    age <= 900000;
  return {
    rows,
    date,
    at: data?.retrieved_at,
    fresh,
    complete: rows.every((r) => r.total !== null && r.target !== null),
    queued: !!data?.refresh_queued,
  };
}
export function weatherWindow(
  forecasts,
  start,
  end,
  attrs,
  cfg,
  { dry = false, temperature = false, wind = false } = {},
) {
  let cursor = start;
  for (const f of forecasts) {
    const a = Date.parse(f.datetime),
      b = a + 3600000;
    if (b <= cursor || a >= end) continue;
    if (a > cursor + 1000) return { ok: false, reason: "Forecast gap" };
    const p = number(f.precipitation_probability),
      rain = number(f.precipitation),
      t = number(f.temperature),
      w = number(f.wind_speed);
    const c =
      t === null
        ? null
        : attrs.temperature_unit === "°F"
          ? ((t - 32) * 5) / 9
          : attrs.temperature_unit === "°C"
            ? t
            : null;
    const km =
      w === null
        ? null
        : attrs.wind_speed_unit === "mph"
          ? w * 1.609344
          : attrs.wind_speed_unit === "m/s"
            ? w * 3.6
            : attrs.wind_speed_unit === "km/h"
              ? w
              : null;
    if (dry && (p === null || rain === null))
      return { ok: false, reason: "Rain forecast incomplete" };
    if (dry && (p >= cfg.rain_probability || rain > 0))
      return { ok: false, reason: "Rain risk in this window" };
    if (temperature && (c === null || c < cfg.min_temp_c || c > cfg.max_temp_c))
      return {
        ok: false,
        reason:
          c === null
            ? "Temperature unknown"
            : "Temperature outside preferred range",
      };
    if (wind && (km === null || km > cfg.max_wind_kmh))
      return {
        ok: false,
        reason: km === null ? "Wind unknown" : "Wind above preferred limit",
      };
    cursor = Math.max(cursor, b);
    if (cursor >= end) return { ok: true, reason: "Forecast fits this window" };
  }
  return { ok: false, reason: "Forecast coverage unknown" };
}
export function daylight(states, start, end, now) {
  const s = states["sun.sun"];
  if (!s || !["above_horizon", "below_horizon"].includes(s.state)) return false;
  const rise = Date.parse(s.attributes.next_rising),
    set = Date.parse(s.attributes.next_setting);
  const from = s.state === "above_horizon" ? now : rise;
  return (
    Number.isFinite(from) && Number.isFinite(set) && start >= from && end <= set
  );
}
export function duration(task) {
  const d = task.effective_duration;
  const n = number(d?.amount);
  if (n === null || n <= 0) return null;
  return ["minute", "minutes"].includes(d.unit)
    ? n
    : ["hour", "hours"].includes(d.unit)
      ? n * 60
      : ["day", "days"].includes(d.unit)
        ? n * 1440
        : null;
}
export function rankTasks(tasks, free, context) {
  const { cfg, now, zone, forecast, weatherAttrs, states, rec } = context;
  const today = dayKey(now, zone);
  return tasks
    .filter((t) => !t.is_completed && !t.is_uncompletable)
    .map((t) => {
      const labels = (t.labels ?? []).map((x) => x.toLowerCase());
      const has = (k) =>
        (cfg.labels[k] ?? []).some((x) => labels.includes(x.toLowerCase()));
      const mins = duration(t);
      const reasons = [];
      const requiredContexts = labels
        .filter((x) => x.startsWith("context:"))
        .map((x) => x.slice(8));
      const contextOk = requiredContexts.every((x) =>
        (cfg.contexts ?? []).map((c) => c.toLowerCase()).includes(x),
      );
      const minimums = labels
        .map((x) => /^min-temp:(-?\d+(?:\.\d+)?)(c|f)$/.exec(x))
        .filter(Boolean)
        .map((x) =>
          x[2] === "f" ? ((Number(x[1]) - 32) * 5) / 9 : Number(x[1]),
        );
      const taskWeather = {
        ...cfg,
        min_temp_c: Math.max(cfg.min_temp_c, ...minimums),
      };
      if (has("focus"))
        reasons.push("Focus required; capacity is self-assessed");
      const timed = t.due?.kind === "datetime";
      const dueAt = timed
        ? instant(t.due.datetime, t.due.effective_timezone ?? zone)
        : null;
      const dueDate = t.due?.date ?? null,
        deadline = t.deadline?.date;
      const overdue =
        (timed && dueAt !== null ? dueAt < now : dueDate && dueDate < today) ||
        (deadline && deadline < today);
      const dueToday = dueDate === today || deadline === today;
      let score =
        (overdue ? 1000 : dueToday ? 500 : 0) + (number(t.priority) ?? 0) * 30;
      if (overdue) reasons.push("Overdue");
      else if (dueToday) reasons.push("Due today");
      else reasons.push(dueDate ? "Due " + dueDate : "No due date");
      if (timed && dueAt === null) reasons.push("Due time is ambiguous");
      let block = null,
        why =
          mins === null
            ? "Duration unknown"
            : free.length
              ? "No suitable block"
              : "Availability unconfirmed or no free blocks";
      const conflict = has("outdoor") && has("indoor");
      if (conflict) why = "Conflicting context labels";
      if (!contextOk) why = "Required context is not confirmed";
      if (mins !== null && !conflict && contextOk && !(timed && dueAt === null))
        for (const f of free) {
          const start = f.start + cfg.buffer_minutes * 60000,
            end = start + mins * 60000;
          if (end > f.end) continue;
          if (dueAt !== null && dueAt >= now && end > dueAt) {
            why = "Would finish after due time";
            continue;
          }
          if (has("physical") && rec.effort !== "Moderate effort") {
            why = "Physical effort needs stronger recovery signals";
            continue;
          }
          if (has("daylight") && !daylight(states, start, end, now)) {
            why = "Daylight not confirmed";
            continue;
          }
          if (has("outdoor") || has("dry") || minimums.length) {
            const w = weatherWindow(
              forecast,
              start,
              end,
              weatherAttrs,
              taskWeather,
              {
                dry: has("dry"),
                temperature: has("outdoor") || minimums.length > 0,
                wind: has("outdoor"),
              },
            );
            if (!w.ok) {
              why = w.reason;
              continue;
            }
          }
          block = { start, end, freeStart: f.start };
          why = "Fits a free block";
          break;
        }
      if (block) score += 20;
      reasons.push(why);
      if (
        !labels.some((x) =>
          Object.values(cfg.labels)
            .flat()
            .map((v) => v.toLowerCase())
            .includes(x),
        )
      )
        reasons.push("Other suitability not specified");
      return {
        task: t,
        minutes: mins,
        block,
        reasons,
        score,
        labels,
        tone: block ? "teal" : "muted",
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || String(a.task.id).localeCompare(String(b.task.id)),
    );
}
export function buildModel(hass, cache, cfg, now = Date.now()) {
  const zone = hass.config?.time_zone ?? "UTC",
    states = hass.states ?? {},
    b = bounds(now, zone, cfg),
    start = Math.max(now, b.from);
  const g = {};
  for (const key of [
    "body_battery",
    "sleep_score",
    "hrv_last_night_average",
    "hrv_balanced_range_lower",
    "hrv_balanced_range_upper",
    "resting_heart_rate",
    "steps",
    "daily_step_goal",
    "acute_training_load",
    "chronic_training_load",
    "training_load_ratio",
    "training_readiness",
    "recovery_time",
  ])
    g[key] = garmin(states, key, now, zone, cfg);
  const rec = recovery(g);
  const cal =
    cache.calendar?.ok &&
    cache.calendar.day === b.day &&
    now - cache.calendar.at < 600000;
  const sc =
    cal && start < b.to
      ? schedule(cache.calendar.data, start, b.to, zone)
      : { free: [], busy: [], allDay: [], uncertain: false };
  const te = cache.tasks?.data;
  const taskOk =
    cache.tasks?.ok &&
    now - cache.tasks.at < 600000 &&
    te?.outcome === "success" &&
    te.complete === true &&
    te.stale === false &&
    te.enrichment_complete === true &&
    te.metadata?.stale === false &&
    te.metadata?.complete === true &&
    te.metadata?.outcome === "success";
  const forecast =
    cache.weather?.ok && now - cache.weather.at < 7200000
      ? cache.weather.data
      : [];
  const weatherAttrs = ["unknown", "unavailable"].includes(
    states[cfg.weather]?.state,
  )
    ? {}
    : (states[cfg.weather]?.attributes ?? {});
  const ranked = taskOk
    ? rankTasks(te.tasks ?? [], sc.free, {
        cfg,
        now,
        zone,
        forecast,
        weatherAttrs,
        states,
        rec,
      })
    : [];
  const assignments = new Map(),
    used = new Set();
  for (const block of sc.free) {
    const candidates = taskOk
      ? rankTasks(te.tasks ?? [], [block], {
          cfg,
          now,
          zone,
          forecast,
          weatherAttrs,
          states,
          rec,
        })
      : [];
    const task = candidates.find((t) => t.block && !used.has(t.task.id));
    if (task) {
      assignments.set(block.start, task);
      used.add(task.task.id);
    }
  }
  let training = null;
  if (rec.effort !== "Uncertain")
    for (const block of sc.free) {
      if (assignments.has(block.start)) continue;
      const mins = Math.floor(
        Math.min(
          rec.effort === "Low effort" ? 15 : cfg.training_minutes,
          (block.end - block.start) / 60000 - cfg.buffer_minutes,
        ),
      );
      if (mins < 10) continue;
      const s = block.start + cfg.buffer_minutes * 60000,
        e = s + mins * 60000;
      const outside =
        daylight(states, s, e, now) &&
        weatherWindow(forecast, s, e, weatherAttrs, cfg, {
          dry: true,
          temperature: true,
          wind: true,
        }).ok;
      training = {
        start: s,
        end: e,
        minutes: mins,
        freeStart: block.start,
        title: rec.training,
        note: outside
          ? "Outdoor conditions fit the forecast"
          : "Indoor option · outdoor fit not confirmed",
      };
      break;
    }
  const n = nutrition(cache.nutrition?.data, b.day, now);
  if (!cache.nutrition?.ok) n.fresh = false;
  const tl =
    states["sensor.garmin_connect_body_battery_and_stress_timeline"]
      ?.attributes;
  const curve =
    tl?.calendar_date === b.day
      ? (tl.body_battery ?? []).filter(
          (p) =>
            Array.isArray(p) &&
            Number.isFinite(p[0]) &&
            number(p[1]) !== null &&
            p[1] >= 0 &&
            p[1] <= 100,
        )
      : [];
  return {
    now,
    zone,
    b,
    g,
    rec,
    cal,
    sc,
    taskOk,
    ranked,
    assignments,
    training,
    n,
    forecast,
    weatherAttrs,
    curve,
    events: cal ? cache.calendar.data : [],
    sources: {
      calendar: cal ? "Ready" : "Unavailable / refreshing",
      tasks: taskOk ? "Ready" : "Incomplete / older / unavailable",
      nutrition:
        n.fresh && n.complete
          ? "Ready"
          : n.date
            ? "Older / incomplete"
            : "Unavailable",
      weather: forecast.length ? "Ready" : "Unavailable / refreshing",
    },
    trainingMinutes: training?.minutes ?? 0,
  };
}
