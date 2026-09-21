# Phase 6 — polish and scale

Started 2026-09-20. Phase 5 is complete. Confirmed priority: **desktop first;
mobile remains usable**. Preserve the fantasy globe aesthetic, existing saves,
reviewed creator control and deterministic simulation. No new mechanics or
provider activation is implied by this phase.

| Milestone | Status | Tasks and acceptance |
| --- | --- | --- |
| 6a. Review accessibility | Complete and deployed | Native modal reviews, meaningful initial focus, full keyboard access including expandable details, background isolation, Escape/cancel and focus restoration, visible errors and safe in-flight behavior. Browser verification for proposal and world reviews, save preservation on cancel/failure, desktop and narrow screens. |
| 6b. Desktop navigation and usable small screens | Complete and deployed | Review inspector density, discoverability, keyboard globe instructions, control labels and status announcements. Keep mobile controls reachable without obscuring every interaction. Verify zoom, short viewports, keyboard use and supported browser behavior. |
| 6c. Rendering and delivery performance | Complete: 6c1–6c2 verified | Profile standard and maximum reference sizes. Reduce measured rendering/update and delivery bottlenecks, address frontend bundle structure without merely hiding warnings, and compare reproducible before/after measurements. Preserve simulation hashes. |
| 6d. Local operation and recovery | Complete and deployed | Review npm startup/build expectations, LAN configuration, provider availability/errors, save/backup guidance and recovery. Document a repeatable home-server installation/update path. Preserve native login and secret isolation. |
| 6e. Final integration and evidence | Planned | Consolidate browser, keyboard, responsive and performance regression checks; document supported scope, remaining limitations and acceptance results. Deploy and publish milestones with exact save preservation. |

## 6a implementation

The existing proposal keyboard loop handles only Cancel and Apply, so it can skip
expandable forecast details. World review isolates background elements manually
but lacks a complete keyboard focus loop. Both become native HTML dialogs, using
the browser's modal focus behavior and background isolation. A dynamic boundary
loop includes all visible controls and keeps Tab from leaving for browser chrome. Focus starts at the
review heading so long reports can be read before confirmation; closing returns
to the initiating control, or a visible fallback if that control disappeared.

Errors inside an open review must be readable in that review. Escape and Cancel
must not dismiss a review while its submission is in flight. Successful submission
closes normally; a failed submission leaves the review available for inspection
and cancellation. These changes do not alter the engine or automatically apply
any proposal.

Native browser semantics and automated keyboard tests are the first accessibility
milestone, not a claim of a complete screen-reader audit or WCAG certification.

## 6a verification and limits

- `npm run check`: all 269 engine/server tests, typecheck and production build pass.
- `npm run test:review-accessibility`: actual keyboard navigation through direct
  and model-proposed reviews, native background isolation, expandable plugin
  details, successful apply/restore, initiating-control focus, inline request
  failure, in-flight Escape protection, cancellation save preservation and a
  390px mobile viewport. The provider is a local test fixture, not a live model.
- Existing plugin, checkpoint/replay, historical branch and combined simulation
  browser workflows pass. Desktop/mobile review screenshots inspected.
- Conversation polling can replace the review button while a modal is open.
  Stable button IDs allow focus to return to its replacement; otherwise a visible
  conversation/creator/worlds control is used. A refreshed chat after Apply falls
  back to its message input when the initiating review action no longer exists.
- Errors remain in the modal until it closes or a new review opens. Background
  controls are inaccessible while reviewing; backdrop clicks do not apply or
  dismiss changes. Escape/Cancel are ignored during submission to keep the
  result associated with its review. Apply still uses the same server transaction.
- Current browser evidence is Chromium. Other browser engines, manual assistive
  technology testing, broader contrast/labels and complete responsive navigation
  are remaining Phase 6 work. The existing large-bundle warning remains for 6c.

## 6b deliveries

1. **6b1 — zone and keyboard navigation (complete and deployed):** direct zone-number jump,
   adjacent-zone links, center the selected zone and pause rotation on navigation,
   globe/inspector keyboard entry and return, focus-visible skip controls, explicit
   layer pressed states and selection announcements only when selection changes.
   Keep navigation usable in short desktop and narrow mobile viewports.
2. **6b2 — panel organization and broader usability (complete and deployed):** review inspector density,
   map-layer/panel overlap, keyboard zoom and remaining labels/status information.
   Continue desktop-first; mobile must retain reachable controls.

Zone navigation is presentation-only. It never issues a world proposal, advances
simulation, calls a model or changes saved terrain/settlement data. Normal pointer
selection retains its existing behavior. Jump/neighbor/arrow navigation centers
the selected tile and pauses rotation; Resume rotation remains available.

### Using zone navigation

