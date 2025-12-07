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
  small: { name: 'small', size: '36px'},
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

export const BORDER_COLOR_POSITIONS = {
  left: { name: 'left' },
  right: { name: 'right' },
  top: { name: 'top' },
  all: { name: 'all' }
}

export const BACK_BUTTON_OPTIONS = {
  noButton: { name: 'noButton' },
  lastScene: { name: 'lastScene' },
  defaultScenes: { name: 'defaultScenes' }
}

export const DOCK_RESIZE_OPTIONS = {
  off: { name: 'off' },
  horizontal: { name: 'horizontal' },
  vertical: { name: 'vertical' }
}

export const MIN_AV_WIDTH = 140;

export const THEMES = [
  {
    label: 'Carolingian Teal',
    className: 'crlngn-theme',
    colorPreview: [
      'rgb(193, 193, 217)',     // Secondary Light (inverted lightness)
      'rgb(62, 62, 88)',      // Secondary Dark
      'rgb(68, 147, 173)',     // Accent
    ]
  },
  {
    label: "Royal Blood",
    className: 'crlngn-theme-royal-blood',
    colorPreview: [
      'rgb(215, 206, 224)',     // Secondary Light (inverted lightness)
      'rgb(40, 31, 49)',       // Secondary Dark
      'rgb(159, 35, 49)',      // Accent
    ]
  },
  {
    label: "Dark Sorcery",
    className: 'crlngn-theme-dark-sorcery',
    colorPreview: [
      'rgb(206, 222, 224)',     // Secondary Light (inverted lightness)
      'rgb(31, 47, 49)',       // Secondary Dark
      'rgb(126, 88, 182)',     // Accent
    ]
  },
  {
    label: "Grass and Stone",
    className: 'crlngn-theme-grass-stone',
    colorPreview: [
      'rgb(207, 208, 208)',     // Secondary Light (inverted lightness)
      'rgb(47, 48, 48)',       // Secondary Dark
      'rgb(121, 163, 62)',     // Accent
    ]
  },
  {
    label: "Gold and Chocolate",
    className: 'crlngn-theme-gold-chocolate',
    colorPreview: [
      'rgb(221, 212, 212)',     // Secondary Light (inverted lightness)
      'rgb(34, 25, 25)',       // Secondary Dark
      'rgb(164, 138, 51)',     // Accent
    ]
  },
  {
    label: "Pumpkin Patch",
    className: 'crlngn-theme-pumpkin-patch',
    colorPreview: [
      'rgb(215, 206, 224)',     // Secondary Light (inverted lightness)
      'rgb(40, 31, 49)',       // Secondary Dark
      'rgb(220, 120, 43)',     // Accent
    ]
  },
  {
    label: "Plum Purple",
    className: 'crlngn-plum-purple',
    colorPreview: [
      'rgb(230, 233, 236)',     // Secondary Light (inverted lightness)
      'rgb(20, 23, 26)',       // Secondary Dark
      'rgb(146, 42, 96)',      // Accent
    ]
  },
  {
    label: "Gambit's Blue",
    className: 'crlngn-theme-gambits-blue',
    colorPreview: [
      'rgb(215, 206, 224)',     // Secondary Light (inverted lightness)
      'rgb(40, 31, 49)',       // Secondary Dark
      'rgb(45, 126, 207)',     // Accent
    ]
  }
];

