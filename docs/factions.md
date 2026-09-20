# Factions and conflict — Phase 5h plan

Phase 5h is split into four deliveries:

1. **5h1 — identities and territory:** named/color-coded factions, stable IDs,
   tile ownership, explicit symmetric relationships, a territory overlay and
   reviewed world/local edits. Ownership does not create or move inhabitants.
2. **5h2 — borders and mobilization:** connect explicit faction policy to defined
   travel/trade/knowledge channels, reserve existing inhabitants and provisions,
   and explain why movement or preparation stops. Avoid a second population ledger.
3. **5h3 — conflict resolution:** creator or rule-driven orders (player choice),
   bounded deterministic contests, explicit supplies/losses/territory changes and
   recovery. No autonomous LLM calls or invented abstract political scores.
4. **5h4 — integration:** closures, stranded travelers, food/health/research,
   displacement, recovery, replay and long-run acceptance. Phase 5i then tunes the
   full world including conflict.

Confirmed: the creator establishes named factions and their initial territory.
Conflict initiation will be automatic under explicit world rules when the conflict
mechanics are implemented in the following milestones.

The first milestone records identities, territory and relationships. It does not
silently turn a hostile label into casualties, border closures or a war. Later
milestones must explicitly define those tangible consequences. Existing worlds
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

### Current limits and acceptance

Neutral/allied/hostile are **relationship records**, with no automatic border,
trade, knowledge, mobilization or combat effect in 5h1. Physical channels retain
their existing settings. Hostility does not start a battle. Explicit rule-driven
automatic conflict remains the confirmed direction for 5h2–5h3, after manpower,
supplies, border policies and consequence accounting are implemented.

`npm run check` covers identity updates, land claims/releases, submerged/depopulated
territory, symmetric relationships, removal dependencies, dangling references,
limits, atomic/version/scope rejection, overlay color, unchanged simulation output,
read-only forecasts, replay, checkpoints and portable archives. The model response
schema explicitly supports required nullable ownership for releases.
`npm run test:factions` covers browser review/cancel, claims/releases, relations,
territory overlay, unchanged population, save/replay/reload and responsive layouts.
Full Phase 5h remains open; next is borders and mobilization.
