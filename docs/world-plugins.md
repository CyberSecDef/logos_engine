# Restricted world plugins — logos-stack-v1

World plugins can now compute custom-property effects using arithmetic,
branching, and saved per-tile memory. The engine runs their bounded JSON programs;
it never evaluates them as JavaScript or changes application code. Prefer ordinary
declarative rules for simple conditions and sharing. Plugins are useful when a
mechanic needs a multi-step calculation or internal state that persists between days.

## Try crystal bloom

Select a tile, open **Talk about this place**, select **Entire world** scope, then
Propose:

> Create a crystal stock property, 0–1000 shards, initially zero. Install a
> tile-local restricted plugin called crystal-bloom here. Remember consecutive
> days above 10 °C. After three warm days, add five crystal shards and reset the
> counter; colder days also reset it. Keep this tile at 20 °C so I can observe it.

Review the five-day forecast and Apply. The inspector shows the plugin's active
state and `warm-days` counter, alongside the Crystal property and resource ledger.
Advance three days to see five shards produced. **Review disable plugin** pauses
it while retaining its internal state; re-enable resumes that state. The proposed
program is available under **Inspect plugin program** in the review dialog.

[The example transaction](examples/crystal-bloom.json) defines the property and
plugin for zone 0; it deliberately does not change temperature. Adjust its world,
revision and origin before using it as a developer transaction. In the prompt UI,
the server fills world/revision identity. No plugins are added to existing worlds
automatically, and ticking never calls a model.

## Contract and authority

Three operations use the existing proposal/review/Apply path:

| Operation | Fields and behavior |
| --- | --- |
| `plugin-define` | `tileId`, `definition`, `migration: preserve/reset/map`. Install or replace a versioned program. |
| `plugin-toggle` | `tileId`, `pluginId`, `enabled`. Keep state while pausing/resuming execution. |
| `plugin-remove` | `tileId`, `pluginId`. Delete the program and its internal state; emitted property values remain. |

Model-generated plugin changes require Entire world authority, including changes
to tile-scoped programs. This does not make a plugin world-scoped: its manifest
still declares `tile`, `neighbors` (origin plus adjacent tiles), or `world` targets.
Operation origin must match the definition and cannot move on update. Versions
start at 1 and increase by one, including recreation after removal.

A definition contains `id`, `version`, `abi: logos-stack-v1`, label/description,
origin `tileId`, scope, enabled flag, `everyDays`, `stateFields`, and `program`.
Each state field has `id`, `min`, `max`, and `initial`. At most eight bounded numeric
values are saved per target tile; absent entries use the initial values. `preserve`
requires unchanged scope and state-key order/shape, materializes old defaults,
and rejects values outside new bounds. `reset` explicitly discards internal state
and uses the new defaults. These options do not reset emitted world properties.

Plugins run after built-in weather/water/vegetation, alongside custom rules. All
custom reads observe the same pre-effect snapshot. Reads support the existing
built-in/custom numeric sources and self/neighbor-average/min/max sampling. Even
a tile-scoped program may read its neighbors' aggregate conditions. It cannot
look up another world, arbitrary tile, file, or host object.

Each program returns proposed property effects and new internal state. Effects
combine with ordinary custom rules: additions aggregate, values clamp to property
bounds and round to 0.001, and overlapping set/add writers are rejected. Stock
creation/removal appears in the existing resource ledger. Use ordinary transfer
rules for conservation; paired plugin add/subtract effects are not a transfer.
Remove dependent plugins before removing a property they read or write, even if
the plugins are disabled. The interpreter cannot write terrain, climate rules, topology, population,
communication, definitions, another plugin's state, or engine code.

## Instructions

A program is a flat array, with zero-based instruction addresses. A fresh stack
is created for each tile evaluation; only declared state persists. Binary
operations pop `b`, then `a`, and push `a OP b`.

| Instruction | Behavior |
| --- | --- |
| `{op: constant, value}` | Push a finite number. |
| `{op: read, read}` | Push an existing `Read` value (same schema as declarative rules). |
| `{op: tick}` | Push the current simulated day. |
| `{op: state-get, key}` | Push this tile's saved state value. |
| `{op: state-set, key}` | Pop a value, validate bounds, round to 0.001, save in this evaluation. |
| `add`, `subtract`, `multiply`, `divide`, `modulo`, `min`, `max` | Arithmetic; each instruction is `{op: name}`. Division/remainder by zero fails. |
| `less`, `greater`, `equal` | Push 1 when true, otherwise 0. |
| `floor` | Pop a number, push its floor. |
| `dup`, `drop` | Duplicate or discard the top value. |
| `{op: jump, target}` | Move to the given instruction. |
| `{op: jump-zero, target}` | Pop a value and jump if it equals zero. |
| `{op: emit, fieldId, mode: add/set}` | Pop an effect on this tile's existing custom property. |
| `{op: stop}` | End evaluation. Reaching the end also terminates. |

Use real JSON with quoted keys/string values; the table is abbreviated notation.
A target outside the program, an unknown opcode/key/property, or extra instruction
fields is rejected. There are no imports, source strings, recursion, dynamic
allocation instructions, host calls, clocks, or random instructions. Built-in
weather remains seeded by the engine. Numeric operations use JavaScript finite
number arithmetic, bounded to ±1e9; state and world outputs use 0.001 precision.
The ABI identifies these semantics for replay; changing them requires a new ABI.