At the top of the inspector, enter an existing zone number and choose **Go**.
The camera centers that zone, rotation pauses, and keyboard focus moves to its
heading. The neighbor buttons list actual adjacent zones in numerical order.
**Return to globe** puts keyboard focus back on the canvas. Left/right arrows
select previous/next zone IDs (they do not imply geographic adjacency); Enter
moves focus to the inspector. Tab reveals skip controls for globe, inspector and
layers. Use **Resume rotation** whenever desired.

Numbers must be integers within the displayed world range. A running model reply
retains its current selection lock. Navigation does not announce the same zone on
every tick or rebuild its focused neighbor controls unnecessarily. Layer buttons
expose their pressed state; custom-property selection clears built-in states.
World changes clear the selection announcement.

### 6b1 verification and remaining scope

`npm run test:navigation` uses a temporary 1,442-zone world to check zones 447/444,
center-ray picking, adjacent navigation, invalid input, keyboard focus, layer and
custom-property states, selection-only announcements, and save preservation.
Checks cover 1440×1000, 1024×600, 390×844 and 320×640 with screenshot inspection.
Short desktop panels scroll within available height. Mobile navigation remains
reachable; panel overlap and inspector organization are addressed in **6b2** below.
These are Chromium browser checks, not a full assistive-technology audit. No
engine, save schema or prompt-operation changes are introduced.

### 6b2 implementation

Confirmed: retain expandable inspector sections and add a quick-jump menu.
The sticky menu opens/focuses a chosen section without closing others. Overview
and terrain/weather controls are included. No section choices are persisted into
world data. Desktop retains its side-by-side layout.

At mobile widths, Globe / Map layers / Zone details select one view at a time.
The panel area scrolls above the switcher and time controls; Worlds and conversation
have their own existing panels. Switching via the toolbar closes those panels
when no model request is running. Globe Enter/skip navigation reveals the relevant
panel. Ongoing model requests retain their navigation lock.

Globe + / − keys and zoom buttons adjust camera distance within the existing orbit
limits; Home / Reset zoom restores the viewport's initial distance. Zoom does not
alter rotation preference, world state or simulation time. Status is announced on
explicit zoom actions, not animation frames. Existing scroll-wheel zoom remains.

### 6b2 acceptance

`npm run test:panels` uses an isolated world and fixture provider. It checks:

- Quick-jump focus stays below the sticky menu; other expanded sections remain open.
- Overview/terrain navigation and disabled section selection before selecting a zone.
- Keyboard/button zoom, the zoom-in cap and reset; no world changes.
- Exclusive phone panels at 390×844 and 320×640, no horizontal overflow, and panel
  bounds above the switcher. Globe Enter restores the inspector.
- Transitions from Worlds/conversation to the requested panel, plus a short
  1024×600 desktop layout where the inspector remains above the time controls.

New and existing browser workflows run against temporary worlds. No engine,
save-schema or provider-operation change is involved. Desktop/mobile screenshots
are inspected. Current automation is Chromium; other engines, manual screen-reader
and contrast audits remain final-integration work. Camera zoom is covered here;
this does not claim a comprehensive browser-page-zoom/assistive-technology audit.

Final verification: all 269 tests, typecheck/build, and panels/navigation/review/
combined-simulation/checkpoint browser workflows pass. Verified deployed controls
through LAN with exact live-world and save-envelope preservation. Phase 6c is next;
remaining cross-browser/manual accessibility acceptance is retained for 6e.

## 6c1 rendering cache

Per-tile geometry/projection/style caching is implemented and verified against
the original rendering buffers. See [measurements and limits](phase-6-render-performance.md).
6c2 frontend delivery remains next; the large-bundle warning is still open.

## 6c2 frontend delivery

Data-only defaults remove browser schema initialization; a separate renderer chunk
and hashed-asset caching reduce downloads. See [delivery evidence and limits](phase-6-delivery.md).
The remaining Three.js size advisory is documented, with no warning suppression.
6c is complete within the measured scope; 6d local operation/recovery is next.


## 6d local operation and recovery

Added [the home-server runbook](local-operation.md): locked dependency installs,
production/dev expectations, LAN configuration, stopped-server updates, full tar
backups, archive verification, staged recovery, matching-version rollback and
provider troubleshooting without credential copying or model probes.

Startup validates ports before save access and refuses to initialize a replacement
when an existing first-world directory or explicit selection points to a missing
save. Damaged saves receive recovery guidance. No simulation/default/schema changes.

Verification: all 271 tests, typecheck/build; focused tar backup/extraction and
exact-directory restore, active selection, history verification and no offline
progression. Checkpoint/replay and portable-world browser flows also pass.
No automatic filesystem backup schedule or cross-process writer lock is added;
the one-writer requirement and external-backup limits are documented.
Phase 6e consolidated integration/accessibility acceptance is next.
