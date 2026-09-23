# Huzband Dashboard — Long-Term Product Vision and Decision Architecture

## Purpose

The Huzband Dashboard should evolve from the current v0.1 daily-status dashboard into a transparent personal decision-support system.

Its purpose is not merely to aggregate data from multiple applications. Its purpose is to reduce the number of separate applications and data sources the user must mentally reconcile in order to answer questions such as:

- What kind of day am I capable of having?
- What should I prioritize today?
- Is my planned activity appropriate given my recovery and the weather?
- Which tasks are particularly well suited to today's circumstances?
- When during the day should particular activities happen?
- What should I prioritize nutritionally for the rest of the day?
- Should today's plan be adjusted because of schedule, recovery, weather, household circumstances, or unusual activity?
- Is there anything about tomorrow or the next few days that should influence what I do today?

The long-term goal is for the dashboard to behave increasingly like a personal assistant that understands the user's routines, goals, schedule, physiological signals, environmental conditions, tasks, and household context and can make useful recommendations accordingly.

This is intentionally a high bar.

Development should progress incrementally from transparent deterministic logic toward richer context-aware reasoning. Sophistication must not come at the expense of explainability or reliability.

---

# 1. Current baseline

The current v0.1 implementation establishes several principles that should be preserved.

The existing architecture separates:

- data retrieval and caching,
- deterministic decision logic,
- and presentation.

`src/model.mjs` contains decision logic, `src/controller.mjs` owns fetching/caching, and the cards are intended to remain presentation-only.

The current model:

- validates freshness and provenance before trusting source data,
- fails closed rather than assuming missing values,
- derives calendar free blocks,
- produces a simple recovery classification,
- filters tasks against basic contextual requirements,
- ranks Todoist tasks,
- fits recommendations into calendar openings,
- proposes a simple training window,
- exposes reasons for positive recommendations,
- and never mutates Todoist or calendar data.

These principles are valuable and should continue even as the implementation architecture changes.

See:

- `docs/decision-flow.md`
- `docs/decision-logic-handoff.md`
- `README.md`

The long-term system should be considered an evolution of these concepts rather than a replacement for them.

---

# 2. Product vision

The eventual system should continuously combine five concepts:

**State**

What is true about the user and environment now?

Examples include recovery, activity accumulated so far, weather, nutrition, schedule, household circumstances, and data quality.

**Intent**

What does the user normally intend or want to accomplish?

Examples include planned exercise, Todoist work, ongoing projects, nutrition goals, recurring routines, and longer-term goals.

**Constraints**

What limits the available choices?

Examples include calendar commitments, weather, daylight, task duration, recovery, expected physical exertion, location, and household circumstances.

**Opportunities**

What is unusually well suited to the current day or a particular time window?

Examples include a rare dry afternoon suitable for outdoor work, a long calendar opening, high recovery on a planned training day, or a low-energy day containing several desk-based tasks.

**Tradeoffs**

If several individually valid activities compete for the same limited time or physical capacity, which combination makes the most sense?

The dashboard should increasingly reason across all five rather than evaluating each source independently.

---

# 3. Governing principles

## 3.1 Advisory first

The target system remains advisory.

It may recommend:

- tasks,
- exercise adjustments,
- timing,
- rest,
- nutrition priorities,
- or plan changes.

It should not automatically:

- move calendar events,
- schedule tasks,
- alter Todoist,
- log meals,
- or otherwise mutate source systems.

A future approval-based workflow may eventually be considered, but automatic action is not a current architectural requirement.

The architecture should nevertheless avoid making future user-approved actions unnecessarily difficult.

## 3.2 Explain positive recommendations

The user should be able to understand why a recommendation was made.

Examples:

> Good time for the garage project  
> 2h 15m calendar opening · dry weather · good recovery · indoor training planned later

or:

> Consider an indoor workout today  
> Tuesday is normally a run day · rain expected throughout the available outdoor window · temperature in the 40s

The UI does not need to routinely explain every option that was rejected.

Internally, however, retaining enough decision trace information to debug and tune rules is desirable.

## 3.3 Fail closed

Unknown data must remain unknown.

Missing or stale information must not silently become:

- zero,
- normal,
- free time,
- suitable weather,
- low exertion,
- or any other favorable assumption.

The current v0.1 principle should continue.

## 3.4 Deterministic constraints before AI

Hard constraints and well-understood domain rules should initially remain deterministic.

Examples include:

