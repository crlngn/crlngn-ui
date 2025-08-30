import { DARK_MODE_RULES, MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { BORDER_COLOR_TYPES, getSettings, ICON_SIZES, THEMES, UI_SCALE } from "../constants/Settings.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";
import { ChatLogControls } from "./ChatLogControlsUtil.mjs";
import { ChatUtil } from "./ChatUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LeftControls } from "./LeftControlsUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { MacroHotbar } from "./MacroHotbarUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SheetsUtil } from "./SheetsUtil.mjs";
import { SidebarTabs } from "./SidebarUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

/**
 * Core settings management utility for the Carolingian UI module
 * Handles registration, retrieval, and application of module settings
 */
export class SettingsUtil {
  static #uiHidden = false;
  static firstLoad = true;
  static foundryUiConfig = null;

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
            SettingsUtil.apply(setting.tag, value);
            if (setting.tag !== 'v2-enforce-gm-settings' && setting.tag !== 'v2-default-settings') {
              SettingsUtil.onSettingChange(setting.tag);
            }
          }
        }
  
        if(setting.choices || setting.options){
          settingObj.choices = setting.choices || setting.options;
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
          key: "0",
          modifiers: ["Control"]
        }
      ],
      onDown: () => {  },
      onUp: () => { SettingsUtil.hideInterface() },
      restricted: false, // Restrict this Keybinding to gamemaster only?
    });


    /**
     * Register the tabbed settings menu as the main entry point
     */
    const settingMenus = Object.entries(getSettingMenus());
    
    // First register the main tabbed settings menu
    const tabbedMenu = settingMenus.find(entry => entry[0] === 'moduleSettingsMenu');
    if (tabbedMenu) {
      const tabbedMenuData = tabbedMenu[1];
      const tabbedMenuObj = {
        name: tabbedMenuData.tag,
        label: tabbedMenuData.label, 
        hint: tabbedMenuData.hint,
        icon: tabbedMenuData.icon, 
        type: tabbedMenuData.propType,
        restricted: false // tabbedMenuData.restricted
      };
      await game.settings.registerMenu(MODULE_ID, tabbedMenuData.tag, tabbedMenuObj);
    }

    if(SettingsUtil.get(SETTINGS.disableUI.tag)===true){ return; }
    // Apply custom theme and CSS
    SettingsUtil.applyThemeSettings();
    SettingsUtil.applyCustomCSS();
    SettingsUtil.applyModuleAdjustments();
    TopNavigation.applyTopNavHeight();

    SettingsUtil.foundryUiConfig = game.settings.get('core','uiConfig') || null;

    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, SettingsUtil.applyLeftControlsSettings);
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersList.applyPlayersListSettings); 
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, () => {
      MacroHotbar.applyCustomStyle();
      if(SettingsUtil.firstLoad){
        SettingsUtil.firstLoad = false;
        MacroHotbar.applyHotBarCollapse();
      }
    });
    SettingsUtil.applyDebugSettings();
    SettingsUtil.applyChatStyles();
    SettingsUtil.applyBorderColors();
    SheetsUtil.applyThemeToSheets(SettingsUtil.get(SETTINGS.applyThemeToSheets.tag));
    SheetsUtil.applyHorizontalSheetTabs(SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag));

    const sceneNavFields = SETTINGS.sceneNavMenu.fields;
    sceneNavFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    const cameraDockFields = SETTINGS.cameraDockMenu.fields;
    cameraDockFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    const fontFields = SETTINGS.customFontsMenu.fields;
    fontFields.forEach(fieldName => {
      SettingsUtil.applyCustomFonts(SETTINGS[fieldName].tag);
    });   

    const controlFields = SETTINGS.leftControlsMenu.fields;
    controlFields.forEach(fieldName => {
      SettingsUtil.applyLeftControlsSettings(SETTINGS[fieldName].tag);
    });

    const interfaceFields = SETTINGS.interfaceOptionsMenu.fields;
    interfaceFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });
    
    SettingsUtil.applyForcedDarkTheme();
    SidebarTabs.applySideBarWidth();
    SettingsUtil.applyDarkThemeToModules();
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
   * @returns {boolean} True if setting was updated successfully
   */
  static set(settingName, newValue, moduleName=MODULE_ID){ 
    if(!settingName){ return false; }

    let selectedSetting = game.settings.storage.get("client")[`${moduleName}.${settingName}`];
    let isClientSetting = !!selectedSetting;

    if(!selectedSetting){
      const world = game.settings.storage.get("world");
      selectedSetting = world.getSetting(`${moduleName}.${settingName}`);
    } 
    LogUtil.log("Setting",[settingName, selectedSetting, newValue]);

    try{
      game.settings.set(moduleName, settingName, newValue);
      // selectedSetting.update({value: newValue});
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
      case SETTINGS.uiFontBody.tag:
      case SETTINGS.uiFontTitles.tag:
      case SETTINGS.journalFontBody.tag:
      case SETTINGS.journalFontTitles.tag:
        SettingsUtil.applyCustomFonts(settingTag, value);
        break;
      case SETTINGS.controlsAutoHide.tag:
        SettingsUtil.applyLeftControlsSettings(settingTag, value);
        break;
      case SETTINGS.dockHeight.tag:
        CameraDockUtil.currSettings.dockHeight = value;
        SettingsUtil.applyCameraHeight(value); 
        break;
      case SETTINGS.dockWidth.tag:
        CameraDockUtil.currSettings.dockWidth = value;
        SettingsUtil.applyCameraWidth(value); break;
      case SETTINGS.dockPosX.tag:
        CameraDockUtil.currSettings.dockPosX = value;
        SettingsUtil.applyCameraPosX(value); break;
      case SETTINGS.dockPosY.tag:
        CameraDockUtil.currSettings.dockPosY = value;
        SettingsUtil.applyCameraPosY(value); break;
      case SETTINGS.defaultVideoWidth.tag:
        CameraDockUtil.currSettings.defaultVideoWidth = value;
        CameraDockUtil.applyVideoWidth(value); break;
      case SETTINGS.dockResizeOnUserJoin.tag:
        CameraDockUtil.currSettings.dockResizeOnUserJoin = value;
        CameraDockUtil.applyDockResize(value); break;
      case SETTINGS.chatBorderColor.tag:
        ChatUtil.chatBorderColor = value;
        SettingsUtil.applyBorderColors(); break;
      case SETTINGS.chatBorderPosition.tag:
        ChatUtil.chatBorderPosition = value;
        SettingsUtil.applyBorderColors(); break;
      case SETTINGS.sideBarWidth.tag:
        TopNavigation.sideBarWidth = value;
        SidebarTabs.applySideBarWidth();
        break;
      case SETTINGS.useLeftChatBorder.tag:
        ChatUtil.useLeftChatBorder = value;
      case SETTINGS.enableChatStyles.tag:
        ChatUtil.enableChatStyles = value;
        SettingsUtil.applyChatStyles(); break;
      // case SETTINGS.enforceDarkMode.tag:
      //   SettingsUtil.resetFoundryThemeSettings(); break;
      case SETTINGS.debugMode.tag:
        SettingsUtil.applyDebugSettings(); break;
      case SETTINGS.useSceneFolders.tag:
        TopNavigation.useSceneFolders = value;
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
        ui.nav?.render(); break;
      case SETTINGS.useSceneLookup.tag:
        TopNavigation.useSceneLookup = value;
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
      case SETTINGS.showNavOnHover.tag:
        TopNavigation.showNavOnHover = value; break;
      case SETTINGS.sceneNavCollapsed.tag:
        TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag); break;
      case SETTINGS.colorTheme.tag:
        SettingsUtil.applyThemeSettings(); break;
      case SETTINGS.playerColorTheme.tag:
        SettingsUtil.applyThemeSettings(); break;
      case SETTINGS.customStyles.tag:
        SettingsUtil.applyCustomCSS(value); break;
      case SETTINGS.forcedDarkTheme.tag:
        SettingsUtil.applyForcedDarkTheme(value); break;
      case SETTINGS.adjustOtherModules.tag:
        SettingsUtil.applyModuleAdjustments(value); break;
      case SETTINGS.applyDarkThemeToModules.tag:
        SettingsUtil.applyDarkThemeToModules(value); break;
      case SETTINGS.otherModulesList.tag:
        SettingsUtil.applyOtherModulesList(value); break;
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
      case SETTINGS.applyThemeToSheets.tag:
        SheetsUtil.applyThemeToSheets(value); break;
      case SETTINGS.useHorizontalSheetTabs.tag:
        SheetsUtil.applyHorizontalSheetTabs(value); break;
      case SETTINGS.enforceGMSettings.tag:
        // When GM enables enforcement, immediately save current settings
        if (value && game.user?.isGM) {
          SettingsUtil.saveDefaultSettings();
          ui.notifications.info("Current settings saved as defaults for players");
        }
        break;
      default:
        // do nothing
    }
    
  }

  /**
   * Applies border color settings to chat messages
   * Can be based on player color or roll type
   */
  static applyBorderColors(){
    const SETTINGS = getSettings();
    const borderColorSettings = SettingsUtil.get(SETTINGS.chatBorderColor.tag);
    const body = document.querySelector("body");

    if(borderColorSettings===BORDER_COLOR_TYPES.playerColor.name){ 
     body.classList.add("player-chat-borders");
     body.classList.remove("roll-chat-borders"); 
    }else if(borderColorSettings===BORDER_COLOR_TYPES.rollType.name){
     body.classList.add("roll-chat-borders"); 
     body.classList.remove("player-chat-borders");
    }else{
     body.classList.remove("player-chat-borders");
     body.classList.remove("roll-chat-borders"); 
    }
  }

  /**
   * Applies chat message styling settings
   */
  static applyChatStyles(){
    const SETTINGS = getSettings();
    const chatMsgSettings = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
    const body = document.querySelector("body");

    LogUtil.log("applyChatStyles", [chatMsgSettings, SETTINGS]);

    if(chatMsgSettings){ 
      body.classList.add("crlngn-chat"); 
    }else{
      body.classList.remove("crlngn-chat"); 
    }
  }


  /**
   * Applies settings to left controls bar
   * @param {string} tag - Setting tag to apply
   * @param {*} value - Value to apply for the setting
   */
  static applyLeftControlsSettings(tag, value){
    const SETTINGS = getSettings();
    const navEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    const controls = document.querySelector("#ui-left");
    const body = document.querySelector('body.crlngn-ui');
    const bodyStyleElem = document.querySelector('#crlngn-ui-vars');

    LogUtil.log("applyLeftControlsSettings", [tag]);

    switch(tag){
      case SETTINGS.controlsAutoHide.tag:
        if(SettingsUtil.get(SETTINGS.controlsAutoHide.tag)){
          controls.classList.add("auto-hide"); 
        }else{
          controls.classList.remove("auto-hide"); 
        }
        break;
      default:
        //
    }
  }

  /**
   * Applies size settings for control icons
   * Updates the size of icons in the left controls panel
   */
  static applyControlIconSize(){
    const SETTINGS = getSettings();
    const iconSize = SettingsUtil.get(SETTINGS.controlsIconSize.tag);
    const body = document.querySelector("body");
    const size = ICON_SIZES[iconSize] ? ICON_SIZES[iconSize].size : ICON_SIZES.regular.size;

    function getIconFontSize(currIconSize){
      switch(currIconSize){
        case ICON_SIZES.large.name:
          return `var(--font-size-18);`;
        case ICON_SIZES.regular.name:
          return `var(--font-size-16);`;
        default:
          return `var(--font-size-14);`;
      }
    }
    LogUtil.log("applyControlIconSize", [size]);
    GeneralUtil.addCSSVars('--icon-font-size', getIconFontSize(iconSize));
    GeneralUtil.addCSSVars('--control-item-size', size);
    SettingsUtil.applyLeftControlsSettings();
  }

  /**
   * Applies scene navigation position settings
   * @param {number} [value] - Position value to apply, if not provided uses stored setting
   */
  static applySceneNavPos(value){
    const SETTINGS = getSettings();
    TopNavigation.navPos = value || SettingsUtil.get(SETTINGS.sceneNavPos.tag);
  }

  /**
   * Applies horizontal position of camera dock
   * @param {number} [pos] - X position to apply
   */
  static applyCameraPosX(pos){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockPosX.tag);
    const xPos = pos || cameraSettings; 
    CameraDockUtil.resetPositionAndSize({ x: xPos });
  }

  /**
   * Applies vertical position of camera dock
   * @param {number} [pos] - Y position to apply
   */
  static applyCameraPosY(pos){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockPosY.tag);
    const yPos = pos || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ y: yPos });
  }

  /**
   * Applies width of camera dock
   * @param {number} [value] - Width value to apply
   */
  static applyCameraWidth(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockWidth.tag);
    const width = value || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ w: width });
  }

  /**
   * Applies height of camera dock
   * @param {number} [value] - Height value to apply
   */
  static applyCameraHeight(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockHeight.tag);
    const height = value || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ h: height });
  }

  /**
   * Applies custom font settings
   * @param {string} tag - Font setting tag to apply
   * @param {string} [value] - Font value to apply
   */
  static applyCustomFonts(tag, value){
    const SETTINGS = getSettings();
    const fields = SETTINGS.customFontsMenu.fields;
    const customFonts = {};

    LogUtil.log("applyCustomFonts", [tag, value]);
    fields.forEach(fieldName => {
      customFonts[fieldName] = SettingsUtil.get(SETTINGS[fieldName].tag);
    });

    const body = document.querySelector("body.crlngn-ui");
    switch(tag){
      case SETTINGS.uiFontBody.tag:
        GeneralUtil.addCSSVars('--crlngn-font-family', value || customFonts.uiFontBody || '');
        break;
      case SETTINGS.uiFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-titles', value || customFonts.uiFontTitles || '');
        break;
      case SETTINGS.journalFontBody.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-body', value || customFonts.journalFontBody  || '');
        break;
      case SETTINGS.journalFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-title', value || customFonts.journalFontTitles || '');
        break;
      default:
        //
    }
  }

  /**
   * Resets Foundry's theme settings to defaults
   * Used when enforcing dark mode or other theme changes
   */
  static resetFoundryThemeSettings(){
    // const SETTINGS = getSettings();
    // const isMonksSettingsOn = GeneralUtil.isModuleOn('monks-player-settings');
    // const isForceSettingsOn = GeneralUtil.isModuleOn('force-client-settings');
    // const forceDarkModeOn = SettingsUtil.get(SETTINGS.enforceDarkMode.tag);
    // if(isForceSettingsOn){
    //   if(game.user?.isGM) {
    //     ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.forceClientSettingsConflict"), {permanent: true});
    //     SettingsUtil.set(SETTINGS.enforceDarkMode.tag, false);
    //   }
    //   return;
    // }

    // LogUtil.log("resetFoundryThemeSettings", [game.settings]);
    // const foundryUiConfig = game.settings.get('core','uiConfig') || null;

    // // applications or interface
    // LogUtil.log("resetFoundryThemeSettings", [foundryUiConfig, game.settings])
    
    // if(forceDarkModeOn){
    //   const enforcedThemes = {
    //     ...foundryUiConfig,
    //     colorScheme: {
    //       application: foundryUiConfig.colorScheme.applications===''? 'dark' : foundryUiConfig.colorScheme.applications,
    //       interface: foundryUiConfig.colorScheme.interface===''? 'dark' : foundryUiConfig.colorScheme.interface
    //     }
    //   }
    //   game.settings.set('core','uiConfig', enforcedThemes);
    // }
  }

  /**
   * Applies debug mode settings
   * @param {boolean} [value] - Whether to enable debug mode
   */
  static applyDebugSettings(value){
    const SETTINGS = getSettings();
    LogUtil.debugOn = value || SettingsUtil.get(SETTINGS.debugMode.tag);
  }

  /**
   * Applies the selected theme to the UI
   * @param {string} [value] - Theme name to apply, if not provided uses stored setting
   */
  static applyThemeSettings = (value) => {
    const SETTINGS = getSettings();
    const themeName = value || SettingsUtil.get(SETTINGS.playerColorTheme.tag) || SettingsUtil.get(SETTINGS.colorTheme.tag) || "";
    const body = document.querySelector("body");

    LogUtil.log("applyThemeSettings", [value, themeName, SettingsUtil.get(SETTINGS.colorTheme.tag)]);
    
    THEMES.forEach((theme)=>{
      if(theme.className){
        body.classList.remove(theme.className);
      }
    });

    if(themeName){
      body.classList.add(themeName);
    }
  }

  /**
   * Applies custom CSS styles to the UI
   * @param {string} [value] - CSS content to apply, if not provided uses stored setting
   */
  static applyCustomCSS = (value) => {
    const SETTINGS = getSettings();
    const cssContent = value || SettingsUtil.get(SETTINGS.customStyles.tag) || "";

    GeneralUtil.addCustomCSS(cssContent);
  }

  /**
   * Applies dark mode to defined CSS selectors
   * @param {string} [value] - CSS selectors / rules to apply dark theme to. If not provided uses stored setting
   */
  static applyForcedDarkTheme = (value) => {
    const isDarkMode = SettingsUtil.foundryUiConfig?.colorScheme?.applications==='dark' || SettingsUtil.foundryUiConfig?.colorScheme?.interface==='dark';
    if(!isDarkMode) {return;}

    const SETTINGS = getSettings();
    const cssSelectorStr = value || SettingsUtil.get(SETTINGS.forcedDarkTheme.tag) || "";
    if (!cssSelectorStr.trim()) return;
    
    // Process the CSS rules using the utility method
    const finalStyle = GeneralUtil.processCSSRules(DARK_MODE_RULES, cssSelectorStr);
    
    LogUtil.log("applyForcedDarkTheme", [finalStyle.substring(0, 100) + "..."]);
    
    // Apply the CSS
    GeneralUtil.addCustomCSS(finalStyle, 'crlngn-forced-dark-mode');
  }

  /**
   * Applies style adjustments to other modules
   * @param {boolean} [value] - Whether to enforce styles, if not provided uses stored setting
   */
  static applyModuleAdjustments = (value) => {
    const SETTINGS = getSettings();
    const enforceStyles = value || SettingsUtil.get(SETTINGS.adjustOtherModules.tag) || false;
    
    if(enforceStyles){
      ModuleCompatUtil.addModuleClasses();
    }
  }

  static applyDarkThemeToModules = (value) => {
    const SETTINGS = getSettings();
    const enforceDarkTheme = value || SettingsUtil.get(SETTINGS.applyDarkThemeToModules.tag) || false;
    const foundryUiConfig = game.settings.get('core','uiConfig') || null;
    
    if(enforceDarkTheme && foundryUiConfig?.colorScheme?.applications==='dark'){
      SettingsUtil.applyForcedDarkTheme('.app.theme-light:not(.sheet), #AA-autorec-settings');
      document.querySelector('body').classList.add('crlngn-forced-dark-theme');
    }
  }

  /**
   * Applies the list of other modules to adjust styles for
   * @param {string} [value] - Comma-separated list of module names wrapped in single quotes, if not provided uses stored setting
   */
  static applyOtherModulesList = (value) => {
    const SETTINGS = getSettings();
    const currSetting = value || SettingsUtil.get(SETTINGS.otherModulesList.tag);
    LogUtil.log("applyOtherModulesList", [currSetting]);
    if(currSetting.split(",").length===0){
      SettingsUtil.set(SETTINGS.adjustOtherModules.tag, false);
      SettingsUtil.set(SETTINGS.otherModulesList.tag, "");
    }else{
      SettingsUtil.set(SETTINGS.adjustOtherModules.tag, true);
    }
    ModuleCompatUtil.addModuleClasses();
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
      if(ui) cameraViews.style.removeProperty('visibility');
      if(ui) taskbar.style.removeProperty('visibility');
      SettingsUtil.#uiHidden = false;
    }else{
      if(ui) ui.style.setProperty('visibility', 'hidden');
      if(cameraViews) cameraViews.style.setProperty('visibility', 'hidden');
      if(taskbar) taskbar.style.setProperty('visibility', 'hidden');
      SettingsUtil.#uiHidden = true;
    }
  }

  /**
   * Enforces GM settings to players when enabled
   * Called during module initialization for non-GM users
   */
  static enforceGMSettings() {
    const SETTINGS = getSettings();
    
    // Only proceed if user is not GM and enforcement is enabled
    if (game.user?.isGM || !SettingsUtil.get(SETTINGS.enforceGMSettings.tag)) {
      return;
    }

    // Get stored default settings
    const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag);
    if (!defaultSettings || Object.keys(defaultSettings).length <= 1) { // <= 1 because of _version
      LogUtil.log("No default GM settings found to enforce");
      return;
    }

    LogUtil.log("Enforcing GM settings to player", [defaultSettings]);

    let settingsApplied = false;

    // Apply each stored setting
    for (const [settingTag, value] of Object.entries(defaultSettings)) {
      // Skip the version tracking field
      if (settingTag === '_version') continue;
      
      try {
        // Only apply client-scoped settings
        const setting = Object.values(SETTINGS).find(s => s.tag === settingTag);
        if (setting && setting.scope === 'client') {
          // Check if the current value is different from the GM default
          const currentValue = SettingsUtil.get(settingTag);
          if (currentValue !== value) {
            SettingsUtil.set(settingTag, value);
            LogUtil.log(`Applied GM setting: ${settingTag}`, [value]);
            settingsApplied = true;
          }
        }
      } catch (error) {
        LogUtil.log(`Failed to apply GM setting: ${settingTag}`, [error]);
      }
    }
    
    return settingsApplied;
  }

  /**
   * Saves current GM settings as defaults for enforcement
   * Called when GM changes settings and enforcement is enabled
   */
  static saveDefaultSettings() {
    const SETTINGS = getSettings();
    
    // Only GM can save default settings
    if (!game.user?.isGM) {
      return;
    }

    // Only save if enforcement is enabled
    if (!SettingsUtil.get(SETTINGS.enforceGMSettings.tag)) {
      return;
    }

    const defaultSettings = {
      _version: Date.now() // Add timestamp to track updates
    };

    // Collect all client-scoped settings
    for (const [key, setting] of Object.entries(SETTINGS)) {
      if (setting.tag && setting.scope === 'client' && !setting.isMenu) {
        const value = SettingsUtil.get(setting.tag);
        if (value !== undefined) {
          defaultSettings[setting.tag] = value;
        }
      }
    }

    // Save the collected settings
    SettingsUtil.set(SETTINGS.defaultSettings.tag, defaultSettings);
    LogUtil.log("Saved default GM settings", [defaultSettings]);
  }

  /**
   * Hook for when settings change to update default settings
   */
  static onSettingChange(settingTag) {
    const SETTINGS = getSettings();
    
    // If GM and enforcement is enabled, save settings immediately
    if (game.user?.isGM && SettingsUtil.get(SETTINGS.enforceGMSettings.tag)) {
      // Save synchronously to ensure they're available before any reload
      SettingsUtil.saveDefaultSettings();
    }
  }

}