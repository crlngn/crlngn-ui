**IMPORTANT:**
- Foundry v13 or v14  - install v4.x
- Foundry v12 - install v1.x

**Patreon members** receive priority support and may vote or suggest new features and modules on my Discord channel.

[![Static Badge](https://img.shields.io/badge/Patreon-carolingian-white?style=for-the-badge&logo=patreon&labelColor=%23000000&color=%238000b3)](https://www.patreon.com/c/carolingiandev)
[![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/cAuTaTYda3) 
![GitHub Downloads (specific asset, all releases)](https://img.shields.io/github/downloads/crlngn/crlngn-ui/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge)

## Carolingian UI
A highly configurable UI overhaul, focusing on removing clutter from screen and improving overall look and feel of Foundry VTT, but also offering many quality of life features to the UI panels.

https://github.com/user-attachments/assets/ebd47223-3bef-48a0-8294-9fe59b8ab9c8


### EXTRA FEATURES ON V13/V14:
- **Fade out:** ability to disable fade out behavior of interface elements individually
- **Custom Styles:** ability to disable/enable Carolingian UI styles on interface elements individually and still take advantage of other features like scene navigation, color themes, custom fonts, etc.
- **Reworked Scene Navigation** with a toggle for Folder Navigation and separated active/viewed scenes
- **Scene Preview Shortcuts:** which allow user to view and toggle global illumination, token vision, scene sound and open config
- **Toggle floating chat log:** button to hide/show the chat input box if you don't use it often
- **Players List:** Avatar miniatures
- **Sidebar Tab control** Hide sidebar tabs for you or for players
- **Combat Carousel:** horizontal combat tracker built from the regular Foundry popout
- Most of the options present in v12 (below) are also available

### FEATURES ON V12/V13/V14:
- **Scene Navigation** has folders and scene search. It can be scrolled horizontally, saving space, and there's improved icons and markers for players and GM;
- **Custom Fonts** for UI and journals;
- **Custom Color Themes** for highlights, inputs, secondary controls and actor sheets for some systems;
- **Horizontal Tabs for 5e Actor Sheets** - many people get confused with the lateral icon tabs in 5e sheets. I've added an option to use horizontal tabs with labels;
- **Compact left controls:** small or regular sized icons; secondary bars can be hidden until hovered;
- **Wrapping control icons** set a safe area at the bottom and the left controls will wrap to avoid it - great if you have lots of modules that add icons to left bar; 
- **Secondary controls bar** has different styles to make it clearer;
- **Compact Player List** - can be auto-hidden and opened on hover;
- **Macro hotbar** with optional resizing and styles;
- **Floating camera dock** - drag and position it anywhere on screen, resize automatically or manually;
- **Right panel** buttons, sliders and headers have modified dark styles for a more uniform feel;
- **Settings** allow you to configure macro bar, left controls, camera dock and scene navigation;
- **Dark style for chat messages** - applied if the selected Foundry theme is Dark (tested on DnD5e 4.x/5.x and Pathfinder2e, partial support for other systems); 
- **Compact chat messages** (DnD5e) compact usage buttons to save some space on chat log;
- **Chat Border Colors** - Select if you want the borders to show player color, roll type (5e), or none;
- **Custom CSS Field** to load your own style modifications to your world or to specific players

**Carolingian UI** is licensed under [Creative Commons Attribution-NonCommercial 4.0](https://creativecommons.org/licenses/by-nc/4.0/): you may use, share and adapt it for non-commercial purposes with credit to the original repo. Commercial use is not allowed. See the LICENSE file for third-party notices.

I am very opinionated about this module's look and feel, and I may override some other modules' fonts and colors to look more uniform with mine. This behavior can be unchecked per module in settings. My setup of modules is relatively lean, with only ~40 quality of life modules. If the aesthetics are too off or the module is too niche, I might not be interested in working on compatibility for it. That being said, I've specifically tested some modules by user request, and adapted their styling, and you may request support for specific modules.

**Compatibility:** 
- v1.x: Foundry VTT version 12.328+
- v4.x: Foundry VTT version 13.339 to 14.368
- Mostly tested with DnD5e 4.x - 6.x. Should work with most other systems, but modules for those systems remain untested. 
- Localization: English, Brazilian Portuguese, Chinese, Italian. Thanks to [yyzitai](https://github.com/yyzitai) for contributions to the Chinese language files.


### MODULE COMPATIBILITY:
I've adapted or adjusted many modules to go well with Carolingian UI - mostly those that might be particularly affected by changes in the UI. Check the compatibility tracker in issues tab.
I have verified PF2e HUD to work, but I do not play PF2e so there might be issues I haven't noticed. Feel free to report.

**Note:**
If you want to use **Monk's Scene Navigation** instead of mine you need to disable my horizontal navigation, as Monk's is not compatible with it. You'll find the option in settings ("Custom layout").

### NOTES:
- The module was tested mostly on Foundry v12, v13, v14 and DnD5e. The overall UI styles are system agnostic, but chat card styles were tested for DnD5e and PF2e. Each system may have overrides that I may not be able to account for. If you would like to request support for a different system (and help with info and screenshots), please add a feature request on Github issue tracker (subject to evaluation);
- Carolingian UI works best for DMs with a somewhat lean list of modules. Modules which modify the UI are likely to have conflicts.
- Feel free to report compatibility status with other modules (subject to evaluation);
- If you use a non-compatible module, play with the settings and disable the parts that might be affecting it before reporting.
- If you would like to contribute with translation to your language please send a PR or copy the en language file, translate and post as enhancement.

### FOR MODULE DEVELOPERS: SETTINGS LOCKS API
With *Enable client settings lock for core and other modules* on, the GM can lock other modules' player settings that appear in Configure Settings. If your module keeps player settings in its own settings window (`config: false`), you can make those lockable too, whether or not that option is on. The GM's locks and values are stored in Carolingian UI's world settings, so your module doesn't bundle anything or register extra settings. Nothing happens if Carolingian UI isn't active.

Lock states: `unlocked` (players choose), `soft` (the GM's value is applied once, then players can change it), `locked` (the GM's value is applied on every load and player changes revert), `gate` (locked for players, while the GM keeps their own value).

**1. Register your client or user settings.** Listen for the hook during `init` or earlier. It fires at `setup`, once every module has registered its settings:
```js
let locks;
Hooks.once("crlngn-ui.settingsLocksReady", (api) => {
  locks = api.register("my-module", ["compactMode", "fontSize"]);
});
```
After `setup`, the same API is at `game.modules.get("crlngn-ui").api.settingsLocks`. Registering wraps each setting's `onChange` in place. For a setting you register later, pass its handler through `locks.wrapOnChange(key, onChange)`.

**2. Draw the lock icons in your settings form**, e.g. in your ApplicationV2's `_onRender`:
```js
_onRender(context, options) {
  game.modules.get("crlngn-ui")?.api?.settingsLocks?.render(this.element, "my-module", { scope: `#${this.id}` });
}
```
Fields are matched by their input's `name` (the setting key). Options: `fieldPrefix` when names look like `"my-module.key"`, `fieldKeys` to map other field names to keys (`{ fieldName: "key" }`), and `scope` (a CSS selector for your window) to keep the injected styles local. The GM gets a clickable icon that cycles the state (right-click or Alt+click for gate). Players see a lock on fields locked for them, and those inputs are disabled.

**3. Read the state if you need it:** `locks.getState(key)` returns one of `api.LOCK_STATES`, and `locks.lockedValue(key)` returns the GM's value when the setting is locked for the current player (otherwise `undefined`).

### BUGS AND FEATURE REQUESTS:
- Please use the issue tracker to report any bugs and requests for enhancements using the appropriate labels.
- When reporting bugs, please first try to disable modules one by one to see which one might cause the issue. Take screenshots of any errors and provide as much information as possible on your issue (Foundry version, game system, active modules). 
