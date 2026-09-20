# Factions and conflict — Phase 5h plan

Phase 5h is split into four deliveries:

1. **5h1 — identities and territory:** named/color-coded factions, stable IDs,
   tile ownership, explicit symmetric relationships, a territory overlay and
   reviewed world/local edits. Ownership does not create or move inhabitants.
2. **5h2 — borders and mobilization:** 5h2a border policy and 5h2b local resident garrisons are implemented; supplied troop movements are implemented in5h3a; automatic battles/capture are implemented in5h3b. connect explicit faction policy to defined
   travel/trade/knowledge channels, reserve existing inhabitants and provisions,
   and explain why movement or preparation stops. Avoid a second population ledger.
3. **5h3 — conflict resolution:** 5h3a supplied troop movements are implemented; 5h3b implements automatic initiation under explicit world rules,
   bounded deterministic contests, explicit supplies/losses/territory changes and
   recovery. No autonomous LLM calls or invented abstract political scores.
4. **5h4 — integration:** closures, stranded travelers, food/health/research,
   civilian preservation, recovery, replay and long-run acceptance. Phase 5i then tunes the
   full world including conflict.

Confirmed: the creator establishes named factions and their initial territory.
The first battles will use bounded combatant losses; civilians and infrastructure
survive capture. Displacement and building damage are later scope.
Conflict initiation will be automatic under explicit world rules when the conflict
mechanics are implemented in the following milestones.

Identity and territory are implemented, together with separately enabled border
rules. A hostile label alone does not close a border or cause casualties or war.
Local resident garrisons and supplied troop movements prepare the labor/supply
foundation; automatic adjacent battles/capture are implemented below in5h3b. Existing worlds
remain factionless until reviewed setup. Save schema extensions must remain
optional so existing replay remains unchanged.

Land claims are world-creator edits, not military conquests. Claims persist when
population leaves or terrain later submerges; no inhabitants, food, infrastructure,
research or health state are lost or granted by changing ownership. A zone can be
unclaimed. Stable faction identity is separate from its editable name/color.

Factions, relations and territory changes must be visible in previews, inspector,
provider context and a territory overlay. Definitions/relationships require world
prompt scope; a claim requires only its affected tile scope. Referential integrity,
version checks, atomic rejection, checkpoints and portable replay apply throughout.


## Implemented: 5h1 identities, territory and relationships

Open **Factions and territory** in the inspector. Review a faction definition,
then review claiming the selected land zone for it. Defining a faction alone does
not claim any land. Use the **Territory** overlay to view faction colors; grey is
unclaimed. The creator remains a world creator rather than a member of a faction.

### Data and operations

