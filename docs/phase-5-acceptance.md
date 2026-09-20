# Phase 5 final acceptance

Phase 5 implements the agreed deterministic environment, population, movement,
health, research and adjacent-land conflict systems. The creator still supplies
world changes through reviewed prompts; simulation ticks require no model calls.
Gameplay defaults remain unchanged by the final acceptance milestone.

## Reproduce the final checks

```sh
npm run check
npm run test:simulation
npm run test:simulation-browser
```

`check` includes 269 tests, type checking and the production build. The separate
scale command builds TypeScript, runs three bounded cases, verifies daily budgets
and frozen reference hashes, and prints timing/size JSON. It creates no files in
`worlds/` and does not contact a model. `test:simulation-browser` uses a temporary
saved world, starts its own server on an ephemeral port, and removes that world
when finished. Browser screenshots go to ignored `.local/screenshots/`.

## Evidence matrix

| Area | Evidence and limits |
| --- | --- |
| Compatibility | `transport.test.ts` retains two frozen pre-Phase-5 100-day hashes. Optional activation, transaction rejection and existing world formats remain covered by the full suite. |
| Water and climate | Exact per-zone runoff/sediment reports, one-hop transport, heat pulses and sustained settings, and neighbor effects. Combined scenarios reconcile retained water against rain, evaporation and ocean drainage each day. |
| Food, soil and demographics | Local production/consumption/overflow ledgers; soil/weather/worker effects; default surplus, crop failure and recovery control below. Named stock routes have separate conserved inventory tests. |
| Visits and migration | Temporary work/food/exploration, automatic relocation, timed journeys, closed borders, in-transit provisions and health. Tests include same-day guard reservation and blocked arrivals/resupply/recovery. |
| Pollution and disease | Daily air/water contaminant budgets, runoff, sanitation and farm effects. Generic susceptible/ill/immune accounting follows residents and travelers; no direct disease deaths. Air damage remains intentionally deferred. |
| Technology | Automatic selection, real worker costs, prior-day knowledge/effects, closed communication/borders, cultivation and installed-treatment improvement. |
| Factions and conflict | Explicit factions/territory/hostility, separate border channels, local garrisons, supplied expeditions, bounded combatant losses and capture. Civilians/buildings survive direct capture; tests cover cancellation, closures and returning survivors. |
| Long runs | 24-settlement scenarios: 1,000 days at 92 zones, 200 at 1,442 zones, 30 at 6,762 zones. Each day reconciles births, settlement/transit starvation and combat losses against total people, plus health and physical budgets. A second run matches every daily state hash; final hashes are frozen in the runner. |
| Persistence and interruption | The combined world is saved after 60 days, served through two clean server restarts without changing the save bytes or advancing time, then resumed for another 60 days and compared with uninterrupted simulation. History replay matches. Existing journal tests cover failed commits/orphan records; checkpoint/export coverage includes the 200-day conflict scenario. |
| Browser | A standard 1,442-zone combined world steps, saves and replays; all built-in overlays and active-system inspectors work. Temperature preview/cancel preserves the save. Reload, desktop/mobile layout and zero autonomous model calls pass. Screenshots inspected. Feature-specific browser acceptance was recorded at each earlier milestone in DEVELOPMENT.md. |
| Provider interface | No new operations or adapter changes in 5i. Shared operation-schema parity, scope/revision checks and forecast/apply tests pass. Prior milestone live native-provider evidence remains recorded; this milestone does not claim new live provider or paid API checks. |

## Balance controls and interpretation

With default settlement rules, a 100-person village supplied with 1,000 rations,
ideal temperature/rain and working drainage reaches 102 inhabitants after 60 days.
Removing all stored food and maintaining 60°C with no rain stops production;
28 days of shortage cause recorded population losses. Restoring weather and food
stops losses immediately, but the remaining population stays unchanged for 29
fully supplied days before slow growth resumes on the thirtieth.

The combined fixture starts with 3,600 inhabitants across 24 villages, installed
sanitation, researched effects available, explicit hostile factions and normal
birth/starvation settings. It intentionally supplies starting food and suitable
weather. Its 1,000-day case records 204 births and 44 combatant deaths, finishing
with 3,760 people. It has no starvation; shortage and recovery are exercised by
the separate control and stranded-survivor tests. This is a reproducible example,
not evidence that arbitrary terrain or creator rules produce a stable economy.

No default rates were changed: the tested behaviors match the agreed slow growth,
reserve requirements and delayed shortage losses. Creation tools already permit
world/local adjustments. Dense cities, extreme custom rules and different seeds
can yield different outcomes; there is no universal equilibrium target.

## Cost and scale

The checked-in [measurement record](phase-5-benchmarks.json) includes host/Node
metadata, tick median/p95/max, five-day proposal forecast time, serialized world
size, demographic totals and reference hashes. Timings include engine validation;
they exclude fixture creation, hash assertions, persistence, network transfer and
browser rendering. Cold samples remain included. Host load and garbage collection
make them observations rather than hardware-independent pass thresholds.

The standard-world probe was approximately 43–45 ms/day at p95; the maximum-size
probe was approximately 187–190 ms/day on the development host. A five-day candidate
plus baseline forecast was approximately 0.45 seconds at standard size and two
seconds at maximum size. The maximum-size world serialized to about 10.4 MB.
These cases use 24 settlements, not one on every zone, and do not maximize custom
plugins, entities, history or every optional stock route. They do not establish a
worst-case latency guarantee. The final verification also ran alongside browser
acceptance; small-case timing is particularly sensitive to that contention.

Work remains structurally bounded by schema limits (6,762 zones, 64 active
journeys, bounded rule/plugin programs, daily conflict departure limits). The
runner checks active journey and departure caps each day. At maximum size,
forecasting and save/transfer costs can be noticeable. Browser time controls
schedule the next step after the current request, so displayed speed is not a
promise of a fixed wall-clock day rate.

## Final scope and follow-up

The final UI correction makes the territory legend describe enabled border
policies; ownership alone is not a universal permission rule.

Phase 5 is complete within its agreed scope. Sea journeys, markets/currency,
army occupation, sieges, civilian displacement, building damage/repair, direct
air-pollution damage and richer technology effects remain future features.
Broader UI polish, dense-world profiling, save/response size reduction and the
existing frontend bundle-size warning belong to subsequent scale/polish work.
No live world was used as an acceptance fixture or silently activated.
