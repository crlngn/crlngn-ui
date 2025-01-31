**Latest Version:** 1.1.4

**Compatibility:** 
- Foundry VTT version 12.328+

## Carolingian UI
A light module that provides a sleek minimalist UI overhaul, focusing on saving space on screen and improving overall look and feel of Foundry VTT v12. Most changes are made through CSS styling and should not break other modules. The exception is the Top Navigation, where some simple JS code is added to provide horizontal scroll functionality. 

**Carolingian UI** is free to use and distribute. If you reuse my code, please add mention to the original repo. 

### FEATURES:
- Compact left controls: the icons are smaller and the secondary bars are hidden until an item is hovered or clicked; 
- Right panel buttons, sliders and headers have modified styles for a more uniform feel;
- Secondary controls bar has a different background color to make it clearer;
- Top Navigation can be horizontally scrolled; player and GM markers are turned into simple lines with the color of each player;
- Compact Player list - it opens on hover;
- Reduced size of macro bar;
- Chat messages have more compact usage buttons for saving some space (tested on DnD5e 4.x, partial support for other systems);
- Chat messages are shown in dark mode if the selected Foundry theme is Dark (tested on DnD5e 4.x, partial support for other systems);
  

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/screenshot-2.webp?raw=true" width="100%" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/right-panel-settings.webp?raw=true" width="200px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/toolbar-1.webp?raw=true" width="200px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/top-nav-1.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/slider-controls.webp?raw=true" width="300px" height="auto" />

<img src="https://github.com/crlngn/crlngn-ui/blob/main/demo/players-list-1.webp?raw=true" width="300px" height="auto" />


### IMPORTANT:
- The module was tested mostly on Foundry v12 and DnD 4.x. The overall UI styles are system agnostic, but chat card styles are mostly for DnD5e - I've done some basic tests for PF2e. If you would like to request support for a different system (and help with info and screenshots), please add a feature request on Github issue tracker (subject to evaluation);
- The module is currently compatible with **"Compact Scene Navigation"**, but you might want to disable the auto-hide setting on that module as my module also implements auto-hide; 
- Feel free to report compatibility status with other modules (subject to evaluation);

### BUGS AND FEATURE REQUESTS:
- Please use the issue tracker to report any bugs and requests for enhancements using the appropriate labels.
- When reporting bugs, please first try to disable all other modules. Take screenshots of any errors and provide as much information as possible on your issue (Foundry version, game system, active modules). 