- calendar conflicts,
- task duration,
- daylight requirements,
- explicit weather limits,
- Todoist metadata,
- source freshness,
- known planned exercise,
- and explicitly configured household states.

AI may later reason over the resulting context, explain tradeoffs, identify patterns, or propose refinements.

An AI-generated recommendation should not silently override a deterministic hard constraint.

## 3.5 Recommendations should become personal, not universally "optimal"

The goal is not to construct a generalized health or productivity optimizer.

The system should increasingly model the user's own:

- routines,
- tolerances,
- preferences,
- historical responses,
- typical schedule,
- preferred exercise patterns,
- and task behavior.

---

# 4. Planning horizon

The primary planning horizon should remain **today**.

The decision engine should also be able to inspect approximately the next **one to three days** where doing so materially improves a recommendation.

Examples:

- outdoor work is suitable today but rain is forecast for the next two days,
- today is physically demanding and tomorrow already contains a planned long run,
- a flexible task can reasonably wait because tomorrow offers a much better weather window,
- or today's nutrition/recovery choices may affect tomorrow's planned activity.

The dashboard should not initially attempt full autonomous weekly optimization.

A rolling week planner may be considered after the daily and short-horizon models are mature.

---

# 5. Activity and exercise model

The dashboard is **not intended to become a workout-prescription engine**.

The user's activity schedule is generally predictable and can be supplied explicitly.

Sources of planned activity may eventually include:

- recurring configuration,
- calendar events,
- a dedicated activity-plan source,
- or another structured schedule.

The system should start with the assumption:

> "This is what the user planned to do."

It should then determine whether current conditions suggest:

- proceeding as planned,
- resting,
- reducing the expected exertion,
- or substituting a contextually appropriate alternative.

Examples:

- Planned outdoor run + healthy recovery + suitable weather → planned activity appears reasonable.
- Planned outdoor run + poor recovery indicators → recommend rest or a lower-exertion alternative.
- Planned outdoor run + persistent cold rain → recommend an indoor equivalent or other predetermined indoor activity.
- Planned long ride → avoid recommending substantial physical household work during the same day.
- Planned hard or long activity tomorrow → consider avoiding an unusually large physical workload late today.

Activity suitability should initially be determined using configurable deterministic rules.

Possible factors include:

- activity type,
- planned duration,
- outdoor/indoor requirement,
- precipitation,
- temperature,
- wind,
- daylight,
- recovery classification,
- accumulated activity,
- and other planned physical work.

Weather thresholds should be configurable by activity type rather than globally where appropriate.

The system should not infer detailed exercise programming from Garmin or other physiological data unless explicitly added as a future capability.

---

# 6. Daily capacity

A major evolution beyond v0.1 should be the concept of **finite daily capacity**.

Today, a Todoist task, a workout, and another physical task can each independently satisfy their rules while collectively representing an unreasonable day.

The future engine should reason about at least:

- physical demand,
- time demand,
- and eventually cognitive/focus demand.

This does not require a false-precision "87/100 capacity score."

A useful initial implementation may instead use broad categories and explicit rules.

Example:

- planned long ride = substantial physical commitment,
- mowing lawn = substantial physical task,
- therefore mowing should receive a strong penalty or be excluded on that day.

Capacity reasoning should consider both planned activities and activity already accumulated during the day.

Historical information may eventually improve these estimates.

---

# 7. Todoist task suitability

Todoist should evolve from a due-date source into a structured inventory of candidate actions.

Task metadata is currently too sparse for the intended model and should be deliberately improved.

The project should define and document a standard metadata vocabulary.

Potential dimensions include:

| Dimension | Examples |
|---|---|
| Duration | 15m, 30m, 60m, 2h+ |
| Physical demand | low, medium, high |
| Focus demand | low, medium, high |
| Environment | indoor, outdoor, either |
| Weather | dry required, rain acceptable |
| Temperature | minimum and/or maximum |
| Daylight | required / not required |
| Context | home, office, computer, errands, garage |
| Interruptibility | easily interrupted / contiguous block required |
| Flexibility | anytime / weekday / weekend / specific windows |

Exact label names should be designed as part of the roadmap.

Explicit user-authored metadata should remain authoritative.

AI or heuristics may eventually suggest metadata for an unlabeled task, but inferred metadata should not silently replace explicit metadata.

## Candidate selection

Task recommendation should evolve into two conceptually separate stages.

### Eligibility

Determine whether a task can reasonably be performed.

Hard constraints may include:

- duration versus free-block length,
- calendar conflicts,
- environmental requirements,
- temperature limits,
- daylight,
- required context/location,
- and unavailable required data.

