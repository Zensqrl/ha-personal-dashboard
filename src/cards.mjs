import {
  VERSION,
  DEFAULTS,
  buildModel,
  instant,
  number,
  dayKey,
} from "./model.mjs";
import { getController } from "./controller.mjs";
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (x) =>
  x === null || x === undefined
    ? "—"
    : Number(x).toLocaleString(undefined, { maximumFractionDigits: 1 });
const time = (t, m) =>
  new Date(t).toLocaleTimeString(undefined, {
    timeZone: m.zone,
    hour: "numeric",
    minute: "2-digit",
  });
const icon = (name, cls = "") =>
  `<ha-icon class="${cls}" icon="mdi:${name}" aria-hidden="true"></ha-icon>`;
const pill = (text, tone = "") =>
  `<span class="pill ${tone}">${esc(text)}</span>`;
const CSS = `
ha-card{display:block}ha-icon{display:inline-flex;width:var(--mdc-icon-size,20px);height:var(--mdc-icon-size,20px);vertical-align:middle}ha-icon svg{width:100%;height:100%}
:host{display:block;color:#edf3f8;--ink:#edf3f8;--sub:#a7b7c8;--line:#304050;--teal:#77dfc0;--blue:#78b7ef;--amber:#efc477;font-family:var(--primary-font-family,system-ui,sans-serif)}
*{box-sizing:border-box}ha-card{background:linear-gradient(135deg,#1c2a35,#18232e);border:1px solid #2d3b48;border-radius:17px;color:var(--ink);box-shadow:0 5px 16px #0002;overflow:hidden}a{color:var(--blue);text-decoration:none}button,summary,a{touch-action:manipulation}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--teal);outline-offset:3px}button{border:0;background:none}button:disabled{opacity:.5;cursor:wait}h1,h2,h3,p{margin:0}h2{font-size:17px;line-height:1.3;display:flex;gap:9px;align-items:center}h3{font-size:15px}p{line-height:1.5}small,.sub{color:var(--sub);font-size:12px;line-height:1.5}.pad{padding:16px}.head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px}.head small{text-align:right}ha-icon{--mdc-icon-size:20px;color:var(--blue);flex-shrink:0}.orb{display:grid;place-items:center;width:43px;height:43px;border-radius:50%;background:#275345;color:var(--teal);flex-shrink:0}.orb ha-icon{--mdc-icon-size:27px;color:inherit}.orb.blue{background:#263f56;color:var(--blue)}.orb.amber{background:#4c402c;color:var(--amber)}.pill{display:inline-block;font-size:11px;line-height:1.4;border:1px solid #465768;border-radius:20px;padding:3px 8px;color:#bdcad5;white-space:normal}.teal{color:var(--teal)}.amber{color:var(--amber)}.pill.teal{background:#23463f;border-color:#38685b}.pill.amber{background:#443d2b;border-color:#665638}.muted{color:var(--sub)}.line{height:1px;background:var(--line);margin:13px 0}.stack{display:grid;gap:10px}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:9px}.metric{font-size:23px;font-weight:700;letter-spacing:-.4px}.metric small{font-size:12px;font-weight:400}.label{font-size:12px;color:var(--sub)}.metricbox{border:1px solid var(--line);background:#15222c;border-radius:11px;padding:11px;min-width:0}.metricbox .metric{font-size:21px}.hint{font-size:12px;color:var(--sub);line-height:1.5;margin-top:10px}.source{font-size:11px;color:var(--sub)}
.pagehead{display:flex;align-items:center;justify-content:space-between;margin:0 2px 15px}.brand{display:flex;align-items:center;gap:12px}.brand h1{font-size:22px;letter-spacing:-.4px}.brand ha-icon{--mdc-icon-size:27px;color:#dce9f3}.refresh{min-width:44px;min-height:44px;border-radius:50%;background:#263644}.hero-top{display:flex;align-items:center;gap:12px}.hero-top h2{font-size:24px;letter-spacing:-.5px}.eyebrow{font-size:10px;letter-spacing:1.7px;text-transform:uppercase;font-weight:700;color:var(--teal);margin-bottom:5px}.hero-title{flex:1}.reasons{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:8px}.reasons li{font-size:13px;display:flex;gap:10px;align-items:flex-start}.reasons ha-icon{--mdc-icon-size:17px;color:var(--sub)}summary{min-height:36px;cursor:pointer;font-size:12px;color:#b4c6d5;padding:8px 0}details p{font-size:13px;margin:8px 0;color:var(--sub)}.tiles{margin-top:10px}.tile{width:100%;text-align:left;padding:13px;display:flex;gap:10px;align-items:center;border:1px solid #2d3b48;border-radius:14px;background:#1b2a35;min-height:99px}.tile b{display:block;font-size:17px;margin:3px 0}.tile .orb{width:37px;height:37px}.tile .orb ha-icon{--mdc-icon-size:23px}.tile .chev{margin-left:auto;--mdc-icon-size:15px}.tile div:not(.orb){min-width:0}.tile small{font-size:11px}
.timeline{display:grid;gap:9px}.event{display:grid;grid-template-columns:65px 1fr;gap:13px;align-items:start}.clock{font-size:11px;color:var(--sub);text-align:right;padding-top:9px;white-space:nowrap}.slot{position:relative;padding:10px 12px;border:1px solid #354556;background:#23323f;border-radius:9px;min-width:0}.slot:before{content:'';position:absolute;width:8px;height:8px;border-radius:50%;left:-18px;top:13px;background:var(--blue);box-shadow:0 0 0 4px #1a2833}.slot:after{content:'';position:absolute;top:27px;bottom:-15px;left:-15px;border-left:1px solid #3b5262}.event:last-child .slot:after{display:none}.slot.free{background:#193a37;border-color:#30645b}.slot.free:before{background:var(--teal)}.slot.rain{background:#3c3525;border-color:#746037}.slot.rain:before{background:var(--amber)}.slot b{font-size:13px}.slot small{display:block}.proposal{margin-top:9px;padding:10px;background:#102d2e80;border:1px solid #386056;border-radius:7px}.proposal a{color:#e4f5ed}.task{border:1px solid var(--line);border-radius:11px;background:#182630;padding:13px;display:flex;gap:11px}.rank{width:26px;height:26px;background:#254a43;color:var(--teal);border-radius:50%;display:grid;place-items:center;font-size:12px;flex-shrink:0}.tasktitle{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.tasktitle a{font-size:14px;color:#edf3f8;font-weight:600;overflow-wrap:anywhere}.chips{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}.chips .pill{font-size:10px;padding:2px 6px}.taskbody{flex:1;min-width:0}.task p{font-size:12px;color:var(--sub)}.empty{padding:18px;border:1px dashed #445b6b;border-radius:10px;color:var(--sub);font-size:13px;line-height:1.6}.spark{width:100%;height:78px;display:block}.spark polyline{fill:none;stroke:var(--teal);stroke-width:2;vector-effect:non-scaling-stroke}.bar{height:7px;border-radius:9px;background:#354459;overflow:hidden;margin-top:8px}.bar>i{height:100%;display:block;background:var(--teal);border-radius:9px}.bar.blue>i{background:var(--blue)}.bar.amber>i{background:var(--amber)}.barlabel{display:flex;justify-content:space-between;gap:5px;font-size:12px}.barlabel strong{font-size:12px}.nutrient{padding:11px;background:#15232f;border:1px solid var(--line);border-radius:10px}.nav{display:flex;gap:4px;justify-content:space-around;background:#152330ed;backdrop-filter:blur(16px);border:1px solid #324657;border-radius:17px;padding:6px;position:fixed;bottom:max(10px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(510px,calc(100vw - 28px));z-index:5;box-shadow:0 6px 24px #0008}.nav button{display:grid;justify-items:center;align-content:center;gap:5px;font-size:10px;min-height:49px;flex:1;border-radius:11px}.nav button.active{background:#25445c;color:#bfe2ff}.nav ha-icon{color:inherit;--mdc-icon-size:21px}.navspace{height:78px}dialog{background:#14212c;color:var(--ink);border:1px solid #496170;border-radius:20px;width:min(560px,calc(100vw - 24px));max-height:85dvh;padding:20px;overflow:auto;box-shadow:0 20px 80px #0008}dialog::backdrop{background:#020b13aa;backdrop-filter:blur(3px)}.close{border:1px solid var(--line);border-radius:10px;min-height:44px;min-width:44px}.dialoghead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.report{display:grid;grid-template-columns:1fr auto;gap:9px;font-size:13px;padding:10px 0;border-bottom:1px solid var(--line)}.report small{grid-column:1/-1} .linkbutton{display:inline-block;border:1px solid #496170;border-radius:10px;padding:12px;margin-top:12px} @media(max-width:420px){.pad{padding:13px}.hero-top h2{font-size:20px}.hero-top{gap:9px;flex-wrap:wrap}.hero-top>.pill{margin-left:52px}.tile{padding:10px;gap:8px}.tile b{font-size:15px}.tile .orb{width:31px;height:31px}.tile .chev{display:none}.clock{font-size:10px}.event{grid-template-columns:53px 1fr;gap:12px}.pill{font-size:10px}}
`;
const safeLink = (t) =>
  /^https:\/\/(?:app\.todoist\.com|todoist\.com)\//.test(t.url ?? "")
    ? t.url
    : `https://app.todoist.com/app/task/${encodeURIComponent(t.id)}`;
