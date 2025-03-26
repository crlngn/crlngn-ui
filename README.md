**Latest Version:** 1.3.8

I have just created a Discord channel for users of my module to discuss it and seek help. It's pretty empty so far as I've just created it, but feel free to join:

[![alt-text](https://img.shields.io/badge/-Discord-%235662f6?style=for-the-badge)](https://discord.gg/cAuTaTYda3) 
![GitHub Downloads (specific asset, all releases)](https://img.shields.io/github/downloads/crlngn/crlngn-ui/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge)


**Compatibility:** 
- Foundry VTT version 12.328+
- Mostly tested with DnD5e 4.x. Should work with other systems, but modules for those systems remain untested. 
- Localization: English and Brazilian Portuguese (me), Chinese by [yyzitai](https://github.com/yyzitai)

## Carolingian UI
A sleek and minimalist UI overhaul, focusing on saving space on screen and improving overall look and feel of Foundry VTT v12, but also offering many quality of life features to the ui panels. 

<div style="display: flex; flex-direction: row;">
<video src="https://github.com/user-attachments/assets/9cc3b4fb-9f9e-45a4-9367-1bc6d255679c" width="100%" height="auto">
</video>
</div>
  
<div style="display: flex; flex-wrap: wrap; flex-direction: row; gap: '2%'">
  <img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/carolingian-ui-2.webp?raw=true" width="49%" height="auto" />
  <img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/carolingian-ui-1.webp?raw=true" width="49%" height="auto" />
</div>

### FEATURES:
- **Scene Navigation** have folders and scene search. It can be scrolled horizontally, saving space, and there's improved icons and markers for players and GM;
- **Custom Fonts** for UI and journal;
- **Custom Color Themes** for highlights, inputs and secondary controls
- **Compact left controls:** small or regular sized icons; secondary bars can be hidden until hovered;
- **Wrapping control icons** set a safe area at the bottom and the left controls will wrap to avoid it - great if you have lots of modules that add icons to left bar; 
- **Secondary controls bar** has different styles to make it clearer;
- **Compact Player List** - can be auto-hidden and opened on hover;
- **Macro hotbar** with optional resizing and styles;
- **Floating camera dock** - drag, resize and position it anywhere on screen;
- **Right panel** buttons, sliders and headers have modified dark styles for a more uniform feel;
- **Settings** allow you to configure macro bar, left controls, camera dock and scene navigation;
- **Dark style for chat messages** if the selected Foundry theme is Dark (tested on DnD5e 4.x, partial support for other systems); 
- **Compact chat messages** (DnD5e) compact usage buttons to save some space on chat log;
- **Chat Border Colors** - Select if you want the borders to show player color, roll type, or none;
- **Custom CSS Field** to load your own style modifications to your world


<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/crlngn-ui-folder-tree.gif?raw=true" width="500px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/right-panel-settings.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/toolbar-1.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/top-nav-1.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/slider-controls.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/players-list-1.webp?raw=true" width="300px" height="auto" />


**Carolingian UI** is free to use and distribute under MIT License. If you reuse my code, please add mention to the original repo. 

I am very opinionated about this module's look and feel, as it was created for my own use, and I overwrite some other modules' fonts and colors to look more uniform with mine. My setup of modules is relatively lean, with only 35-40 quality of life modules. If the aesthetics are too off or the module is too niche, I might not be interested in working on compatibility for it. That being said, I've specifically tested some modules by user request, and adapted their styling.

### VERIFIED MODULE COMPATIBILITY (A-Z):
**Note:** This is not an extensive list - I've only included modules that I personally checked and which might be particularly affected by changes in the UI.
- Are You Focused? 1.2.x
- Break Time 12.0.x
- Carousel Combat Tracker 3.1.x
- Compact Scene Navigation 1.0.x (my module now provides similar features, so I suggest not using it)
- CRUX 1.2.x
- Dice Tray 2.2.x
- Dungeon Draw 3.0.x
- Epic Rolls 5e 4.2.x
- Force Client Settings 2.5.x (please disable "Enforce Dark Mode")
- Hide Player UI 1.7.x
- LiveKit AV Client 0.5.x
- Midi-QoL 12.4.x (seems to work in v11 as well)
- Mobile Improvements 1.3.x
- Monk's Hotbar Expansion 11.0.x
- Party Resources 1.7.x
- Ready Set Roll 5e 3.4.x
- Taskbar 4.1.x
- Tidy 5e 9.1.x
- TheRipper93's Module Hub 4.1.x
- Touch VTT 2.2.x
- Visual Active Effects
- YouTube Player Widget 2.1.x

I have also verified PF2e HUD, but I do not play PF2e so there might be issues I haven't noticed.

**Note:**
If you want to use **Monk's Scene Navigation** you need to disable my horizontal navigation, as Monk's is not compatible with it. You'll find the option in settings.

### NOTES:
- The module was tested mostly on Foundry v12 and DnD 4.x. The overall UI styles are system agnostic, but chat card styles are mostly for DnD5e - I've done some basic tests for PF2e. If you would like to request support for a different system (and help with info and screenshots), please add a feature request on Github issue tracker (subject to evaluation);
- Carolingian UI works best for DMs with a somewhat lean list of active modules. Modules which heavily modify the UI are likely to have conflicts.
- The module is currently compatible with **"Compact Scene Navigation"**, but you might want to disable the auto-hide setting in one of the modules; 
- Feel free to report compatibility status with other modules (subject to evaluation);
- If you use a non-compatible module, play with the settings and disable the parts that might be affecting it before reporting.
- If you would like to contribute with translation to your language please send a PR or copy the en language file, translate and post as enhancement.

### BUGS AND FEATURE REQUESTS:
- Please use the issue tracker to report any bugs and requests for enhancements using the appropriate labels.
- When reporting bugs, please first try to disable unrelated modules. Disable modules one by one to see which one might cause the issue. Take screenshots of any errors and provide as much information as possible on your issue (Foundry version, game system, active modules). 
