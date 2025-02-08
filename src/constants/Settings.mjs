export const SETTING_INPUT = {
  select: "select", 
  checkbox: "checkbox",
  text: "text"
}
export const SETTING_SCOPE = {
  client: "client",
  world: "world"
}

export const SETTINGS = { 

  enableChatStyles: { 
    tag: "enable-chat-styles", 
    label: "Enable styles for chat messages", 
    hint: "Adds style modifications to chat cards. When dark mode is selected on Foundry, makes chat cards dark as well. <b>Mostly for DnD5e</b> - only partial support for other systems.", 
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

  sceneNavDisabled: { 
    tag: "scene-nav-disabled", 
    label: "Disable Scene Nav Styles", 
    hint: "If you are having layout issues with a non-compatible module, you can disable my custom styles for Scene Navigation. This will also affect positioning of the macro bar", 
    propType: Boolean, 
    inputType: SETTING_INPUT.checkbox, 
    default: false, 
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
    hint: "Enable to auto-hide the secondary bar on the left controls, unless the mouse is not over that area", 
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
    hint: "Enable to keep player list on the bottom left minimized unless hovered", 
    propType: Boolean,
    inputType: SETTING_INPUT.checkbox,
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: true, 
    requiresReload: false 
  },

}