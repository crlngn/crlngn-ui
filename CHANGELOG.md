# Changelog

Notable changes to Carolingian UI, starting at 4.0.0. Earlier releases are
described in the [GitHub releases](https://github.com/crlngn/crlngn-ui/releases).

## 4.2.0 — 2026-09-10

### Fixed

- **D&D 5e 6.0 compatibility.** The body now carries a `crlngn-<system>-v<major>`
  class (for example `crlngn-dnd5e-v6`) so styles can be gated per system
  version while 5.x and 6.0 worlds coexist. Sheet tooltips no longer force
  the light parchment palette on dnd5e 6.0, which themes tooltips from their
  context and left dark text on a dark tooltip. The item tooltip scroll icon
  works again: 6.0 moves the tooltip into `data-tooltip-html`, which is now
  carried over to the icon along with `data-tooltip`. The "Welcome Screen"
  button dnd5e 6.0 adds to the Settings sidebar picks up the same styling as
  the other sidebar buttons and no longer overlaps the system links, which
  now use the primary text color. Chat cards created under dnd5e 5.x and
  re-rendered by 6.0 (which adds its new compact layout to them without the
  legacy header styles) get their icon / name / chevron row restored, and
  the transparent-background rule for non-system content no longer strips
  the pill backgrounds on 6.0 cards. Compact cards get the chat title
  treatment on the sender name, a little spacing around the card header,
  narrower damage-tray multiplier buttons, and expanded collapsible content
  gets some outer margin. Roll-type chat classes now fall back to the 6.0
  message `system` data when the legacy `flags.dnd5e` are absent.

### Changed

- The chat sender / title line (`.name-stacked .title`) now uses the UI font
  instead of the titles font when the custom title font is enabled; chat
  headings keep the titles font.

## 4.1.4 — 2026-09-09

### Added

- **Group Combatants (D&D 5e)** (Combat Tracker, client setting, off by
  default). Combatants that the D&D 5e tracker groups together collapse into
  a single card in the carousel with a badge showing the group size, or the
  current member as "2/3" while the group has the turn. Click the badge to
  unfold the group to the right, or fold it again; the sidebar tracker and the
  carousel share the same expanded state. Folded members stay loaded behind
  the scenes so unfolding does not blink, and turn navigation walks through a
  folded group in place. Closes #248.

### Fixed

- Changing the Combat Tracker Layout between carousel and simple list with a
  combat open rebuilds the carousel from scratch, instead of leaving cards
  positioned for the previous mode.
- Grouped combatants no longer blink on re-render: the image cache now also
  covers cards nested inside system group rows.

## 4.1.3 — 2026-09-09

### Added

- **Keep Horizontal Tabs in a Single Row** (Sidebar & Chat, client setting,
  on by default). With horizontal sidebar tabs enabled, the tab icons stay on
  one row: the collapse arrow keeps its fixed spot, the row shows as many tabs
  as fit, and a "…" button on the right jumps to the last tabs that fit, with
  the "…" then on the left to jump back. Activating a tab that sits at the
  other end jumps there automatically, and the "…" shows a notification pip
  when a hidden tab has one. The option only appears while horizontal tabs are
  enabled; untick it to let the tabs wrap into two rows as before.

### Fixed

- Horizontal sidebar tabs no longer push part of the sidebar content off
  screen when the tabs wrap into more than one row: the content area now
  fills whatever height remains below the tab row instead of assuming a
  single row.

### Changed

- Tooltips on horizontal sidebar tabs open downward instead of to the left.

## 4.1.2 — 2026-09-05

### Added

- **Calendaria** joins the Modules & Systems compatibility list, enabled by
  default. While the Carolingian combat carousel is enabled, the Calendaria
  HUD sits beneath the carousel and comes back to the front as soon as it is
  hovered, so the two no longer fight over the top of the screen. Untick
  Calendaria in the list to keep its original stacking.

### Changed

- D&D 5e actor sheets and the compendium browser in vertical-tabs mode use a
  tighter gap between the horizontal tabs (1rem, down from 1.5rem).
- Context menu items get a little more padding so entries are easier to hit.

### Fixed

- **Item Piles.** Merchant, vault and trade windows are now themed through the
  Modules & Systems compatibility styles, scoped to the dark applications
  colour scheme, so each player can switch it off from the list. Even/odd item
  rows, price lists, sublists, trade quantity fields and the plain buttons that
  core's AppV1 rule painted cream all follow the dark theme, and the forced
  dark theme reaches the Item Piles sheet windows it used to skip.
- The minimized camera dock disappeared whenever the players list re-rendered,
  taking its restore button with it. It is re-attached on every render.
- `--current-sidebar-width` pointed at a variable that no longer exists, so
  anything reading it resolved to nothing. On Foundry v14 this overrode Flash
  Token Bar's own value and its docked menu lost its sidebar offset.

## 4.1.1 — 2026-08-22

- Fixed the release package shipping without its manifest and module archive.
  The merged release serves both Foundry generations from a single
  `dist/templates`, so the build requires the v13 and v14 branches to produce
  identical template folders, and moving custom CSS into its own dialog changed
  a shared template. The custom CSS field now renders behind a conditional so
  one file serves both generations. 4.1.0 was published without installable
  assets and is superseded by this release.

## 4.1.0 — 2026-08-22

### Added

- **Custom CSS dialog.** Custom CSS now has its own GM-only dialog, opened from
  the module settings root below Interface Settings, instead of being buried in
  the Theme & Styles tab.
  - **World** tab applies to everyone, backed by the existing setting so nothing
    saved before this release is lost.
  - **Users** tab applies styles per user. Pick *All Players* to reach every
    player — Game Masters are never included — or a single user, a Game Master
    included, to target just them.
  - Both editors use Foundry's built-in CodeMirror element, so line numbers,
    undo history, bracket matching and find/replace come along.

### Changed

- World custom CSS applies as soon as it is saved and no longer asks for a
  reload. Clearing the field now removes the styles instead of leaving them in
  place until the next page load.
- Daggerheart fear tracker docking now requires the system's own fear position
  to be *Free*, and asks before switching it. If the position is later changed
  in Daggerheart's settings, docking steps aside rather than fighting the system
  for placement.
- The update news chat message is disabled until its payload is refreshed.

### Fixed

- **Daggerheart 2.x.** The system made `#resources` frameless and now re-parents
  it itself, which broke docking and every style written against the old markup.
  - Fear tokens and the +/- controls no longer swallow their own clicks; the
    drag handler was capturing every mousedown on the tracker.
  - Docking and the system no longer fight over where the tracker lives.
  - Tracker styles rewritten for the frameless markup, with the 1.x rules kept
    intact for Foundry v13.
- Daggerheart character sheets: flattened the new trait chips, kept slot borders
  off the icon-based armor slots, and fixed the armor slot label turning
  unreadable on hover where its text resolved to the same colour as its
  background.
- The Daggerheart docking setting never reacted to being toggled, as
  client-scoped settings emit `clientSettingChanged` rather than `updateSetting`.

## 4.0.2 — 2026-08-21

- Foundry v14.367 rewrote the scene navigation template: the label span lost its
  `scene-name` class, core dropped its own `.scene::after` status-icon rules in
  favour of a rendered `span.icons`, and the levels menu renders as a sibling of
  `#scene-navigation-viewed`. All fixes are version-tolerant, so v13 and earlier
  v14 builds keep working from the same source.
  - Added `TopNavigation.getSceneNameElem()` to locate the scene label either way
    and restore the `scene-name` class when missing, fixing the null
    `addEventListener` crash that aborted the whole `renderSceneNavigation` hook.
  - Scene ids resolve via `closest([data-scene-id], [data-entry-id])` instead of a
    class check, so handlers work bound to either the `li` or the label.
  - The levels menu anchors on the scene id its entries carry rather than on
    position, since `handleSceneList` is async and the viewed scene may already
    have moved; the append is now idempotent.
  - Scene status glyphs are positioned explicitly, having previously inherited
    from core's removed `::after` rule.
  - Widened the Font Awesome fallback stack (v14 ships FA7, v13 ships FA6).
- Themed the pf2e action-tab activate button, gated on `crlngn-sheets`.
- Dropped Monk's Enhanced Journal's light parchment background when its compat
  styles are active, unless the user picked one of MEJ's own backgrounds.
- Gave popped-out chat a themed background, which dnd5e sets to none.
- Scoped docked chat card colours to `#interface` so they follow the interface
  theme instead of the applications theme, and fixed a missing comma that broke
  the popout selector list.
- Marked 14.367 verified.

## 4.0.1 — 2026-07-06

- Fixed chat message text being unreadable in dark mode on Foundry v14 after the
  merge with the v13 code.

## 4.0.0 — 2026-07-04

- Unified the Foundry v13 and v14 lines into a single package. The module detects
  your Foundry version at load time and activates the matching build — v13 users
  keep the 2.x feature set, v14 users the 3.x one. Everyone can now update
  normally from the same release line.
