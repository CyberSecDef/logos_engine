# Prompt workflow (Phase 3)

Select a tile and choose **Talk about this place**. Ask a question with **Discuss**,
or request a tangible change with **Propose change**. A proposal must pass schema,
world revision, scope, and engine validation. Review the exact operations and a
five-day forecast against the unchanged-world baseline, then explicitly Apply.
Neither discussion nor preview changes the saved world. Unsupported mechanics can
receive an explanation or clarification instead of a proposal.

The implemented operations are recurring rainfall, elevation delta, one-time or
sustained temperature, stopping a sustained temperature source, and a stored
communication flag. The flag does not yet simulate knowledge exchange. Custom
numeric definitions and bounded conditional rules are available through
[world extensibility](world-extensibility.md). New engine mechanics, arbitrary
rule expressions, and executable world plugins remain future work.
Models cannot extend application code through this interface.

Example prompts:

- “An asteroid impact heats this tile to 150 °C once. Let the heat fade.”
- “Keep this zone at −40 °C.”
- “Stop maintaining this zone's temperature and let it recover naturally.”

Temperature requests currently accept −100 to 200 °C. Heat/cold spreads to
neighbors during deterministic ticks even with scope set to the selected tile;
neighbor scope controls direct edits, not physical consequences. See the
[temperature rules](implemented-interface.md#temperature) for mechanics and limits.

## Local Claude Code

The default provider is the installed Claude Code CLI, using its existing login.
The current adapter requires Linux, `/usr/bin/bwrap` (bubblewrap), and the native
Claude executable on PATH. It was verified with Claude Code 2.1.273. Run
`claude auth login` as the server user if authentication is unavailable. No API key
is needed for this provider. Optional server `.env` settings:

```dotenv
LLM_PROVIDER=claude-code
# CLAUDE_MODEL=sonnet
# CLAUDE_BIN=/absolute/path/to/claude
```

Restart the server after configuration changes. Requests time out after 120 seconds
and can be cancelled. Failures never automatically retry or apply anything.

The adapter runs the trusted CLI in bubblewrap with a disposable home and working
directory, a read-only host root, and masked host home directories. Tools, hooks,
skills, MCP servers, and session persistence are disabled. The CLI's native
configuration directory is mounted writable so OAuth refresh updates the real login;
credentials are not copied into disposable storage or included in model context.
This directory is an explicit exception to scratch-only writes. Network access is
available to the CLI for its service. The default engine location under `/home` is
hidden; engine paths elsewhere remain read-only. This is a bounded text-provider
integration, not the future sandbox for arbitrary world plugin execution.

## Optional direct API

Set `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL` in the
server `.env`. The adapter sends bounded context to the Anthropic Messages API;
credentials stay server-side. This path has mocked HTTP coverage but has not been
verified with a paid API request. Missing provider configuration does not prevent
ordinary simulation or manual controls.

## Cursor and other local sessions

Open the external-exchange section, write a prompt, choose its mode and scope, and
export the context JSON. Give that packet to your chosen local session and request
only its response JSON. Import the response file using the exported request ID.
Use an independent session without engine repository write access. This manual
workflow does not launch or sandbox Cursor itself; imported output always passes
server validation and requires review/Apply for changes.

The packet includes instructions, capabilities, selected tile and neighbors,
permitted mutation IDs, current revision, recent events, and bounded conversation
history. Only the selected tile is editable unless neighbors or the entire world were
explicitly included. Definition changes require entire-world scope. The authoritative request stays on the server; stale or reused imports
are rejected. Exporting/importing makes no automatic model call.

## Engine–model contract

`packages/contracts/src/prompts.ts` defines executable request/reply schemas and
exports the response JSON Schema. A request includes `id`, `worldId`,
`expectedRevision`, `tileId`, `mode` (`discuss` or `propose`), `scope` (`tile`,
`neighbors`, or `world`), and `message`. A reply contains:

```json
{
  "kind": "proposal",
  "message": "Set rainfall to 80 mm per day on this tile.",
  "assumptions": [],
  "operations": [{ "kind": "rainfall", "tileId": 24, "mmPerDay": 80 }]
}
```

Other reply kinds are `discussion`, `clarification`, and `unsupported`; their
operations must be empty. Discuss rejects executable proposals. The server assigns
proposal IDs and authority, validates all effects on a copy, and persists the
response before reporting completion. Apply uses the same atomic transaction
interface as manual creator controls.

Conversations persist within each world's `conversations/` directory and are
excluded from Git. Interrupted requests become failed after restart; they are not
replayed. Ticks, forecasts, history reads, page loads, and job polling never invoke
models. The browser pauses time while its conversation panel is open; active model
requests also lock server mutations. Advancing a world later invalidates older
unapplied proposals and exports through revision checks.
