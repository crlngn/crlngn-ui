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

export const BORDER_COLOR_TYPES = {
  playerColor: { name: 'playerColor'},
  rollType: { name: 'rollType'},
  none: {
    name: 'none'
  }
}

export const THEMES = [
  {
    label: 'Carolingian Teal',
    className: '',
    colorPreview: [
      'rgb(62, 62, 88)',
      'rgb(68, 147, 173)'
    ]
  },
  {
    label: "Gold and Chocolate",
    className: 'crlngn-theme-gold-chocolate',
    colorPreview: [
      'rgb(34, 25, 25)',
      'rgb(164, 138, 51)'
    ]
  },
  {
    label: "Royal Blood",
    className: 'crlngn-theme-royal-blood',
    colorPreview: [
      'rgb(40, 31, 49)',
      'rgb(127, 18, 36)'
    ]
  },
  {
    label: "Dark Sorcery",
    className: 'crlngn-theme-dark-sorcery',
    colorPreview: [
      'rgb(31, 47, 49)',
      'rgb(94, 57, 127)'
    ]
  },
  {
    label: "Tangerine",
    className: 'crlngn-theme-tangerine',
    colorPreview: [
      'rgb(40, 31, 49)',
      'rgb(220, 120, 43)'
    ]
  }
];

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
      fields: [
        'uiFontBody',
        'uiFontTitles',
        'journalFontBody',
        'journalFontTitles'
      ],
      default: {
        uiFontBody: `"Work Sans", Arial, sans-serif`,
        uiFontTitles: `"Roboto Slab", Arial, sans-serif`,
        journalFontBody: `"Work Sans", Arial, sans-serif`, 
        journalFontTitles: `"Roboto Slab", Arial, sans-serif`
      },
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    themeAndStylesMenu: {
      tag: "theme-styles-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"),
      title: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.hint"),
      propType: String,
      fields: [
        "colorTheme", 
        "adjustOtherModules", 
        "customStyles" 
      ],
      default: {
        colorTheme: '',
        adjustOtherModules: false,
        customStyles: ''
      },
      scope: SETTING_SCOPE.world,
      config: false
    },

    chatMessagesMenu: {
      tag: "chat-messages-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.hint"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: [
        "enableChatStyles",
        "chatBorderColor"
      ],
      default: { 
        enableChatStyles: true,
        chatBorderColor: BORDER_COLOR_TYPES.playerColor.name
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    leftControlsMenu: {
      tag: "left-controls-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      propType: Object,
      inputType: SETTING_INPUT.button,
      fields: [
        "controlsBottomBuffer",
        "controlsIconSize",
        "controlsAutoHide",
        "hideFoundryLogo"
      ],
      default: { 
        bottomBuffer: 200,
        iconSize: ICON_SIZES.small.name,
        autoHideSecondary: false,
        hideFoundryLogo: true
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
        },
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

    /*
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
    */

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

    /* DARK MODE */
    enforceDarkMode: { 
      tag: "enforce-dark-mode", 
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enforceDarkMode.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enforceDarkMode.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: true 
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

    /* NON-CONFIG SETTINGS */
    /* FONTS */
    uiFontBody: {
      tag: "ui-font-body",
      oldName: "uiFont",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiBody.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiBody.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: `"Work Sans", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false
    },
    uiFontTitles: {
      tag: "ui-font-titles",
      oldName: "uiTitles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: `"Roboto Slab", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false
    },
    journalFontBody: {
      tag: "journal-font-body",
      oldName: "journalBody",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: `"Work Sans", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false
    }, 
    journalFontTitles: {
      tag: "journal-font-titles",
      oldName: "journalTitles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: `"Roboto Slab", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false
    },

    /* THEME AND STYLES */
    colorTheme:{
      tag: "color-theme",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.colorTheme.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.colorTheme.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: "",
      scope: SETTING_SCOPE.world,
      config: false
    },

    adjustOtherModules: {
      tag: "adjust-other-modules",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.adjustOtherModules.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.adjustOtherModules.hint"),
      inputType: SETTING_INPUT.checkbox,
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.world,
      config: false
    },

    customStyles:{
      tag: "custom-styles",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customStyles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customStyles.hint"),
      inputType: SETTING_INPUT.text,
      propType: String,
      default: "",
      scope: SETTING_SCOPE.world,
      config: false
    },

    /* CHAT STYLES */
    chatBorderColor: {
      tag: "chat-border-color",
      oldName: "borderColor",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.hint"),
      options: {
        playerColor: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.playerColor"), 
        rollType: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.rollType"), 
        none: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.none")
      }, 
      propType: String, 
      inputType: SETTING_INPUT.text, 
      default: BORDER_COLOR_TYPES.playerColor.name, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },
    enableChatStyles:{
      tag: "enable-chat-styles", 
      oldName: "enableChatStyles",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enableChatStyles.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enableChatStyles.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false,
      requiresReload: true 
    },

    /* CONTROLS SETTINGS */
    controlsBottomBuffer:{
      tag: "control-bottom-buffer",
      oldName: "bottomBuffer",
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.bottomBuffer.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.bottomBuffer.hint"),
      propType: Number,
      inputType: SETTING_INPUT.number,
      default: 200,
      scope: SETTING_SCOPE.client,
      config: false
    }, 
    controlsIconSize: {
      tag: "control-icon-size",
      oldName: "iconSize",
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.hint"),
      inputType: SETTING_INPUT.select, 
      options: {
        small: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.small"), 
        regular: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.regular")
      },
      propType: String,
      default: ICON_SIZES.small.name,
      scope: SETTING_SCOPE.client,
      config: false
    },
    controlsAutoHide: {
      tag: "auto-hide-secondary-controls",
      oldName: "autoHideSecondary",
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.hint"), 
      inputType: SETTING_INPUT.checkbox,
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false
    },
    hideFoundryLogo: {
      tag: "hide-foundry-logo",
      oldName: "hideFoundryLogo",
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.hideFoundryLogo.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.hideFoundryLogo.hint"), 
      inputType: SETTING_INPUT.checkbox,
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false
    }

  }

}