### Ranking

Eligible tasks should then be compared using softer factors such as:

- due date,
- Todoist priority,
- project importance,
- fit with current recovery,
- fit with physical/cognitive capacity,
- quality of the available time block,
- current weather opportunity,
- whether similar opportunities will exist tomorrow,
- and compatibility with planned exercise.

A task should not outrank another merely because its Todoist priority number is higher if the rest of the day's context strongly favors the other task.

---

# 8. Calendar and time allocation

Calendar commitments should continue to be treated as constraints rather than something the dashboard is free to modify.

The system should derive:

- busy periods,
- free blocks,
- contiguous usable windows,
- and relevant short-horizon availability.

Over time, plan assembly should improve beyond simply filling the next available block.

The engine should consider:

- duration,
- weather windows,
- planned exercise,
- physical capacity,
- task opportunity,
- timing preferences,
- meals,
- and important transitions.

Recommendations remain tentative.

The dashboard does not reserve the time unless a future user-approved scheduling feature is explicitly introduced.

---

# 9. Recovery and physiological context

Garmin and similar signals should answer a limited question:

> "Do today's recovery signals suggest that the planned level of effort is reasonable?"

They should not be treated as medical diagnoses or as authoritative workout prescriptions.

Useful inputs may include:

- Body Battery,
- sleep,
- HRV relative to the user's Garmin-provided range,
- resting heart rate trends,
- recovery time,
- training readiness where available,
- accumulated activity,
- and potentially historical personal patterns.

The current Low / Moderate / Uncertain model is an appropriate starting point but is expected to become more nuanced as historical patterns and live experience justify additional rules.

Changes should remain explainable.

---

# 10. Nutrition

The near-term nutrition model should support two levels of guidance.

## Current-state guidance

Display:

- calorie progress,
- macro progress,
- remaining targets,
- and data freshness.

## Directional next-meal guidance

Recommend broad nutritional priorities rather than specific foods.

Examples:

- prioritize protein,
- protein + carbohydrates would fit well,
- fat is already near target,
- a substantial meal is still available within today's calorie budget.

Specific food or meal recommendations are a desirable later capability, but are not required for the initial mature dashboard.

A future meal recommendation system may require:

- historical food preferences,
- frequently eaten meals,
- current pantry/inventory information,
- nutritional requirements,
- meal timing,
- training context,
- and possibly AI-assisted reasoning.

That should be treated as a separate capability rather than implemented as a giant deterministic rule tree inside the dashboard.

---

# 11. Household context

The future system should support contextual information about the household that changes what a realistic day looks like.

Examples include:

- child sick,
- spouse sick,
- unusual caregiving responsibility,
- guests,
- travel,
- school closure,
- or another atypical household condition.

Initially these may be explicit user-controlled states.

For example, Home Assistant helpers or a compact dashboard dialog could expose temporary context flags.

These flags should be capable of modifying deterministic rules.

Example:

> child_sick = true

might:

- reduce expected uninterrupted focus time,
- penalize long away-from-home activities,
- avoid suggesting nonessential errands,
- or change which Todoist contexts are appropriate.

More sophisticated inference can be considered later.

---

# 12. Feedback and personalization

The dashboard should eventually allow lightweight feedback on recommendations without consuming substantial screen space.

A possible interaction is a small feedback icon on a recommendation card that opens a dialog.

Initial feedback options might include:

- Good suggestion
- Not today
- Wrong timing
- Too physically demanding
- Too mentally demanding
- Bad weather judgment
- Duration estimate wrong
- Other

Feedback should not immediately and invisibly modify rules.

Instead, feedback should initially be **stored as evidence**.

The system can then:

1. accumulate recommendation/feedback history,
2. identify repeated mismatches,
3. surface patterns,
4. suggest rule or preference changes,
5. and eventually use sufficiently strong personal patterns as inputs to decision making.

This creates an auditable path from manually designed rules to a system that increasingly reflects the user's actual behavior.

---

# 13. Target technical architecture

The long-term decision engine should not live primarily inside Lovelace/dashboard cards.

The cards should become consumers of an already-computed decision model.

Conceptually:

```text
External Sources / HA Entities
            │
            ▼
      Source Adapters
            │
            ▼
   Normalized Context Model
            │
            ▼
      Decision Engine
     ┌──────┼────────┐
     │      │        │
constraints scoring allocation
     │      │        │
     └──────┴────────┘
            │
            ▼
      Daily Plan Model
       │           │
       ▼           ▼
   HA Dashboard   Optional AI
```

