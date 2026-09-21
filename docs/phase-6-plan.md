# Phase 6 — polish and scale

Started 2026-09-20. Phase 5 is complete. Confirmed priority: **desktop first;
mobile remains usable**. Preserve the fantasy globe aesthetic, existing saves,
reviewed creator control and deterministic simulation. No new mechanics or
provider activation is implied by this phase.

| Milestone | Status | Tasks and acceptance |
| --- | --- | --- |
| 6a. Review accessibility | Complete and deployed | Native modal reviews, meaningful initial focus, full keyboard access including expandable details, background isolation, Escape/cancel and focus restoration, visible errors and safe in-flight behavior. Browser verification for proposal and world reviews, save preservation on cancel/failure, desktop and narrow screens. |
| 6b. Desktop navigation and usable small screens | 6b1 complete; 6b2 next | Review inspector density, discoverability, keyboard globe instructions, control labels and status announcements. Keep mobile controls reachable without obscuring every interaction. Verify zoom, short viewports, keyboard use and supported browser behavior. |
| 6c. Rendering and delivery performance | Planned | Profile standard and maximum reference sizes. Reduce measured rendering/update and delivery bottlenecks, address frontend bundle structure without merely hiding warnings, and compare reproducible before/after measurements. Preserve simulation hashes. |
| 6d. Local operation and recovery | Planned | Review npm startup/build expectations, LAN configuration, provider availability/errors, save/backup guidance and recovery. Document a repeatable home-server installation/update path. Preserve native login and secret isolation. |
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
2. **6b2 — panel organization and broader usability:** review inspector density,
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
reachable; overlapping mobile panels and inspector organization remain **6b2**.
These are Chromium browser checks, not a full assistive-technology audit. No
engine, save schema or prompt-operation changes are introduced.
