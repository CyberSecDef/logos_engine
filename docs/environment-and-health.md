# Planned environmental pollution and disease

Status: air and water contamination are implemented (September 20, 2026);
generic disease remains planned. Air pollution tracks/spreads only. Water pollution
reduces farm output, as confirmed by the player; neither causes direct illness yet.
See [air pollution](air-pollution.md) and [water quality](water-quality.md).
Water contamination uses the [actual water transfers](water-transport.md), retains
dry deposits, and tracks sanitation impairment/recovery from food supply. These
are fantasy gameplay rules rather than real pollutant or pathogen models.

## Trackable properties and transport

| System | Stored state and visible measures | Spread | Example consequences |
| --- | --- | --- | --- |
| Air pollution | Abstract airborne contaminant load; derived air-quality severity; emission sources | Deterministic wind direction/speed, local mixing, settling, and explicit removal | Reduced vegetation growth and population health; smoke reaching downwind zones |
| Water contamination | Contaminant load in water and retained surface deposits; concentration and usable-water quality | Actual runoff/water transfers, dilution, wash-off, settling, and treatment | Reduced usable drinking water, lower production, and generic illness pressure downstream |
| Disease | Generic population illness burden and healthy/ill/recovered counts; derived prevalence | Local contact, permitted neighbor movement, and recorded long-distance travel routes | Reduced workforce, recovery, and explicit population losses where configured |

Use bounded, nonnegative stored quantities with declared units and defaults.
Pollutant load is authoritative; displayed severity/concentration is derived.
Define dry-zone behavior explicitly: contamination can remain as a surface deposit
for later wash-off, without dividing by zero or disappearing when water dries up.
Avoid a single disease score that is copied between zones or creates population.
Travel must move people and their health state together, debiting the origin and
crediting the destination. Empty zones cannot acquire sick inhabitants until
people arrive; any environmental hazard is a separate tracked field.

## Distinct causal paths

**Air:** introduce a seeded, saved wind field on the sphere, with direction and
strength controlling outgoing transport over each neighbor edge. A large fire
can introduce heat plus smoke as separate sources. Smoke travels downwind over
successive ticks, including across borders and oceans. Fire spread and fuel
consumption are later rules, not assumed consequences of a temperature setting.
A calm zone may still have explicitly defined local mixing; wind reversal must
change transport direction. Add rain-driven deposition only when its transfer
into surface/water contamination is explicitly accounted for.

**Water:** reuse the hydrology phase's actual transfer volumes, rather than a
separate approximation of downstream direction. Move contaminant amounts with
those transfers; clean inflow dilutes concentration without deleting load.
Evaporation removes water, not automatically its contaminants. Model ocean export,
decay, deposition, and cleanup as explicit destinations or sinks. Existing ocean
drainage cannot silently dispose of contamination: either account for an export
sink initially or add ocean-water transport in a later milestone.

**Famine:** use a visible game-rule chain, such as food shortage → reduced capacity
to maintain sanitation/water infrastructure → contaminated supply → downstream
exposure. Food shortage can also affect population resilience through a declared
rule. Famine itself is not a substance flowing through water. Surface deposits or
waste sources need explicit state and accounting. Add these links only when food,
population, and infrastructure systems exist; direct creator contamination can
exercise water transport earlier.

**Disease:** begin with one generic fictional illness system. After population and
movement exist, use local contact plus infected travelers to affect other zones.
A route may connect distant lands without physical tile adjacency; track travelers
or scheduled arrivals so spread respects route duration. Air/water exposure may
contribute to generic illness through declared rules, but pollution and infectious
spread remain distinct causes. Population growth and contact intensity can affect
risk through tangible state, not an unexplained automatic penalty for city size.

Communication, travel, trade, wind, and runoff remain independent channels.
Disabling communication alone stops neither smoke nor contaminated runoff nor
travel. Restrictions on travel affect disease movement only through their defined
route/contact effects. Cleanup, source removal, and recovery should be observable
interventions alongside introducing hazards.

## Engine and prompt contract

Add the required transport, state, and effect primitives during development;
the engine remains fixed during play. Worlds supply declarative definitions,
source/sink rules, and approved parameters. Models may propose a bounded one-time
release, recurring source, removal/treatment rule, or generic illness intervention
only after that installation advertises the capability. Distinguish stopping a
source from removing its existing pollution or curing existing illness.

Every change follows Discuss → Propose → preview → explicit Apply. Show direct
edits separately from downstream/downwind/travel consequences. Direct mutation
scope does not stop physical spread. A request for a fire or famine must not claim
unsupported intermediate systems already exist. Simulation, spread, cleanup,
recovery, previews, and event explanations run without LLM calls and without
offline time advancement.

Document tick ordering so environmental exposure, population movement, illness
progression, and later production effects read defined snapshots. Use simultaneous
bounded transfers, stable ordering, deterministic rounding, and explicit sources,
sinks, and population accounting. Save all state needed for replay; migrate old
worlds with zero pollution and no initial illness unless the creator chooses otherwise.

## Inspection and visual feedback

Add Air quality, Water quality, and Disease overlays, with readable units or
clearly labeled game indices. Show wind/flow direction and travel links on demand.
Inspectors should expose current load, concentration/prevalence, recent changes,
active sources, incoming/outgoing transfers, and recovery/cleanup effects. Events
should identify the source zone or route and the rule responsible. Previews compare
against an unchanged-world baseline and disclose their time horizon, especially
when distant arrivals occur after the preview ends.

## Delivery order and acceptance scenarios

1. Define shared transported-load accounting, versioned schemas, defaults, and
   migration tests; document the wind, water, and population channels separately.
2. Add wind and air pollution. A creator smoke release reaches downwind neighbors;
   reversal redirects it, calm conditions behave predictably, and stopping the
   source allows remaining pollution to disperse or be removed.
3. Add water contamination using actual runoff. Upstream pollution reaches lower
   zones, clean water dilutes it, evaporation concentrates remaining load, and
   dry deposits wash off when rain returns. Sources/sinks balance on each tick.
4. Add population, food, sanitation, and travel prerequisites; then generic disease
   and famine-related water-quality effects. Local outbreaks can reach distant
   lands through travelers, with bounded counts, delays, recovery, and no duplicated
   people. Disabling communication must not block these physical channels.
5. Verify saved replay, old-world defaults, nonnegative loads/populations, atomic
   scoped proposals, baseline previews, overlays, and zero model calls during
   autonomous simulation. Include cleanup and recovery scenarios as well as spread.

Detailed units, coefficients, wind generation, route timing, and illness progression
remain implementation choices to review when their prerequisites are developed.

## Current delivery sequence

The [Phase 5 execution plan](phase-5-plan.md) now governs milestone order: actual
water-transfer accounting first, creator-placed settlements and food/population
next, then movement and the environmental/health systems with their prerequisites.
The scenarios and separate-channel requirements above remain the acceptance goals.

### Phase 5b prerequisite update

Creator-placed inhabitants and food reserves now exist; see [settlements](settlements.md).
Shortage, growth, sanitation and water contamination now exist. Visits and timed
migration also exist. With explicit water-quality activation, settlements emit
waste and food shortages reduce sanitation condition; pollution can reduce harvest.
[Health accounting](disease.md) now supports recovery, temporary immunity,
workforce loss and water-caused cases after separate activation. Health travels
with people; contact transmission remains planned for Phase 5f2.
The confirmed first disease model has no direct disease deaths.
