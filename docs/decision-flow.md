# Decision flow

How the rule-based logic in `src/model.mjs` turns Home Assistant data into what the cards display. All of it is deterministic: no AI model, no inference service, no randomness.

## Overall pipeline

```mermaid
flowchart TB
    subgraph SRC["Data sources — Controller polls, caches, backs off"]
        HS[("HA entity states<br/>Garmin · sun.sun · weather attrs")]
        TD[("Todoist Enhanced WS<br/>todoist_enhanced/tasks · 5 min")]
        CAL[("Calendar REST<br/>calendars/entity · 5 min")]
        WX[("weather.get_forecasts<br/>hourly · 30 min")]
        NUT[("Nutrition MCP<br/>fitness_get_day · 1 min")]
    end

    subgraph GATE["Validation gates — fail closed, never assume"]
        G1{{"garmin()<br/>outcome ok · not retained · no fallback<br/>source_date = today · age ≤ 120 min"}}
        G2{{"taskStatus()<br/>complete · enrichment_complete<br/>stale = false · checked &lt; 10 min"}}
        G3{{"calendar ok<br/>cached day = today · age &lt; 10 min"}}
        G4{{"weather ok<br/>age &lt; 2 hr"}}
        G5{{"nutrition()<br/>today's diary · all totals+targets<br/>stale = false · age ≤ 15 min"}}
    end

    subgraph DERIVE["Derivation — pure rules"]
        B["bounds()<br/>planning window 08:00–21:00 local<br/>DST-ambiguous times rejected"]
        S["schedule()<br/>drop cancelled/transparent<br/>merge busy · invert to free blocks"]
        R["recovery()<br/>effort verdict"]
        RT["rankTasks()<br/>score + block fit"]
        AS["Block assignment<br/>≤ 1 task per free block"]
        TR["Training window<br/>first unassigned block"]
    end

    MODEL["buildModel() → view model<br/>rec · sc · ranked · assignments · training · n · g · curve · sources<br/><i>pure · deterministic · no AI</i>"]

    subgraph VIEW["Cards — presentation only"]
        V1(["personal-day-brief"])
        V2(["personal-day-timeline"])
        V3(["personal-suggested-actions"])
        V4(["personal-signals"])
        V5(["personal-navigation"])
    end

    HS --> G1 --> R
    TD --> G2 -->|ready| RT
    G2 -->|"loading / timeout / contract /<br/>unavailable / auth / old / stale / incomplete"| MODEL
    CAL --> G3 --> S
    WX --> G4 --> RT
    NUT --> G5 --> MODEL
    HS --> B --> S
    G1 -->|"not fresh → labelled<br/>Retained / Fallback / Older"| MODEL

    S --> RT --> AS --> TR
    R --> RT
    R --> TR
    S --> TR
    R --> MODEL
    S --> MODEL
    AS --> MODEL
    TR --> MODEL

    MODEL --> V1 & V2 & V3 & V4 & V5
```

Every unavailable or unverified input degrades to an explicit labelled state. Nothing is silently assumed: no free time, no zero duration, no strong recommendation.

## Recovery verdict

`recovery()` in `src/model.mjs`.

```mermaid
flowchart TB
    A["Garmin readings<br/>via garmin()"] --> B{"All five fresh and non-null?<br/>body_battery · sleep_score<br/>hrv_last_night_average<br/>hrv_balanced_range lower + upper"}

    B -->|No| U["<b>Check your signals</b><br/>effort: Uncertain · tone: muted<br/>training: Easy movement<br/><i>suppresses training window entirely</i>"]

    B -->|Yes| C["Collect concern flags"]
    C --> F1{"Body Battery &lt; 35"}
    F1 --> F2{"Sleep score &lt; 60"}
    F2 --> F3{"HRV below balanced range"}
    F3 --> F4{"HRV above balanced range"}
    F4 --> F5{"Training readiness &lt; 40<br/><i>only if fresh</i>"}
    F5 --> F6{"Recovery time &gt; 0<br/><i>only if fresh</i>"}

    F6 --> D{"Any flag raised?"}
    D -->|Yes| LOW["<b>Make room for recovery</b><br/>effort: Low effort · tone: amber<br/>training: Easy walk / mobility<br/>each flag listed as a reason"]
    D -->|No| MOD["<b>Capacity for a steady day</b><br/>effort: Moderate effort · tone: teal<br/>training: Easy / base session"]

    LOW --> G["Gates downstream:<br/>training block capped at 15 min<br/>'physical' tasks blocked"]
    MOD --> H["Training block up to 30 min<br/>'physical' tasks permitted"]
    U --> I["No training window proposed"]
```

These are prototype planning cues, not medical thresholds or Garmin prescriptions.

## Task ranking and block fit

`rankTasks()` in `src/model.mjs`.

```mermaid
flowchart TB
    A["Tasks from Todoist Enhanced"] --> B["Filter: drop is_completed<br/>and is_uncompletable"]
    B --> C["Score = due weight + priority × 30<br/>overdue 1000 · due today 500 · else 0"]
    C --> D{"Duration known?<br/>effective_duration &gt; 0"}

    D -->|No| X1["No block · 'Duration unknown'<br/><i>never treated as zero</i>"]
    D -->|Yes| E{"Conflicting labels?<br/>outdoor AND indoor"}
    E -->|Yes| X2["No block · 'Conflicting context labels'"]
    E -->|No| F{"context: labels satisfied<br/>by configured contexts?"}
    F -->|No| X3["No block · 'Required context is not confirmed'"]
    F -->|Yes| G{"Timed due date resolvable?"}
    G -->|No| X4["No block · 'Due time is ambiguous'"]

    G -->|Yes| LOOP["For each free block:<br/>start = block.start + 10 min buffer<br/>end = start + duration"]
    LOOP --> T1{"Fits inside the block?"}
    T1 -->|No| NEXT["Try next block"]
    T1 -->|Yes| T2{"Finishes before due time?"}
    T2 -->|No| NEXT2["'Would finish after due time'"]
    T2 -->|Yes| T3{"'physical' label?<br/>requires Moderate effort"}
    T3 -->|Fails| NEXT3["'Physical effort needs<br/>stronger recovery signals'"]
    T3 -->|Pass| T4{"'daylight' label?<br/>requires sun.sun confirmation"}
    T4 -->|Fails| NEXT4["'Daylight not confirmed'"]
    T4 -->|Pass| T5{"outdoor / dry / min-temp labels?<br/>→ weatherWindow()"}
    T5 -->|Fails| NEXT5["'Rain risk' · 'Forecast gap'<br/>'Temperature outside range'<br/>'Wind above preferred limit'"]
    T5 -->|Pass| FIT["Block assigned · score += 20<br/>tone: teal · 'Fits a free block'"]

    NEXT --> LOOP
    NEXT2 --> LOOP
    NEXT3 --> LOOP
    NEXT4 --> LOOP
    NEXT5 --> LOOP

    FIT --> SORT["Sort by score desc,<br/>tie-break on task ID"]
    X1 --> SORT
    X2 --> SORT
    X3 --> SORT
    X4 --> SORT
    SORT --> OUT["Top 3 → Suggested actions<br/>Assigned blocks → Timeline"]
```

Suggestions are tentative. They do not reserve time, create calendar events or mutate Todoist.