Optional world `factions` has model `territory-v1`, a shared positive version,
up to32 definitions and up to496 unordered relationship pairs. A definition has a
stable lowercase `id`, editable `label` (1–80 characters) and `color` (#RRGGBB).
Optional tile `factionId` identifies its owner; absence means unclaimed. Old saves
remain without these fields, and ticks do not create factions or expand territory.

| Operation | Scope and version | Behavior |
| --- | --- | --- |
| `faction-define` | World; `expectedVersion`0 initially/current thereafter | `faction:{id,label,color}` creates or updates identity presentation; increments registry version |
| `faction-remove` | World; current version | Removes an unclaimed faction and its relationship records; rejects if it still owns any zone |
| `faction-claim` | Local tile; proposal revision | Existing `factionId` assigns/replaces ownership; explicit null releases it |
| `faction-relation` | World; current version | Distinct existing `factionId`/`otherFactionId`, relationship neutral/allied/hostile; increments registry version |

Registry edits in one proposal must use sequential expected versions. Claims do
not change registry version but still require the correct world revision. New
claims require land above sea level. Release is allowed even if a claimed zone
has subsequently submerged. Ownership remains through terrain/population changes
unless explicitly changed; nothing is destroyed or transported by a claim.

Relations are symmetric, stored in canonical ID order. Unspecified pairs are
neutral; setting neutral removes a stored pair. Self-pairs, dangling IDs, duplicate
pairs and registry overflow reject atomically. Removing a faction requires first
releasing or reassigning all its territory; removal clears only that faction's
relation records. Historical proposals retain prior identities for replay.

### Inspector and previews

The inspector shows owner, faction territory/resident totals and stored relations.
Totals count residents of owned zones, **excluding travelers**, and do not claim
personal citizenship. Migrants, visitors and transit parties have no faction
allegiance in this first milestone. Land ownership is distinct from population.

Previews show registry/territory totals before and immediately after Apply, then
five days later. Each operation discloses its scope and limits. Prompts can create,
rename, recolor or remove factions, claim/release zones, or record relationships;
registry edits require Entire world scope and local claims obey selected tile scope.
The model is still called only for user requests.

### Identity foundation acceptance

The original 5h1 relationship records remain inert when no border policy is
enabled. Hostility does not start a battle. Automatic conflict under explicit
rules remains the confirmed direction after mobilization and supply accounting.

`npm run check` covers identity updates, land claims/releases, submerged/depopulated
territory, symmetric relationships, removal dependencies, dangling references,
limits, atomic/version/scope rejection, overlay color, unchanged simulation output,
read-only forecasts, replay, checkpoints and portable archives. The model response
schema explicitly supports required nullable ownership for releases.
`npm run test:factions` covers browser review/cancel, claims/releases, relations,
territory overlay, unchanged population, save/replay/reload and responsive layouts.
Full Phase 5h remains open; border policy and local garrisons are described below.


## Implemented: 5h2a hostile border policies

Confirmed player choice: independently block hostile **travel**, **trade**, and
**knowledge**, with allied, neutral, same-owner and unclaimed borders open.
Existing local permissions still apply. No policy means the previous behavior.

In **Factions and territory**, choose which hostile channels to block, then
**Review enabling/updating borders** and Apply. **Review pausing border rules**
disables enforcement while retaining channel choices. The inspector lists blocked
neighboring edges; previews include the policy plus five-day journey, delivery,
visit, migration and research consequences. No model call is needed for these
controls. Example advisor request using **Entire world** scope:

> Enable hostile border restrictions for travel and trade, but allow knowledge
> exchange. Explain how this affects journeys already under way.

### World interface

Optional `factions.borders` has `{model:"hostile-borders-v1", enabled, travel,
trade, knowledge}`. Every boolean is explicit; a true channel blocks only while
`enabled` is true. `faction-borders-configure` requires `tileId`, the current
registry `expectedVersion`, and all four booleans. It requires an existing faction
registry and Entire world prompt scope, and increments the shared registry version.
Changes are reviewed, atomic, revision guarded and included in replay/checkpoints
and portable saves. Multiple registry edits use sequential expected versions.

Checks use the **current territorial owners of each edge**, symmetrically. Claims,
releases and relationship changes can therefore change restrictions immediately.
They do not rewrite ordinary per-zone flags. No personal citizenship is assigned
to migrants, visitors or cargo. A route through unclaimed territory can bypass a
closed direct edge; this is territorial access, not an origin-based embargo.

| Channel | Consequences at hostile edges |
| --- | --- |
| Travel | Blocks routine work/exploration/food visits, automatic migration departures, creator journey departures and every subsequent journey hop; pathfinding searches open alternatives |
| Trade | Blocks adjacent food sharing, food-collection visits, named stock routes and journeys carrying positive stock cargo; work/exploration remain travel-controlled |
| Knowledge | Blocks neighbor research acceleration; local research and completed archives remain intact |

Named stock routes and food-collection visits require **both travel and trade**.
Food sharing requires trade, but retains its existing independence from physical
travel permissions. Personal journey food provisions are exempt from trade blocks;
stock cargo is not. Knowledge retains its existing independent communication gates.
Physical water, air, pollution and temperature transport ignore faction borders.
Generic custom transfers remain governed by their own declarative rules and can
represent magic or physical flows; they are not automatically treated as trade.

### Travelers and diagnostics

A journey encountering a closure reports `border-closed`, waits in its current
zone, and preserves its remaining leg time, inhabitants and cargo. Waiting people
still consume provisions and follow the existing starvation rules. Reopening
resumes the same leg, without duplicate arrivals or grants. Ownership/relationship
changes take effect on the next crossing check. No new forced displacement occurs.

A stranded party can be provisioned from its current settlement, redirected, or
docked locally when ordinary land/travel/capacity requirements allow. Redirecting
may retain a blocked future path; actual movement still checks every edge. Local
docking/provisioning crosses no border. Named routes also report `border-closed`;
the inspector shows the exact blocked neighbor channels, distinct from ordinary
zone closures. Automatic visits/migration select only permitted edges.

### Acceptance and remaining work

`npm run check` covers independent/symmetric switches, optional activation, local
permissions, alternate paths, atomic rejection, in-flight waits/reopening,
provisioning/docking, stock cargo, food conservation, migration, named versus
generic transfers, local versus assisted research, scope/version checks, pure
forecasts, checkpoint/export/replay and unchanged physical simulation.
`npm run test:faction-borders` covers review/cancel/apply, settings, stranded
travelers, pause/reopen, saved reload/replay, responsive layouts and no autonomous
model calls. Phase **5h4 combined acceptance** is documented below;
**5i whole-world tuning** follows.


## Implemented: 5h2b local resident garrisons

Confirmed player choice: local resident garrisons first. Designated service slots
stay within the settlement population and normal meal/health accounting. Healthy
home residents fill service slots before research and farming. This implements
mobilization preparation; it does not add movement orders, attacks or casualties.

Select a claimed land settlement, open **Garrison service**, set **Resident service
slots** and **Food reserve days required**, then review and Apply. **Review
demobilizing** sets the target to zero and releases the allocation. A paused game
does not spend food or labor. Example local advisor prompt:

> Assign 40 resident service slots here, requiring seven days of food reserves.
> Explain the farming impact before I apply it.

### Interface and invariants

Optional tile `garrison` has model `resident-garrison-v1`, a local `version`,
`target` (integer0–1,000,000), `reserveDays` (integer0–3,650), and optional `lastDay`.
`garrison-configure` accepts `tileId`, current `expectedVersion` (0 initially),
`target` and `reserveDays`. It is a local operation, obeys tile/neighbor/world
prompt scope, and increments its own version rather than the faction registry.
A positive target requires a claimed land settlement and cannot initially exceed
its existing population. Subsequent population losses do not erase the target:
actual reservation is capped by remaining residents. Target zero demobilizes even
if terrain has submerged. Removing a demobilized settlement removes its configuration.

This is a **resident labor allocation**, with no second population, health or food
ledger. Service slots are fungible daily allocations, not named soldiers or a
permanent separate health cohort. Ill residents cannot serve while the disease
model is active. Reserved slots stay home even when some are unfilled by healthy
workers. Demobilization frees those slots for ordinary visits or migration.

Ownership changes and settlement removal require target zero first, even if service
is temporarily paused. A proposal may demobilize and then change ownership in
sequence. No silent transfer of a garrison to a new faction occurs. Population
creator edits, births and starvation still work through existing settlement rules.

### Daily order, costs and permissions

1. After journey arrivals, ecology and food sharing, take a snapshot of service
   eligibility. Require population, land above sea, standing water at most100mm,
   and food at least `population * (reserveDays + 1)`. The extra day covers today's
   meals. Otherwise report empty, terrain or food and reserve zero slots.
2. Reserve `min(target, population)` home slots. Routine visits can use only the
   remaining residents. Neighbor farm job availability includes vacancies created
   by service. Food-sharing policy operates before this reservation.
3. After visit health and contact infection, staff at most the reserved slots from
   healthy residents physically at home. Remaining healthy workers can research,
   then farm. Illness is subtracted once; visitors cannot serve in the host garrison.
4. All residents consume their usual settlement meal exactly once. No extra military
   rations, stockpile, training currency or equipment is created or charged.
5. Automatic migration can use only unreserved residents. Creator journey departures
   also check current eligibility and reject requests consuming reserved slots;
   demobilize first to release them. Incoming residents do not duplicate population.

The food threshold is a **service eligibility condition**, not an earmarked stock
reserve. It does not lock food against trade, provisions or creator edits. Eligibility
is sampled once for that day's service; later transfers can affect tomorrow's service.
A food pause permits residents to work and migrate again. Service automatically
resumes when conditions recover. Ordinary borders/permissions still govern movement.
There is no personal military allegiance, combat power, training, equipment, separate
army supply system or mobile army in this delivery.

### Reports and validation

`lastDay` records tick, starting population, reserved slots, healthy workers and
reason (`demobilized`, `empty`, `terrain`, `food`, `serving`, `illness`). Partial
healthy staffing still reports serving with the actual count. Settlement daily
reports add `garrisonWorkers`; garrison inspector shows both current eligibility
and the last completed day's service. Preview shows day+5 staffing and existing
farm/research/food consequences without advancing the save.

`npm run check` covers exactly-once meals and population totals, farm/research
competition, visits/migration, health/contact, food/terrain pauses and recovery,
manual departure limits, safe ownership/removal, attrition, versions, malformed
reports, scope, pure forecasts, deterministic replay, checkpoints and portable saves.
`npm run test:garrisons` covers review/cancel/apply, staffing costs, food pause,
demobilization, save/reload/replay, responsive layouts and zero autonomous model calls.
Supplied troop movement is described below (5h3a). Automatic adjacent conflict is described below (5h3b), including losses, capture
and recovery.


## Implemented: 5h3a supplied troop movements

Healthy garrison members can now move to reinforce another settlement belonging
to their faction. Open **Move garrison troops**, choose a destination, troop count,
carried rations and days per leg, then review and Apply. The pathfinder searches
own/allied open land; it does not cross neutral, unclaimed or hostile territory.
Ordinary local travel closures and enabled faction border restrictions still apply.

This delivery implements creator-directed reinforcement. It does not initiate
attacks, capture territory, or automatically dispatch armies. The separate opt-in conflict policy below supports automatic adjacent attacks,
with bounded combatant losses and civilian/infrastructure preservation. No LLM runs during ticks.

### Interface and departure accounting

`army-depart` has `tileId`, unique `journeyId`, `label`, simple adjacent `path`
(2–65 zones), `daysPerHop` (1–30), positive `population` (up to1,000,000) and
`foodRations` (up to1,000,000,000). It shares the journey ID namespace and the limit
of64 active journeys. All path zones must fit the prompt scope; use neighbors for
an adjacent destination or Entire world for a longer route. Example:

> Move 40 healthy garrison members from this zone to our other settlement, taking
> two days per leg and 400 food rations. Explain the departure and arrival effects.

The origin must have an eligible supplied garrison. Troop count cannot exceed the
reserved slots or healthy resident count. Ill residents are never recruited, even
when disease progression is paused. Susceptible/immune recruits use proportional
integer partition with largest remainders (susceptible first on ties), preserving
all existing health totals. The initial path must be own/allied open land and end
at an **own-faction** settlement; destination capacity is checked on arrival.

Apply atomically debits inhabitants, carried food and garrison target by the troop
count. It increments the source garrison version and clears its old daily report.
This avoids immediately replacing departing troops with another full levy. Source
settlement demographic counters reset as with civilian departure. No extra people,
food or health compartments are generated. Armies carry no custom stock cargo in
this first departure format.

Require at least `troops * legs * daysPerHop` food on departure and leave at least
`remainingResidents * (source.reserveDays + 1)` food at home. This deliberately
budgets every planned travel day, including the arrival day, even though arrival
meals are handled at the destination. These are departure checks, not a guarantee
against later delays. Food capacity can limit the largest possible deployment.

### Persistent identity and daily behavior

An army is a normal saved journey with optional
`military:{factionId,homeTileId,reserveDays}`. Allegiance is frozen in transit,
independent of later changes to its origin's owner. Civilians keep their existing
territorial movement model and gain no personal faction identity.

Armies use existing transit meals, starvation settings frozen at departure,
health progression, contact handling, arrival capacity and deterministic priority.
They are included once in world population, health, food and portable/replay totals.
Each hop rechecks friendly access at both current and next zones, plus normal
land/travel/border restrictions. If access changes, `military-access` reports a
wait, retaining leg progress. Waiting still consumes food and can cause existing
starvation losses; no combat losses occur in this milestone.

Arrival or local `journey-dock` requires an own-faction settlement with full
population/food/cargo capacity. It transfers surviving people, food and health once
and reinforces that settlement's garrison target by survivors, capped by the
resulting resident population. Existing reserve-day settings stay intact; a new
garrison inherits the departure reserve-day setting. Local garrison version is
incremented. Arrivals participate in the destination's ordinary service and meals
that day, with no transit meal double charge. Zero-survivor recovery creates no
new service slots.

### Recovery and limits

Use the existing reviewed `journey-provision`, `journey-redirect` and
`journey-dock` operations. Provisioning requires a local own/allied settlement and
debits its food; later resupply retains ordinary journey semantics without imposing
the initial departure's home reserve check. Redirects must use own/allied territory
and end at an own-faction settlement, reset leg time, and do not create provisions.
Redirects can be blocked by terrain/travel flags until repaired. If the current
zone loses friendly status, restore ownership/alliance before local resupply or
movement; no automatic retreat through hostile territory exists yet. Ending a
journey restores service slots rather than discarding the troops.

Faction removal rejects while any active army retains its identity, including
zero-survivor parties awaiting recovery. Journey reports record the military faction
for arrivals/losses after the active party is gone; historical report IDs remain
valid even if that faction is subsequently removed. Separately enabled automatic expeditions use the campaign rules below. Friendly
reinforcement journeys retain their original access checks.

`npm run check` covers exact departure/arrival accounting, healthy recruitment,
provisions/home reserves, friendly access, ownership changes, recovery, capacity
waits, starvation/health totals, shared IDs, removal safeguards, full path scope,
pure previews, checkpoint/export and deterministic replay. `npm run test:armies`
checks review/cancel/apply, debits, military identity, meals, arrival/reinforcement,
saved transit reload/replay, responsive layouts and no autonomous model calls.


## Implemented: 5h3b automatic adjacent conflict

**Explicitly opt in** using **Conflict rules**. Configure the numeric rules and
review the five-day forecast before Apply. Hostile relationships alone remain inert.
The creator confirmed that invasions ignore civilian travel/border closures, and
that battles kill combatants while preserving civilians and infrastructure.

### World policy and defaults

Optional `conflict` uses `adjacent-conflict-v1`, an independent version, `enabled`,
settings, an ID sequence, per-zone cooldown timestamps and a daily battle/launch
report. `conflict-configure` requires Entire world scope, an existing faction
registry, current `expectedVersion` (0 initially), `enabled` and all settings.
Configuration preserves sequence/cooldowns. Old saves without conflict stay unchanged.

| Setting | Default | Meaning / bounds |
| --- | --- | --- |
| deploymentPermille | 500 | Deploy 50% of eligible healthy garrison workers; 0–1000 |
| minimumTroops | 10 | Minimum expedition size; 1–1,000,000 |
| daysPerHop | 2 | Days outward and again returning; 1–30 |
| provisionDays | 7 | Rations per deployed person; 1–365, at least twice leg days plus1 |
| cooldownDays | 30 | Minimum days since either zone's last launch/battle/cancellation; 1–3650 |
| lossPermille | 100 | Battle loss rate, default10%; 0–500 |
| requiredAdvantagePermille | 1250 | Planned troops must be at least125% of estimated defense; 1001–4000 |
| maxDeparturesPerDay | 4 | Global launch cap; 0–16 |

Settings are concrete world data, not changes to application code. The advisor can
explain or propose settings; ticks never call a model. Example Entire world prompt:

> Enable adjacent conflict with the default rules. Explain the likely population
> losses and show me the preview before I apply it.

### Launch and travel

After resident meals/sanitation, evaluate a frozen snapshot of garrison staffing,
health and food. Origins need a supplied, dry land settlement with healthy service
members. Destinations must be hostile adjacent dry land settlements. Unclaimed,
neutral and allied territory is not automatically attacked. Troop size is
`floor(healthyService * deploymentPermille / 1000)`, subject to minimum size and
required advantage. Defense estimates also exclude ill residents when disease is
paused. The expedition debits real residents, garrison target and carried food;
remaining residents keep their configured garrison food reserve plus one day.

Ascending origin ID, then target ID, resolves competing choices. Fronts are
**disjoint**: a zone cannot participate in another expedition while a campaign
involving it is active. Cooldowns are stamped at launch and resolution/cancellation.
The global daily cap and shared64-journey limit apply. This first model does not
combine several armies into one battle or coordinate attacks across fronts.

Campaign journeys carry `military.mission: assault | return | cancelled` while
retaining faction identity, health and ordinary transit food/starvation accounting.
Assaults take the configured outward leg before reporting `battle-ready`. Assaults
and their returns bypass civilian travel flags and faction border restrictions;
physical land requirements and own-faction recovery/capacity checks still apply.
Friendly reinforcement journeys without a mission retain their existing gates.

### Battle and capture

Resolve ready campaigns after visit contact and garrison staffing, before research
and farming. Strength is healthy surviving attackers versus healthy garrison
members physically at home. Ill residents and residents away on visits cannot be
combat casualties, even when disease progression is paused. Compute both losses
from the same pre-battle strengths:

```
losses = min(ownStrength,
             ceil(ownStrength * lossPermille / 1000),
             ceil(opposingStrength * lossPermille / 1000))
```

Deaths reduce actual population and the corresponding susceptible/immune health
compartments. There is no abstract damage score and no direct civilian or illness
mortality. Integer rounding can remove a lone combatant; zero opposing strength
or a zero loss rate causes no combat deaths. The stronger surviving healthy force
wins; ties preserve the defender's ownership. A reinforcement or illness during
travel can reverse the original launch advantage.

Capture changes only ownership and demobilizes surviving defenders. Civilians,
surviving residents, buildings, food, local research and custom inventory stay.
There is no looting, forced displacement, conversion into a new army, or extra
housing demand from occupiers. Secondary food shortages can still harm civilians
through the existing settlement rules; preservation describes capture's direct
consequences, not immunity from later simulation effects.

Surviving attackers, whether victorious or repelled, spend a full return leg.
Own-faction arrival transfers remaining people/health/food once and restores
service slots under existing army arrival rules. Existing arrivals/food sharing
precede battles; research, farming and subsequent permissions see captured ownership.
Ready disjoint fronts have no shared troops or defenders, preventing double losses.

### Pause, peace and recovery

Pausing stops new expeditions and cancels pending assaults on the next tick.
Ending hostility, removing the target settlement, submerged endpoints or an empty
party also cancels an assault. Cancellation attempts recovery in the current home
zone on the following tick; this avoids charging both transit and resident meals
on the cancellation day. Existing return legs continue when conflict is paused.

All parties retain food, health and population while waiting. Lost home ownership,
submergence or insufficient home capacity can strand returns/cancelled parties.
The creator can restore conditions or use reviewed local army recovery controls.
Zero-survivor parties retain any inventory for manual recovery; no resources vanish.
Return missions may leave hostile territory, but must recover into their own faction.
Redirecting a campaign to a friendly route clears its campaign mission and uses
ordinary reinforcement access. Changing policy travel days affects future launches;
existing parties retain their saved leg duration. Battles use the current loss rate.

### Diagnostics and acceptance

Daily launch records identify origin, target, troops and provisions. Battle records
show outcome, factions, pre/post combatant counts and exact losses. Capture/repulse
also add world events. The inspector shows the latest report; previews collect
**all five forecast days**, including launches and battles that finish before day5,
and compare total population against the unchanged-policy baseline. Other births,
starvation and movement remain part of those totals; a five-day preview is bounded.

Unit coverage includes activation/version/scope, supply/force/cooldown limits,
disjoint fronts, capture and ties, civilian/infrastructure preservation, health
and visitor protection, closed civilian borders, pause/peace, stranded returns,
pure forecasts, replay/checkpoint/export and malformed accounting. Browser
acceptance is `npm run test:conflict`. Integrated acceptance (5h4) is documented below;
whole-world balance/performance tuning (5i) remains; naval warfare, sieges,
building damage and displacement are future scope.


## Phase 5h4: combined acceptance

`tests/conflict-integration.test.ts` adds full-tick integration scenarios to the
existing conflict, army, border and garrison acceptance tests. Run them through
`npm run check` (or build TypeScript and run the compiled test file).

| Scenario | Required evidence |
| --- | --- |
| Expedition plus automatic relocation | From 200 residents and 120 guards, 60 troops depart; the 60 remaining guards stay reserved while at most 80 civilians migrate to a better supplied neighbor. All 400 inhabitants across the three settlements and journeys remain accounted for. |
| 200-day combined world | Conflict, hostile borders, farming, fertility, weather, pollution, disease/contact, visits, migration, food sharing and research all enabled. Actual battles, losses, air transport, visits and completed research occur. Daily population equals initial population minus recorded combat losses with births/starvation disabled in this fixture; health population agrees. Air and water pollution budgets balance every day. |
| Persisted reproducibility | Every day matches a separate deterministic run. A reviewed temperature-pulse forecast leaves the input unchanged. The 200-day saved history replays exactly; checkpoints and portable exports preserve the complete state hash. |
| Stranded survivors and recovery | Submerging home blocks the return journey while provisions are consumed and recorded starvation removes real people. Resupply conserves food. Restoring land lets survivors return and reinforce exactly once, even with civilian travel closed. Disease compartments agree with population throughout. |

The relocation scenario exposed a scheduling bug: automatic expedition departure
cleared the home garrison report before the migration phase, releasing all remaining
guards to migration. Departure now subtracts only the departing reserved slots and
workers from that day's report. Remaining guards retain their reservation; staffing
is not run a second time. The report's population remains its original staffing
snapshot, consistent with other within-day reports. No saved schema or prompt
operation changes are required.

Existing tests cover hostile civilian closures/reopening, independently blocked
trade and knowledge, food-limited service, illness/visitors excluded from combat,
peace/pause cancellation, ownership/housing-blocked returns and recovery, and
preservation of civilian infrastructure on capture. Forced displacement and building
damage remain future mechanics. Phase 5i still owns broader balance and performance
tuning; the small deterministic acceptance world does not establish large-world
performance or long-term gameplay balance.
