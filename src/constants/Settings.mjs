export const SETTING_INPUT = {
  select: "select", 
  checkbox: "checkbox",
  text: "text",
  number: "number"
}
export const SETTING_SCOPE = {
  client: "client",
  world: "world"
}

export const SETTINGS = { 

  enableChatStyles: { 
    tag: "enable-chat-styles", 
    label: "Enable styles for chat messages", 
    hint: "Adds style modifications to chat cards. When dark mode is selected on Foundry, makes chat cards dark as well. MOSTLY FOR DND5E - only partial support for other systems.", 
    propType: Boolean, 
    inputType: SETTING_INPUT.checkbox, 
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: true 
  }, 

  customFont: { 
    tag: "custom-font", 
    label: "Custom fonts", 
    hint: "You can type the name of custom fonts loaded on Foundry core and they will be used throughout the interface. Names with spaces must be written with double quotes (\"Font Name\"). If the font doesn't load you haven't typed the name correctly, or the font was not found. Default value: "+`"Work Sans", Arial, sans-serif`, 
    propType: String, 
    inputType: SETTING_INPUT.text, 
    default: `"Work Sans", "Roboto", Arial, sans-serif`, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: true 
  }, 

  debugMode: { 
    tag: "debug-mode", 
    label: "Debug Mode",
    hint: "Enable or disable debug messages on browser console",
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: false,
    scope: SETTING_SCOPE.client,
    config: true
  },

  sceneNavCollapsed: { 
    tag: "scene-nav-collapsed", 
    label: "Scene Navigation Collapsed", 
    hint: "Current state of the scene navigation toggle. Is it collapsed?", 
    propType: Boolean, 
    inputType: SETTING_INPUT.checkbox, 
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: false 
  },

  sceneNavEnabled: { 
    tag: "scene-nav-enabled", 
    label: "Enable Scene Nav Styles", 
    hint: "If you are having layout issues with a non-compatible module, you can disable my custom styles for Scene Navigation.", 
    propType: Boolean, 
    inputType: SETTING_INPUT.checkbox, 
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: true 
  },

  sceneNavPos: { 
    tag: "scene-nav-pos", 
    label: "Scene Navigation Position", 
    hint: "Stores current position of navigation for reset when it's re-rendered", 
    propType: Number, 
    inputType: SETTING_INPUT.number, 
    default: 0, 
    scope: SETTING_SCOPE.client, 
    config: false 
  },

  enableMacroLayout: { 
    tag: "enable-macro-layout", 
    label: "Enable macro resize", 
    hint: "The module reduces the size of macro slots on the hotbar, and enlarges the numbers. Disable this setting to use default Foundry layout.", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

  showSceneNavOnHover: { 
    tag: "show-scene-nav-on-hover", 
    label: "Show scene list on hover", 
    hint: "If the scene navigation is collapsed, you can show it by hovering the mouse over the top of screen.", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

  autoHideLeftControls: { 
    tag: "auto-hide-secondary-controls", 
    label: "Auto hide secondary controls", 
    hint: "Enable to keep the secondary bar on the left controls hidden unless you hover on the region or click on an item", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

  autoHidePlayerList: { 
    tag: "auto-hide-player-list", 
    label: "Auto hide player list", 
    hint: "Enable to keep the bottom left players list minimized, except when hovered", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

 collapseMacroBar: { 
    tag: "collapse-macro-bar", 
    label: "Collapse Macro Bar", 
    hint: "Enable to have the macro hotbar start minimized by default on world load.", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

  enableCameraStyles: {
    tag: "enable-camera-styles", 
    label: "Enable floating camera dock", 
    hint: "Apply styles to camera dock, so video players are floating and can be placed anywhere on screen. You may still pop out individual videos and move them independently", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.world, 
    config: true, 
    requiresReload: true 
  },

  cameraDockPosX: { 
    tag: "camera-dock-pos-x", 
    label: "X position of camera dock", 
    hint: "Position of camera dock on X axis, from left. In absolute pixels. ", 
    propType: Number, 
    inputType: SETTING_INPUT.number, 
    default: 0, 
    scope: SETTING_SCOPE.client, 
    config: true 
  },

  cameraDockPosY: { 
    tag: "camera-dock-pos-y", 
    label: "Y position of camera dock", 
    hint: "Position of camera dock on Y axis, from bottom. In absolute pixels. ", 
    propType: Number, 
    inputType: SETTING_INPUT.number, 
    default: 100, 
    scope: SETTING_SCOPE.client, 
    config: true 
  },

  cameraDockWidth: { 
    tag: "camera-dock-width", 
    label: "Width of camera dock", 
    hint: "Width of camera dock when not minimized, in absolute pixels. ", 
    propType: Number, 
    inputType: SETTING_INPUT.number, 
    default: 120, 
    scope: SETTING_SCOPE.client, 
    config: true 
  },

  cameraDockHeight: { 
    tag: "camera-dock-height", 
    label: "Height of camera dock", 
    hint: "Height of camera dock when not minimized, in absolute pixels. ", 
    propType: Number, 
    inputType: SETTING_INPUT.number, 
    default: 120, 
    scope: SETTING_SCOPE.client, 
    config: true 
  } ,

  controlIconSize: { 
    tag: "conrol-icon-size", 
    label: "Size of control icons", 
    hint: "If you use a very large screen, you may want to change the size of the icons on left controls. This may affect some other UI elements", 
    propType: Number, 
    choices: {
      1: "small",
      2: "normal"
    },
    inputType: SETTING_INPUT.number, 
    default: 1, 
    scope: SETTING_SCOPE.client, 
    config: true 
  } 

}