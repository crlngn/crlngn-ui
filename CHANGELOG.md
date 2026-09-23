# Changelog

Notable changes to Carolingian UI, starting at 4.0.0. Earlier releases are
described in the [GitHub releases](https://github.com/crlngn/crlngn-ui/releases).

## 4.3.2 — 2026-09-22

### Added

- dnd5e 6.0: retroactive advantage on d20 rolls. The roll's author and the
  GM get angles-up and angles-down buttons flanking the total of attack rows,
  save entries, check summaries and standalone check and save cards, which
  apply advantage or disadvantage after the roll, or return it to normal.
  One extra d20 is rolled (two with Elven Accuracy) and shown through Dice So
  Nice, the kept die follows the new mode, and hit, miss, critical and fumble
  follow the new total. Dice rolled this way are remembered on the message,
  so toggling back and forth reuses them, and a changed roll shows a marked
  pill. Not shown when Ready Set Roll is active, and the GM can turn the
  buttons off with the new world setting "Retroactive advantage buttons".

## 4.3.1 — 2026-09-21

### Changed

- dnd5e 6.0: the "Compact activity cards" setting and the system's "Summary
  Chat Cards" client setting now stay in sync. On load Carolingian UI's setting
  wins and the dnd5e setting is changed to match it, with a notification.
  After that, turning either one on or off applies to both.
- dnd5e 6.0: in the damage tray, the Apply button sits at the end of the
  multiplier row instead of on its own line, and the multipliers start next
  to their icon rather than being pushed to the right.

## 4.3.0 — 2026-09-20

### Changed

- License changed from MIT to Creative Commons Attribution-NonCommercial 4.0.
  Earlier releases remain under MIT; see the LICENSE file for third-party
  notices.

### Added

- dnd5e 6.0: compact activity cards. Attack, damage and healing rolls made
  from an activity card are folded into that card instead of posting their
  own cards, using the system's chat card summary mechanism. Each roll is a
  row with its total in a fixed column on the right and a chevron that opens
  a drawer with the dice result and formula, one line per damage type; the
  damage tray keeps its place under the damage row. Attacks against three or
  more targets show hit and miss counts on the row and list the targets in
  the drawer. Saving throws rolled from the card are grouped into one row per
  ability with success and failure counts, and the DC is only shown when the
  system's challenge visibility setting allows it for the current user.
  Buttons whose roll already exists shrink to their icon. Client setting
  "Compact activity cards" under Systems and Modules, enabled by default;
  it requires the system's own "Summarize Chat Cards" setting and is skipped
  when Midi-QOL is active.
- dnd5e 6.0: the tags of a compact activity card and of its rolls are merged
  into one deduplicated row, ordered by usefulness (activation, range or
  reach, area, properties, duration, then the rest) and collapsed to the
  first three behind a "+N" chip. Client setting "Collapse card tags by
  default" under Systems and Modules, enabled by default.
- dnd5e 6.0: client setting "Labeled card buttons" under Systems and Modules
  chooses between the text-labeled action buttons (default) and icon-only
  buttons on activity cards.
- dnd5e 6.0: the compact activity cards now live in a shared package
  (`shared/dnd5e-compact-cards`, a git submodule) that Flash Token Bar 5e
  bundles as well, so users of either module get the same cards. When both
  modules are active only one copy runs: the one bundling the newer package
  version, Carolingian UI on ties. The other module's compact card settings
  say which module handles the feature. Integrations can listen to
  `dnd5e-compact-cards.renderRoll` and `dnd5e-compact-cards.renderCard`;
  the `crlngn-ui.renderCompactRoll` and `crlngn-ui.renderCompactCard` hooks
  still fire when this module runs the feature. The body classes are now
  `dnd5e-compact-cards` and `dnd5e-icon-card-buttons`.

### Fixed

- Saving the Systems and Modules settings tab without touching any module
  checkbox logged "otherModulesList is malformed string" and fell back to
  the stored list. The hidden input carrying the list was rendered without
  HTML escaping, so the first quote inside the JSON ended the attribute and
  the form only submitted `[{`. The value is now escaped, so the submitted
  list is read correctly.
- dnd5e 6.0: the Welcome Screen button in the Settings sidebar tab grew to
  fill all spare vertical space, most visible on tall windows and on the
  player side. The system appends that button directly to the tab rather
  than inside a section, so it picked up the shared sidebar button rule's
  flex grow; direct children of the tab no longer grow.

## 4.2.4 — 2026-09-15

### Changed

- dnd5e 6.0: the action buttons on activity cards (attack, damage, save,
  template, consume and so on) were bare 24px icons that were hard to find.
  Each one now shows a short label next to its icon, using the same
  localized strings as the 5.x card buttons and falling back to the button's
  own accessible name for anything else. The buttons are laid out two per
  row across the card width, and an odd last button spans the full row.
- dnd5e 6.0: pill rows, target rows and action buttons on compact cards are
  aligned to the left edge of the card, and the leading icon of every row
  sits in the same 24px column as the targets row's toggle button.
- dnd5e 6.0: the damage tray "Apply" button label no longer renders in
  small caps; it uses the same typography as the action button labels.
- dnd5e 6.0: chat card pills are outlined with the theme's alternate
  background color instead of filled, so they read as tags rather than
  buttons, with slightly larger text, padding and spacing and a text color
  derived from the hyperlink color. Target pills keep a highlight fill. Card
  buttons size by content with a shared 2.5em minimum, and card tray headers
  and damage multiplier buttons are bolder. dnd5e 5.x cards are unchanged.
- Chat card buttons use the theme's alternate background color (all systems).
- The sender name in the chat message header uses the titles font when the
  chat titles font setting is on; card titles keep the body font.
- dnd5e 6.0: the dark-mode rules that forced the module's text color onto
  every element inside a chat message are no longer applied. dnd5e 6.0
  themes its own cards in dark mode, and the blanket override was flattening
  colors that other modules put in their chat cards. Other systems keep the
  override, since some system and core markup (for example the whisper
  recipients label) still depends on it there; that label now also has its
  own explicit color everywhere.

### Fixed

- Foundry 14: the scene directory context menu showed "Edit" twice. Core now
  ships its own "Edit" entry, and the module added another one on top. The
  module's shortcut is only added when no edit entry exists yet, whoever
  provided it, and any copy it added itself on an earlier pass is removed
  first.
- The "Toggle Chat Box" button in the roll-mode strip could appear twice
  (most visible on Foundry 14, where the strip is laid out vertically
  whenever chat is not the active tab). The button was built from an async
  template, so two sidebar hooks firing back to back both passed the
  "already exists" check before either had inserted anything. The button is
  now created synchronously, and every render pass removes any extra copies
  wherever they ended up, so a single button is guaranteed regardless of
  how many times or from where the hooks fire.
- Scene directory status icons (active, current, hidden) are replaced instead
  of prepended on every render, so they can no longer stack up.

### Fixed

- Pathfinder 2e: clicking a card in the combat carousel, including the
  end-turn button on the active card, threw that card out of position. On GM
  clients PF2e attaches a SortableJS instance to the tracker list for drag
  reordering, and Sortable clears the inline transform of any card that is
  pressed and released, so the card snapped to its natural place before the
  turn animation ran. The Sortable instance is now disabled on the carousel
  after every render.
- Daggerheart: the spotlight request button on the carousel is only shown to
  players for combatants whose token or actor they own. GMs keep it on every
  card.

### Added

- Daggerheart: a combatant requesting the spotlight gets a thin animated
  outline on its carousel card, a conic gradient swirling around the frame,
  and the sparkling-hand button glows.

## 4.2.2 — 2026-09-10

### Fixed

- Whisper and blind chat cards had no background in light mode (visible in
  the chat notifications overlay and the sidebar alike): their background
  tokens were only defined for dark mode, so the `!important` background
  resolved to nothing. Light-mode whisper and blind tokens for cards,
  buttons and dice are now defined and derived from the light card color.

## 4.2.1 — 2026-09-10

### Fixed

- Chat cards follow the interface theme again when Applications and Interface
  use different themes (for example Applications: Dark with Interface: Light).
  Foundry v14 renamed the sidebar body from `.sidebar-content` to
  `#sidebar-content`, which left the interface-scoped chat color overrides
  inert, and a body-theme-scoped override was painting dark cards with dark
  text into the light sidebar. The chat tokens derived from dnd5e variables
  are now also re-resolved inside the light interface region.

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
