**IMPORTANT: If you are using Foundry v12 install Carolingian UI v1.18.x. If you are using Foundry v13 you should install Carolingian UI v2.x**

**Patreon members** receive priority support and may vote or suggest new features and modules on my Discord channel.

[![Static Badge](https://img.shields.io/badge/Patreon-carolingian-white?style=for-the-badge&logo=patreon&labelColor=%23000000&color=%238000b3)](https://www.patreon.com/c/carolingiandev)
[![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/cAuTaTYda3) 
![GitHub Downloads (specific asset, all releases)](https://img.shields.io/github/downloads/crlngn/crlngn-ui/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge)

## Carolingian UI
A UI overhaul, focusing on removing clutter from screen and improving overall look and feel of Foundry VTT, but also offering many quality of life features to the UI panels.

<div style="display: flex; flex-direction: row;">
  <img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/crlngn-ui-1.x-sheet-themes.png?raw=true" width="100%" height="auto" />

  <!--<video src="https://github.com/user-attachments/assets/9cc3b4fb-9f9e-45a4-9367-1bc6d255679c" width="100%" height="auto">
  </video>-->
</div>
  
<div style="display: flex; flex-wrap: wrap; flex-direction: row; gap:2%">
  <img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/carolingian-ui-1.webp?raw=true" width="49%" height="auto" />
  <img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/carolingian-ui-2.webp?raw=true" width="49%" height="auto" />
</div>

### EXTRA FEATURES ON V13:
- **Fade out:** ability to disable fade out behavior of interface elements individually
- **Custom Styles:** ability to disable/enable Carolingian UI styles on interface elements individually and still take advantage of other features like scene navigation, color themes, custom fonts, etc.
- **Reworked Scene Navigation** with a toggle for Folder Navigation and separated active/viewed scenes
- **Scene Preview Shortcuts:** which allow user to view and toggle global illumination, token vision, scene sound and open config
- **Toggle floating chat log:** button to hide/show the chat input box if you don't use it often
- **Players List:** Avatar miniatures
- Most of the options present in v12 (below) are also available

### FEATURES ON V12:
- **Scene Navigation** have folders and scene search. It can be scrolled horizontally, saving space, and there's improved icons and markers for players and GM;
- **Custom Fonts** for UI and journal;
- **Custom Color Themes** for highlights, inputs, secondary controls and 5e actor sheets
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
- **Custom CSS Field** to load your own style modifications to your world

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/crlngn-ui-folder-tree.gif?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/slider-controls.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/players-list-1.webp?raw=true" width="300px" height="auto" />


**Carolingian UI** is free to use and distribute under MIT License. If you reuse my code, please add mention to the original repo. 

I am very opinionated about this module's look and feel, as it was created for my own use, and I overwrite some other modules' fonts and colors to look more uniform with mine. My setup of modules is relatively lean, with only ~40 quality of life modules. If the aesthetics are too off or the module is too niche, I might not be interested in working on compatibility for it. That being said, I've specifically tested some modules by user request, and adapted their styling, and you may request support for specific modules if you are a member on Patreon.

**Compatibility:** 
- v1.x: Foundry VTT version 12.328+
- v2.x: Foundry VTT version 13.341+
- Mostly tested with DnD5e 4.x - 5.x. Should work with other systems, but modules for those systems remain untested. 
- Localization: English, Brazilian Portuguese, Chinese, Italian. Thanks to [yyzitai](https://github.com/yyzitai) for contributions to the Chinese language files.


### MODULE COMPATIBILITY (A-Z):
I've adapted or adjusted many modules to go well with Carolngian UI - mostly those that might be particularly affected by changes in the UI. Check the  compatibility trcker for v13.
I have verified PF2e HUD, but I do not play PF2e so there might be issues I haven't noticed.

**Note:**
If you want to use **Monk's Scene Navigation** you need to disable my horizontal navigation, as Monk's is not compatible with it. You'll find the option in settings.

### NOTES:
- The module was tested mostly on Foundry v12 and DnD 4.x. The overall UI styles are system agnostic, but chat card styles are mostly for DnD5e - I've done some basic tests for PF2e. If you would like to request support for a different system (and help with info and screenshots), please add a feature request on Github issue tracker (subject to evaluation);
- Carolingian UI works best for DMs with a somewhat lean list of active modules. Modules which heavily modify the UI are likely to have conflicts.
- Feel free to report compatibility status with other modules (subject to evaluation);
- If you use a non-compatible module, play with the settings and disable the parts that might be affecting it before reporting.
- If you would like to contribute with translation to your language please send a PR or copy the en language file, translate and post as enhancement.

### BUGS AND FEATURE REQUESTS:
- Please use the issue tracker to report any bugs and requests for enhancements using the appropriate labels.
- When reporting bugs, please first try to disable modules one by one to see which one might cause the issue. Take screenshots of any errors and provide as much information as possible on your issue (Foundry version, game system, active modules). 
