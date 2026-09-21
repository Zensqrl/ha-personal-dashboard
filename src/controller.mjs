import { DEFAULTS, dayKey, bounds, unpack } from "./model.mjs";
const controllers = new WeakMap();
export function getController(hass, config) {
  let map = controllers.get(hass.connection);
  if (!map) {
    map = new Map();
    controllers.set(hass.connection, map);
  }
  const { type, grid_options, ...options } = config;
  const key = JSON.stringify(
    Object.fromEntries(
      Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
  if (!map.has(key)) map.set(key, new Controller(hass, options));
  return map.get(key);
}
export class Controller {
  constructor(hass, config) {
    this.hass = hass;
    this.cfg = {
      ...DEFAULTS,
      ...config,
      labels: { ...DEFAULTS.labels, ...config.labels },
    };
    this.cache = {};
    this.listeners = new Set();
    this.timer = null;
    this.busy = false;
    this.refresh = () => this.poll();
    this.visibility = () => {
      if (!document.hidden) this.poll(true);
    };
  }
  subscribe(fn) {
    this.listeners.add(fn);
    if (this.listeners.size === 1) {
      this.timer = setInterval(() => this.poll(), 60000);
      document.addEventListener("visibilitychange", this.visibility);
      this.poll();
    }
    fn();
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size) {
        clearInterval(this.timer);
        document.removeEventListener("visibilitychange", this.visibility);
      }
    };
  }
  emit() {
    for (const fn of this.listeners) fn();
  }
  async read(key, fn, day) {
    let timer;
    try {
      const data = await Promise.race([
        fn(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("Timed out")), 30000);
          timer.unref?.();
        }),
      ]);
      this.cache[key] = { data, ok: true, at: Date.now(), day, failures: 0 };
    } catch {
      this.cache[key] = {
        ...this.cache[key],
        ok: false,
        at: Date.now(),
        day,
        failures: (this.cache[key]?.failures ?? 0) + 1,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  async poll(force = false) {
    if (this.busy || !this.listeners.size || document.hidden) return;
    this.busy = true;
    const now = Date.now(),
      zone = this.hass.config.time_zone,
      day = dayKey(now, zone),
      b = bounds(now, zone, this.cfg);
    const needs = (key, ttl) =>
      !this.cache[key] ||
      this.cache[key].day !== day ||
      now - this.cache[key].at >=
        (this.cache[key].failures
          ? Math.min(900000, 60000 * 2 ** (this.cache[key].failures - 1))
          : force
            ? 10000
            : ttl);
    const jobs = [];
    if (needs("tasks", 300000))
      jobs.push(
        this.read(
          "tasks",
          async () => {
            const r = await this.hass.callWS({
              type: "todoist_enhanced/tasks",
            });
            if (
              !r ||
              r.contract_version !== 1 ||
              (r.tasks !== null && !Array.isArray(r.tasks))
            )
              throw Error("Invalid task response");
            return r;
          },
          day,
        ),
      );
    if (needs("calendar", 300000))
      jobs.push(
        this.read(
          "calendar",
          async () => {
            const r = await this.hass.callApi(
              "GET",
              `calendars/${encodeURIComponent(this.cfg.calendar)}?start=${encodeURIComponent(new Date(b.midnight).toISOString())}&end=${encodeURIComponent(new Date(b.next).toISOString())}`,
            );
            if (!Array.isArray(r) || r.some((e) => !e || typeof e !== "object"))
              throw Error("Invalid calendar response");
            return r;
          },
          day,
        ),
      );
    if (needs("weather", 1800000))
      jobs.push(
        this.read(
          "weather",
          async () => {
            const r = await this.hass.callWS({
              type: "call_service",
              domain: "weather",
              service: "get_forecasts",
              target: { entity_id: this.cfg.weather },
              service_data: { type: "hourly" },
              return_response: true,
            });
            const forecast = (r.response ?? r.service_response)?.[
              this.cfg.weather
            ]?.forecast;
            if (!Array.isArray(forecast)) throw Error("Invalid forecast");
            return forecast
              .filter((f) => f && Number.isFinite(Date.parse(f.datetime)))
              .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
          },
          day,
        ),
      );
    if (needs("nutrition", 60000))
      jobs.push(
        this.read(
          "nutrition",
          async () => {
            if (
              !this.hass.user?.is_admin ||
              !/^mcp-[a-z0-9]+$/i.test(this.cfg.nutrition_api ?? "")
            )
              throw Error("Admin nutrition access required");
            const raw = await this.hass.callApi(
              "POST",
              `mcp/${this.cfg.nutrition_api}`,
              {
                jsonrpc: "2.0",
                id: now,
                method: "tools/call",
                params: { name: "fitness_get_day", arguments: { day } },
              },
              { Accept: "application/json" },
            );
            const d = unpack(raw);
            return {
              status: d.status,
              stale: d.stale,
              day: d.day,
              retrieved_at: d.retrieved_at,
              refresh_queued: d.refresh_queued,
              data: { day: d.data?.day, nutrition: d.data?.nutrition },
            };
          },
          day,
        ),
      );
    await Promise.allSettled(jobs);
    this.busy = false;
    this.emit();
  }
}
