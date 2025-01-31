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
    hint: "(DnD5e only) Adds style modifications to chat cards. When dark mode is selected on Foundry, makes chat cards dark as well.", 
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
    default: `"Work Sans", Arial, sans-serif`, 
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

}