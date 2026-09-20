# Phase 6 — polish and scale

Started 2026-09-20. Phase 5 is complete. Confirmed priority: **desktop first;
mobile remains usable**. Preserve the fantasy globe aesthetic, existing saves,
reviewed creator control and deterministic simulation. No new mechanics or
provider activation is implied by this phase.

| Milestone | Status | Tasks and acceptance |
| --- | --- | --- |
| 6a. Review accessibility | Complete and deployed | Native modal reviews, meaningful initial focus, full keyboard access including expandable details, background isolation, Escape/cancel and focus restoration, visible errors and safe in-flight behavior. Browser verification for proposal and world reviews, save preservation on cancel/failure, desktop and narrow screens. |
| 6b. Desktop navigation and usable small screens | Planned | Review inspector density, discoverability, keyboard globe instructions, control labels and status announcements. Keep mobile controls reachable without obscuring every interaction. Verify zoom, short viewports, keyboard use and supported browser behavior. |
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
