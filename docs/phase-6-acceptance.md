# Phase 6 acceptance

Status: all checks passed on 2026-09-20 (local date). Desktop-first interaction and usable narrow
layouts remain the agreed scope. The live world is not a test fixture.

## Repeatable checks

```sh
npm ci
npx playwright install chromium webkit
npm run test:phase6
```

Browser installation may require the OS libraries listed by Playwright on the
host. The command first runs typecheck, all engine/server tests and production
build, then runs the acceptance workflows serially against temporary worlds.
A browser launch or test failure stops the run and returns a nonzero exit code;
missing browsers are not silently skipped. No live-provider calls are made.

The runner writes .local/phase6-acceptance.json. Accessibility reports are
.local/audit-chromium.json and .local/audit-webkit.json. Screenshots are under
.local/screenshots/. Reports include failed runs and automated checks needing
review; neither is treated as a pass. The runner assumes the current production
build; use the npm command to build and validate it first.

Individual checks:
- npm run test:accessibility — build and Chromium axe audit.
- LOGOS_BROWSER=webkit node tests/accessibility-audit.mjs — WebKit audit.
- LOGOS_BROWSER=webkit node tests/review-accessibility-browser.mjs — WebKit
  keyboard review flow against the already-built application.
- npm run test:delivery and npm run test:render-performance — reproducible
  delivery and buffer-parity checks documented in their dedicated reports.

## Acceptance matrix

| Area | Evidence |
| --- | --- |
| Simulation/save compatibility | Full engine/server suite; combined-world browser steps, forecast cancellation, save/reload and replay. |
| Keyboard/navigation | Exact tile and neighbor navigation, centered globe picking, focus transitions, layer state and quiet live announcements. |
| Inspector/layout | Expandable sections and sticky quick-jump control; bounded zoom; exclusive mobile panels; short desktop and 320/390px layouts. |
| Review safety | Native modal containment, dynamic tab order, Escape/cancel, in-flight protection, inline failure, focus return, apply and restore. |
| Automated accessibility | axe WCAG 2 A/AA and 2.1 A/AA tags on overview, fully expanded inspector, conversation, proposal/world dialogs, world management and mobile panels. |
| Cross-browser | Navigation, panel, review, combined-simulation and axe workflows under Playwright Chromium and WebKit. |
| Rendering | Original attribute hashes/bounds preserved at 42, 1,442 and 6,762 zones; unchanged updates request no uploads. |
| Delivery | No schema runtime bundled; independent renderer hash; production cache headers and warm JS/CSS transfer reuse. |
| Recovery | Startup protection, actual tar backup/extraction, exact file restore, active world/history; checkpoint and portable-world browser flows. |

The audit exposed an ambiguous label on the zoom-controls container. Giving it
role=group associates its accessible label with a defined group role. This changes
semantics only. The WebKit panel test also found its native select made the sticky
menu 92px tall, exceeding the fixed 90px scroll margin. Quick jumps now measure
the menu height and add clearance before scrolling, preserving focus and keeping
the selected heading visible across browsers. World data is unaffected.

## Supported scope and limits

Automated evidence covers the recorded Playwright Chromium and WebKit builds on
this Linux host. It is not a certification of every Chrome/Edge/Safari release or
real iOS touch behavior. Firefox is not included. WebKit rendering is tested with
the installed host graphics stack; Chromium uses software rendering in the test
environment. Physical GPU performance is not established by these results.

Axe is supplemental to the keyboard and interaction tests. Passing rules do not
prove all WCAG requirements. A human screen-reader audit, OS high-contrast modes,
browser-page zoom and assistive-technology combinations remain unverified. The
canvas offers keyboard zone navigation and a text inspector; the visual map itself
is not a complete nonvisual geographic representation.

The [rendering report](phase-6-render-performance.md) and
[delivery report](phase-6-delivery.md) retain measurement limits. Three.js still
triggers the bundle-size advisory; no threshold was raised. HTTP compression,
offline support and historical asset retention are not implemented. Recovery
requires one writer and separately maintained filesystem backups; see the
[operation runbook](local-operation.md).

These limitations are explicit acceptance boundaries, not hidden claims of full
accessibility, device coverage or production hosting support.

## Final recorded result

All 271 engine/server tests, typecheck and production build passed, followed by
all 15 acceptance workflows. Chromium 153.0.8010.12 and WebKit 26.6 each passed
nine axe views with zero violations and zero incomplete findings. Desktop panel,
mobile globe and mobile review screenshots were visually inspected.
See [the recorded result](phase-6-acceptance-results.json) for individual checks.
Phase 6 is complete within the documented scope and limits above.
