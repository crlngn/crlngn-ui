# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the Carolingian UI module for Foundry VTT - a comprehensive UI overhaul that modernizes the interface with customizable themes, enhanced navigation, and improved usability features.

## Build Commands

```bash
# Production build
npm run build

# Development watch mode
npm run watch

# Version management (auto-builds after version bump)
npm run bump        # Patch version
npm run bump:minor  # Minor version
npm run bump:major  # Major version

# Type checking (JSDoc validation)
npm run tsc
```

## Architecture Overview

### Module Structure
The module follows a static utility class pattern where each UI component is self-contained:

- **Main.mjs** - Central orchestrator that initializes all components based on settings
- **Component Pattern** - Each component (e.g., TopNavUtil, ChatUtil) has:
  - Static `init()` method called by Main
  - Hook listeners for Foundry events
  - Settings integration via SettingsUtil
  - No direct dependencies between components

### Key Architectural Decisions

1. **Hook-Based Architecture**: All components interact with Foundry through its hook system. Common hooks used:
   - `ready` - Module initialization
   - `renderSceneNavigation` - Scene nav customization
   - `renderChatMessage` - Chat styling
   - `renderPlayerList` - Player list enhancements
   - `renderActorSheetV2` - Character sheet modifications

2. **Settings-Driven Behavior**: Every feature can be toggled via settings. The settings system:
   - Centralized in `constants/Settings.mjs`
   - Uses Foundry's native settings API
   - Supports both client and world scopes
   - Changes apply without page reload via hook listeners

3. **CSS Architecture**: 
   - PostCSS processes all styles with nesting and custom properties
   - Each UI section has its own CSS file in `src/styles/`
   - Theme variables defined in `theme.css`
   - All custom classes prefixed with `crlngn-`

### Component Communication

Components don't directly communicate but share state through:
- Foundry's game settings
- DOM class additions to `document.body`
- CSS custom properties for theming

Example flow:
1. User changes theme in settings
2. SettingsUtil updates the setting
3. ThemeUtil's hook listener detects change
4. Theme classes/properties applied to body
5. All components automatically reflect new theme

### Build Process Details

The build system (`tools/build.mjs`):
1. Bundles JS with Vite (entry: `src/scripts/crlngn-ui.mjs`)
2. Processes CSS with PostCSS plugins:
   - `postcss-import` - Combines CSS files
   - `postcss-nesting` - Nests selectors
   - `postcss-custom-properties` - Preserves CSS variables
   - `cssnano` - Minifies output
3. Copies static assets (templates, lang files)
4. Syncs version across package.json, module.json, and README.md
5. Creates symlink for local Foundry development

### System Compatibility

The module primarily targets D&D 5e but includes compatibility code for:
- PF2e system (limited support)
- Popular modules like Monk's TokenBar, Dice So Nice, etc.

Compatibility is handled through:
- Conditional initialization based on `game.system.id`
- Module-specific CSS rules
- Feature detection before applying modifications

### Development Patterns

1. **No External Dependencies**: The module is self-contained with no runtime dependencies
2. **Defensive Coding**: All DOM queries use optional chaining (`?.`)
3. **Performance**: Uses `setTimeout` for non-critical UI updates to avoid blocking
4. **Localization**: All user-facing text uses i18n keys from `/lang` files

### Testing Approach

While there's no formal test suite, the module uses:
- JSDoc type annotations checked by TypeScript compiler
- Manual testing across different Foundry versions
- Community feedback through GitHub issues

When making changes:
1. Test with D&D 5e 4.x system first (primary target)
2. Verify settings changes apply without reload
3. Check theme compatibility in both light and dark modes
4. Ensure no console errors during normal operation