## Source adapters

Each source should normalize its data into an internal contract.

Examples:

- Garmin
- weather
- calendar
- Todoist
- nutrition
- household context
- activity plan

Source-specific quirks should remain in the adapter rather than leak throughout decision rules.

Freshness, provenance, and completeness should be part of these contracts.

## Normalized context

The engine should operate against concepts such as:

```text
recovery
planned_activity
weather_windows
calendar_availability
task_candidates
nutrition_state
activity_so_far
household_context
short_horizon_forecast
```

rather than repeatedly reaching into raw Home Assistant entity structures.

## Decision engine

The decision layer should contain:

- validation,
- hard constraints,
- suitability rules,
- capacity accounting,
- candidate ranking,
- opportunity comparison,
- schedule fitting,
- and explanation generation.

Whenever practical, these should remain pure functions so that behavior can be tested against synthetic scenarios.

The strong testability of the current `buildModel()` approach should be preserved.

## Daily Plan Model

The engine should produce one canonical output describing what the UI needs.

For example:

```json
{
  "day_state": {},
  "planned_activity": {},
  "recommendations": [],
  "task_suggestions": [],
  "timeline": [],
  "nutrition_guidance": {},
  "signals": {},
  "source_health": {},
  "decision_trace": {}
}
```

The exact schema should be designed during implementation.

All cards should consume this common model rather than independently reproducing decision rules.

---

# 14. Persistent data

Not all future data belongs in Home Assistant entities.

The architecture should distinguish four forms of state.

## Source-of-truth data

Continue to live in their existing systems where practical.

Examples:

- Todoist tasks,
- calendar events,
- Garmin observations,
- MyFitnessPal diary information.

## Home Assistant state

Useful for:

- current environmental state,
- current sensor values,
- household context controls,
- UI-exposed summaries,
- automations,
- and integration with the rest of the home.

## Home Assistant Recorder

Continue using Recorder for ordinary entity history.

Do not assume Recorder should become the application's full historical or analytical database.

## Decision-engine storage

Introduce a small persistent store when features require it.

SQLite is likely sufficient initially unless deployment constraints suggest another choice.

Potential stored information includes:

- recommendation records,
- recommendation timestamps,
- recommendation inputs/features,
- user feedback,
- completion/outcome information where available,
- historical derived baselines,
- learned duration estimates,
- preference adjustments,
- and rule/model version identifiers.

The system should avoid copying every raw source datapoint merely because it is available.

Persist information only when it supports:

- historical reasoning,
- feedback,
- auditing,
- personalization,
- or performance.

---

# 15. Historical baselines

Some desired recommendations require understanding what is normal for this specific user.

Examples include:

- steps relative to the usual amount at this time of day,
- typical Body Battery drain,
- typical duration of recurring tasks,
- exercise timing preferences,
- and whether particular recommendation patterns tend to be accepted.

These should eventually be derived from historical observations.

Historical baselines should not be represented as opaque AI memory.

They should be explicit computed features wherever practical.

Example:

```text
steps_now: 8,200
median_steps_at_this_weekday_time: 5,400
activity_pacing_ratio: 1.52
```

AI can interpret these features later, but the feature itself remains inspectable.

---

# 16. AI role

AI should initially sit **above**, not underneath, the deterministic decision engine.

A future AI layer may receive a compact structured context such as:

```text
recovery: moderate
planned_activity: outdoor_run
activity_suitability: weather_problem
weather_issue: cold_rain
free_windows: [...]
physical_commitment_today: moderate
nutrition_priority: protein
top_tasks: [...]
household_context: normal
```

It may then:

- summarize the day,
- explain tradeoffs naturally,
- identify interactions not yet captured by simple scoring,
- produce a concise daily briefing,
- or suggest changes to deterministic rules.

AI should not initially:

- invent missing source values,
- override calendar conflicts,
- disregard explicit Todoist metadata,
- silently change hard weather requirements,
- or prescribe workouts.

As trust and validation improve, more reasoning authority may gradually move into the AI layer, but this should be an explicit product decision rather than an accidental consequence of implementation complexity.

---

# 17. Configuration versus learned behavior

The system should distinguish:

**Hard configuration**

Examples:

- outdoor running minimum temperature,
- rain tolerance,
- planning hours,
- activity schedule,
- explicit task labels,
- contexts.

**Personal preferences**

Examples:

