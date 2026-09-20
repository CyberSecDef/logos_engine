# Health and recovery — Phase 5f1

The first health milestone tracks susceptible, ill and temporarily immune people.
It supports creator introduction/treatment, recovery, immunity loss, polluted-water
exposure and lost farm labor. **Contact transmission is not implemented yet**;
local infection and exposure through visits/arrivals are the next milestone (5f2).
These are fictional game balance rules, not a model of a real disease.

## Activation and interface

Existing and new worlds have no health model until a reviewed activation. Use
**Health and recovery → Review activation** in the inspector, or ask the advisor
with Entire world scope. Activation initializes all residents and existing journey
parties as susceptible; it does not create cases. Engine schema 4 remains compatible
with inactive historical worlds. The versioned world marker is `health-state-v1`.

The validated operations are:

- `disease-configure`: `tileId`, `expectedVersion` (0 initially), `enabled`, and
  complete `settings`. This requires world prompt scope and increments the version.
- `disease-introduce`: `tileId`, positive integer `count`; convert susceptible
  residents to ill. Reject counts above the susceptible population.
- `disease-treat`: `tileId`, positive integer `count`; convert ill residents to
  temporarily immune. Reject counts above the ill population.

Settings are world data and adjustable through reviewed prompts. All are integer
permille rates between 0 and 1,000:

| Setting | Default | Meaning |
| --- | --- | --- |
| `waterExposurePermille` | 20 | Maximum daily susceptible fraction developing illness from fully contaminated standing water |
| `recoveryPermille` | 100 | Daily fraction of existing ill people recovering |
| `immunityLossPermille` | 10 | Daily fraction of existing immune people becoming susceptible |

Every tile and active journey stores `health: {ill, immune}` after initialization.
Susceptible is derived as population minus those two counts. All counts must be
nonnegative integers and sum to no more than the associated population. Empty
zones cannot have cases. Creator edits preserve population and require review.
No arbitrary plugin or custom property write changes these built-in compartments.

## One day's progression

After hydrology, water quality and air transport, but before journey arrivals,
each resident population and active journey progresses once. Recovery and immunity
loss use their respective **start-of-phase** counts. Each positive rate transfers
`floor(count * rate / 1000)`, with a minimum of one for a nonempty compartment,
capped by the available people. A zero rate transfers nobody. Newly recovered
people cannot lose immunity in the same progression phase.

Resident water cases are:

```
floor(startSusceptible * waterExposurePermille * (1000 - waterQualityPermille) / 1000000)
```

This uses the current day's water-quality multiplier, from 0 (fully contaminated)
to 1,000 (clean). Both health and water quality must be enabled. Dry zones, clean
water, paused water quality and transit parties introduce zero water cases. There
is no minimum case count. Newly introduced water cases do not recover that day.
Water exposure is independent of contagious contacts; it can introduce the first
cases into a world. The daily report records water cases, recovered and immunity lost.

Arrivals then move their already-progressed health into the destination. Routine
visits are assigned after arrivals; farming and meals follow. Sanitation condition
changes after meals affect tomorrow's water treatment. Automatic relocation runs
after meals, so its new travelers have already progressed for this day.

## Work, travel and population accounting

Ill residents and ill incoming work visitors cannot farm. All still consume food
and can travel. Outgoing ill visitors are subtracted from home unavailable labor;
only incoming work visitors contribute to destination farm labor. Susceptible and
immune people work normally. The farm ledger records unavailable ill workers.
Visit allocation does not specifically recruit replacement workers for illness.

Departures debit health from home; arrivals and docking credit it exactly once.
Blocked travelers continue recovery and immunity loss. Health moves with automatic
relocation as well as creator journeys. Temporary visits retain home residency and
sample from one shared remaining origin pool, preventing duplication across trips.
There is currently no infection caused by sharing a destination with an ill visitor.

Every permanent departure, population decrease and starvation loss partitions
susceptible/ill/immune proportionally using exact integer products and largest
remainders. Equal remainders prioritize susceptible, then ill, then immune.
Births and creator population additions are susceptible. Removing a settlement
removes its residents and resets tile health. World forecast totals include transit.

There are **no direct disease deaths**. Existing food shortages can still cause
starvation losses, including when reduced labor lowers harvest. Treatment has no
invented currency, medicine or infrastructure cost in this milestone.

Pausing freezes progression, water exposure and the labor penalty. It preserves
health and still accounts for travel, births and population losses. Explicit creator
case/treatment operations remain usable while paused. Ordinary ticks call no model.

## Inspection and verification

The inspector shows susceptible/ill/immune counts and review controls. Journeys
show carried illness/immunity; the illness overlay shows resident prevalence.
Proposal previews compare world health before, immediately after Apply, and five
days later against an unchanged baseline. Previewing never advances the live world.

`npm run check` covers compartment conservation, rounding, invalid edits, water
exposure, pause, workforce, visits, migration, arrivals, blocked journeys, starvation,
births, scope, replay, checkpoints and portable saves. `npm run test:disease` checks
review/cancel/apply, treatment, travel recovery, labor, overlays, save/reload,
desktop/mobile layout and no autonomous model calls in an isolated world.