export function getSettings() { 
  return {
    moduleSettingsMenu: {
      isMenu: true,
      showOnRoot: true, 
      tag: "v2-interface-options-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.hint"),
      propType: Object,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false,
      fields: [],
      default: {}
    },
    interfaceOptionsMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-interface-options-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.hint"),
      propType: Object,
      fields: [
        "sceneControlsFadeOut",
        "sidebarTabsFadeOut",
        "chatLogControlsFadeOut",
        "playerListFadeOut",
        "cameraDockFadeOut",
        "macroHotbarFadeOut",
        "sceneNavFadeOut",

        "sceneControlsHide",
        "sidebarTabsHide",
        "chatLogControlsHide",
        "playerListHide",
        "cameraDockHide",
        "macroHotbarHide",
        "sceneNavHide",

        "enableSceneControls",
        "enableSidebarTabs",
        "enableChatLogControls",
        "sceneNavEnabled",
        "enableMacroLayout",
        "enableFloatingDock",
        "enablePlayerList",

        "collapseMacroBar",
        "preventMacroBarReposition",
        "useFolderStyle",
        "controlsAutoHide",
        "hoverableSettingsHints"
      ],
      default: {
        // Fade out
        sceneControlsFadeOut: false,
        sidebarTabsFadeOut: false,
        chatLogControlsFadeOut: true,
        playerListFadeOut: true,
        cameraDockFadeOut: false,
        macroHotbarFadeOut: true,
        sceneNavFadeOut: false,
        // Hide
        sceneControlsHide: false,
        sidebarTabsHide: false,
        chatLogControlsHide: false,
        playerListHide: false,
        cameraDockHide: false,
        macroHotbarHide: false,
        sceneNavHide: false,
        // Custom Layout
        enableSceneControls: true,
        enableSidebarTabs: true,
        enableChatLogControls: true,
        sceneNavEnabled: true,
        enableMacroLayout: true,
        enableFloatingDock: true,
        enablePlayerList: true,

        collapseMacroBar: false,
        preventMacroBarReposition: true,
        useFolderStyle: true,
        controlsAutoHide: false,
        hoverableSettingsHints: false
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    customFontsMenu: {
      tag: "v2-custom-font-families",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.label"),
      title: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.hint"),
      description: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.description"),
      propType: Object,
      fields: [
        'enableFontUI',
        'uiFontBody',
        'enableFontTitles',
        'uiFontTitles',
        'enableFontJournal',
        'journalFontBody',
        'enableFontJournalTitles',
        'journalFontTitles'
      ],
      default: {
        enableFontUI: true,
        uiFontBody: `"Work Sans", Arial, sans-serif`,
        enableFontTitles: true,
        uiFontTitles: game.system.id === 'daggerheart' ? `"Cinzel Decorative", Arial, sans-serif` : `"Roboto Slab", Arial, sans-serif`,
        enableFontJournal: true,
        journalFontBody: `"Work Sans", Arial, sans-serif`,
        enableFontJournalTitles: true,
        journalFontTitles: game.system.id === 'daggerheart' ? `"Cinzel Decorative", Arial, sans-serif` : `"Roboto Slab", Arial, sans-serif`
      },
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    themeAndStylesMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-theme-styles-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"),
      title: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.hint"),
      propType: String,
      fields: [
        "colorTheme",
        "applyDarkThemeToModules",
        "forcedDarkTheme",
        "customStyles"
      ],
      default: {
        colorTheme: "crlngn-theme",
        applyDarkThemeToModules: false,
        forcedDarkTheme: "",
        customStyles: ""
      },
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },
    player_themeAndStylesMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-player-theme-styles-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"),
      title: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.hint"),
      propType: String,
      fields: [
        "playerColorTheme",
        "useGlassEffect",
        "glassTranslucence"
      ],
      default: {
        playerColorTheme: "",
        useGlassEffect: false,
        glassTranslucence: 0.7
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    chatMessagesMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-chat-messages-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.hint"),
      propType: Object,
      fields: [
        "sideBarWidth",
        "enableChatStyles",
        "chatBorderColor",
        "useLeftChatBorder",
        "chatBorderPosition",
        "openChatLogOnLoad",
        "closeSidebarWhenIdle",
        "useHorizontalSidebarTabs",
        "showChatNotificationsOnTop"
      ],
      default: {
        sideBarWidth: 300,
        enableChatStyles: true,
        chatBorderColor: BORDER_COLOR_TYPES.playerColor.name,
        useLeftChatBorder: true,
        chatBorderPosition: "left",
        openChatLogOnLoad: false,
        closeSidebarWhenIdle: false,
        useHorizontalSidebarTabs: false,
        showChatNotificationsOnTop: false
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    leftControlsMenu: {
      isMenu: true,
      showOnRoot: false, 
      tag: "v2-left-controls-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      propType: Object,
      fields: [
        "controlsAutoHide"
      ],
      default: { 
        controlsAutoHide: false
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    playersListMenu: {
      isMenu: true,
      showOnRoot: false, 
      tag: "v2-players-list-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.hint"),
      propType: Object,
      fields: [
        "autoHidePlayerList",
        "playerListAvatars"
      ],
      default: {
        autoHidePlayerList: false,
        playerListAvatars: true
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    cameraDockMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-camera-dock-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.hint"),
      propType: Object,
      fields: [
        "dockCamerasToBottom",
        "dockResizeOnUserJoin",
        "dockPosX",
        "dockPosY",
        "dockWidth",
        "dockHeight",
        "defaultVideoWidth"
      ],
      default: {
        dockCamerasToBottom: true,
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
      isMenu: true,
      showOnRoot: false, 
      tag: "v2-scene-nav-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      propType: Object,
      fields: [
        "hideLoadingSceneName",
        "useSceneFolders",
        "useSceneLookup",
        "sceneClickToView",
        "useSceneIcons",
        "useSceneBackButton",
        "useScenePreview",
        "hideInactiveOnFolderToggle",
        "subFoldersLayout",
        "expandScrimToSubfolders"
      ],
      default: {
        hideLoadingSceneName: true,
        useSceneFolders: true,
        sceneClickToView: true,
        useSceneIcons: true,
        useSceneLookup: true,
        useScenePreview: true,
        useSceneBackButton: true,
        hideInactiveOnFolderToggle: true,
        subFoldersLayout: "parent",
        expandScrimToSubfolders: false
      },
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    player_sceneNavMenu: {
      isMenu: true,
      showOnRoot: false, 
      tag: "v2-player-scene-nav-menu", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      propType: Object,
      fields: [
        "navStartCollapsed",
        "showNavOnHover",
        "sceneItemWidth",
        "disableActiveSceneSeparation"
      ],
      default: {
        navStartCollapsed: false,
        showNavOnHover: false,
        sceneItemWidth: 150,
        disableActiveSceneSeparation: false
      },
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },

    /* SYSTEM-SPECIFIC MENUS */
    systemsMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-systems-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.hint"),
      propType: Object,
      fields: [
        "applyThemeToSheets",
        "adjustOtherModules",
        "otherModulesList"
      ],
      default: {
        applyThemeToSheets: true,
        adjustOtherModules: true,
        otherModulesList: [
          { id: 'levels-3d-preview', enabled: true },
          { id: 'beneos-module', enabled: true },
          { id: 'combat-carousel', enabled: true },
          { id: 'dice-calculator', enabled: true },
          { id: 'hurry-up', enabled: true },
          { id: 'crux', enabled: true },
          { id: 'fvtt-youtube-player', enabled: true },
          { id: 'bg3-inspired-hotbar', enabled: true },
          { id: 'touch-vtt', enabled: true },
          { id: 'breaktime', enabled: true },
          { id: 'simple-timekeeping', enabled: true }
        ]
      },
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    player_systemsMenu: {
      isMenu: true,
      showOnRoot: false,
      tag: "v2-player-systems-menu",
      label: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.hint"),
      propType: Object,
      fields: [
        "useHorizontalSheetTabs",
        "dockDHResources"
      ],
      default: {
        useHorizontalSheetTabs: true,
        dockDHResources: true
      },
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    defaultSettings: {
      tag: "v2-default-settings",
      label: game.i18n.localize("CRLNGN_UI.settings.defaultSettings.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.defaultSettings.hint"),
      propType: Object,
      default: {},
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    settingEnforcement: {
      tag: "v2-setting-enforcement",
      label: "Setting Enforcement States",
      hint: "Stores individual enforcement states for each setting (unlocked/soft/locked/gate)",
      propType: Object,
      default: {},
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    bulkLockAction: {
      tag: "v2-bulk-lock-action",
      label: game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.hint"),
      options: {
        "": game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.select"),
        "unlocked": game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.unlocked"),
        "soft": game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.soft"),
        "locked": game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.locked")
      },
      propType: String,
      default: "",
      scope: SETTING_SCOPE.world,
      config: true,
      requiresReload: false,
      onChange: (value) => {
        if (value && game.user?.isGM) {
          // Trigger the bulk lock action
          import('../constants/SettingMenus.mjs').then(module => {
            module.applyBulkLockState(value);
          });
        }
      }
    },

    disableUI: {
      tag: 'disable-ui',
      label: game.i18n.localize("CRLNGN_UI.settings.disableUI.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.disableUI.hint"),
      propType: Boolean,
      scope: SETTING_SCOPE.client,
      config: true,
      default: false,
      requiresReload: false
    },

    dockDHResources: {
      tag: 'v2-dock-dh-resources',
      label: game.i18n.localize("CRLNGN_UI.settings.dockDHResources.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.dockDHResources.hint"),
      propType: Boolean,
      scope: SETTING_SCOPE.client,
      config: false,
      default: true,
      requiresReload: true,
      system: ['daggerheart']
    },

    useSceneFolders: { 
      tag: "v2-nav-folders-enabled", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneFolders.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneFolders.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false, 
      requiresReload: false 
    },

    navFoldersForPlayers: { 
      tag: "v2-nav-folders-for-players", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navFoldersForPlayers.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navFoldersForPlayers.hint"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.world, 
      config: false, 
      requiresReload: false 
    },

    navStartCollapsed: { 
      tag: "v2-nav-start-collapsed", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navStartCollapsed.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navStartCollapsed.hint"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    navShowRootFolders: { 
      tag: "v2-nav-show-root-folders", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navShowRootFolders.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.navShowRootFolders.hint"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    hideInactiveOnFolderToggle: {
      tag: "v2-hide-inactive-on-folder-toggle",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.hideInactiveOnFolderToggle.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.hideInactiveOnFolderToggle.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    subFoldersLayout: {
      tag: "v2-sub-folders-layout",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.subFoldersLayout.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.subFoldersLayout.hint"),
      options: {
        parent: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.subFoldersLayout.options.parent"),
        rowStart: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.subFoldersLayout.options.rowStart")
      },
      propType: String,
      default: "parent",
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    expandScrimToSubfolders: {
      tag: "v2-expand-scrim-to-subfolders",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.expandScrimToSubfolders.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.expandScrimToSubfolders.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    useSceneLookup: {
      tag: "v2-use-scene-lookup", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneLookup.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneLookup.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false, 
      requiresReload: false 
    },

    sceneItemWidth: { 
      tag: "v2-scene-nav-item-width", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneItemWidth.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneItemWidth.hint"), 
      propType: Number, 
      inputType: SETTING_INPUT.number, 
      default: 150, 
      scope: SETTING_SCOPE.client, 
      config: false
    },

    showNavOnHover: { 
      tag: "v2-show-nav-on-hover", 
      oldName: "showNavOnHover",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.showNavOnHover.hint"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    hideLoadingSceneName: {
      tag: "v2-hide-loading-scene-name",
      oldName: "hideLoadingSceneName",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.hideLoadingSceneName.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.hideLoadingSceneName.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    disableActiveSceneSeparation: {
      tag: "v2-disable-active-scene-separation",
      oldName: "disableActiveSceneSeparation",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.disableActiveSceneSeparation.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.disableActiveSceneSeparation.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    sceneClickToView: { 
      tag: "v2-scene-click-to-view", 
      oldName: "sceneClickToView",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneClickToView.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneClickToView.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false, 
      requiresReload: false 
    },

    useSceneIcons: {
      tag: "v2-use-scene-icons", 
      oldName: "useSceneIcons",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneIcons.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneIcons.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false, 
      requiresReload: false  
    },

    useSceneBackButton: {
      tag: "v2-use-scene-back-button",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneBackButton.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useSceneBackButton.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false , 
      requiresReload: false 
    },

    useScenePreview: {
      tag: "v2-use-scene-preview",
      oldName: "useScenePreview",
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useScenePreview.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.useScenePreview.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.world, 
      config: false , 
      requiresReload: false 
    },

    sceneNavCollapsed: { 
      tag: "v2-scene-nav-collapsed", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavCollapsed.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavCollapsed.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },  

    sceneNavPos: { 
      tag: "v2-scene-nav-pos", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavPos.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavPos.hint"), 
      propType: Number, 
      default: 0, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    collapseMacroBar: { 
      tag: "v2-collapse-macro-bar", 
      label: game.i18n.localize("CRLNGN_UI.settings.collapseMacroBar.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.collapseMacroBar.hint"), 
      propType: Boolean,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    useFolderStyle: { 
      tag: "v2-use-folder-style", 
      label: game.i18n.localize("CRLNGN_UI.settings.useFolderStyle.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.useFolderStyle.hint"), 
      propType: Boolean,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    // enforceDarkMode: { 
    //   tag: "v2-enforce-dark-mode", 
    //   label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.enforceDarkMode.label"), 
    //   hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.enforceDarkMode.hint"), 
    //   propType: Boolean, 
    //   default: true, 
    //   scope: SETTING_SCOPE.world, 
    //   config: true 
    // },

    debugMode: { 
      tag: "v2-debug-mode", 
      label: game.i18n.localize("CRLNGN_UI.settings.debugMode.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.debugMode.hint"), 
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: true, 
      requiresReload: false 
    },

    /* NON-CONFIG OR MENU SETTINGS */
    /* PLAYERS LIST */
    autoHidePlayerList: { 
      tag: "v2-auto-hide-player-list", 
      label: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.fields.autoHidePlayerList.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.fields.autoHidePlayerList.hint"), 
      propType: Boolean,
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    playerListAvatars: { 
      tag: "v2-player-list-avatars", 
      label: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.fields.playerListAvatars.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.fields.playerListAvatars.hint"), 
      propType: Boolean,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    /* FONTS - Enable toggles */
    enableFontUI: {
      tag: "v2-enable-font-ui",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontUI.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontUI.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },
    enableFontTitles: {
      tag: "v2-enable-font-titles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontTitles.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },
    enableFontJournal: {
      tag: "v2-enable-font-journal",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontJournal.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontJournal.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },
    enableFontJournalTitles: {
      tag: "v2-enable-font-journal-titles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontJournalTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.enableFontJournalTitles.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    /* FONTS - Font family values */
    uiFontBody: {
      tag: "v2-ui-font-body",
      oldName: "uiFont",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiBody.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiBody.hint"),
      propType: String,
      default: `"Work Sans", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },
    uiFontTitles: {
      tag: "v2-ui-font-titles",
      oldName: "uiTitles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.uiTitles.hint"),
      propType: String,
      default: game.system.id === 'daggerheart' ? `"Cinzel Decorative", Arial, sans-serif` : `"Roboto Slab", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },
    journalFontBody: {
      tag: "v2-journal-font-body",
      oldName: "journalBody",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalBody.hint"),
      propType: String,
      default: `"Work Sans", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    }, 
    journalFontTitles: {
      tag: "v2-journal-font-titles",
      oldName: "journalTitles",
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.fields.journalTitles.hint"),
      propType: String,
      default: game.system.id === 'daggerheart' ? `"Cinzel Decorative", Arial, sans-serif` : `"Roboto Slab", Arial, sans-serif`,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    /* THEME AND STYLES */
    colorTheme:{
      tag: "v2-color-theme",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.colorTheme.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.colorTheme.hint"),
      propType: String,
      default: "crlngn-theme",
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    customThemeColors: {
      tag: "v2-custom-theme-colors",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customThemeColors.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customThemeColors.hint"),
      propType: Object,
      default: null,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    applySecondaryColorToBg: {
      tag: "v2-apply-secondary-color-to-bg",
      label: game.i18n.localize("CRLNGN_UI.settings.colorPicker.applySecondaryColorToBg.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.colorPicker.applySecondaryColorToBg.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: true
    },

    playerColorTheme:{
      tag: "v2-player-color-theme",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.playerColorTheme.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.playerColorTheme.hint"),
      propType: String,
      default: "",
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },

    playerCustomThemeColors: {
      tag: "v2-player-custom-theme-colors",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.playerCustomThemeColors.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.playerCustomThemeColors.hint"),
      propType: Object,
      default: null,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    useGlassEffect: {
      tag: "v2-use-glass-effect",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.useGlassEffect.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.useGlassEffect.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    glassTranslucence: {
      tag: "v2-glass-translucence",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.glassTranslucence.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.glassTranslucence.hint"),
      propType: Number,
      inputType: SETTING_INPUT.number,
      default: 0.7,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    adjustOtherModules: {
      tag: "v2-adjust-other-modules",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.adjustOtherModules.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.adjustOtherModules.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },
    applyDarkThemeToModules: {
      tag: "v2-dark-theme-to-modules",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.applyDarkThemeToModules.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.applyDarkThemeToModules.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: true 
    },

    otherModulesList: {
      tag: "v2-other-modules-list-a3",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.otherModulesList.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.otherModulesList.hint"),
      propType: Array,
      // Array of objects: [{ id: 'module-id', enabled: true/false }]
      // Storing all modules explicitly allows us to distinguish between:
      // - User disabled a module: { id: 'foo', enabled: false } (preserved)
      // - Module is new: not in array at all (auto-enabled on merge)
      default: [
        { id: 'levels-3d-preview', enabled: true },
        { id: 'beneos-module', enabled: true },
        { id: 'combat-carousel', enabled: true },
        { id: 'dice-calculator', enabled: true },
        { id: 'hurry-up', enabled: true },
        { id: 'crux', enabled: true },
        { id: 'fvtt-youtube-player', enabled: true },
        { id: 'bg3-inspired-hotbar', enabled: true },
        { id: 'touch-vtt', enabled: true },
        { id: 'breaktime', enabled: true },
        { id: 'simple-timekeeping', enabled: true }
      ],
      options: {
        "3D Canvas Mapmaking": "levels-3d-preview",
        "Beneos Module": "beneos-module",
        "BG3 Inspired Hotbar": "bg3-inspired-hotbar",
        "Breaktime": "breaktime",
        "Combat Carousel": "combat-carousel",
        "Crux": "crux",
        "Dice Tray": "dice-calculator",
        "Hurry Up": "hurry-up",
        "Simple Timekeeping & Calendar": "simple-timekeeping",
        "Touch VTT": "touch-vtt",
        "Youtube Player": "fvtt-youtube-player"
      },
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false
    },

    customStyles:{
      tag: "v2-custom-styles",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customStyles.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.customStyles.hint"),
      propType: String,
      default: "",
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: true 
    },

    forcedDarkTheme: {
      tag: "v2-forced-dark-theme",
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.forcedDarkTheme.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.fields.forcedDarkTheme.hint"),
      propType: String,
      default: "",
      scope: SETTING_SCOPE.world,
      config: false, 
      requiresReload: false 
    },

    /* CHAT STYLES */
    chatBorderColor: {
      tag: "v2-chat-border-color",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.hint"),
      options: {
        playerColor: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.playerColor"), 
        rollType: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.rollType"), 
        none: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderColor.options.none")
      }, 
      propType: String,  
      default: BORDER_COLOR_TYPES.playerColor.name, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: true 
    },
    chatBorderPosition: {
      tag: "v2-chat-border-position",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.hint"),
      options: {
        left: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.options.left"), 
        right: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.options.right"), 
        top: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.options.top"), 
        all: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.borderPosition.options.all")
      }, 
      propType: String,  
      default: BORDER_COLOR_POSITIONS.left.name, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: true 
    },
    /* keeping for compatibility - remove after a few releases */
    useLeftChatBorder:{
      tag: "v2-use-left-chat-border",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useLeftChatBorder.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useLeftChatBorder.hint"),
      propType: Boolean, 
      inputType: SETTING_INPUT.checkbox, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: true 
    },
    enableChatStyles:{
      tag: "v2-enable-chat-styles", 
      oldName: "enableChatStyles",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enableChatStyles.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.enableChatStyles.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false,
      requiresReload: true 
    },
    sideBarWidth: {
      tag: "v2-side-bar-width",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.sideBarWidth.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.sideBarWidth.hint"),
      propType: Number,
      default: 300,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    openChatLogOnLoad: {
      tag: "v2-open-chat-log-on-load",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.openChatLogOnLoad.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.openChatLogOnLoad.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    closeSidebarWhenIdle: {
      tag: "v2-close-sidebar-when-idle",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.closeSidebarWhenIdle.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.closeSidebarWhenIdle.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    useHorizontalSidebarTabs: {
      tag: "v2-use-horizontal-sidebar-tabs",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useHorizontalSidebarTabs.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.useHorizontalSidebarTabs.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    showChatNotificationsOnTop: {
      tag: "v2-show-chat-messages-on-top",
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.showChatNotificationsOnTop.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.fields.showChatNotificationsOnTop.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    /* CONTROLS SETTINGS */
    controlsAutoHide: {
      tag: "v2-auto-hide-secondary-controls",
      oldName: "autoHideSecondary",
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.fields.autoHideSecondary.hint"), 
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },

    /* CAMERA DOCK */
    dockPosX: {
      tag: "v2-camera-dock-x",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosX.hint"),
      propType: Number,
      default: 0,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },
    dockPosY: {
      tag: "v2-camera-dock-y",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockPosY.hint"),
      propType: Number,
      default: 120,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },
    dockWidth: {
      tag: "v2-camera-dock-width",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockWidth.hint"),
      propType: Number,
      default: 180,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },
    dockHeight: {
      tag: "v2-camera-dock-height",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockHeight.hint"),
      propType: Number,
      default: 145,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },
    dockResizeOnUserJoin: {
      tag: "v2-dock-resize-on-user-join",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.hint"),
      options: {
        off: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.off"),
        horizontal: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.horizontal"),
        vertical: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockResizeOnUserJoin.options.vertical")
      },
      propType: String,
      default: DOCK_RESIZE_OPTIONS.horizontal.name,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    dockCamerasToBottom: {
      tag: "v2-dock-cameras",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockCamerasToBottom.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.dockCamerasToBottom.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },
    defaultVideoWidth: {
      tag: "v2-default-video-width",
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.defaultVideoWidth.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.defaultVideoWidth.hint"),
      propType: Number,
      default: 160,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: false 
    },
    // NEWS UPDATE
    lastUpdateId: {
      tag: 'last-update-id',
      label: game.i18n.localize("CRLNGN_UI.ui.updates.label"),
      hint: game.i18n.localize("CRLNGN_UI.ui.updates.hint"),
      propType: String,
      scope: SETTING_SCOPE.world,
      config: false,
      default: '', 
      requiresReload: false 
    },

    /* INTERFACE ELEMENTS FADE OUT OPTIONS */
    sceneControlsFadeOut: { 
      tag: "v2-scene-controls-fade-out", 
      oldName: "sceneControlsFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sceneControls"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    sidebarTabsFadeOut: { 
      tag: "v2-sidebar-tabs-fade-out", 
      oldName: "sidebarTabsFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sidebarTabs"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false  
    },

    chatLogControlsFadeOut: {
      tag: "v2-chat-log-controls-fade-out", 
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.chatLogControls"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    playerListFadeOut: { 
      tag: "v2-player-list-fade-out", 
      oldName: "playerListFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.playerList"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    cameraDockFadeOut: { 
      tag: "v2-camera-fade-out", 
      oldName: "cameraDockFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.cameraDock"),
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    macroHotbarFadeOut: { 
      tag: "v2-macro-hotbar-fade-out", 
      oldName: "macroHotbarFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.macroHotbar"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    sceneNavFadeOut: { 
      tag: "v2-scene-nav-fade-out", 
      oldName: "sceneNavFadeOut",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sceneNav"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    /* INTERFACE ELEMENTS HIDE OPTIONS */
    sceneControlsHide: { 
      tag: "v2-scene-controls-hide", 
      oldName: "sceneControlsHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sceneControls"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false  
    },

    sidebarTabsHide: { 
      tag: "v2-sidebar-tabs-hide", 
      oldName: "sidebarTabsHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sidebarTabs"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    chatLogControlsHide: {
      tag: "v2-chat-log-controls-hide", 
      oldName: "chatLogControlsHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.chatLogControls"),
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    playerListHide: { 
      tag: "v2-player-list-hide", 
      oldName: "playerListHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.playerList"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    cameraDockHide: { 
      tag: "v2-camera-dock-hide", 
      oldName: "cameraDockHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.cameraDock"), 
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    macroHotbarHide: { 
      tag: "v2-macro-hotbar-hide", 
      oldName: "macroHotbarHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.macroHotbar"),
      propType: Boolean, 
      default: false, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    sceneNavHide: {
      tag: "v2-scene-nav-hide",
      oldName: "sceneNavHide",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sceneNav"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false ,
      requiresReload: false
    },

    hoverableSettingsHints: {
      tag: "v2-hoverable-settings-hints",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.hoverableSettingsHints.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.hoverableSettingsHints.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: true
    },

    preventMacroBarReposition: {
      tag: "v2-prevent-hotbar-reposition",
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.preventMacroBarReposition.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.preventMacroBarReposition.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false
    },

    /* INTERFACE ELEMENTS ENABLE OPTIONS */

    sceneNavEnabled: { 
      tag: "v2-scene-nav-enabled", 
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.fields.sceneNavEnabled.hint"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false,
      requiresReload: true
    },

    enableSceneControls: { 
      tag: "v2-enable-scene-controls", 
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sceneControls"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false , 
      requiresReload: false 
    },

    enableSidebarTabs: { 
      tag: "v2-enable-sidebar-tabs", 
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.sidebarTabs"), 
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    enableChatLogControls: {
      tag: "v2-enable-chat-log-controls", 
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.fields.chatLogControls"),
      propType: Boolean, 
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    enableMacroLayout: { 
      tag: "v2-enable-macro-layout", 
      label: game.i18n.localize("CRLNGN_UI.settings.enableMacroLayout.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.enableMacroLayout.hint"), 
      propType: Boolean,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    enablePlayerList: { 
      tag: "v2-enable-player-list", 
      label: game.i18n.localize("CRLNGN_UI.settings.enablePlayerList.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.enablePlayerList.hint"), 
      propType: Boolean,
      default: true, 
      scope: SETTING_SCOPE.client, 
      config: false, 
      requiresReload: false 
    },

    enableFloatingDock: { 
      tag: "v2-enable-floating-dock", 
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.fields.enableFloatingDock.hint"), 
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false, 
      requiresReload: true 
    },

    /* Actor SHEETS */
    applyThemeToSheets: {
      tag: "v2-apply-theme-and-styles",
      label: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.fields.applyThemeToSheets.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.fields.applyThemeToSheets.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.world,
      config: false,
      requiresReload: false,
      system: ["daggerheart", "dnd5e", "pf2e"]
    },
    useHorizontalSheetTabs: {
      tag: "v2-use-horizontal-tabs",
      label: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.fields.useHorizontalSheetTabs.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.systemsMenu.fields.useHorizontalSheetTabs.hint"),
      propType: Boolean,
      default: true,
      scope: SETTING_SCOPE.client,
      config: false,
      requiresReload: false,
      system: ["dnd5e"]
    },

  }

}