const linkTask = (t) =>
  `<a href="${esc(safeLink(t))}" target="_blank" rel="noopener noreferrer">${esc(t.content)}</a>`;
function remaining(row) {
  if (!row || row.total === null || row.target === null)
    return "Target unavailable";
  const r = row.target - row.total;
  return `${fmt(Math.abs(r))}${row.unit === "g" ? "g" : " kcal"} ${r >= 0 ? "left" : "over target"}`;
}
function bars(m) {
  return `<div class="twocol">${m.n.rows.map((r, i) => `<div class="nutrient"><div class="barlabel"><span>${esc(r.label)}</span><strong>${fmt(r.total)} <span class="muted">/ ${fmt(r.target)} ${esc(r.unit)}</span></strong></div><div class="bar ${i === 1 ? "blue" : i === 3 ? "amber" : ""}" role="img" aria-label="${esc(r.label + " " + fmt(r.total) + " of " + fmt(r.target) + " " + r.unit)}"><i style="width:${r.total !== null && r.target > 0 ? Math.min(100, (r.total / r.target) * 100) : 0}%"></i></div><small>${esc(remaining(r))}</small></div>`).join("")}</div>`;
}
function metric(label, g) {
  return `<div class="metricbox"><div class="label">${esc(label)}</div><div class="metric">${fmt(g.value)} <small>${esc(g.unit)}</small></div><small class="${g.fresh ? "" : "amber"}">${g.fresh ? "Current" : esc(g.reason)}</small></div>`;
}
function spark(m) {
  if (m.curve.length < 2)
    return '<p class="hint">Today’s Body Battery samples are not available.</p>';
  const pts = m.curve.slice().sort((a, b) => a[0] - b[0]);
  const first = pts[0][0],
    last = pts.at(-1)[0];
  const groups = [];
  let group = [];
  for (const p of pts) {
    if (group.length && p[0] - group.at(-1)[0] > 600000) {
      groups.push(group);
      group = [];
    }
    group.push(p);
  }
  groups.push(group);
  return `<svg class="spark" viewBox="0 0 320 80" preserveAspectRatio="none" role="img" aria-label="Today's Body Battery samples; gaps are not interpolated">${groups.map((g) => `<polyline points="${g.map((p) => `${(((p[0] - first) / Math.max(1, last - first)) * 312 + 4).toFixed(1)},${(76 - p[1] * 0.7).toFixed(1)}`).join(" ")}"/>`).join("")}</svg><div class="barlabel muted"><span>${time(first, m)}</span><span>${time(last, m)} · samples end</span></div>`;
}
function brief(m) {
  const g = m.g,
    n = m.n.rows[1],
    wa = m.weatherAttrs;
  const rain = m.forecast.find(
    (f) =>
      Date.parse(f.datetime) >= m.now &&
      number(f.precipitation_probability) >= 30,
  );
  const reasons = [
    ...m.rec.reasons.slice(0, 2),
    m.cal
      ? m.sc.uncertain
        ? "All-day / ambiguous events need review"
        : `${m.sc.free.length} open blocks on the selected calendar`
      : "Calendar availability is not confirmed",
    m.n.fresh && m.n.complete
      ? `Logged nutrition: ${remaining(n)} protein`
      : "Nutrition is older, incomplete or unavailable",
  ];
  const tile = (kind, ico, label, value, note, tone) =>
    `<button class="tile" data-detail="${kind}"><div class="orb ${tone}">${icon(ico)}</div><div><span class="label">${label}</span><b>${esc(value)}</b><small>${esc(note)}</small></div>${icon("chevron-right", "chev")}</button>`;
  return `<div class="pagehead"><div class="brand">${icon("home-outline")}<div><h1>My day</h1><small>${new Date(m.now).toLocaleDateString(undefined, { timeZone: m.zone, weekday: "long", month: "long", day: "numeric" })}</small></div></div><button class="refresh" data-refresh aria-label="Refresh dashboard">${icon("refresh")}</button></div><ha-card class="pad"><div class="hero-top"><div class="orb ${m.rec.tone}">${icon("white-balance-sunny")}</div><div class="hero-title"><div class="eyebrow">Today · Huzband</div><h2>${esc(m.rec.title)}</h2></div>${pill(m.rec.effort, m.rec.tone)}</div><ul class="reasons">${reasons.map((r, i) => `<li>${icon(["heart-outline", "chart-bar", "calendar-blank-outline", "silverware-fork-knife"][i])}<span>${esc(r)}</span></li>`).join("")}</ul><div class="line"></div><details><summary>Why this recommendation?</summary><p>${m.rec.reasons.map(esc).join(". ")}.</p><p>Policy: Body Battery ≥35, sleep ≥60 and HRV within Garmin's range support moderate effort. Low readiness or remaining recovery time favors easy movement. These are v0.1 planning cues, not Garmin prescriptions.</p><p>Training load is context; it does not establish an aerobic deficit. Available time comes only from your selected Google calendar.</p><p>${Object.entries(
    m.sources,
  )
    .map(([k, v]) => esc(k) + ": " + esc(v))
    .join(
      " · ",
    )}</p></details></ha-card><div class="twocol tiles">${tile("recovery", "lightning-bolt", "Energy", `${fmt(g.body_battery.value)} Body Battery`, g.body_battery.fresh ? `Sleep score ${fmt(g.sleep_score.value)}` : "Older / unverified observation", "blue")}${tile("training", "bike", "Training", m.rec.training, m.trainingMinutes >= 10 ? `Up to ${Math.floor(m.trainingMinutes)} min fits calendar` : "No confirmed training window", "")}${tile("weather", "weather-partly-cloudy", "Weather", `${fmt(wa.temperature)}${wa.temperature_unit ?? ""}`, rain ? `Rain risk around ${time(Date.parse(rain.datetime), m)}` : m.forecast.length ? "Forecast available" : "Forecast unavailable", "blue")}${tile("nutrition", "silverware-fork-knife", "Nutrition", m.n.fresh && m.n.complete ? `${remaining(n)} protein` : "Check nutrition", m.n.fresh && m.n.complete ? remaining(m.n.rows[0]) : m.n.date ? `Older diary: ${m.n.date}` : "Awaiting a current diary", "amber")}</div>`;
}
function timeline(m, cfg) {
  const rows = [];
  if (m.cal) {
    for (const e of m.events) {
      const start = instant(e.start, m.zone),
        end = instant(e.end, m.zone);
      if (start === null || end === null || end < m.now || start > m.b.to)
        continue;
      rows.push({
        at: start,
        html: `<div class="event"><div class="clock">${time(start, m)}</div><div class="slot"><b>${esc(e.summary ?? "Calendar event")}</b><small>${time(start, m)}–${time(end, m)}</small></div></div>`,
      });
    }
    for (const f of m.sc.free) {
      const t = m.assignments.get(f.start),
        train = m.training?.freeStart === f.start ? m.training : null;
      rows.push({
        at: f.start,
        html: `<div class="event"><div class="clock">${time(f.start, m)}</div><div class="slot free"><b>Open · ${Math.floor((f.end - f.start) / 60000)} min</b><small>Until ${time(f.end - f.start > 0 ? f.end : f.start, m)} · based on calendar</small>${t ? `<div class="proposal"><small class="teal">SUGGESTED · ${time(t.block.start, m)}</small><b>${linkTask(t.task)}</b><small>${t.minutes} min · ${esc(t.reasons.join(" · "))}</small></div>` : train ? `<div class="proposal"><small class="teal">SUGGESTED · ${time(train.start, m)}</small><b>${esc(train.title)} · ${train.minutes} min</b><small>${esc(train.note)}</small></div>` : "<small>No timed suggestion: add a duration to a suitable task.</small>"}</div></div>`,
      });
    }
  }
  const rain = m.forecast.find(
    (f) =>
      Date.parse(f.datetime) >= m.now &&
      Date.parse(f.datetime) < m.b.to &&
      (number(f.precipitation_probability) >= cfg.rain_probability ||
        number(f.precipitation) > 0),
  );
  if (rain) {
    const at = Date.parse(rain.datetime);
    rows.push({
      at,
      html: `<div class="event"><div class="clock">${time(at, m)}</div><div class="slot rain"><b>Rain risk · ${fmt(number(rain.precipitation_probability))}%</b><small>Hourly forecast window, not an exact onset</small></div></div>`,
    });
  }
  rows.sort((a, b) => a.at - b.at);
  return `<ha-card class="pad"><div class="head"><h2>${icon("calendar-clock-outline")}Today's timeline</h2><small>${m.zone}</small></div><p class="sub" style="margin-bottom:14px">Your schedule, weather & open time</p>${m.sc.allDay.map((e) => `<div class="empty">All day: ${esc(e.summary ?? "Event")} · availability needs review</div>`).join("")}${!m.cal ? '<div class="empty">Calendar unavailable. Free time is not assumed.</div>' : m.sc.uncertain ? '<p class="hint amber">An event has uncertain availability. Free-block suggestions are paused.</p>' : ""}<div class="timeline">${rows.map((r) => r.html).join("")}</div>${!rows.length && m.cal ? '<div class="empty">No remaining blocks in your planning day.</div>' : ""}<p class="hint">Planning hours ${cfg.start_hour}:00–${cfg.end_hour}:00. Suggestions reserve no time. Todoist calendars are excluded.</p></ha-card>`;
}
function actions(m) {
  const items = m.ranked.slice(0, 3);
  return `<ha-card class="pad"><div class="head"><h2>${icon("checkbox-marked-outline")}Suggested actions</h2><small>Ranked for today</small></div>${
    !m.taskOk
      ? '<div class="empty">Task data is incomplete, older or unavailable. Ranking resumes after a complete fresh read.</div>'
      : !items.length
        ? '<div class="empty">No active tasks returned.</div>'
        : `<div class="stack">${items
            .map(
              (r, i) =>
                `<article class="task"><div class="rank">${i + 1}</div><div class="taskbody"><div class="tasktitle">${linkTask(r.task)}${pill(r.block ? "Time fits" : "Review fit", r.tone)}</div><div class="chips">${pill(r.minutes !== null ? `${fmt(r.minutes)} min` : "Duration unknown")}${pill("P" + (r.task.display_priority ?? "?"))}${
                  r.task.labels
                    ?.slice(0, 3)
                    .map((l) => pill(l))
                    .join("") ?? ""
                }</div><p>${esc(r.reasons.join(" · "))}</p></div></article>`,
            )
            .join("")}</div>`
  }<details><summary>How tasks are ranked</summary><p>Overdue and due-today tasks first, then priority and known time fit. Unknown duration is never treated as zero. Weather, daylight and effort constraints apply when labels specify them. Task links open Todoist without changing anything.</p></details></ha-card>`;
}
function signals(m) {
  const g = m.g;
  return `<ha-card class="pad"><div class="head"><h2>${icon("chart-bar")}Underlying signals</h2><button data-detail="recovery" class="sub">Why these suggestions ${icon("chevron-right")}</button></div><div class="metricbox"><div class="head"><div><span class="label">Body Battery</span><div class="metric">${fmt(g.body_battery.value)}</div></div>${pill(g.body_battery.fresh ? "Current" : "Older", "muted")}</div>${spark(m)}</div><div class="twocol" style="margin:9px 0">${metric("Last-night HRV", g.hrv_last_night_average)}${metric("Resting heart rate", g.resting_heart_rate)}${metric("Steps · goal " + fmt(g.daily_step_goal.value), g.steps)}${metric("Acute training load", g.acute_training_load)}</div><div class="head"><h3>Nutrition</h3>${pill(m.n.fresh && m.n.complete ? "Current diary" : "Older / incomplete", m.n.fresh ? "teal" : "amber")}</div>${bars(m)}<p class="hint">Logged intake only · ${esc(m.n.date ?? "No diary date")}. ${m.n.queued ? "Refresh is queued; displayed data is not yet updated." : ""}</p></ha-card>`;
}
function detail(kind, m) {
  if (kind === "nutrition")
    return `<p class="hint">${m.n.fresh && m.n.complete ? "Current diary" : "Older or incomplete diary — remaining values describe the displayed log only."}</p><p class="hint">${esc(m.n.date ?? "No diary date")} · Source ${esc(m.n.at ?? "unavailable")}</p><div class="line"></div>${bars(m)}<p class="hint">Targets are from MyFitnessPal. A partial food log does not establish a nutritional deficit.</p>`;
  if (kind === "weather")
    return `<div class="stack">${
      m.forecast
        .filter((f) => Date.parse(f.datetime) >= m.now)
        .slice(0, 12)
        .map(
          (f) =>
            `<div class="report"><span>${time(Date.parse(f.datetime), m)} · ${esc(f.condition ?? "")}</span><b>${fmt(number(f.temperature))}${esc(m.weatherAttrs.temperature_unit ?? "")}</b><small>Rain ${fmt(number(f.precipitation_probability))}% · Wind ${fmt(number(f.wind_speed))} ${esc(m.weatherAttrs.wind_speed_unit ?? "")}</small></div>`,
        )
        .join("") || "<p>Forecast unavailable.</p>"
    }</div>`;
  const keys =
    kind === "training"
      ? [
          "acute_training_load",
          "chronic_training_load",
          "training_load_ratio",
          "training_readiness",
          "recovery_time",
        ]
      : kind === "activity"
        ? ["steps", "daily_step_goal"]
        : [
            "body_battery",
            "sleep_score",
            "hrv_last_night_average",
            "hrv_balanced_range_lower",
            "hrv_balanced_range_upper",
            "resting_heart_rate",
          ];
  return `${kind === "recovery" ? spark(m) : ""}${keys.map((k) => `<div class="report"><span>${esc(k.replaceAll("_", " "))}</span><b>${fmt(m.g[k].value)} ${esc(m.g[k].unit)}</b><small>${esc(m.g[k].reason)} · source ${esc(m.g[k].sourceDate ?? "unknown")} · fetched ${esc(m.g[k].at ?? "unknown")}</small></div>`).join("")}<p class="hint">${kind === "training" ? "Load ratio is context, not proof of a base-training deficit. Optional readiness/recovery values may not be supplied." : kind === "activity" ? "Steps versus normal and full historical activity analytics are deferred." : "Thresholds are planning policy. No RHR normal/abnormal claim is made without a personal baseline."}</p>`;
}
const Base = globalThis.HTMLElement ?? class {};
export class PersonalCard extends Base {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.mode = this.constructor.mode;
    this.lastRender = 0;
  }
  setConfig(config) {
    if (!/^calendar\.[a-z0-9_]+$/.test(config.calendar ?? ""))
      throw Error("Configure exactly one planning calendar");
    for (const k of ["start_hour", "end_hour"])
      if (
        config[k] !== undefined &&
        (!Number.isInteger(config[k]) || config[k] < 0 || config[k] > 23)
      )
        throw Error("Planning hours must be integers 0–23");
    if ((config.start_hour ?? 8) >= (config.end_hour ?? 21))
      throw Error("Planning end must follow start");
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.controller = null;
    this.config = config;
    if (this._hass) this.connect();
  }
  set hass(hass) {
    this._hass = hass;
    if (this.controller && this.connection !== hass.connection) {
      this.unsubscribe?.();
      this.controller = null;
    }
    if (!this.controller) this.connect();
    if (this.controller) {
      this.controller.hass = hass;
      if (Date.now() - this.lastRender > 10000) this.render();
    }
  }
  connectedCallback() {
    this.connect();
  }
  disconnectedCallback() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.controller = null;
  }
  connect() {
    if (!this.isConnected || !this.config || !this._hass || this.controller)
      return;
    this.controller = getController(this._hass, this.config);
    this.connection = this._hass.connection;
    this.unsubscribe = this.controller.subscribe(() => this.render());
  }
  getCardSize() {
    return { brief: 5, timeline: 8, actions: 6, signals: 7, nav: 1 }[this.mode];
  }
  getGridOptions() {
    return { columns: 12, rows: "auto" };
  }
  render() {
    if (!this.controller || this.shadowRoot.querySelector("dialog")?.open)
      return;
    const active = this.shadowRoot.activeElement;
    const focusKey =
      active?.getAttribute("data-detail") ??
      (active?.hasAttribute("data-refresh") ? "refresh" : null);
    const open = this.shadowRoot.querySelector("details")?.open;
    const dialogKind = this.dialogKind;
    this.lastRender = Date.now();
    const m = buildModel(
      this._hass,
      this.controller.cache,
      this.controller.cfg,
    );
    this.model = m;
    const content =
      this.mode === "brief"
        ? brief(m)
        : this.mode === "timeline"
          ? timeline(m, this.controller.cfg)
          : this.mode === "actions"
            ? actions(m)
            : this.mode === "signals"
              ? signals(m)
              : `<div class="navspace"></div><nav class="nav" aria-label="Personal dashboard sections">${[
                  ["recovery", "heart-outline", "Recovery"],
                  ["training", "bike", "Training"],
                  ["nutrition", "silverware-fork-knife", "Nutrition"],
                  ["activity", "walk", "Activity"],
                  ["planning", "calendar-blank-outline", "Planning"],
                ]
                  .map(
                    ([k, i, l]) =>
                      `<button data-detail="${k}" class="${k === "planning" ? "active" : ""}">${icon(i)}${l}</button>`,
                  )
                  .join("")}</nav>`;
    this.shadowRoot.innerHTML = `<style>${CSS}</style>${content}<dialog aria-label="Dashboard details"><div class="dialoghead"><h2></h2><button class="close" aria-label="Close details">${icon("close")}</button></div><div class="detailcontent"></div></dialog>`;
    if (open && this.shadowRoot.querySelector("details"))
      this.shadowRoot.querySelector("details").open = true;
    for (const el of this.shadowRoot.querySelectorAll("[data-detail]"))
      el.onclick = () => this.showDetail(el.dataset.detail);
    const refresh = this.shadowRoot.querySelector("[data-refresh]");
    if (refresh) {
      refresh.disabled = this.controller.busy;
      refresh.onclick = () => this.controller.poll(true);
    }
    const dialog = this.shadowRoot.querySelector("dialog");
    dialog.querySelector(".close").onclick = () => dialog.close();
    dialog.onclose = () => {
      this.dialogKind = null;
    };
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
    if (dialogKind) this.showDetail(dialogKind);
    else if (focusKey)
      this.shadowRoot
        .querySelector(
          focusKey === "refresh"
            ? "[data-refresh]"
            : `[data-detail="${focusKey}"]`,
        )
        ?.focus({ preventScroll: true });
  }
  showDetail(kind) {
    if (kind === "planning") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    this.dialogKind = kind;
    const d = this.shadowRoot.querySelector("dialog");
    d.querySelector("h2").textContent = kind[0].toUpperCase() + kind.slice(1);
    d.querySelector(".detailcontent").innerHTML = detail(kind, this.model);
    if (!d.open) d.showModal();
  }
}
if (globalThis.customElements) {
  for (const [name, mode] of [
    ["personal-day-brief", "brief"],
    ["personal-day-timeline", "timeline"],
    ["personal-suggested-actions", "actions"],
    ["personal-signals", "signals"],
    ["personal-navigation", "nav"],
  ]) {
    if (!customElements.get(name)) {
      class Card extends PersonalCard {
        static mode = mode;
      }
      customElements.define(name, Card);
    }
  }
  globalThis.customCards = globalThis.customCards ?? [];
  customCards.push({
    type: "personal-day-brief",
    name: "Huzband • My day",
    description: `Personal dashboard ${VERSION}`,
  });
}
