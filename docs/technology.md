# Knowledge and technology — Phase 5g plan

Phase 5g is divided into three reviewable deliveries:

1. **5g1 — local research:** versioned world technology definitions, settlement
   projects, tangible worker-time costs, recorded progress and bounded farm
   improvements. Completion takes effect on the following day. Preserve existing
   worlds until reviewed activation. Show costs, stalled work and completion.
2. **5g2 — knowledge exchange:** separately enabled adjacent communication, frozen
   daily knowledge snapshots, closed-channel enforcement, prerequisites and
   explicit teaching/learning accounting. No same-day knowledge retransmission.
3. **5g3 — broader unlocks and acceptance:** water-treatment improvements, resource
   costs if useful, custom-rule reads and integrated multi-settlement scenarios.
   Check definitions, replay, migration, depopulation, food, health and transport.

The player confirmed automatic settlement project selection and improved
cultivation as the first example. Research
workers are healthy residents staying home, excluded from that day's farm labor;
ordinary meals remain accounted once. Visitors do not simultaneously research.
No model calls occur during research or knowledge exchange.

Implementation requirements:

- Technologies are world data interpreted by fixed engine primitives, not code.
- Local acquisition is distinct from global definition. Defining a technology
  does not grant it to every settlement.
- Research never creates inhabitants, food or worker time. Pausing retains progress.
- Flooded/submerged/empty settlements cannot research; food and health affect
  available workers. Explain stalls and protect configurable food reserves.
- Never compound bonuses by repeatedly rewriting base settlement settings. Derive
  bounded effective capacities from completed knowledge; preserve creator settings.
- Save completion time so bonuses begin at an explicit next-day boundary.
- Inactive old saves remain unchanged. Validate scope/version/dependencies and
  reject incomplete proposals atomically. Preserve replay and portable saves.
- Imported knowledge and new effects must not silently alter earlier completions.

Implemented contracts for the first substep follow below. Phase 5g is not yet complete.

## Implemented: 5g1 automatic local research

Confirmed by the player: settlements choose projects automatically; improved
cultivation is the first example. **Knowledge exchange remains 5g2 work.**

### Activation and world definitions

Use the inspector's **Research and technology → Review enabling research**, then
**Review cultivation technology**. These are two independently reviewed proposals.
Activation starts with no definitions; defining a technology makes it available
to every active settlement, without granting knowledge or changing progress.
Existing worlds remain unchanged until reviewed activation.

World `technology` is optional, with model `local-research-v1`, a version, enabled
flag, settings and at most 16 definitions. Settings default to `workerPermille:100`
(10% of residents) and `reserveDays:7`. Reviewed prompts can adjust the fraction
from 0–1,000 and reserves from 0–3,650 days. A zero fraction pauses automatic
research, while explicit manual assignments retain their own worker budget.

Each immutable definition has a stable lowercase ID, label, `workRequired`
(1–1 billion worker-days) and `farmBonusPermille` (0–1,000). The cultivation example
requires 200 worker-days and adds 200 permille (20%) to farm capacity and worker
productivity. Definition edits/removal and prerequisites are not supported in
this first milestone. New definitions use new IDs and cannot silently rewrite
completed knowledge.

### Daily selection, labor and food

After journey arrivals, neighbor visits and illness contact spread, but before
farming/meals, populated land settlements choose an unfinished project. Retain an
existing unfinished automatic assignment; otherwise choose the cheapest total
work requirement, with stable ID as tie-breaker. One project is worked per day.

Automatic daily allocation is `floor(population * workerPermille / 1000)`, minimum
one when the fraction is positive. Bound this by healthy residents who stayed
home and the remaining required work. Illness only excludes workers when health
is active, consistent with farming. Visitors of every purpose are unavailable
for home research; incoming workers can farm but never research simultaneously.

Each researcher contributes one worker-day and is subtracted from farm labor.
There is no invented extra food charge: researchers consume their ordinary home
meal exactly once. Research requires **pre-harvest** food of at least
`population * (reserveDays + 1)`: reserves plus today's meals. This is a start-of-day
threshold, not a guarantee against future shortages. Automatic food collection
and sharing have already occurred. Empty, unoccupied, submerged or flooded zones
(over 100 mm standing water) do no work. Temperature/soil affect food production,
not research directly.

The local daily report records actual workers/progress and why activity stopped:
idle (no selected/remaining project), paused, empty, terrain, food, no available
workers or completed. Progress is integer,
cannot overrun the requirement and completion records the current tick.

### Completion and farm effects

On the **following day**, combine completed local bonuses additively, capped at
+100% overall. Multiply both base farm capacity and available-worker output by
this factor, floor each and take their minimum, with a 10-million-ration absolute
capacity cap. Existing temperature, moisture, soil fertility, flooding and water
quality rules still limit actual production. No base settlement setting changes,
so bonuses never compound daily and creator edits remain meaningful.

Neighbor work-trip assignment currently uses base farm staffing needs; the shared
capacity/productivity factor normally preserves that staffing ratio. At the
absolute capacity ceiling, work visits can exceed useful staffing. Research does
not request additional visiting workers to replace researchers in this milestone.

### Local archives, overrides and pause

Optional tile `research` stores projects (technology ID, progress, completion tick),
assignment, local pause and last daily report. Treat these as local archives:
progress/knowledge remain when population leaves or a settlement is removed.
New inhabitants can use the archive; travelers do not carry it elsewhere. Sharing
between zones and prerequisites will require explicit future mechanics.

- `technology-configure`: world scope; `expectedVersion` 0 initially/current later,
  `enabled`, complete `settings`. Increments the shared technology version.
- `technology-define`: world scope; current `expectedVersion` and a complete
  definition. Increments version; rejects duplicate IDs or more than 16 definitions.
- `research-assign`: local populated land settlement; existing `technologyId`,
  `workers` 1–1 million, `reserveDays` 0–3,650. Overrides automatic selection.
  Keeps all previous progress; rejects already learned projects. A completed
  manual assignment stays selected until the creator changes it.
- `research-pause`: local pause, keeps archives and learned bonuses.
- `research-auto`: clears local pause/manual override; automatic choice resumes
  on the next day and retains project progress.

Global pause disables research **and farm bonuses**, preserving archives. Local
pause only stops research. Simulation calls no model; prompts can discuss a plan
before proposing operations and all operations pass the existing review workflow.

### Validation and remaining work

Inspector reports show allocation, progress, stalls and completion/bonus dates.
Five-day previews compare research against the unchanged baseline; longer projects
will not complete within that window. Tests cover labor, food, terrain, illness,
visits, automatic/manual selection, paused archives, completion timing, immutable
IDs, bad progress, world scope, forecast purity and 100-day replay/checkpoint/portable
saves. `npm run test:technology` checks the full browser flow with isolated saves.

Next: **5g2 knowledge exchange** with communication gates and frozen one-hop
snapshots, followed by 5g3 broader unlocks/integration. No water-treatment unlock,
resource-input cost, custom-rule knowledge read or knowledge transfer is implied
by the current cultivation primitive.
