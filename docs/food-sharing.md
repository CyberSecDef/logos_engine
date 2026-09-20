# Adjacent food sharing — Phase 5c1

The `adjacent-food-v1` model shares actual saved food between neighboring populated
land settlements. Automatic sharing after world activation was confirmed by the
player. It is a deterministic surplus-distribution model, with no currency, prices,
barter, merchant jobs or autonomous LLM calls. Resource routes, timed journeys and
population migration remain later Phase 5c work.

## Use it

Select a zone, open **Settlement and food**, then **Review food sharing activation**.
The review shows settings, next-day routes/food totals and the usual five-day
settlement comparison. Cancel changes nothing; Apply enables future daily sharing
without immediately moving food. Existing settlements participate, and future ones
participate if eligible. Existing saves stay on their previous behavior until activation.

Or choose **Entire world** scope and ask:

> Enable automatic food sharing between neighboring settlements with the default
> reserve protections and daily limits.

For a single zone, **Review closing food sharing** or a tile-scoped prompt closes
both imports and exports. **Review opening food sharing** reopens it. This permission
is saved even without a settlement. Communication is independent: stopping messages
does not stop food, and stopping food does not stop messages or existing custom-stock
transfers. This is not a general travel permission for people or other goods.

## Defaults and timing

| Setting | Default | Range |
| --- | --- | --- |
| `reserveDays` | 7 | 0–3,650 whole days |
| `targetDays` | 3 | 0–3,650 whole days, no greater than reserveDays |
| `exportPerDay` | 1,000 rations | 0–1,000,000,000 |
| `importPerDay` | 1,000 rations | 0–1,000,000,000 |
| `edgePerDay` | 500 rations | 0–1,000,000,000 |

All settings are world-wide and adjustable through reviewed prompts. Settlement
production, consumption/growth settings remain their existing per-settlement data.

The daily order is temperature → hydrology/vegetation → soil ecology → **food
sharing** → harvest/consumption/population → custom rules/plugins. Sharing uses
start-of-day reserves and the population before births/losses. Food delivered today
can be eaten today; food harvested today can first be shared tomorrow.

An endpoint must have a settlement, positive population, elevation above sea level,
and food-sharing permission (missing permission means open). Ocean routes, empty
settlements, uninhabited depots and intermediate unpopulated zones do not transport
food. Floods affect farming but do not yet close otherwise eligible land connections.

For each eligible donor:

```
protected food = population × (reserveDays + 1)
supply = min(exportPerDay, max(0, starting food − protected food))
```

The extra day protects today's meal; the remaining days are future reserves.
For each eligible recipient:

```
target food = population × (targetDays + 1)
demand = min(importPerDay, max(0, target food − starting food), storage headroom)
```

Storage remains capped at one billion rations per settlement. Protection exceeding
storage capacity simply prevents donations; target demand still respects headroom.
Zero limits stop the corresponding flows. With targetDays ≤ reserveDays, a settlement
cannot be both donor and recipient in the same phase.

Donors are processed by ascending zone ID; each visits adjacent recipients in
ascending ID order. Each transfer is the minimum remaining donor supply, remaining
recipient demand and edge limit. Every transfer debits and credits exactly the same
integer number of rations. Both budgets are reserved across all competing neighbors.
No new food appears, no delivery is retransmitted the same day, and incoming food
cannot make an intermediate settlement a new same-day donor. Fixed priority is
predictable but can favor lower IDs under scarcity; fairness/market allocation is
not implemented. Units do not travel through multiple zones in one day.

Example: a 100-person donor with 1,000 rations protects 800 and can share 200. A
100-person neighbor with zero food receives 200, then consumes 100, ending with 100.
The donor consumes its own 100 and ends with 700. The sharing phase conserves 1,000
rations; meals subsequently consume 200. No transport cost or spoilage is assumed.

## World interface

Operations use existing proposals/preview/Apply routes:

```json
{
  "kind": "food-trade-configure",
  "tileId": 0,
  "expectedVersion": 0,
  "enabled": true,
  "settings": {
    "reserveDays": 7,
    "targetDays": 3,
    "exportPerDay": 1000,
    "importPerDay": 1000,
    "edgePerDay": 500
  }
}
```

Configuration requires world scope. Version zero means not yet configured; later
updates use the current version and increment it. All settings must be supplied.
Configuration clears the old transfer report, which would otherwise describe old
settings. Disabling preserves inventories and permissions. Local permission:

```json
{"kind":"food-trade-permission","tileId":0,"allowed":false}
```

The permission change itself is local; resulting neighbor consequences appear in
the forecast. It does not remove stored food. Last-day routes remain historical if
permissions, terrain or settlements change after that day.

`world.foodTrade` stores configuration and a bounded last-day report containing
`tick`, world food before/after sharing, total transferred, and exact `{from,to,rations}`
edges. The inspector filters these routes to the selected zone. Settlement daily
`beforeFood` is measured **after sharing**, and its existing harvest/meal ledger
remains exact. Trade totals are measured before harvest and consumption, so they
are not the world's end-of-day food. Preview includes at most 24 next-day routes
with a full count and total; provider context bounds routes to the selected neighborhood.
The existing Food reserves overlay continues to reflect actual remaining food.

## Compatibility and verification

Optional `world.foodTrade` and `tile.foodTradeAllowed` preserve legacy hashes and
replay when absent. The `adjacent-food-v1` marker pins these semantics. Old builds
cannot load active sharing saves. Checkpoints, portable copies, restored worlds
and replay retain configuration, permissions and ledgers. No offline progression.

`npm run check` verifies conservation, both sides of competition, reserve/storage
bounds, timing, no forwarding, permission/communication separation, stale settings,
atomic rejection, scope/Discuss, replay/checkpoints and portable future equivalence.
`npm run test:food-trade` verifies activation/cancel, previews, exact deliveries,
prompted closure, direct reopening, daily inspection, reload/replay and mobile UI.

Acceptance on 2026-09-20: all 139 tests pass, with food-sharing, settlement,
soil-ecology and prompt browser checks. Native Claude proposed a valid activation
whose preview and tick conserved exactly 400 transferred rations. LAN deployment
preserved the exact player-world and saved-envelope hashes.
