# Health, recovery and contact spread — Phase 5f

The first health milestone tracks susceptible, ill and temporarily immune people.
It supports creator introduction/treatment, recovery, immunity loss, polluted-water
exposure and lost farm labor. Phase 5f2 adds separately activated local and travel
contact transmission.
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
immune people work normally. The farm ledger records unavailable ill workers, including cases introduced during
the current contact phase.
Visit allocation does not specifically recruit replacement workers for illness.

Departures debit health from home; arrivals and docking credit it exactly once.
Blocked travelers continue recovery and immunity loss. Health moves with automatic
relocation as well as creator journeys. Temporary visits retain home residency and
sample from one shared remaining origin pool, preventing duplication across trips.
With contact spread enabled, sharing a destination with ill people can introduce
cases, including among visitors.

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

## Daily contact spread — Phase 5f2

Contact spread requires **separate reviewed activation** after health tracking.
Use **Review enabling contact spread** or ask the advisor with Entire world scope.
Old health saves/replays keep exactly their previous behavior without this option.
The new `disease-contact-configure` operation takes `tileId`, `expectedVersion`
(the current disease version), `enabled` and integer `ratePermille` between 0 and
1,000. It increments the shared disease version and clears the previous daily
report. The inspector starts with rate 200. This is a fictional gameplay setting.
`disease-configure` preserves this optional `contact` object, marked
`model: daily-contact-v1`. Both health and contact flags must be enabled to spread.
Pausing contact alone leaves water exposure, recovery and lost farm labor active.

After recovery/water exposure, journey advancement/arrivals and visit assignment,
**before farming and meals**, construct one frozen presence snapshot:

- Home groups contain residents who did not visit elsewhere that day.
- Each visit group spends its contact phase at its recorded destination. Food,
  work and exploration visits all mix. Each visitor is counted once and retains
  their home residency and home meals.
- Remaining transit parties mix internally, including blocked parties. Parties
  do not mix with one another or the zones they pass through or wait beside.
  Completed arrivals are already destination residents and mix there instead.

For every resident/visitor group at a location, let S be its susceptible count,
I the **total ill people present**, and P the **total people present**. New cases:

```
floor(S * ratePermille * I / (1000 * P))
```

Use exact integer arithmetic. Empty locations give zero. There is no minimum case
or fractional carry; small exposures can round to zero. Apply the same formula
within each transit party. All case counts use the frozen snapshot, so new contact
cases never create another round of transmission that day. Newly ill visitors
return their cases to their home health counts, and their visit health records
also reflect those cases for farm labor accounting. No population is created,
lost or permanently moved by a contact calculation.

People whose immunity waned earlier today are susceptible. People who recovered
are protected; earlier water-caused cases can be infectious in this contact phase.
New contact cases cannot farm today and begin recovery on subsequent days. Existing
starvation rules still run afterward. Automatic migration departs after meals and
carries the resulting health, without a second contact phase on departure day.

Travel closures block actual visits and journey movement; they do not suppress
local mixing, mixing inside waiting parties, or physical water contamination.
The communication flag does not affect contact spread. Resource/food transfers
without people have no contact effect. There is no long-distance spontaneous
infection, air-pollution health effect or direct disease death.

`disease.lastDay.contactCases` totals new contact cases. Nonzero `contactEntries`
record resident/visitor home zone and exposure zone, or transit journey ID, along
with group population, susceptible count, ill/present totals and resulting cases.
These identify where exposure happened, not which individual transmitted it.
Entries describe that day's contact phase, before subsequent meals/migration;
current populations may differ. The inspector shows up to 20 relevant entries;
full reports are retained in world state and available to the advisor. Five-day
proposal previews include final-day contact and water-case totals alongside the
population health baseline comparison.

`npm run test:disease-contact` exercises reviewed activation/cancel, observed cases,
attribution, forecasts, replay/reload, responsive layout and zero autonomous model
calls. Engine tests cover closed travel, visitor return, no same-day cascade,
arrival/blocked transit, immunity, pause, rounding, version/scope enforcement,
100-day determinism, population conservation and portable/checkpoint persistence.
