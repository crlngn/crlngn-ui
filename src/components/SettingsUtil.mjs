import { DARK_MODE_RULES, MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE, HOOKS_CRLNGN } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { BORDER_COLOR_TYPES, DOCK_RESIZE_OPTIONS, getSettings, ICON_SIZES, THEMES, UI_SCALE } from "../constants/Settings.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";
import { ChatLogControls } from "./ChatLogControlsUtil.mjs";
import { ChatUtil } from "./ChatUtil.mjs";
import { CombatTrackerManager } from "./combat-tracker/CombatTrackerManager.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LeftControls } from "./LeftControlsUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { MacroHotbar } from "./MacroHotbarUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SettingsAppliers } from "./SettingsAppliers.mjs";
import { SettingsEnforcement } from "./SettingsEnforcement.mjs";
import { SettingsOtherModules } from "./SettingsOtherModules.mjs";
import { SettingsThemes } from "./SettingsThemes.mjs";
import { SheetsUtil } from "./SheetsUtil.mjs";
import { JournalUtil } from "./JournalUtil.mjs";
import { SidebarTabs } from "./SidebarUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";
import { ColorPickerUtil } from "./ColorPickerUtil.mjs";

/**
 * Core settings management utility for the Carolingian UI module
 * Handles registration, retrieval, and application of module settings
 */
export class SettingsUtil {
  static #uiHidden = false;
  static firstLoad = true;

