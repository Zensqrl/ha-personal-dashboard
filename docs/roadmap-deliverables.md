# Roadmap Deliverables and Approval Gate

## Roadmap deliverables and approval gate

The initial roadmap exercise is a planning and review task only.

Do not immediately convert the vision into Todoist backlog items or begin implementing roadmap features.

Produce a compact, visually reviewable roadmap package rather than a single large Markdown document.

### Required artifacts

Create:

1. **Visual roadmap**
   - Show major phases, sequencing, dependencies and architectural transition points.
   - Prefer an editable format such as Mermaid and/or Draw.io rather than a static PNG.
   - The entire high-level roadmap should be understandable from this artifact without reading detailed prose.

2. **Target architecture diagram**
   - Show the evolution from the current v0.1 browser/controller/model architecture toward the proposed long-term architecture.
   - Include source adapters, normalized context, decision engine, persistence, Home Assistant presentation, feedback and optional AI layers.
   - Clearly indicate which components exist today versus proposed future components.

3. **Roadmap workbook**
   - Create an editable spreadsheet containing the detailed roadmap.
   - Include at minimum:
     - phase
     - capability
     - user-visible value
     - current-state gap
     - required inputs/data
     - architectural dependency
     - persistence requirement
     - AI requirement
     - implementation dependency
     - risk/uncertainty
     - proposed/deferred status
     - approval status
   - Use separate sheets where useful for phases, architecture decisions, dependencies and deferred capabilities.
   - This workbook is planning material, not a Todoist task list.

4. **Concise roadmap summary**
   - Keep narrative documentation intentionally short.
   - Target approximately 2–4 pages of meaningful material rather than an exhaustive specification.
   - Refer to the diagrams and workbook for detail instead of duplicating them in prose.

5. **Optional interactive visualization**
   - If it materially improves review, create a small self-contained HTML roadmap that visually presents phases and allows details to be inspected interactively.
   - Keep its underlying data/configuration editable and committed with the project.

### Artifact principles

Prefer artifacts that are:

- editable,
- source controlled,
- easy for a human to scan,
- easy for Codex to revise,
- and structured enough to become inputs to later planning.

Do not use static generated images as the sole source of architecture or roadmap information.

PowerPoint or PDF may be created as secondary presentation artifacts if useful, but they should not become the canonical roadmap source.

### Approval gate

After producing these artifacts:

1. Present the roadmap for user review.
2. Stop before creating implementation backlog entries.
3. Incorporate requested roadmap changes.
4. Obtain explicit user approval of the roadmap.
5. Only then use the Todoist Project Backlog skill to translate approved near-term roadmap work into actionable Todoist entries.

Do not automatically create backlog tasks for speculative ideas, future possibilities or explicitly deferred roadmap capabilities.

Deferred means documented in the roadmap, not automatically added to Todoist.
