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

export const MODULE_SETTINGS = {
  lastUpdateId: "lastUpdateId"
}

export const ICON_SIZES = {
  small: { name: 'small', size: '38px'},
  regular: { name: 'regular', size: '42px'},
  large: { name: 'large', size: '48px'},
}

export const UI_SCALE = {
  small: { name: 'small'},
  regular: { name: 'regular'},
  large: { name: 'large'},
}

export const BORDER_COLOR_TYPES = {
  playerColor: { name: 'playerColor'},
  rollType: { name: 'rollType'},
  none: {
    name: 'none'
  }
}

export const BORDER_TYPES = {
  leftOnly: { name: 'leftOnly'},
  fullBorder: { name: 'fullBorder'}
}

export const BACK_BUTTON_OPTIONS = {
  noButton: { name: 'noButton' },
  lastScene: { name: 'lastScene' },
  defaultScenes: { name: 'defaultScenes' }
}

export const DOCK_RESIZE_OPTIONS = {
  off: { name: 'OFF' },
  horizontal: { name: 'horizontal' },
  vertical: { name: 'vertical' }
}

export const MIN_AV_WIDTH = 140;

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
  },
  {
    label: "Gambit's Blue",
    className: 'crlngn-theme-gambits-blue',
    colorPreview: [
      'rgb(40, 31, 49)',
      'rgb(49, 140, 231)'
    ]
  }
];

