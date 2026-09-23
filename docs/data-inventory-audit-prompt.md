# Home Assistant Daily Dashboard Data Inventory

You are working on my Home Assistant environment and have access to inspect the running Home Assistant instance.

I am planning a future "Daily Decision Dashboard" that combines health/recovery, training, weather, nutrition, calendar availability, and task suitability into one decision-oriented view.

Before designing or implementing the dashboard, I want a factual inventory of what data is already available in Home Assistant.

## Objective

Perform a **read-only audit** of the existing Home Assistant instance and create a structured inventory spreadsheet showing:

1. Which desired data points already exist.
2. Which Home Assistant entities provide them.
3. What type/granularity of data is available.
4. Whether useful history is being recorded.
5. Which values could be derived from existing data even if no direct entity exists.
6. Which desired inputs are genuinely missing.
7. Which gaps should block the initial dashboard prototype versus being deferred to a later phase.

Do **not** create entities, modify integrations, change Recorder configuration, install anything, or otherwise alter Home Assistant during this audit.

---

# Sources to investigate

At minimum, inspect these sources/domains:

- Weather / forecast
- Garmin
- MyFitnessPal
- Outlook calendar / calendar entities
- Todoist
- Zwift
- Strava
- Home Assistant Recorder/history

Also note any other existing integrations or entities that appear directly useful to this dashboard.

Do not assume an integration exists merely because it is listed here. Verify everything against the running Home Assistant instance.

---

# Desired dashboard inputs

## Weather

Look for:

- Current temperature
- Feels-like temperature
- Current conditions
- Hourly temperature forecast
- Daily temperature forecast
- Precipitation probability
- Expected precipitation amount
- Timing of expected precipitation
- Wind speed/gusts
- Humidity
- Sunrise
- Sunset
- Any useful severe-weather information

Pay particular attention to whether forecast data can support deriving:

- Best outdoor activity window
- Dry-until time
- Suitable temperature windows
- Daylight-required task windows

## Garmin: recovery

Look for:

- Current Body Battery
- Intraday Body Battery samples/history
- Morning/wake Body Battery
- Overnight Body Battery charge
- Daily Body Battery drain
- Sleep score
- Sleep duration
- Sleep stages, if available
- HRV
- HRV status
- HRV baseline/range
- Resting heart rate
- Stress
- Intraday stress history
- Recovery time
- Training readiness
- Any other recovery-related Garmin values already exposed

Determine whether Home Assistant retains enough history for trend calculations.

## Garmin: activity and training

Look for:

- Daily steps
- Step goal
- Historical/intraday step accumulation
- Active calories
- Recent activities/workouts
- Activity type
- Start time
- Duration
- Distance
- Training load per activity
- Rolling 7-day training load
- Optimal training-load range
- Training-load status
- Load focus
- Base / low aerobic load
- High aerobic / tempo load
- Anaerobic load
- VO2 max
- Any relevant training-status metrics

Specifically determine whether existing data could support:

- "Steps versus normal for this time of day"
- Training recommendation
- Training duration recommendation
- Identification of a training-load deficit such as needing more base work

## MyFitnessPal / nutrition

Look for:

- Calories consumed today
- Calorie target
- Calories remaining
- Protein consumed
- Protein target
- Carbohydrates consumed
- Carbohydrate target
- Fat consumed
- Fat target
- Individual food entries
- Meal grouping
- Food-entry timestamps
- Nutritional data for individual foods
- Weight
- Weight history

Identify whether nutrition information exists directly as Home Assistant entities, attributes, MQTT topics, database-backed data, or some other mechanism.

Do not assume that data must be represented by a normal `sensor.*` entity to be considered available.

## Calendar

Inventory the calendar entities that could affect personal daily planning.

For each relevant calendar determine whether Home Assistant exposes enough information to obtain:

- Today's events
- Event title
- Start time
- End time
- All-day status
- Location, if present
- Description, if useful
- Multiple events during the same day

Determine whether the available calendar data can be used to derive:

- Occupied time blocks
- Free time blocks
- Length of each free block

Do not modify calendar data.

## Todoist

Determine exactly what Todoist information is currently accessible to Home Assistant.

Look for:

- Tasks
- Due dates
- Due times
- Priorities
- Projects
- Sections
- Labels
- Recurring-task information
- Completed status
- Overdue status
- Descriptions/notes
- Any other useful metadata

The future task-selection model may use labels similar to:

- estimated duration
- indoor/outdoor
- dry weather required
- minimum temperature
- daylight required
- physical effort
- cognitive/focus effort
- location/context

These labels may not exist yet.

For this audit, determine:

1. Whether Todoist labels themselves are accessible from Home Assistant.
2. Whether arbitrary labels attached to tasks can be retrieved.
3. Whether enough task information exists to build a deterministic task filtering/ranking engine.

Do not create or alter Todoist labels or tasks.

## Zwift

Look for anything currently available related to:

- Recent Zwift activities
- Activity date
- Activity type
- Duration
- Distance
- Whether at least one qualifying activity occurred during the current week
- Streak information, if directly available

If there is no Zwift integration/data at all, record that clearly.

## Strava

Look for:

- Recent activities
- Activity type
- Start date/time
- Distance
- Duration
- Elevation
- Weekly totals
- Monthly totals
- Yearly totals
- Activity counts
- PRs/achievements
- Historical activity data

Distinguish between information directly exposed by the integration and values that could be calculated from available activity history.

---

# Historical-data audit

For metrics where history matters, examine Home Assistant Recorder/history availability.