  /** Settings tags that control UI element visibility (fade, enable, hide) */
  static #uiVisibilitySettings = [
    'v2-scene-controls-fade-out',
    'v2-sidebar-tabs-fade-out',
    'v2-chat-log-controls-fade-out',
    'v2-player-list-fade-out',
    'v2-camera-fade-out',
    'v2-macro-hotbar-fade-out',
    'v2-scene-nav-fade-out',
    'v2-enable-scene-controls',
    'v2-enable-sidebar-tabs',
    'v2-enable-chat-log-controls',
    'v2-enable-player-list',
    'v2-enable-floating-dock',
    'v2-enable-macro-layout',
    'v2-scene-nav-enabled',
    'v2-scene-controls-hide',
    'v2-sidebar-tabs-hide',
    'v2-chat-log-controls-hide',
    'v2-player-list-hide',
    'v2-camera-dock-hide',
    'v2-macro-hotbar-hide',
    'v2-scene-nav-hide'
  ];

  /**
   * Registers all module settings with Foundry VTT
   * Initializes settings, registers menus, and sets up hooks for settings changes
   */
  static registerSettings = async() => {
    const SETTINGS = getSettings();
    
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach(async(entry) => {
      const setting = entry[1]; 
      // LogUtil.log("Registering... ", [entry], true); 

      if((setting.showOnRoot && setting.isMenu) || !setting.isMenu){
        const settingObj = {
          name: setting.label,
          hint: setting.hint,
          default: setting.default,
          type: setting.propType,
          scope: setting.scope,
          config: setting.config,
          requiresReload: setting.requiresReload || false,
          onChange: value => {
            const SETTINGS = getSettings();

            // Check if this setting is enforced and user is not GM
            // Only block changes for 'locked' or 'gate' modes, NOT 'soft' mode
            // Soft mode only applies defaults on first load, then allows player changes
            const enforcementState = SettingsEnforcement.getEnforcementState(setting.tag);
            const shouldBlock = !game.user.isGM &&
                                setting.scope === 'client' &&
                                (enforcementState === 'locked' || enforcementState === 'gate');

            if (shouldBlock) {
              // Revert to GM's default value
              const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag) || {};
              const gmDefault = defaultSettings[setting.tag];
              if (gmDefault !== undefined && gmDefault !== value) {
                // Silently revert the change
                setTimeout(() => {
                  SettingsUtil.set(setting.tag, gmDefault);
                }, 0);
                return;
              }
            }

            // If GM changes a locked/soft setting, update the enforced default
            // (but NOT in gate mode - gate mode allows GM to have different value)
            if (game.user.isGM && setting.scope === 'client') {
              const state = SettingsEnforcement.getEnforcementState(setting.tag);
              if (state === 'soft' || state === 'locked') {
                const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag) || {};
                defaultSettings[setting.tag] = value;
                SettingsUtil.set(SETTINGS.defaultSettings.tag, defaultSettings);
              }
            }

            SettingsUtil.apply(setting.tag, value);
            if (setting.tag !== 'v2-default-settings' && setting.tag !== 'v2-setting-enforcement') {
              SettingsEnforcement.onSettingChange(setting.tag);
            }

            // Call custom onChange handler if defined in the setting
            if (typeof setting.onChange === 'function') {
              setting.onChange(value);
            }
          }
        }
  
        if(setting.choices){
          settingObj.choices = setting.choices;
        } else if(setting.options){
          // Convert options object to choices format expected by Foundry
          // If options have nested {label, value} structure, extract just the labels
          const firstOption = Object.values(setting.options)[0];
          if (firstOption && typeof firstOption === 'object' && firstOption.label) {
            // Options have nested structure like {small: {label: "Small", value: "..."}}
            // Convert to flat format like {small: "Small"}
            settingObj.choices = {};
            for (const [key, opt] of Object.entries(setting.options)) {
              settingObj.choices[key] = opt.label;
            }
          } else {
            settingObj.choices = setting.options;
          }
        }
  
        // @ts-ignore - Valid module ID for settings registration
        await game.settings.register(MODULE_ID, setting.tag, settingObj);
  
        if(SettingsUtil.get(setting.tag) === undefined){
          LogUtil.log('resetting...', [setting.tag]);
          SettingsUtil.set(setting.tag, setting.default);
        }
      }

    });

    game.keybindings.register(MODULE_ID, "hideInterface", {
      name: game.i18n.localize("CRLNGN_UI.settings.hideInterface.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.hideInterface.hint"),
      editable: [
        {
          key: "O",
          modifiers: ["Alt"]
        }
      ],
      onDown: () => {  },
      onUp: () => { SettingsUtil.hideInterface() },
      restricted: false, // Restrict this Keybinding to gamemaster only?
    });

    game.keybindings.register(MODULE_ID, "toggleSidebar", {
      name: game.i18n.localize("CRLNGN_UI.settings.toggleSidebar.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.toggleSidebar.hint"),
      editable: [
        {
          key: "R",
          modifiers: ["Shift"]
        }
      ],
      onDown: () => {  },
      onUp: () => { SettingsUtil.toggleSidebar() },
      restricted: false, // Restrict this Keybinding to gamemaster only?
    });

    game.keybindings.register(MODULE_ID, "combatPrev", {
      name: game.i18n.localize("CRLNGN_UI.settings.combatPrev.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.combatPrev.hint"),
      editable: [
        {
          key: "Comma",
          modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT]
        }
      ],
      onDown: () => {
        if (!game.combat) return;
        const isOwner = game.combat.combatant?.isOwner;
        if (!isOwner) return;
        game.combat.previousTurn();
      },
      repeat: false,
      restricted: false,
    });

    game.keybindings.register(MODULE_ID, "combatNext", {
      name: game.i18n.localize("CRLNGN_UI.settings.combatNext.label"),
      hint: game.i18n.localize("CRLNGN_UI.settings.combatNext.hint"),
      editable: [
        {
          key: "Period",
          modifiers: [foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT]
        }
      ],
      onDown: () => {
        if (!game.combat) return;
        const isOwner = game.combat.combatant?.isOwner;
        if (!isOwner) return;
        game.combat.nextTurn();
      },
      repeat: false,
      restricted: false,
    });

    /**
     * Register all menus from getSettingMenus
     */
    const settingMenus = Object.entries(getSettingMenus());

    // Register each menu
    for (const [menuKey, menuData] of settingMenus) {
      const menuObj = {
        name: menuData.tag,
        label: menuData.label,
        hint: menuData.hint,
        icon: menuData.icon,
        type: menuData.propType,
        restricted: menuData.restricted || false
      };
      await game.settings.registerMenu(MODULE_ID, menuData.tag, menuObj);
    }

    if(SettingsUtil.get(SETTINGS.disableUI.tag)===true){ return; }

    // Check if we're in stream mode
    const isStreamMode = document.body.classList.contains('stream');

    // Apply custom theme and CSS
    SettingsThemes.applyThemeSettings();
    SettingsThemes.applyCustomCSS();
    SettingsThemes.applyModuleAdjustments();

    SettingsThemes.foundryUiConfig = game.settings.get('core','uiConfig') || null;

    // Initialize color scheme detection for stream mode
    SettingsThemes.updateColorScheme();

    // Apply chat styles regardless of stream mode
    SettingsThemes.applyDebugSettings();
    SettingsAppliers.applyChatStyles();
    SettingsAppliers.applyBorderColors();

    // Exit early if in stream mode - skip UI component settings
    if (isStreamMode) {
      LogUtil.log("Stream mode detected - skipping UI settings initialization");

      // Listen for core UI config changes to update stream mode theme
      Hooks.on(HOOKS_CORE.UPDATE_SETTING, (setting, value) => {
        if (setting.key === 'core.uiConfig') {
          SettingsThemes.foundryUiConfig = value;
          SettingsThemes.updateColorScheme();
        }
      });
      return;
    }

    // Non-stream mode UI initialization
    TopNavigation.applyTopNavHeight();

    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, SettingsAppliers.applyLeftControlsSettings);
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersList.applyPlayersListSettings);
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, () => {
      MacroHotbar.applyCustomStyle();
      if(SettingsUtil.firstLoad){
        SettingsUtil.firstLoad = false;
        MacroHotbar.applyHotBarCollapse();
      }
    });

    // Listen for core UI config changes to update stream mode theme
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, (setting, value) => {
      if (setting.key === 'core.uiConfig') {
        SettingsThemes.foundryUiConfig = value;
        SettingsThemes.updateColorScheme();
      }
    });

    SheetsUtil.applyThemeToSheets(SettingsUtil.get(SETTINGS.applyThemeToSheets.tag));
    SheetsUtil.applyHorizontalSheetTabs(SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag));

    const sceneNavFields = SETTINGS.sceneNavMenu.fields;
    sceneNavFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    const playerSceneNavFields = SETTINGS.player_sceneNavMenu.fields;
    playerSceneNavFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });
    ui.nav?.render();

    const cameraDockFields = SETTINGS.cameraDockMenu.fields;
    cameraDockFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    const fontFields = SETTINGS.customFontsMenu.fields;
    fontFields.forEach(fieldName => {
      SettingsAppliers.applyCustomFonts(SETTINGS[fieldName].tag);
    });

    const controlFields = SETTINGS.leftControlsMenu.fields;
    controlFields.forEach(fieldName => {
      SettingsAppliers.applyLeftControlsSettings(SETTINGS[fieldName].tag);
    });

    const interfaceFields = SETTINGS.interfaceOptionsMenu.fields;
    interfaceFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    SettingsThemes.applyForcedDarkTheme();
    SidebarTabs.applySideBarWidth();
    SettingsThemes.applyDarkThemeToModules();
    TopNavigation.applyHide();

    // Apply background settings
    const useGlassEffect = SettingsUtil.get(SETTINGS.useGlassEffect.tag);
    const glassTranslucence = SettingsUtil.get(SETTINGS.glassTranslucence.tag);
    SettingsAppliers.applyGlassEffect(useGlassEffect);
    if(useGlassEffect){
      SettingsAppliers.applyTranslucence(glassTranslucence);
    }

    // Apply sidebar settings
    const useHorizontalSidebarTabs = SettingsUtil.get(SETTINGS.useHorizontalSidebarTabs.tag);
    SidebarTabs.applyHorizontalSidebarTabs(useHorizontalSidebarTabs);

    const showChatNotificationsOnTop = SettingsUtil.get(SETTINGS.showChatNotificationsOnTop.tag);
    SidebarTabs.applyShowChatNotificationsOnTop(showChatNotificationsOnTop);
  }

  /**
   * Retrieve the value of a setting for this module
   * @param {String} settingName 
   * @param {String} moduleName 
   * @returns {*} // current value of the setting
   */
  /**
   * Retrieves the value of a module setting
   * @param {string} settingName - Name of the setting to retrieve
   * @param {string} [moduleName=MODULE_ID] - ID of the module the setting belongs to
   * @returns {*} Current value of the setting
   */
  static get(settingName, moduleName=MODULE_ID){
    if(!settingName){ return null; }

    let setting = false;

    if(moduleName===MODULE_ID){
      setting = game.settings.get(moduleName, settingName);
    }else{
      const client = game.settings.storage.get("client");
      let selectedSetting = client[`${moduleName}.${settingName}`];
      //
      if(selectedSetting===undefined){
        const world = game.settings.storage.get("world");
        selectedSetting = world.getSetting(`${moduleName}.${settingName}`);
      }
      setting = selectedSetting?.value;
      LogUtil.log("GET Setting", [selectedSetting, setting]);
    }

    return setting;
  }

  /**
   * Retrieve the value of a setting for this module
   * @param {String} settingName 
   * @param {String} moduleName 
   * @returns {*} // current value of the setting
   */
  /**
   * Updates the value of a module setting
   * @param {string} settingName - Name of the setting to update
   * @param {*} newValue - New value to set
   * @param {string} [moduleName=MODULE_ID] - ID of the module the setting belongs to
   * @returns {Promise<boolean>} True if setting was updated successfully
   */
  static async set(settingName, newValue, moduleName=MODULE_ID){
    if(!settingName){ return false; }

    let selectedSetting = game.settings.storage.get("client")[`${moduleName}.${settingName}`];
    let isClientSetting = !!selectedSetting;

    if(!selectedSetting){
      const world = game.settings.storage.get("world");
      selectedSetting = world.getSetting(`${moduleName}.${settingName}`);
    }
    LogUtil.log("Setting",[settingName, selectedSetting, newValue]);

    try{
      await game.settings.set(moduleName, settingName, newValue);
    }catch(e){
      // Only log errors for world-scoped settings or actual permission issues
      // Client-scoped settings might show permission errors that can be safely ignored
      if (!isClientSetting || !e.message?.includes("lacks permission")) {
        LogUtil.log("Unable to change setting",[settingName, selectedSetting, e.message]);
      }
    }

    return true;
  }

  /**
   * Apply current settings
   */
  /**
   * Applies a specific setting based on its tag
   * @param {string} settingTag - The tag identifying the setting to apply
   * @param {*} [value] - The value to apply, if not provided uses stored setting. Type depends on setting type
   */
  static apply(settingTag, value=undefined){
    const SETTINGS = getSettings();

    if(value===undefined){
      value = SettingsUtil.get(settingTag);
    }
    LogUtil.log("SettingsUtil.apply",[settingTag, value, SettingsUtil.get(settingTag)]); 
    
    switch(settingTag){
      case SETTINGS.disableUI.tag:
        location.reload();
        break;
      case SETTINGS.enableMacroLayout.tag:
        MacroHotbar.applyCustomStyle(value);
        break;
      case SETTINGS.collapseMacroBar.tag:
        MacroHotbar.applyHotBarCollapse();
        break;
      case SETTINGS.playerListAvatars.tag:
        PlayersList.applyAvatars();
        break;
      case SETTINGS.autoHidePlayerList.tag:
        PlayersList.applyPlayersListSettings();
        break;
      case SETTINGS.playerListAvatarSize.tag:
        PlayersList.applyAvatarSize(value);
        break;
      case SETTINGS.uiFontBody.tag:
      case SETTINGS.uiFontTitles.tag:
      case SETTINGS.journalFontBody.tag:
      case SETTINGS.journalFontTitles.tag:
      case SETTINGS.enableFontUI.tag:
      case SETTINGS.enableFontTitles.tag:
      case SETTINGS.enableFontJournal.tag:
      case SETTINGS.enableFontJournalTitles.tag:
        SettingsAppliers.applyCustomFonts(settingTag, value);
        break;
      case SETTINGS.controlsAutoHide.tag:
        SettingsAppliers.applyLeftControlsSettings(settingTag, value);
        break;
      case SETTINGS.dockHeight.tag:
        CameraDockUtil.currSettings.dockHeight = value;
        SettingsAppliers.applyCameraHeight(value); 
        break;
      case SETTINGS.dockWidth.tag:
        CameraDockUtil.currSettings.dockWidth = value;
        SettingsAppliers.applyCameraWidth(value); break;
      case SETTINGS.dockPosX.tag:
        CameraDockUtil.currSettings.dockPosX = value;
        SettingsAppliers.applyCameraPosX(value); break;
      case SETTINGS.dockPosY.tag:
        CameraDockUtil.currSettings.dockPosY = value;
        SettingsAppliers.applyCameraPosY(value); break;
      case SETTINGS.defaultVideoWidth.tag:
        CameraDockUtil.currSettings.defaultVideoWidth = value;
        CameraDockUtil.applyVideoWidth(value); break;
      case SETTINGS.dockResizeOnUserJoin.tag:
        CameraDockUtil.currSettings.dockResizeOnUserJoin = value;
        CameraDockUtil.applyDockResize(value); break;
      case SETTINGS.chatBorderColor.tag:
        ChatUtil.chatBorderColor = value;
        SettingsAppliers.applyBorderColors(); break;
      case SETTINGS.chatBorderPosition.tag:
        ChatUtil.chatBorderPosition = value;
        SettingsAppliers.applyBorderColors(); break;
      case SETTINGS.sideBarWidth.tag:
        TopNavigation.sideBarWidth = value;
        SidebarTabs.applySideBarWidth();
        break;
      case SETTINGS.useLeftChatBorder.tag:
        ChatUtil.useLeftChatBorder = value;
      case SETTINGS.enableChatStyles.tag:
        ChatUtil.enableChatStyles = value;
        SettingsAppliers.applyChatStyles(); break;
      // case SETTINGS.enforceDarkMode.tag:
      //   SettingsThemes.resetFoundryThemeSettings(); break;
      case SETTINGS.debugMode.tag:
        SettingsThemes.applyDebugSettings(); break;
      case SETTINGS.useSceneFolders.tag:
        TopNavigation.useSceneFolders = value;
        ui.nav?.render(); break;
      case SETTINGS.navFoldersForPlayers.tag:
        TopNavigation.navFoldersForPlayers = value;
        ui.nav?.render(); break;
      case SETTINGS.navShowRootFolders.tag:
        TopNavigation.navShowRootFolders = value;
        ui.nav?.render(); break;
      case SETTINGS.hideInactiveOnFolderToggle.tag:
        TopNavigation.hideInactiveOnFolderToggle = value;
        ui.nav?.render(); break;
      case SETTINGS.sceneClickToView.tag:
        TopNavigation.sceneClickToView = value;
        ui.nav?.render();
        game.scenes?.directory?.render(); break;
      case SETTINGS.useSceneIcons.tag:
        TopNavigation.useSceneIcons = value;
        ui.nav?.render();
        game.scenes?.directory?.render(); break;
      case SETTINGS.useSceneBackButton.tag:
        TopNavigation.useSceneBackButton = value;
        TopNavigation.updateExtraButtonClasses();
        ui.nav?.render(); break;
      case SETTINGS.useSceneLookup.tag:
        TopNavigation.useSceneLookup = value;
        TopNavigation.updateExtraButtonClasses();
        ui.nav?.render(); break;
      case SETTINGS.useScenePreview.tag:
        TopNavigation.useScenePreview = value;
        ui.nav?.render(); break;
      case SETTINGS.sceneItemWidth.tag:
        TopNavigation.sceneItemWidth = value;
        TopNavigation.applySceneItemWidth();
        break;
      case SETTINGS.navStartCollapsed.tag:
        TopNavigation.navStartCollapsed = value;
        ui.nav?.render(); break;
      case SETTINGS.collapseNavDuringCombat.tag:
        TopNavigation.collapseNavDuringCombat = value; break;
      case SETTINGS.showNavOnHover.tag:
        TopNavigation.showNavOnHover = value; break;
      case SETTINGS.disableActiveSceneSeparation.tag:
        TopNavigation.disableActiveSceneSeparation = value;
        ui.nav?.render(); break;
      case SETTINGS.hideLoadingSceneName.tag:
        SettingsAppliers.applyHideLoadingSceneName(value); break;
      case SETTINGS.subFoldersLayout.tag:
        TopNavigation.subFoldersLayout = value;
        TopNavigation.applySubFoldersLayout(); break;
      case SETTINGS.expandScrimToSubfolders.tag:
        TopNavigation.expandScrimToSubfolders = value;
        TopNavigation.applyExpandScrimToSubfolders(); break;
      case SETTINGS.autoCloseSubmenuOnSceneChange.tag:
        TopNavigation.autoCloseSubmenuOnSceneChange = value; break;
      case SETTINGS.sceneNavCollapsed.tag:
        TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag); break;
      case SETTINGS.colorTheme.tag:
        SettingsThemes.applyThemeSettings(); break;
      case SETTINGS.playerColorTheme.tag:
        SettingsThemes.applyThemeSettings(); break;
      case SETTINGS.customThemeColors.tag:
        SettingsThemes.applyThemeSettings(); break;
      case SETTINGS.playerCustomThemeColors.tag:
        SettingsThemes.applyThemeSettings(); break;
      case SETTINGS.customStyles.tag:
        SettingsThemes.applyCustomCSS(value); break;
      case SETTINGS.forcedDarkTheme.tag:
        SettingsThemes.applyForcedDarkTheme(value); break;
      case SETTINGS.adjustOtherModules.tag:
        SettingsThemes.applyModuleAdjustments(value); break;
      case SETTINGS.applyDarkThemeToModules.tag:
        SettingsThemes.applyDarkThemeToModules(value); break;
      case SETTINGS.otherModulesList.tag:
        SettingsOtherModules.apply(value); break;
      // Interface enable options
      case SETTINGS.enablePlayerList.tag:
        PlayersList.applyCustomStyle(value); break;
      case SETTINGS.sceneNavEnabled.tag:
        TopNavigation.applyTopNavHeight();
        TopNavigation.applyCustomStyle(value); break;
      case SETTINGS.enableMacroLayout.tag:
        MacroHotbar.applyCustomStyle(value); break;
      case SETTINGS.enableFloatingDock.tag:
        CameraDockUtil.applyCustomStyle(value); break;
      case SETTINGS.enableSidebarTabs.tag:
        SidebarTabs.applyCustomStyle(value); break;
      case SETTINGS.enableChatLogControls.tag:
        ChatLogControls.applyCustomStyle(value); break;
      case SETTINGS.enableSceneControls.tag:
        LeftControls.applyCustomStyle(value); break;
      case SETTINGS.sceneControlsFadeOut.tag:
        LeftControls.applyFadeOut(value); break;
      case SETTINGS.playerListFadeOut.tag:
        PlayersList.applyFadeOut(value); break;
      case SETTINGS.sidebarTabsFadeOut.tag:
        SidebarTabs.applyFadeOut(value); break;
      case SETTINGS.cameraDockFadeOut.tag:
        CameraDockUtil.applyFadeOut(value); break;
      case SETTINGS.macroHotbarFadeOut.tag:
        MacroHotbar.applyFadeOut(value); break;
      case SETTINGS.chatLogControlsFadeOut.tag:
        ChatLogControls.applyFadeOut(value); break;
      case SETTINGS.sceneNavFadeOut.tag:
        TopNavigation.applyFadeOut(value); break;
      case SETTINGS.sceneControlsHide.tag:
        LeftControls.applyHide(value); break;
      case SETTINGS.playerListHide.tag:
        PlayersList.applyHide(value); break;
      case SETTINGS.sidebarTabsHide.tag:
        SidebarTabs.applyHide(value); break;
      case SETTINGS.cameraDockHide.tag:
        CameraDockUtil.applyHide(value); break;
      case SETTINGS.macroHotbarHide.tag:
        MacroHotbar.applyHide(value); break;
      case SETTINGS.chatLogControlsHide.tag:
        ChatLogControls.applyHide(value); break;
      case SETTINGS.sceneNavHide.tag:
        TopNavigation.applyHide(value); break;
      case SETTINGS.useFolderStyle.tag:
        SidebarTabs.applyFolderStyles(value); break;
      case SETTINGS.openChatLogOnLoad.tag:
        SidebarTabs.applyOpenChatLogOnLoad(value); break;
      case SETTINGS.closeSidebarWhenIdle.tag:
        SidebarTabs.applyCloseSidebarWhenIdle(value); break;
      case SETTINGS.useHorizontalSidebarTabs.tag:
        SidebarTabs.applyHorizontalSidebarTabs(value); break;
      case SETTINGS.showChatNotificationsOnTop.tag:
        SidebarTabs.applyShowChatNotificationsOnTop(value); break;
      case SETTINGS.hiddenSidebarTabs.tag:
        SidebarTabs.applyHiddenTabs(); break;
      case SETTINGS.applyThemeToSheets.tag:
        SheetsUtil.applyThemeToSheets(value); break;
      case SETTINGS.enableJournalStyles.tag:
        JournalUtil.applyJournalStyles(value); break;
      case SETTINGS.useHorizontalSheetTabs.tag:
        SheetsUtil.applyHorizontalSheetTabs(value); break;
      case SETTINGS.useGlassEffect.tag:
        SettingsAppliers.applyGlassEffect(value); break;
      case SETTINGS.glassTranslucence.tag:
        if(SettingsUtil.get(SETTINGS.useGlassEffect.tag)){
          SettingsAppliers.applyTranslucence(value);
        } break;
      case SETTINGS.hideLoadingSceneName.tag:
        SettingsAppliers.applyHideLoadingSceneName(value); break;
      case SETTINGS.enableCombatTrackerCarousel.tag:
        CombatTrackerManager.enableCombatTrackerCarousel = value;
        CombatTrackerManager.applyBodyClass();
        ui.combat?.popout?.render(); break;
      case SETTINGS.autoPopoutOnCombatStart.tag:
        CombatTrackerManager.autoPopoutOnCombatStart = value; break;
      case SETTINGS.combatCarouselScale.tag:
        CombatTrackerManager.combatCarouselScale = value;
        CombatTrackerManager.applyScale(); break;
      case SETTINGS.dockedCarouselOffset.tag:
        CombatTrackerManager.dockedCarouselOffset = value;
        CombatTrackerManager.applyDockedOffset(); break;
      case SETTINGS.combatTrackerTakeFullWidth.tag:
        CombatTrackerManager.combatTrackerTakeFullWidth = value;
        document.body.classList.toggle('crlngn-carousel-full-width', value);
        ui.combat?.popout?.render(); break;
      case SETTINGS.carouselImageSource.tag:
        CombatTrackerManager.carouselImageSource = value;
        ui.combat?.popout?.render(); break;
      case SETTINGS.carouselShowAllHP.tag:
        CombatTrackerManager.carouselShowAllHP = value;
        ui.combat?.popout?.render(); break;
      case SETTINGS.carouselHideDefeated.tag:
        CombatTrackerManager.carouselHideDefeated = value;
        ui.combat?.popout?.render(); break;
      case SETTINGS.showCombatRoundButtons.tag:
        CombatTrackerManager.showCombatRoundButtons = value;
        CombatTrackerManager.updateRoundButtonsVisibility(); break;
      case SETTINGS.autoRollNPCsOnCombatStart.tag:
        CombatTrackerManager.autoRollNPCsOnCombatStart = value; break;
      default:
        // do nothing
    }

    // Fire hook if this is a UI element visibility setting
    if (SettingsUtil.#uiVisibilitySettings.includes(settingTag)) {
      Hooks.callAll(HOOKS_CRLNGN.ELEMENT_VISIBILITY_CHANGED, settingTag, value);
    }

  }


  /**
   * Toggles visibility of the main UI interface
   * Affects all elements inside the #interface block, camera views, and taskbar
   */
  static hideInterface = () => {
    LogUtil.log('hideInterface');
    const ui = document.querySelector("#interface");
    const cameraViews = document.querySelector("#camera-views");
    const taskbar = document.querySelector(".taskbar");

    if(SettingsUtil.#uiHidden){
      if(ui) ui.style.removeProperty('visibility');
      if(cameraViews) cameraViews.style.removeProperty('visibility');
      if(taskbar) taskbar.style.removeProperty('visibility');
      SettingsUtil.#uiHidden = false;
    }else{
      if(ui) ui.style.setProperty('visibility', 'hidden');
      if(cameraViews) cameraViews.style.setProperty('visibility', 'hidden');
      if(taskbar) taskbar.style.setProperty('visibility', 'hidden');
      SettingsUtil.#uiHidden = true;
    }
  }

  /**
   * Toggles the sidebar expand/collapse state
   */
  static toggleSidebar = () => {
    LogUtil.log('toggleSidebar', [ui.sidebar?.expanded]);
    if(!ui.sidebar) return;

    if(ui.sidebar.expanded){
      ui.sidebar.collapse();
    }else{
      ui.sidebar.expand();
    }
  }

}