export const DEFAULT_SETTINGS = {
  useHorizontalSheetTabs: true,
  applyThemeToSheets: true,
  defaultVideoWidth: 160,
  dockPosX: 0,
  dockPosY: 120,
  dockWidth: 160,
  dockHeight: 145,
  dockWasResized: false,
  dockResizeOnUserJoin: DOCK_RESIZE_OPTIONS.horizontal.name,
  controlsIconSize: ICON_SIZES.regular.name,
  controlsAutoHide: false,
  hideFoundryLogo: true,
  controlsBottomBuffer: 200,
  enableChatStyles: true,
  useLeftChatBorder: false,
  chatBorderColor: BORDER_COLOR_TYPES.playerColor.name,
  autoHidePlayerList: false,
  collapseMacroBar: false,
  enableFloatingDock: true,
  enableMacroLayout: true,
  sceneNavCollapsed: false,
  showNavOnHover: false,
  sceneNavEnabled: true,
  sceneItemWidth: 150,
  navStartCollapsed: false,
  uiScale: UI_SCALE.regular.name
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
        "otherModulesList",
        "customStyles",
        "useHorizontalSheetTabs",
        "applyThemeToSheets"
      ],
      default: {
        colorTheme: "",
        adjustOtherModules: true,
        otherModulesList: "'monks-scene-nav','combat-carousel','dice-tray','crux','party-monitor-dock','touch-vtt'",
        customStyles: "",
        useHorizontalSheetTabs: true,
        applyThemeToSheets: true
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
        "chatBorderColor",
        "useLeftChatBorder"
      ],
      default: { 
        enableChatStyles: true,
        chatBorderColor: BORDER_COLOR_TYPES.playerColor.name,
        useLeftChatBorder: false
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
      default: { /* old names */
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
      fields: [
        "enableFloatingDock",
        "dockResizeOnUserJoin",
        "dockPosX",
        "dockPosY",
        "dockWidth",
        "dockHeight",
        "defaultVideoWidth"
      ],
      default: {
        enableFloatingDock: true,
        dockResizeOnUserJoin: DOCK_RESIZE_OPTIONS.horizontal.name,
        defaultVideoWidth: 160,
        dockPosX: 0,
        dockPosY: 120,
        dockWidth: 160,
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
      fields: [
        "sceneNavEnabled",
        "useSceneFolders",
        "navShowSceneFolders",
        "openFolderOnSceneLoad",
        "sceneClickToView",
        "useSceneIcons",
        "navStartCollapsed",
        "showNavOnHover",
        "useSceneBackButton",
        "useSceneLookup",
        "useScenePreview",
        "sceneItemWidth"
      ],
      default: {
        sceneNavEnabled: true,
        useSceneFolders: true,
        navStartCollapsed: false,
        sceneClickToView: true,
        useSceneIcons: false,
        navShowSceneFolders: false,
        openFolderOnSceneLoad: false,
        showNavOnHover: false,
        useScenePreview: true,
        useSceneLookup: true,
        useSceneBackButton: true,
        sceneItemWidth: 150
      },
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: true 
    },

    enforceGMSettings: {
      tag: "enforce-gm-settings",
      label: game.i18n.localize("CRLNGN_UI.settings.enforceGMSettings.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.enforceGMSettings.hint"), 
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.world,
      config: true, 
      requiresReload: false
    },  
    defaultSettings: {
      tag: "default-settings",
      label: game.i18n.localize("CRLNGN_UI.settings.defaultSettings.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.defaultSettings.hint"), 
      propType: Object,
      default: null,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    disableUI: {
      tag: 'disable-ui',
      label: game.i18n.localize("CRLNGN_UI.settings.disableUI.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.disableUI.hint"),
      propType: Boolean,
      scope: SETTING_SCOPE.client,
      config: true,
      default: false
    },

    uiScale: {
      tag: 'ui-scale',
      label: game.i18n.localize("CRLNGN_UI.settings.uiScale.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.uiScale.hint"),
      choices: {
        small: game.i18n.localize("CRLNGN_UI.settings.uiScale.options.small"), 
        regular: game.i18n.localize("CRLNGN_UI.settings.uiScale.options.regular"), 
        large: game.i18n.localize("CRLNGN_UI.settings.uiScale.options.large")
      },
      inputType: SETTING_INPUT.select,
      propType: String, 
      default: UI_SCALE.regular.name,
      scope: SETTING_SCOPE.client,
      config: true
    },

    sceneNavEnabled: { 
      tag: "scene-nav-enabled", 
      oldName: "sceneNavEnabled",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    sceneItemWidth: {
      tag: "scene-item-width", 
      oldName: "sceneItemWidth",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneItemWidth.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneItemWidth.hint"), 
      propType: Number, 
      inputType: SETTING_INPUT.number, 
      default: 150, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    useSceneFolders: { 
      tag: "nav-folders-enabled", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneFolders.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneFolders.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    navFoldersForPlayers: { 
      tag: "nav-folders-for-players", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navFoldersForPlayers.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navFoldersForPlayers.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },
    
    openFolderOnSceneLoad: { 
      tag: "open-folder-on-scene-load", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.openFolderOnSceneLoad.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.openFolderOnSceneLoad.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    navStartCollapsed: { 
      tag: "nav-start-collapsed", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navStartCollapsed.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navStartCollapsed.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox,
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    navShowSceneFolders: { 
      tag: "v1-nav-show-root-folders", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navShowSceneFolders.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navShowSceneFolders.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    showNavOnHover: { 
      tag: "show-nav-on-hover", 
      oldName: "showNavOnHover",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false 
    },

    sceneClickToView: { 
      tag: "scene-click-to-view", 
      oldName: "sceneClickToView",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneClickToView.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneClickToView.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    useSceneIcons: {
      tag: "use-scene-icons", 
      oldName: "useSceneIcons",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneIcons.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneIcons.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    useSceneBackButton: {
      tag: "v1-use-nav-back-button", 
      oldName: "useNavBackButton",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneBackButton.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneBackButton.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    useSceneLookup: {
      tag: "use-scene-lookup", 
      oldName: "useNavBackButton",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneLookup.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneLookup.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    useScenePreview: {
      tag: "use-scene-preview",
      oldName: "useScenePreview",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useScenePreview.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useScenePreview.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox,
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false 
    },

    sceneNavAlias: {
      tag: "scene-nav-alias", 
      oldName: "sceneNavAlias",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavAlias.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavAlias.hint"), 
      propType: String, 
      inputType: SETTING_INPUT.text, 
      default: "", 
      scope: SETTING_SCOPE.world, 
      config: false 
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
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.enforceDarkMode.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.enforceDarkMode.hint"), 
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.world,
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

    otherModulesList: {
      tag: "other-modules-list",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.otherModulesList.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.otherModulesList.hint"),
      inputType: SETTING_INPUT.select,
      propType: String,
      default:  "'monks-scene-nav','combat-carousel','dice-tray','crux','party-monitor-dock','touch-vtt'",
      options: {
        "Combat Carousel": "'combat-carousel'",
        "Crux": "'crux'",
        "Dice Tray": "'dice-tray'",
        "Hurry Up": "'hurry-up'",
        "Monks Scene Navigation": "'monks-scene-nav'",
        "Party HUD": "'party-monitor-dock'",
        "Touch VTT": "'touch-vtt'"
      },
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
      config: false,
      requiresReload: true
    },
    useLeftChatBorder:{
      tag: "use-left-chat-border",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useLeftChatBorder.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useLeftChatBorder.hint"),
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false,
      requiresReload: true 
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
      requiresReload: false 
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
        regular: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.regular"), 
        large: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.iconSize.options.large")
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
    },

    /* CAMERA DOCK */
    enableFloatingDock: { 
      tag: "enable-floating-camera-dock", 
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.hint"), 
      inputType: SETTING_INPUT.checkbox,
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockPosX: {
      tag: "camera-dock-x",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.hint"),
      inputType: SETTING_INPUT.number,
      propType: Number,
      default: 0,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockPosY: {
      tag: "camera-dock-y",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.hint"),
      inputType: SETTING_INPUT.number,
      propType: Number,
      default: 120,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockWidth: {
      tag: "camera-dock-width",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.hint"),
      inputType: SETTING_INPUT.number,
      propType: Number,
      default: 160,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockHeight: {
      tag: "camera-dock-height",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.hint"),
      inputType: SETTING_INPUT.number,
      propType: Number,
      default: 145,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockWasResized: {
      tag: "dock-was-resized", 
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWasResized.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWasResized.hint"), 
      inputType: SETTING_INPUT.checkbox,
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false
    },
    dockResizeOnUserJoin: {
      tag: "dock-resize-on-user-join",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.hint"),
      inputType: SETTING_INPUT.select, 
      options: {
        off: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.off"), 
        horizontal: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.horizontal"), 
        vertical: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.vertical")
      },
      propType: String,
      default: DOCK_RESIZE_OPTIONS.horizontal.name,
      scope: SETTING_SCOPE.client,
      config: false
    },
    defaultVideoWidth: {
      tag: "default-video-width",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.defaultVideoWidth.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.defaultVideoWidth.hint"),
      inputType: SETTING_INPUT.number,
      propType: Number,
      default: 160,
      scope: SETTING_SCOPE.client,
      config: false
    },
    // NEWS UPDATE
    lastUpdateId: {
      tag: 'last-update-id',
      label: game.i18n.localize("CRLNGN_UI.ui.updates.label"),
      hint: game.i18n.localize("CRLNGN_UI.ui.updates.hint"),
      propType: String,
      scope: SETTING_SCOPE.world,
      config: false,
      default: ''
    },

    /* 5e SHEET STYLES */
    applyThemeToSheets: { 
      tag: "v1-apply-theme-and-styles", 
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.applyThemeToSheets.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.applyThemeToSheets.hint"), 
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },
    useHorizontalSheetTabs: { 
      tag: "v1-use-horizontal-tabs", 
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.useHorizontalSheetTabs.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.useHorizontalSheetTabs.hint"), 
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    }
    
  }

}