## Limits and failure recovery

| Limit | Budget |
| --- | --- |
| Plugins per world | 8 |
| Instructions stored per program | 128 |
| Executed instructions per target tile | 512 |
| Stack depth | 32 numbers |
| Emissions per target evaluation | 16 |
| Internal state fields per tile | 8 |
| Reserved world instruction budget | 4,000,000 per tick |

The world budget conservatively reserves 512 instructions per target of every
enabled plugin, even when its cadence skips a day. Narrow scope or disable a
plugin if that reservation is exceeded. Every executed instruction costs one,
including jumps and reads; reads inspect at most six adjacent tiles. Programs
cannot increase their budgets. There is no elapsed-time rule that silently changes
a simulation outcome.

On arithmetic, state, stack, output, or instruction failure, the engine discards
the whole uncommitted tick (including built-in physics and other plugins), and
the browser pauses with the plugin ID, version, and zone in the error. Disable,
update, remove, or restore explicitly to recover. No model is called to repair it.
A recovery proposal can be previewed even when the unchanged world's plugin fails:
the UI identifies the baseline failure/day and still forecasts the proposed world.
A candidate that itself fails cannot pass the browser review workflow. A five-day
forecast is not proof that a program will succeed forever.

Isolation here is provided by the restricted interpreter and validated data,
not a JavaScript VM or operating-system subprocess. The interpreter never hands
world data to `eval`, a shell, a module loader, or any other code executor. Arbitrary
JavaScript/native plugins, new host capabilities, custom UI scripts, and general
plugin-state migration code are not supported in this first runtime.

## Mapping saved memory on update

After installing Crystal bloom and advancing one warm day, use **Entire world**:

> Upgrade Crystal bloom to track warm hours instead of warm days. Preserve its
> accumulated warmth by multiplying the old counter by 24. Each warm day adds 24,
> and it still blooms after three warm days. Keep all other behavior unchanged.

[crystal-hours.json](examples/crystal-hours.json) is a complete update for the
original example. Adapt its origin, revision and version to the current world.
Review the mapping and expand **saved memory on Apply** to see up to six example
tiles and the total affected count. This shows immediate memory changes; the
ordinary five-day forecast shows subsequent world effects. Preview never saves.

`plugin-define` with `migration: "map"` accepts at most eight entries in `stateMap`:

```json
{
  "stateMap": [
    {"key":"warm-hours", "from":"warm-days", "scale":24, "offset":0, "precision":"exact"}
  ],
  "discardStateKeys": []
}
```

Each new declared state key must have exactly one mapping. A source mapping reads
the old effective value (including old initial values on untouched tiles), then
computes `old × scale + offset`. `exact` rejects precision loss beyond floating-point
noise; `round` explicitly rounds to 0.001. Converted values outside the new key's
bounds reject the entire proposal; there is no implicit clamping. Reads use one
old snapshot, so renaming, reordering, and swaps do not depend on mapping order.

An entry `{"key":"new-counter", "initial":true}` initializes that destination
from its new definition. Every old key unused as a source must appear exactly once
in `discardStateKeys`. This makes dropped or reinitialized memory visible in review.
One old source may feed several destinations. Mapping does not infer program units:
the same update must explicitly revise state accesses and relevant constants.

Mapping requires an existing plugin, unchanged origin and scope, and one definition
operation for that plugin in the proposal. It cannot be removed in that transaction.
Use `reset` for scope changes. Mapping fields are rejected with preserve/reset.
Disabled plugins can be migrated. The same state, instruction and world budgets
still apply; migration cannot execute arbitrary code or add host capabilities.

Take a manual checkpoint before a major upgrade when you want a convenient recovery
point. Saved mappings remain in accepted proposal history and travel through saves,
checkpoints, branches and exports. Older builds without this contract cannot load
histories containing map operations. General scripted migrations remain unsupported.

## Storage and migration

Schema 4 / engine 0.4.0 embeds the exact definitions and internal state in every
world save and snapshot. Versions 1–3 load through pure migration with an empty
plugin list; their raw checksums are verified first. The first subsequent save
preserves a `state.vN.backup.json` before replacing the old format.

Accepted definitions are also written as immutable, checksummed JSON artifacts:

```text
worlds/<world-id>/plugins/<plugin-id>/<version>/<sha256>.json
```

The self-contained world's checksum pins the exact embedded program; the artifact
file records its matching definition hash. Activation changes may produce another
artifact under the same version without changing the program. Proposal data remains
staged in conversation records until Apply. Artifacts are durable before state
replacement; interrupted writes may leave harmless unreferenced artifacts.

Checkpoint restore, branching, and portable export/import carry definitions and
internal state together, and reproduce the same future simulation under the same
inputs. Import never runs a program; execution starts only on explicit preview or
play/step. Artifacts are materialized from validated embedded definitions on save.
There are no plugin dependency downloads or install scripts during gameplay.

Run `npm run test:plugins` for the browser flow. `tests/plugins.test.ts` covers
replay, accounting, limits, bad programs, atomic failure/recovery, authority,
migrations, immutable artifacts, snapshots and portable copies.
