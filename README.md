# Huzband Dashboard

Personal Dashboard v0.1 for Home Assistant. A phone-first daily brief, four summary tiles, calendar/weather timeline, suggested Todoist actions, recovery and nutrition signals, and five detail destinations.

## Install

Requires Node 22+ for development; the deployed bundle has no external JavaScript dependencies.

```sh
npm test
npm run build
```

Copy `dist/ha-personal-dashboard.js` to HA's `www/ha-personal-dashboard/` using your supported file-transfer workflow, then register `/local/ha-personal-dashboard/ha-personal-dashboard.js?v=0.1.0` as a JavaScript module. Alternatively, the HA dashboard resource API can register this exact built file as one self-contained inline module. Use one registration, not both. No HACS catalog submission is claimed.

Use `dashboard.example.json` as the new **Huzband Dashboard** configuration. Set the same `calendar`, `nutrition_api` and policy options on every card. Supply only the chosen Google calendar. Do not add Todoist calendars: task dates are read from Todoist Enhanced.

The first deployment is an administrator-only dashboard because the existing MyFitnessPal per-API MCP route requires administrator access. This does not grant permissions or alter authentication. Non-admin support requires separate backend design.

## Development

```sh
npm run preview
# Open http://127.0.0.1:8791 — synthetic fixtures only
node scripts/render-test.mjs /path/to/playwright/index.mjs
```

The render check uses local headless Edge and synthetic data; it checks phone/desktop overflow, details and source-failure rendering. Screenshots stay under ignored `.local/`. It does not log in to HA or prove Companion App acceptance. Pure model/controller tests use Node's built-in test runner.

## Design and data

Four card types share a controller per HA connection and configuration:

- `personal-day-brief`: daily recommendation, reasons, Energy/Training/Weather/Nutrition tiles.
- `personal-day-timeline`: selected Google calendar, merged free blocks, suggestions and hourly rain risk.
- `personal-suggested-actions`: three ranked tasks with source labels, duration and reasons.
- `personal-signals`: current-day Body Battery samples, scalar recovery/activity and nutrition bars.
- `personal-navigation`: small companion footer with accessible detail dialogs. It is included in this same bundle, so no third-party navigation dependency is needed.

HA state supplies Garmin readings and provenance. Supported forecast service calls supply hourly weather. Authenticated calendar REST reads use a local-day window. Todoist Enhanced supplies tasks and metadata freshness via WebSocket. Nutrition uses the same authenticated HA MCP route already accepted by the source project. Nothing calls an AI model or persists personal snapshots to localStorage.

Diagrams of the pipeline, the recovery verdict and task ranking are in [docs/decision-flow.md](docs/decision-flow.md). A narrative walkthrough of the same rules, including what is deliberately not in the model, is in [docs/decision-logic-handoff.md](docs/decision-logic-handoff.md).

The new view uses native Sections for the outer layout. Four tiles remain two-up on phones; larger screens put the timeline left and actions/signals right. Shared CSS inside our own shadow roots provides styling without `card-mod` or modifying existing cards. Details use native dialogs instead of adding a Bubble dependency to this package. Existing Bubble/ApexCharts cards remain available for later expanded details; neither is required by v0.1.

## Policy and configuration

Defaults: planning hours 08:00–21:00 HA-local time, 10 minute buffer, preferred training duration 30 minutes (15 for low recovery), rain probability threshold 30%, outdoor temperature 10–30°C, maximum sustained wind 30 km/h, Garmin source age 120 minutes. These are prototype planning preferences, not medical thresholds. Planning hours and weather/duration settings can be set per card.

Set `start_hour` and `end_hour` to whole hours from 0 through 23, with start before end. Set the same scheduling options on the brief, timeline, suggested-actions, signals and navigation cards so recommendations agree. The timeline's `show_time_zone` option defaults to `false`; set it to `true` to show the HA time-zone label. This display option does not change time conversion or split the shared data controller. Planning details are under **How this timeline works**.

