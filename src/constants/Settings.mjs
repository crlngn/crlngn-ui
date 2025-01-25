export const SETTING_INPUT = {
  select: "select", 
  checkbox: "checkbox"
}
export const SETTING_SCOPE = {
  client: "client",
  world: "world"
}

export const SETTINGS = { 
  /*
  textSize: { 
    tag: "font-size", 
    label: "Default Text Size",
    hint: "Increase or decrese the default font size across Foundry clients. Clients can still change the font size in their Foundry Core settings",
    propType: new foundry.data.fields.StringField({
      choices: {
        "small": "small",
        "regular": "medium",
        "large": "large"
      }
    }),
    inputType: SETTING_INPUT.select,
    default: "small",
    scope: SETTING_SCOPE.world,
    config: true
  },
  */

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

  sceneNavState: { 
    tag: "scene-nav-collapsed", 
    label: "Scene Navigation Collapsed", 
    hint: "Current state of the scene navigation toggle", 
    propType: Boolean, 
    inputType: SETTING_INPUT.checkbox, 
    default: true, 
    scope: SETTING_SCOPE.client, 
    config: false 
  }

}