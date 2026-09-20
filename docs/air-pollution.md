# Airflow and pollution

`air-transport-v1` tracks and transports abstract fantasy pollution. **It causes no
vegetation, farm, health, weather or population damage.** Those links are deferred
by player choice. A fire can be represented by a heat intervention and an independent
pollution source; temperature alone does not create smoke, fire or fuel consumption.

Use **Airflow and pollution → Review enabling air transport** for initial world
activation. This creates clean per-zone air and reproducible seeded winds. Old worlds
and replay retain their original behavior until recorded activation. Configuration
is global and requires Entire world scope for advisor proposals. Pulses, cleanup,
sources and wind edits are local; their physical consequences may leave prompt scope.

## Stored quantities and operations

Each tile stores `air: {load, emissionPerDay, windBearingDeg, windPermille}`. Loads
are whole abstract pollution units, 0–1,000,000,000. Density is load divided by zone
area in square kilometres; this is a game measure, not real-world AQI or toxicity.

| Operation | Scope and effect |
| --- | --- |
| air-configure | Global model/version/enabled/settings. expectedVersion is 0 initially, current version afterwards; increments on change. |
| air-release | One tile, integer delta ±1 billion; positive pulse or negative cleanup. Reject insufficient load or capacity. |
| air-source | One tile, recurring unitsPerDay 0–1 million. Zero stops emissions without erasing existing load. |
| air-wind | One tile, saved bearingDeg 0–359 and transportPermille 0–900. Both required. |

Default global settings: mixingPermille **20** (0–100), removalPermille **10**
(0–1,000). Local wind strength is the maximum fraction transported daily, in
thousandths; it is not metres per second. Initialization uses the world seed, zone
ID and fixed model keys: mostly westward below absolute latitude-coordinate 0.5,
eastward elsewhere, with a ±20° deterministic variation and strength 100–300.
The winds persist until edited; seasonal/storm-driven wind changes are not included.

Bearing describes where air moves **toward**: north 0°, east 90°, south 180°, west
270°. Each neighbor's direction is projected into the zone's spherical tangent
plane. At exact poles the reference east is the positive Z direction. Positive
cosine alignment gives downwind weights, rounded to integer millionths. Opposite
wind directions therefore favor opposite neighbors even across the sphere's seam.

## Daily ordering and budget

Air runs after hydrology, before migration arrivals, soil, neighbor visits and meals.
Its current inputs do not depend on weather; read-only next-day air preview computes
the same air phase without stepping or saving the world.

1. Add each recurring emission, capped by remaining tile load capacity. Report
   actual and rejected emission units separately; rejected emissions never entered
   the atmosphere. They are not silently counted as removed pollution.
2. Read a frozen post-emission stock snapshot. Propose floor(stock × wind/1,000)
   downwind and floor(stock × mixing/1,000) shared equally among all neighbors.
   Each budget is split by integer weights; leftover units go to positive-weight
   neighbors in ascending ID order. Wind + mixing cannot exceed the local stock.
3. Reserve destination space from the same snapshot. Incoming pollution cannot be
   sent onward today; outgoing pollution does not free same-day receiving capacity.
   Origins/recipients resolve in ascending ID order, wind before mixing on each edge.
   Rejected transfers stay at the source. Capacity competition is deterministic.
4. Remove floor(post-transport load × removal/1,000) from each zone. This is an
   explicitly accounted abstract sink, not surface deposition or water pollution.

At zero wind, mixing may still spread load. At zero wind and mixing, it stays local
apart from emissions and removal. With integer rounding, tiny residual loads can
persist; cleanup or a higher removal fraction can clear them. Borders, communication,
travel permissions, elevation and oceans never block this physical transport.
Rain deposition, chemistry and pollutant classes are not yet simulated.

Global equation: after = before + actual emissions − removal. Transfers conserve
the global load. Every tile reports before/emitted/rejectedEmission/incoming/
outgoing/removed/after, and every actual neighbor edge records wind and mixing units.
The bounded lastDay report survives saves/checkpoints/portable copies/replay.

Pausing the air model freezes all loads and recurring emissions without clearing
winds, sources or pollution. Local edits still work while paused; re-enabling
continues from those values. Changing configuration or local air inputs clears the
previous daily report so an old budget cannot masquerade as the result of the edit.

## Inspection and world extensibility

The inspector shows load, density, source and saved wind direction/strength, plus
last-day transport and removal. **Explain next day's air** is read-only and shows
exact incoming/outgoing neighbors. Proposal previews compare world load before,
on Apply, and at day +5 against the unchanged baseline; tile previews include air
state. The horizon does not imply distant pollution already arrived.

**Air pollution** overlay: teal clean → purple at 1,000+ units/km², logarithmic
scale. **Wind** overlay: hue is bearing, brightness is strength. Inactive tiles are
grey. Wind values remain visible if transport is paused. Direction colors are
supplemented by exact inspector bearings and destination records.

Custom rules, appearance conditions and restricted plugins may read `airLoad`,
`airDensity`, `windBearingDeg`, `windPermille` with existing neighbor sampling;
absent air state reads zero. They cannot write built-in pollution through generic
property effects. Dedicated validated air operations are the creator interface.
These reads do not automatically introduce damage or new environmental effects.
