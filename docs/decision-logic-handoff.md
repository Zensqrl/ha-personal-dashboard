# Handoff — decision logic

Updated: 2026-09-22
Scope: how the dashboard decides what to show. Layout, styling and deployment are covered in `README.md` and `projectStatus.md`.
Diagrams: `docs/decision-flow.md`.

## Where the logic lives

Three layers, deliberately separated.

| Layer | File | Responsibility |
| --- | --- | --- |
| Model | `src/model.mjs` | All decisions. Pure functions, no I/O, no side effects. |
| Controller | `src/controller.mjs` | Fetching, caching, polling cadence, backoff, session dismissals. One instance per HA connection plus config. |
| Cards | `src/cards.mjs` | Presentation only. Escaping, formatting, truncation, shadow DOM lifecycle. |

`buildModel(hass, cache, cfg, now, dismissed)` is the single entry point. It takes the HA state object and the controller's cache and returns one plain view-model object. Same inputs always produce the same output, which is why `test/model.test.mjs` can exercise every rule without a browser or an HA connection.

Nothing calls an AI model, a conversation agent or an Assist pipeline. The nutrition read uses MCP's JSON-RPC format to invoke one named tool (`fitness_get_day`) directly; no prompt is sent and no generated text is parsed.

## Governing principle

Every rule fails closed. An input that is missing, older, retained, unverified or contractually incomplete never silently becomes a default value. It becomes an explicit labelled state that suppresses the claim it would have supported.

Concretely: no free time is assumed, no unknown duration is treated as zero, no strong recommendation survives a degraded input, and no suggestion reserves time or mutates a source system.

## The rules

### Freshness gates

Each source passes a gate before any rule may use it.

- **Garmin** (`garmin()`) — fresh only if provenance outcome is ok/success, not retained, no fallback used, coordinator available, `source_date` equals today and age is within `garmin_max_age_minutes` (120). Otherwise the value is still displayed but carries a reason: Retained / Fallback / Older or unverified. Fetch and device-sync times are never presented as measurement times.
- **Tasks** (`taskStatus()`) — ready only if outcome is success, `complete` and `enrichment_complete` are true, metadata agrees, `stale` is false on both, and the last check is under 10 minutes. Failure resolves to a specific actionable code: loading, timeout, contract, unavailable, auth, old, stale, incomplete.
- **Calendar** — usable only if the fetch succeeded, the cached day equals today and the cache is under 10 minutes old.
- **Weather** — usable only if the fetch succeeded and the cache is under 2 hours old.
- **Nutrition** (`nutrition()`) — ready only with today's diary, all totals and targets present, `stale` false and age within 15 minutes. `nutritionAge()` reports bands describing `retrieved_at`, not when food was eaten. A queued refresh is not completion.

### Planning window and availability

`bounds()` resolves `start_hour`/`end_hour` (default 08:00–21:00) to instants in the HA time zone. `wallTime()` enumerates candidate offsets and returns null unless exactly one matches, so DST gaps and folds are rejected rather than guessed.

`schedule()` drops cancelled and explicitly transparent events, merges overlapping busy intervals, then inverts to free blocks. Two conditions set `uncertain` and empty the free list entirely: an all-day event whose busy status is unknown, and any event with an invalid or inverted time. A successful empty query means no recorded commitments, not unlimited availability.

### Recovery verdict

`recovery()` requires five fresh readings: Body Battery, sleep score, HRV last-night average and both HRV balanced-range bounds. If any is missing or unverified the result is **Uncertain**, which suppresses the training window downstream.

With all five present it collects concern flags — Body Battery below 35, sleep below 60, HRV outside Garmin's own reported range, training readiness below 40, or positive recovery time (the last two only when fresh). Any flag yields **Low effort**; none yields **Moderate effort**. Each flag becomes a displayed reason.

These are prototype planning cues. They are not medical thresholds and not Garmin prescriptions. RHR is displayed without a normal/abnormal claim, and load metrics are context rather than a deficit diagnosis.

### Task ranking

`rankTasks()` scores each task as due weight plus priority times 30, where due weight is 1000 overdue, 500 due today, 0 otherwise. Ties break on task ID for stable ordering.

Fit into a free block is then attempted, and each failure records a specific reason rather than a generic one. The sequence: duration must be known, outdoor and indoor labels must not conflict, `context:` labels must be satisfied by configured `contexts`, a timed due date must be resolvable, the task must fit inside the block after a 10-minute buffer, it must finish before its due time, a `physical` label requires Moderate effort, a `daylight` label requires confirmation from `sun.sun`, and outdoor/dry/`min-temp:` labels run `weatherWindow()`.

A successful fit adds 20 to the score. Label vocabulary is configurable per card via `labels`; tasks with no recognised suitability label are annotated as such rather than assumed suitable.

### Weather suitability

`weatherWindow()` walks hourly forecasts covering the requested interval. Any gap in coverage fails. It normalises °F to °C and mph or m/s to km/h using the weather entity's declared units, returning failure when a unit is unrecognised. It fails on rain probability at or above `rain_probability` (30) or any precipitation, temperature outside `min_temp_c`/`max_temp_c` (10–30), or wind above `max_wind_kmh` (30). `min-temp:` labels raise the minimum; multiple minimums take the most restrictive.

### Allocation

Free blocks are filled one at a time. For each block `buildModel()` re-ranks against that block alone and takes the highest-scoring task that fits and has not already been used, so no task appears twice.

The training window then takes the first block with no task assigned. Its length is the smaller of `training_minutes` (30, or 15 when effort is Low) and the block minus the buffer, and it is skipped below 10 minutes or when effort is Uncertain. It is labelled outdoor only when daylight and all three weather checks pass; otherwise it is an indoor option with the outdoor fit explicitly unconfirmed.

## What is not in the model

Some behaviour is intentionally card-local and will not appear in `buildModel()` output:

- Config validation in `setConfig` — calendar entity pattern, `start_hour`/`end_hour` bounds, `show_time_zone` type.
- The brief's rain tile uses a hard-coded 30% threshold while the timeline uses the configurable `cfg.rain_probability`. These agree at default config and diverge if `rain_probability` is changed. Worth reconciling.
- Truncation: top 3 tasks, first 2 recommendation reasons, first 3 task labels.
- Render is skipped while a dialog is open so background refresh cannot steal focus or swap content mid-read.

Dismissals live on the controller's session, keyed by HA connection and user. They hide a task from both the list and the timeline, reset on reload, reconnection or a new local day, and never touch Todoist. Cross-device persistence is deferred to v0.2.

## Configuration that changes decisions

`start_hour`, `end_hour`, `buffer_minutes`, `training_minutes`, `rain_probability`, `min_temp_c`, `max_temp_c`, `max_wind_kmh`, `garmin_max_age_minutes`, `contexts` and `labels`.

The controller key is derived from the config object, so cards with differing options fork into separate controllers with separate caches and can disagree. Set identical options on all five cards.

## Known gaps

- All task durations retrieved so far are unknown, so the time-fit path is exercised by tests but not yet by live data. Duration inference is owned by Todoist Enhanced, not this package.
- Planning hours, weather limits and label mappings have not been tuned against a live view.
- The brief/timeline rain threshold inconsistency noted above.
