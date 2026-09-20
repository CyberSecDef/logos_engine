# Factions and conflict — Phase 5h plan

Phase 5h is split into four deliveries:

1. **5h1 — identities and territory:** named/color-coded factions, stable IDs,
   tile ownership, explicit symmetric relationships, a territory overlay and
   reviewed world/local edits. Ownership does not create or move inhabitants.
2. **5h2 — borders and mobilization:** 5h2a border policy is implemented; 5h2b mobilization remains next. connect explicit faction policy to defined
   travel/trade/knowledge channels, reserve existing inhabitants and provisions,
   and explain why movement or preparation stops. Avoid a second population ledger.
3. **5h3 — conflict resolution:** automatic initiation under explicit world rules,
   bounded deterministic contests, explicit supplies/losses/territory changes and
   recovery. No autonomous LLM calls or invented abstract political scores.
4. **5h4 — integration:** closures, stranded travelers, food/health/research,
   displacement, recovery, replay and long-run acceptance. Phase 5i then tunes the
   full world including conflict.

Confirmed: the creator establishes named factions and their initial territory.
Conflict initiation will be automatic under explicit world rules when the conflict
mechanics are implemented in the following milestones.

Identity and territory are implemented, together with separately enabled border
rules. A hostile label alone does not close a border or cause casualties or war.
Mobilization and conflict consequences remain future milestones. Existing worlds
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
Full Phase 5h remains open; border policy is described below, mobilization is next.


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
model calls. Phase **5h2b mobilization**, **5h3 automatic conflict**, **5h4 combined
acceptance**, and **5i whole-world tuning** remain to be implemented.
