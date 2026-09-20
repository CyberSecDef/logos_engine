# Resource routes and travel permission — Phase 5c2

Named directed routes move custom stock resources between adjacent land zones.
They extend the existing conserved-stock calculation; food sharing remains its own
system. This milestone does not add population movement, sea transport, long-distance
routes, travel time, currency or markets. Those require later explicit models.

## Try a route

Create a stock such as Mana through the advisor, or use an existing one. Select a
source zone, open **Resource routes and travel**, choose a stock and neighboring
destination, then enter the maximum shipment, source reserve, destination target
and schedule. **Review resource route** shows the next scheduled calculation and
five-day changes before Apply. No inventory moves until time advances.

Or choose **Selected tile and its neighbors** and ask:

> Create an enabled daily Mana route from this zone to zone 12. Move up to 20 motes,
> keep 10 at the source, and fill the destination only toward 50 motes.

Use a destination that is actually adjacent. Both the existing and proposed
endpoints must fit the prompt scope. Defining a new stock still requires Entire
world scope. The route does not require settlements or population at either end.

The inspector lists routes touching the selected zone, their policy and last-day
result. **Review closing route travel** closes all named resource routes entering
or leaving that zone. Reopening resumes eligible routes. Ask the advisor to change
capacity, pause a route, change its destination, or remove it. Removing a route
leaves all inventory where it is; there are no in-transit goods in this model.

## Channels and permissions

| Channel | Relevant control |
| --- | --- |
| Named resource routes | `tile.travelAllowed` at both endpoints; absent means open |
| Automatic food sharing | Its existing `foodTradeAllowed` at both endpoints |
| Communication | Existing `communication` flag; knowledge exchange remains planned |
| Existing generic stock rules / creator transfers | Their existing scopes and rules; travel flag does not alter them |
| People or timed journeys | Not yet simulated; policies will be defined in 5c3 |

Travel here has a concrete current effect on named resource routes. It is not a
claim that people already move or that closing it universally blocks every custom
world mechanic. Creator stock edits still work. The controls explain this distinction.

Both endpoints must be above sea level. Defining a route to submerged terrain is
allowed, but it reports **endpoint submerged** and moves nothing until both ends
are land. Flood depth is not a route-closure rule yet. Adjacent sea support was an
optional design question; land-only is the stated first-model implementation default.

## Deterministic transfer rules

Routes participate after settlement food/population and custom production, in the
same stock-reservation phase as existing custom transfer rules:

1. Compute custom production/removal and establish each stock's available outgoing
   inventory and incoming storage headroom.
2. Process legacy custom transfers in their original rule/effect/source order.
3. Process eligible named routes in ascending route-ID order.
4. Commit all reserved movements and the shared stock ledger together.

For a route, the shipment is the least of:

- Its configured `amount` per scheduled day.
- Remaining original source stock after earlier outgoing reservations, less this
  route's `reserve`, clamped to zero.
- Remaining destination storage headroom.
- Its `target` minus the destination's starting stock and already reserved incoming
  deliveries, clamped to zero.

Incoming deliveries never become outgoing stock in this phase, including between
legacy rules and named routes. Destination exports do not free same-phase storage
or target headroom. Later ticks can forward previously delivered goods.

A route's reserve constrains **that route's withdrawal**. Earlier legacy rules or
higher-priority routes can spend below it; it is not a universal protected minimum
for the zone. Multiple routes compete for shared budgets without overspending.
Fixed ordering is predictable but can favor earlier IDs under scarcity.

Quantities use the stock's units with up to three decimal places; calculations use
integer thousandths. No rounding creates resources, and no route adds transport
loss or cost. The existing resource ledger includes named-route transfers in
`transferredMilli`, with world before/after totals and custom sources/sinks.

The schedule runs when `world.tick % everyDays === 0`, not relative to creation.
Day 1 is the first tick after a day-zero world. A route may be defined/paused even
when not currently eligible. Zero amount means no shipment.

## World-data interface

```json
{
  "kind": "resource-route-define",
  "tileId": 0,
  "route": {
    "id": "mana-road",
    "version": 1,
    "label": "Mana road",
    "tileId": 0,
    "toTileId": 12,
    "fieldId": "mana",
    "enabled": true,
    "everyDays": 1,
    "amount": 20,
    "reserve": 10,
    "target": 50
  }
}
```

This is an operation inside an ordinary proposal; adapt IDs and verify adjacency.
At most 64 routes are allowed. The field must exist and be a stock. Amount/reserve/
target are 0–1 billion in field units, with at most three decimals. Reserve/target
cannot exceed field capacity. Schedule is 1–365 days, label 1–80 characters.

Route version starts at 1 and increments for every update, including recreation
after removal. Origin is immutable and must match operation tileId. To pause,
supply the complete route at its next version with `enabled:false`.

```json
{"kind":"resource-route-remove","tileId":0,"routeId":"mana-road"}
{"kind":"travel-permission","tileId":0,"allowed":false}
```

Local permission changes are tile-scoped; route create/update/remove must authorize
both old and new endpoints. Stock unit conversions require explicit updates or
removal of every dependent route, including paused ones, in the same proposal.
Review amount/reserve/target in the new units. Bound-field removal or conversion
to an index fails while a route references it.

Optional `world.resourceRoutes` has model `adjacent-resources-v1`, route definitions
and a bounded last-day report. Each report row includes ID, endpoints, field, label,
unit, moved amount in thousandths, and one of:

| Status | Meaning |
| --- | --- |
| `moved` | Positive delivery; amount may be below capacity |
| `limited` | No shipment due to available stock, reserve, target, storage or zero capacity |
| `paused` | Definition disabled |
| `not-due` | Schedule does not match this day |
| `closed` | At least one endpoint forbids travel |
| `submerged` | At least one endpoint is at/below sea level |

Route edits clear the prior report; later permission/terrain changes leave it as
a dated historical record. Preview exposes up to 24 first-day rows with full count,
and the usual five-day world comparison. No preview advances the live world.

## Compatibility and verification

Without routes, no optional data is invented and legacy transfer outputs remain
unchanged. Versioned model behavior must be retained for replay. Older builds do
not support these new optional schema-4 fields/operations. Checkpoints, portable
worlds, branches and journals retain routes, permissions and reports.

`npm run check` covers conservation, competing routes, legacy interaction, no
forwarding, source/target/capacity limits, fractions, schedules, terrain, permission
independence, conversions, version/scope failures, checkpoints and portable replay.
`npm run test:routes` covers direct creation/cancel/review, transfers, closure and
reopening, prompted pause, mobile layout, reload/replay and no autonomous models.

Acceptance on 2026-09-20: 146 tests pass. Route, resource-sharing, food-sharing and
extension browser checks pass, and mobile visuals were inspected. Native Claude
produced a valid route whose next tick conserved exactly 20 transferred motes.
LAN deployment preserved the exact active-world and saved-envelope hashes.