Important examples include:

- Body Battery
- Stress
- HRV
- Resting heart rate
- Steps
- Weight
- Training load
- Nutrition totals

For each relevant entity determine, as accurately as practical:

- Is Recorder collecting it?
- Roughly how much useful history appears available?
- Is it long-term-statistics capable?
- Is the sampling frequency sufficient for the intended use?

Do not change Recorder configuration.

---

# Inventory classifications

For every desired data point, assign one of these statuses:

### AVAILABLE_DIRECT
The desired value already exists and can be consumed directly.

### AVAILABLE_WITH_HISTORY
The value exists and useful time-series/history is already available.

### DERIVABLE
No direct value exists, but it can reasonably be calculated from data already available in Home Assistant.

Examples:

- Free calendar blocks
- Calories remaining
- Protein remaining
- Steps versus normal by time of day
- Dry-until time

### PARTIAL
Some required information is available, but not enough to implement the desired feature correctly.

### SOURCE_PRESENT_DATA_MISSING
The source/integration exists, but this specific information does not appear to be exposed.

### SOURCE_MISSING
No usable source for this information currently exists in Home Assistant.

### UNKNOWN
Access limitations prevent a confident determination.

Do not label something "missing" merely because you failed to find an obvious entity. Inspect entities, attributes, integration data, services, events, MQTT data where appropriate, and other accessible Home Assistant structures before drawing that conclusion.

---

# Proof-of-concept priority

Assign each desired capability one of:

### P0 — Needed for first proof of concept

Prioritize:

- Weather forecast
- Body Battery
- Sleep/recovery
- HRV
- Resting heart rate
- Steps
- Training load
- Calories/macros
- Today's calendar events
- Todoist tasks and labels

### P1 — Valuable early enhancement

Examples:

- Intraday Body Battery/stress visualization
- Activity pacing
- Load focus
- Weight trend
- Detailed task suitability
- Zwift weekly status

### P2 — Later enhancement

Examples:

- Strava annual statistics
- PRs
- achievements
- secondary analytics that don't materially affect today's decisions

Adjust priority if inspection reveals a compelling reason, but explain any change.

---

# Spreadsheet output

Create:

`docs/home-assistant-daily-dashboard-data-inventory.xlsx`

Also create a CSV copy of the primary inventory sheet:

`docs/home-assistant-daily-dashboard-data-inventory.csv`

Use clear formatting in the XLSX: frozen header row, filters, readable widths, wrapped text, and status/priority columns that are easy to scan.

## Primary sheet: `Data Inventory`

Use these columns:

| Column | Purpose |
|---|---|
| Domain | Weather, Garmin Recovery, Garmin Training, Nutrition, Calendar, Todoist, Zwift, Strava, etc. |
| Desired Data | Human-readable desired metric/capability |
| Status | One of the inventory classifications above |
| HA Entity / Source | Exact entity ID(s), source, or mechanism |
| Current Example | Current/sample value when useful |
| Unit | Unit of measurement |
| Data Granularity | Current value / event / daily / hourly / intraday / historical, etc. |
| History Available | Yes / No / Partial / Unknown |
| History Notes | Retention, sampling, statistics availability, etc. |
| Derivable | Yes / No |
| Derivation Inputs | Exact existing inputs that would make derivation possible |
| Intended Dashboard Use | What decision/display this enables |
| POC Priority | P0 / P1 / P2 |
| Gap / Limitation | What is missing or insufficient |
| Recommended Next Step | Keep as-is, derive later, investigate source, expose new data, defer, etc. |
| Evidence / Notes | Brief explanation supporting the determination |

Use **one row per desired data point**, not one row per integration.

If multiple entities contribute to one capability, list all relevant entity IDs.

## Additional sheets

Create a sheet called `Source Summary` containing one row per source:

- Source
- Integration/config entry if identifiable
- Connected?
- Relevant entities found
- Overall usefulness
- Major gaps
- P0 blocker?
- Notes

Create another sheet called `POC Gaps` containing only items classified as:

- PARTIAL
- SOURCE_PRESENT_DATA_MISSING
- SOURCE_MISSING
- UNKNOWN

Include:

- Desired capability
- Domain
- POC priority
- Current state
- Missing requirement
- Likely effort/category of work
- Recommendation:
  - FIX BEFORE POC
  - DERIVE DURING POC
  - DEFER

Do not attempt to estimate engineering hours unless there is strong evidence.

---

# Final report

After creating the spreadsheet, provide a concise written summary containing:

1. **What we already have**
   - Especially the P0 data that appears ready for dashboard use.

2. **What can be derived**
   - Features that do not require another external integration.

3. **P0 blockers**
   - Missing data that materially affects the initial dashboard concept.

4. **Recommended scope for v0.1**
   - What the first dashboard can realistically include using the current data.

5. **Recommended pre-dashboard work**
   - Data plumbing that is worth completing before UI development.

6. **Safe-to-defer items**
   - Desired functionality that should not hold up the proof of concept.

Be explicit about uncertainty. If Home Assistant access prevents verifying something, mark it UNKNOWN rather than guessing.

## Important constraint

This task is an **inventory and analysis task only**.

Do not:

- alter Home Assistant configuration,
- add integrations,
- create template sensors,
- change Recorder settings,
- modify Todoist,
- modify calendars,
- change MQTT publishers,
- refactor existing integrations,
- or begin dashboard implementation.

The goal is to establish the factual data foundation first so that we can make an informed decision about what belongs in the initial dashboard prototype.