- dislikes hard workouts late in the evening,
- prefers outdoor tasks before exercise,
- generally accepts 30-minute desk tasks between meetings.

**Learned observations**

Examples:

- a nominal 30-minute task normally takes 55 minutes,
- recommendations for physical chores after long runs are consistently rejected.

Hard configuration remains authoritative.

Learned behavior can influence soft ranking but should not silently override explicit constraints.

---

# 18. UI philosophy

The dashboard should remain glanceable.

Increasing backend sophistication should not produce an increasingly complicated homepage.

The primary page should continue to answer:

- What kind of day is this?
- What should I pay attention to?
- What activity adjustment, if any, is appropriate?
- What are the best things to do next?
- What does my schedule look like?
- What should I prioritize nutritionally?

Complexity should live behind:

- dialogs,
- expandable reasoning,
- detail pages,
- and optional diagnostics.

Feedback controls should similarly remain compact.

---

# 19. Data-quality observability

Because recommendations increasingly combine multiple sources, the user must be able to distinguish:

- a meaningful recommendation,
- a degraded recommendation,
- and a recommendation that cannot safely be made.

The existing source freshness and failure behavior should therefore evolve into a reusable source-health model.

The system should know:

- which inputs contributed,
- when they were measured or retrieved,
- whether fallback data was used,
- whether an important input was unavailable,
- and which recommendation was weakened as a result.

Source failures should remain isolated whenever possible.

---

# 20. Roadmap expectations for Codex

Using this document and the current v0.1 implementation, produce an implementation roadmap from the existing system toward the target architecture.

Do not treat every capability in this document as a requirement for the next release.

The roadmap should identify:

| Area | Required analysis |
|---|---|
| Architecture | When and how decision logic should migrate out of frontend cards |
| Data contracts | Canonical normalized models needed between sources and decisions |
| Persistence | Which milestones actually require a database |
| Todoist | Metadata vocabulary and backlog-enrichment strategy |
| Activity planning | How recurring/planned exercise enters the context model |
| Capacity | Initial deterministic physical-capacity model |
| Weather | Per-activity suitability rules |
| Calendar | Today + short-horizon planning support |
| Nutrition | Progression from status to directional guidance |
| Feedback | Storage schema and compact UI interaction |
| History | Baseline computation strategy |
| Household context | Manual context controls first |
| AI | Appropriate insertion point after deterministic foundations mature |
| Testing | Scenario-driven tests for every recommendation rule |
| Migration | How v0.1 behavior remains functional throughout architectural changes |

For each proposed phase or milestone, identify:

- user-visible capability,
- required data,
- architectural dependencies,
- persistence requirements,
- changes to existing modules,
- testing strategy,
- migration risk,
- and what should explicitly remain deferred.

Prefer increments that result in a working dashboard at every stage.

Avoid a large rewrite that requires the entire future architecture to exist before delivering improvements.

---

# 21. Near-term priorities implied by the vision

The first substantial improvements beyond v0.1 should likely focus on foundations rather than AI.

Priority areas include:

1. Define and populate Todoist suitability metadata.
2. Represent the user's planned activity schedule.
3. Add deterministic per-activity weather suitability.
4. Improve recovery-related activity adjustment without creating workout prescriptions.
5. Introduce physical-demand awareness between planned exercise and Todoist tasks.
6. Improve task ranking beyond due-date and priority weighting.
7. Decide where the decision engine should live once frontend-only execution becomes limiting.
8. Define the canonical Daily Plan Model.
9. Design persistence before implementing feedback or learned baselines.
10. Add lightweight feedback only once recommendation identities and persistent storage exist.

AI-assisted daily synthesis should follow these foundations rather than substitute for them.

---

# 22. Success criteria

The dashboard is succeeding when the user increasingly does **not** need to individually inspect Garmin, weather, calendar, Todoist, nutrition, and other applications simply to decide how to structure the day.

A mature version should be able to communicate something conceptually like:

> Recovery looks normal and your planned run is reasonable, but steady rain and temperatures in the 40s overlap the only useful outdoor window. An indoor session would better fit today's conditions. You have a 90-minute opening before lunch that fits the Jenkins task well. Because today's planned workout still represents a meaningful physical commitment, the lawn task has not been prioritized. Protein is currently the main nutrition priority for your next meal.

Every major statement should be traceable to known inputs, explicit preferences, deterministic constraints, historical personal evidence, or clearly identified AI reasoning.

The desired end state is not a dashboard containing more information.

It is a system that makes the existing information substantially easier to act upon.
