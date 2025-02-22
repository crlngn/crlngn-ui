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

export const ICON_SIZES = {
  small: { name: 'small', size: '36px'},
  regular: { name: 'regular', size: '42px'},
}

export function getSettings() { 
  return {
    customFontsMenu: {
      tag: "custom-font-families", 
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.label"),
      title: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.hint"),
      description: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.description"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: {
        uiFont: {
          tag: "ui-font",
          label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiFont.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiFont.hint"),
          inputType: SETTING_INPUT.text
        },
        uiTitles: {
          tag: "ui-titles",
          label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.hint"),
          inputType: SETTING_INPUT.text
        },
        journalBody: {
          tag: "journal-body",
          label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.hint"),
          inputType: SETTING_INPUT.text
        }, 
        journalTitles: {
          tag: "journal-title",
          label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.hint"),
          inputType: SETTING_INPUT.text
        }
      },
      default: {
        uiFont: `"Work Sans", Arial, sans-serif`,
        uiTitles: `"Roboto Slab", Arial, sans-serif`,
        journalBody: `"Work Sans", Arial, sans-serif`, 
        journalTitles: `"Roboto Condensed", Arial, sans-serif`
      },
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    leftControlsMenu: {
      tag: "left-controls-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: {
        iconSize: {
          tag: "control-icon-size",
          label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.hint"),
          inputType: SETTING_INPUT.select, 
          options: {
            small: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.small"), 
            regular: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.regular")
          }
        },
        autoHideSecondary: { 
          tag: "auto-hide-secondary-controls", 
          label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.label"), 
          hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.hint"), 
          inputType: SETTING_INPUT.checkbox
        }
      },
      default: {
        iconSize: ICON_SIZES.small.name,
        autoHideSecondary: false
      },
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },

    cameraDockMenu: {
      tag: "camera-dock-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.hint"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: {
        enableFloatingDock: { 
          tag: "enable-floating-camera-dock", 
          label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.label"), 
          hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.hint"), 
          inputType: SETTING_INPUT.checkbox
        },
        dockPosX: {
          tag: "camera-dock-x",
          label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.hint"),
          inputType: SETTING_INPUT.number
        },
        dockPosY: {
          tag: "camera-dock-y",
          label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.hint"),
          inputType: SETTING_INPUT.number
        },
        dockWidth: {
          tag: "camera-dock-width",
          label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.hint"),
          inputType: SETTING_INPUT.number
        },
        dockHeight: {
          tag: "camera-dock-height",
          label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.label"),
          hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.hint"),
          inputType: SETTING_INPUT.number
        }
      },
      default: {
        enableFloatingDock: true,
        dockPosX: 0,
        dockPosY: 120,
        dockWidth: 140,
        dockHeight: 140
      },
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },

    sceneNavMenu: {
      tag: "scene-nav-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: {
        sceneNavEnabled: { 
          tag: "scene-nav-enabled", 
          label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.label"), 
          hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.hint"), 
          inputType: SETTING_INPUT.checkbox
        },
        showNavOnHover: {
          tag: "show-nav-on-hover", 
          label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.label"), 
          hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.hint"), 
          inputType: SETTING_INPUT.checkbox
        }
      },
      default: {
        sceneNavEnabled: true,
        showNavOnHover: false
      },
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: true 
    },

    sceneNavCollapsed: { 
      tag: "scene-nav-collapsed", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavCollapsed.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavCollapsed.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },  

    sceneNavPos: { 
      tag: "scene-nav-pos", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavPos.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavPos.hint"), 
      propType: Number, 
      inputType: SETTING_INPUT.number, 
      default: 0, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    enableChatStyles: { 
      tag: "enable-chat-styles", 
      label: game.i18n.localize("CRLNGN_UI.settings.enableChatStyles.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.enableChatStyles.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: true, 
      requiresReload: true 
    },   

    enableMacroLayout: { 
      tag: "enable-macro-layout", 
      label: game.i18n.localize("CRLNGN_UI.settings.enableMacroLayout.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.enableMacroLayout.hint"), 
      propType: Boolean,
      inputType: SETTING_INPUT.checkbox,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: true, 
      requiresReload: false 
    },

    collapseMacroBar: { 
      tag: "collapse-macro-bar", 
      label: game.i18n.localize("CRLNGN_UI.settings.collapseMacroBar.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.collapseMacroBar.hint"), 
      propType: Boolean,
      inputType: SETTING_INPUT.checkbox,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: true, 
      requiresReload: false 
    },

    autoHidePlayerList: { 
      tag: "auto-hide-player-list", 
      label: game.i18n.localize("CRLNGN_UI.settings.autoHidePlayersList.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.autoHidePlayersList.hint"), 
      propType: Boolean,
      inputType: SETTING_INPUT.checkbox,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: true, 
      requiresReload: false 
    },

    debugMode: { 
      tag: "debug-mode", 
      label: game.i18n.localize("CRLNGN_UI.settings.debugMode.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.debugMode.hint"), 
      propType: Boolean,
      inputType: SETTING_INPUT.checkbox,
      default: false,
      scope: SETTING_SCOPE.client,
      config: true
    },

  }

}