The **Refresh** button checks data available through HA and reports progress, failure or a retry delay. It does not force an upstream Garmin/Todoist/MyFitnessPal sync. Task errors identify missing, incomplete, older or inaccessible data and suggest a relevant next action.

**Dismiss** hides a suggested task from the list and timeline for the current dashboard session, then fills its position with the next ranked task. **Undo last dismissal** restores it. Dismissals reset on reload/reconnection or a new HA-local day; they do not change Todoist and are not stored in browser storage. Cross-device persistence is deferred to v0.2.

Garmin detail rows show the source day and flag fallback/retained readings. Fetch and device-sync times are not presented as measurement times. Nutrition shows **Data checked** age bands (>15 min, >30 min, >1 hr, >2 hr), separately from incomplete totals/targets and an older diary date. These bands describe `retrieved_at`, not the time food was eaten or edited.

Recovery uses current Body Battery, sleep and HRV relative to Garmin bounds ([diagram](docs/decision-flow.md#recovery-verdict)). Body Battery below 35, sleep below 60, HRV outside bounds, optional training readiness below 40 or positive recovery time favor easy movement. Missing, retained, failed, wrong-day or old inputs suppress a strong recommendation. RHR is displayed without an unsupported normal/abnormal claim. Load metrics are context, not a load-focus deficit diagnosis.

Task ordering ([diagram](docs/decision-flow.md#task-ranking-and-block-fit)): overdue, then due today, then priority, then known time fit, with stable ID tie-breaking. No missing duration is treated as zero. Native/label duration inference is owned by Todoist Enhanced. Configure `labels` to map your exact task label names to `outdoor`, `indoor`, `dry`, `daylight`, `physical` or `focus`. Defaults include outdoor/outside, indoor/indoors, dry, daylight, physical/high-physical, focus/high-focus. Unspecified suitability is explicitly noted. High-focus labels are displayed as context; no unsupported cognitive readiness score is inferred.

Overlapping calendar events merge. Explicitly transparent/cancelled events do not block. An all-day event with unknown busy status or an invalid event time suspends free-block suggestions. Ambiguous/nonexistent DST wall times are rejected. A successful empty query means no recorded commitments, not unlimited availability. Suggestions are tentative and do not reserve time; each free block gets at most one task or activity. Opening a task only follows its Todoist link.

Nutrition requires today's diary, all totals/targets, source age ≤15 minutes and `stale=false`. Older values remain labeled; queued refresh is not completion; logged intake is not evidence of a deficit. Missing targets remain missing. Macro bars cap visually at 100% and show over-target text.

Polling is visible-view-only, deduplicated and bounded: tasks/calendar about 5 minutes, weather 30 minutes, nutrition 1 minute. No forced upstream task refresh. Failed reads back off up to 15 minutes. A manual refresh respects at least a 10-second interval and cannot bypass failure backoff. Midnight/resume recomputes local dates. Modal content is a snapshot while open so focus is not stolen by background refresh.

## v0.1 limits

Optional task labels `min-temp:15c` or `min-temp:59f` set a minimum forecast temperature. Multiple minimums use the most restrictive. A `context:office` label requires `contexts: ["office"]` in card configuration before a time-fit suggestion is made. No current location or cognitive capacity is inferred from Garmin data.

No task mutations, calendar writes, auto-scheduling, Recorder changes or new sensors. No precise training prescription, time-of-day step baseline, historical raw Garmin archive, meal planner, full load focus, annual Strava analysis or non-admin nutrition access. Current-day chart gaps are not interpolated. Data source failures are isolated. Current frontend tests cover Chromium/Edge; actual iOS/Companion acceptance must be recorded separately.

## Deployment and rollback

Build once, verify tests, then register the bundle and create the new dashboard through HA's supported API. The deployment record belongs in ignored `.local/` (resource IDs/configuration may be installation-specific); `projectStatus.md` carries a sanitized handoff. A failed release can be rolled back by updating that one resource to its prior built bundle and restoring this dashboard's prior config through HA's API. Do not restore unrelated dashboards. Do not publish task/event/nutrition snapshots, tokens, or installation account identifiers.
