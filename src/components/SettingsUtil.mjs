import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { BORDER_COLOR_TYPES, DEFAULT_SETTINGS, getSettings, ICON_SIZES, SETTING_SCOPE, THEMES, UI_SCALE } from "../constants/Settings.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
import { ChatUtil } from "./ChatUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SheetsUtil } from "./SheetsUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

/**
 * Core settings management utility for the Carolingian UI module
 * Handles registration, retrieval, and application of module settings
 */
export class SettingsUtil {
  static #uiHidden = false;
  static firstLoad = true;
  static reloadRequired = false;
  static reloadTimeout = null;

  /**
   * Registers all module settings with Foundry VTT
   * Initializes settings, registers menus, and sets up hooks for settings changes
   */
  static registerSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("registerSettings - test", [SETTINGS], true);
    
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach(async(entry) => {
      const key = entry[0];
      const setting = entry[1]; 
      LogUtil.log("Registering... ",[entry, setting.label, setting.scope], true);

      const settingObj = { 
        name: setting.label,
        hint: setting.hint,
        default: setting.default,
        type: setting.propType,
        scope: setting.scope,
        config: setting.config,
        requiresReload: setting.requiresReload || false,
        onChange: value => SettingsUtil.apply(setting.tag, value)
      }

      if(setting.choices || setting.options){
        settingObj.choices = setting.choices || setting.options;
      }

      // @ts-ignore - Valid module ID for settings registration
      await game.settings.register(MODULE_ID, setting.tag, settingObj);
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
     * Register subsetting menus
     */
    const settingMenus = Object.entries(getSettingMenus());
    settingMenus.forEach(async(entry) => {
      const settingMenu = entry[1]; 
      const settingMenuObj = {
        name: settingMenu.tag,
        label: settingMenu.label, 
        hint: settingMenu.hint,
        icon: settingMenu.icon, 
        type: settingMenu.propType,
        restricted: settingMenu.restricted
      }
      // if(game.user.isGM || !settingMenu.restricted){
      await game.settings.registerMenu(MODULE_ID, settingMenu.tag, settingMenuObj); 
      // }
    });

    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, SettingsUtil.applyLeftControlsSettings);
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, SettingsUtil.applyPlayersListSettings); 
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, () => {
      if(SettingsUtil.firstLoad){
        SettingsUtil.applyHotBarCollapse();
      }
      SettingsUtil.applyHotBarSettings();
    });

    // Apply custom theme and CSS
    SettingsUtil.applyThemeSettings();
    // apply chat style settings
    SettingsUtil.applyChatStyles();

    // apply custom font settings
    const fontFields = SETTINGS.customFontsMenu.fields;
    fontFields.forEach(fieldName => {
      SettingsUtil.applyCustomFonts(SETTINGS[fieldName].tag);
    });   
  }

  static applySettings(){
    const SETTINGS = getSettings();
    LogUtil.log("registerSettings - test", [SETTINGS], true);
    
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach(async(entry) => {
      const key = entry[0];
      const setting = entry[1];

      if(SettingsUtil.get(setting.tag) === undefined){ 
        SettingsUtil.set(setting.tag, setting.default);
      }
    });
    //apply debug Settings
    SettingsUtil.applyDebugSettings();
    // aply border colors
    SettingsUtil.applyBorderColors();

    // apply scene nav settings
    const sceneNavFields = SETTINGS.sceneNavMenu.fields;
    sceneNavFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    // apply left controls settings
    const controlFields = SETTINGS.leftControlsMenu.fields;
    controlFields.forEach(fieldName => {
      SettingsUtil.applyLeftControlsSettings(SETTINGS[fieldName].tag);
    });
    
    // apply general scale
    SettingsUtil.applyUiScale();
    SettingsUtil.applyCustomCSS();
    SettingsUtil.applyModuleAdjustments();
    SheetsUtil.applyThemeToSheets(SettingsUtil.get(SETTINGS.applyThemeToSheets.tag));
    SheetsUtil.applyHorizontalSheetTabs(SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag));

    // apply camera dock settings
    const cameraDockFields = SETTINGS.cameraDockMenu.fields;
    cameraDockFields.forEach(fieldName => {
      SettingsUtil.apply(SETTINGS[fieldName].tag);
    });

    const enforceGMSettings = !game.user?.isGM && SettingsUtil.get(SETTINGS.enforceGMSettings.tag); 
    if(enforceGMSettings){
      SettingsUtil.enforceGMSettings();
      // Ensure scene nav setting is properly applied after enforcement
      const navEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
      TopNavigation.sceneNavEnabled = navEnabled;
    }
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

    if(!selectedSetting){
      const world = game.settings.storage.get("world");
      selectedSetting = world.getSetting(`${moduleName}.${settingName}`);
    } 
    LogUtil.log("Setting",[settingName, selectedSetting]);

    try{
      game.settings.set(moduleName, settingName, newValue);
      // selectedSetting.update({value: newValue});
    }catch(e){
      LogUtil.log("Unable to change setting",[settingName, selectedSetting]);
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
    if(value!==undefined && !SettingsUtil.firstLoad){
      const settingKey = Object.keys(SETTINGS).find((key)=>SETTINGS[key].tag===settingTag);
      SettingsUtil.saveDefaultSettings(settingKey, value);
    }
    
    LogUtil.log("SettingsUtil.apply",[settingTag, value, SettingsUtil.get(settingTag)]); 
    switch(settingTag){
      case SETTINGS.disableUI.tag:
        SettingsUtil.reloadRequired = SettingsUtil.firstLoad ? false : true;
        break;
      case SETTINGS.enableMacroLayout.tag:
        SettingsUtil.applyHotBarSettings();
        break;
      case SETTINGS.collapseMacroBar.tag:
        SettingsUtil.applyHotBarCollapse();
        break;
      case SETTINGS.autoHidePlayerList.tag:
        SettingsUtil.applyPlayersListSettings();
        break;
      case SETTINGS.uiFontBody.tag:
      case SETTINGS.uiFontTitles.tag:
      case SETTINGS.journalFontBody.tag:
      case SETTINGS.journalFontTitles.tag:
        SettingsUtil.applyCustomFonts(settingTag, value);
        break;
      case SETTINGS.controlsBottomBuffer.tag:
      case SETTINGS.controlsIconSize.tag:
      case SETTINGS.controlsAutoHide.tag:
      case SETTINGS.hideFoundryLogo.tag:
        SettingsUtil.applyLeftControlsSettings(settingTag, value);
        break;
      case SETTINGS.enableFloatingDock.tag:
        CameraUtil.currSettings.enableFloatingDock = value;
        break;
      case SETTINGS.dockHeight.tag:
        CameraUtil.currSettings.dockHeight = value;
        SettingsUtil.applyCameraHeight(value); 
        break;
      case SETTINGS.dockWidth.tag:
        CameraUtil.currSettings.dockWidth = value;
        SettingsUtil.applyCameraWidth(value); 
        break;
      case SETTINGS.dockPosX.tag:
        CameraUtil.currSettings.dockPosX = value;
        SettingsUtil.applyCameraPosX(value); 
        break;
      case SETTINGS.dockPosY.tag:
        CameraUtil.currSettings.dockPosY = value;
        SettingsUtil.applyCameraPosY(value); 
        break;
      case SETTINGS.defaultVideoWidth.tag:
        CameraUtil.currSettings.defaultVideoWidth = value;
        CameraUtil.applyVideoWidth(value); 
        break;
      case SETTINGS.dockResizeOnUserJoin.tag:
        CameraUtil.currSettings.dockResizeOnUserJoin = value;
        CameraUtil.applyDockResize(value); 
        break;
      case SETTINGS.chatBorderColor.tag:
        ChatUtil.chatBorderColor = SettingsUtil.get(SETTINGS.chatBorderColor.tag);
        SettingsUtil.applyBorderColors();
        SettingsUtil.reloadRequired = SettingsUtil.firstLoad ? false : true;
        break;
      case SETTINGS.enableChatStyles.tag:
        ChatUtil.enableChatStyles = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
        SettingsUtil.applyChatStyles();
        break;
      case SETTINGS.enforceDarkMode.tag:
        SettingsUtil.resetFoundryThemeSettings();
        break;
      case SETTINGS.debugMode.tag:
        SettingsUtil.applyDebugSettings();
        break;
      case SETTINGS.sceneNavEnabled.tag:
        TopNavigation.sceneNavEnabled = value;
        if(value===false && game.user?.isGM){
          SettingsUtil.set(SETTINGS.useSceneFolders.tag, false);
        }
        TopNavigation.applyButtonSettings();
        SettingsUtil.reloadRequired = SettingsUtil.firstLoad ? false : true;
        break;
      case SETTINGS.sceneItemWidth.tag:
        TopNavigation.sceneItemWidth = value || 100;
        TopNavigation.applySceneItemWidth();
        break;
      case SETTINGS.useSceneFolders.tag:
        TopNavigation.useSceneFolders = value;
        if(value===false){
          SettingsUtil.set(SETTINGS.navShowSceneFolders.tag, false);
        }
        break;
      case SETTINGS.navShowSceneFolders.tag:
        TopNavigation.navShowSceneFolders = value;
        break;
      case SETTINGS.sceneClickToView.tag:
        TopNavigation.sceneClickToView = value;
        game.scenes?.directory.render();
        // SceneNavFolders.refreshFolderView();
        break;
      case SETTINGS.useSceneIcons.tag:
        TopNavigation.useSceneIcons = value;
        ui.nav?.render();
        game.scenes?.directory.render();
        break;
      case SETTINGS.useSceneBackButton.tag:
        TopNavigation.useSceneBackButton = value;
        ui.nav?.render();
        break;
      case SETTINGS.useSceneLookup.tag:
        TopNavigation.useSceneLookup = value;
        TopNavigation.applyButtonSettings();
        ui.nav?.render();
        break;
      case SETTINGS.useScenePreview.tag:
        TopNavigation.useScenePreview = value;
        ui.nav?.render();
        break;
      case SETTINGS.sceneNavAlias.tag:
        TopNavigation.sceneNavAlias = value;
        break;
      case SETTINGS.navStartCollapsed.tag:
        TopNavigation.navStartCollapsed = value;
        break;
      case SETTINGS.openFolderOnSceneLoad.tag:
        TopNavigation.openFolderOnSceneLoad = value;
        break;
      // case SETTINGS.showFolderListOnClick.tag:
      //   TopNavigation.showFolderListOnClick = value;
      //   // SceneNavFolders.refreshFolderView();
      //   break;
      case SETTINGS.showNavOnHover.tag:
        TopNavigation.showNavOnHover = value;
        break;
      case SETTINGS.sceneNavCollapsed.tag:
        TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag);
        break;
      case SETTINGS.sceneNavPos.tag:
        SettingsUtil.applySceneNavPos();
        break;
      case SETTINGS.colorTheme.tag:
        SettingsUtil.applyThemeSettings();
        break;
      case SETTINGS.customStyles.tag:
        SettingsUtil.applyCustomCSS();
        break;
      case SETTINGS.adjustOtherModules.tag:
        SettingsUtil.applyModuleAdjustments();
        break;
      case SETTINGS.otherModulesList.tag:
        SettingsUtil.applyOtherModulesList();
        break;
      case SETTINGS.uiScale.tag:
        SettingsUtil.applyUiScale(value);
        break;
      case SETTINGS.applyThemeToSheets.tag:
        SheetsUtil.applyThemeToSheets(value); break;
      case SETTINGS.useHorizontalSheetTabs.tag:
        SheetsUtil.applyHorizontalSheetTabs(value); break;
      case SETTINGS.enforceGMSettings.tag:
        if(value) {
          Object.entries(SETTINGS).forEach(([key, setting])=>{
            if(setting.scope === SETTING_SCOPE.client && DEFAULT_SETTINGS[key] !== undefined){
              SettingsUtil.saveDefaultSettings(key, SettingsUtil.get(setting.tag));
            }
          });
        }
        break;
      default:
        // do nothing
    }
    if(SettingsUtil.reloadRequired){
      clearTimeout(SettingsUtil.reloadTimeout);
      SettingsUtil.reloadTimeout = setTimeout(()=>{
        GeneralUtil.showReloadDialog()
      }, 1000);
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
   * Applies settings for the macro hotbar
   */
  static applyHotBarSettings(){
    const SETTINGS = getSettings();
    const macroSizeOption = SettingsUtil.get(SETTINGS.enableMacroLayout.tag);
    const hotbar = document.querySelector("#hotbar");

    if(!macroSizeOption && hotbar){
      hotbar.classList.add("foundry-default");
    }else if(hotbar){
      hotbar.classList.remove("foundry-default");
    }
  }
  /**
   * Applies collapse state to the macro hotbar
   * Controls visibility and expansion state of the macro bar
   */
  static applyHotBarCollapse(){
    const SETTINGS = getSettings();
    const macroCollapseOption = SettingsUtil.get(SETTINGS.collapseMacroBar.tag);

    if(macroCollapseOption){
      ui.hotbar?.collapse();
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
    const logo = document.querySelector("#ui-left #logo");
    const body = document.querySelector('body.crlngn-ui');
    const bodyStyleElem = document.querySelector('#crlngn-ui-vars');

    if(!body){return;}
    LogUtil.log("applyLeftControlsSettings", [tag]);

    switch(tag){
      case SETTINGS.controlsAutoHide.tag:
        if(SettingsUtil.get(SETTINGS.controlsAutoHide.tag)){
          controls.classList.add("auto-hide"); 
        }else{
          controls.classList.remove("auto-hide"); 
        }
        break;
      case SETTINGS.hideFoundryLogo.tag:
        const bodyStyles = window.getComputedStyle(body);
        const navHeight = bodyStyles.getPropertyValue('--top-nav-height') || '0px';
        const topPadding = parseFloat(navHeight) || 0;
        const hideFoundryLogo = SettingsUtil.get(SETTINGS.hideFoundryLogo.tag);
        LogUtil.log("applyLeftControlsSettings", [tag, topPadding, navHeight]);

        if(hideFoundryLogo===undefined || hideFoundryLogo===true){
          logo.classList.remove("visible");
          GeneralUtil.addCSSVars('--ui-top-padding', `${topPadding}px`);
          document.querySelector("body").classList.remove('logo-visible');
        } else {
          logo.classList.add("visible");
          if(navEnabled){
            GeneralUtil.addCSSVars('--ui-top-padding',`${72 + topPadding}px`);
            document.querySelector("body").classList.add('logo-visible');
          }else{
            GeneralUtil.addCSSVars('--ui-top-padding','72px');
          }
        }
        break;
      case SETTINGS.controlsBottomBuffer.tag:
        SettingsUtil.applyControlsBuffer();
        break;
      case SETTINGS.controlsIconSize.tag:
        SettingsUtil.applyControlIconSize();
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
    GeneralUtil.addCSSVars('--left-control-item-size', size);
    SettingsUtil.applyLeftControlsSettings(SETTINGS.hideFoundryLogo.tag);
  }

  static applyUiScale(value){
    const SETTINGS = getSettings();
    const currSize = value || SettingsUtil.get(SETTINGS.uiScale.tag);
    if(currSize===UI_SCALE.regular.name){
      document.querySelector("#interface")?.classList.add("scale-regular");
      document.querySelector("#interface")?.classList.remove("scale-large");
      SettingsUtil.set(SETTINGS.controlsIconSize.tag,currSize);
      GeneralUtil.addCSSVars('--macro-size', '50px');
    }else if(currSize===UI_SCALE.large.name){
      document.querySelector("#interface")?.classList.remove("scale-regular");
      document.querySelector("#interface")?.classList.add("scale-large");
      SettingsUtil.set(SETTINGS.controlsIconSize.tag,currSize);
      GeneralUtil.addCSSVars('--macro-size', '54px');
    }else{
      document.querySelector("#interface")?.classList.remove("scale-regular");
      document.querySelector("#interface")?.classList.remove("scale-large");
      SettingsUtil.set(SETTINGS.controlsIconSize.tag,currSize);
      GeneralUtil.addCSSVars('--macro-size', '42px');
    }
  }

  /**
   * Applies bottom buffer spacing to left controls
   * Adjusts the spacing at the bottom of the controls panel
   */
  static applyControlsBuffer(){
    const SETTINGS = getSettings();
    const bufferSetting = SettingsUtil.get(SETTINGS.controlsBottomBuffer.tag);
    const buffer = isNaN(bufferSetting) ? SETTINGS.controlsBottomBuffer.default : bufferSetting;
    LogUtil.log("applyControlsBuffer", [buffer, bufferSetting]);
    GeneralUtil.addCSSVars('--controls-bottom-buffer', `${buffer || 0}px`);
  }

  /**
   * Applies settings for the players list
   */
  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings",[document.querySelector("#players"), SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("auto-hide");
    }else{
      document.querySelector("#players")?.classList.remove("auto-hide");
    }
    ModuleCompatUtil.checkPlayersList();
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
    CameraUtil.resetPositionAndSize({ x: xPos });
  }

  /**
   * Applies vertical position of camera dock
   * @param {number} [pos] - Y position to apply
   */
  static applyCameraPosY(pos){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockPosY.tag);
    const yPos = pos || cameraSettings;
    CameraUtil.resetPositionAndSize({ y: yPos });
  }

  /**
   * Applies width of camera dock
   * @param {number} [value] - Width value to apply
   */
  static applyCameraWidth(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockWidth.tag);
    const width = value || cameraSettings;
    CameraUtil.resetPositionAndSize({ w: width });
  }

  /**
   * Applies height of camera dock
   * @param {number} [value] - Height value to apply
   */
  static applyCameraHeight(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockHeight.tag);
    const height = value || cameraSettings;
    CameraUtil.resetPositionAndSize({ h: height });
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
        GeneralUtil.addCSSVars('--crlngn-font-family', value || customFonts.uiFontBody || SETTINGS.uiFontBody.default.uiFont || '');
        break;
      case SETTINGS.uiFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-titles', value || customFonts.uiFontTitles || SETTINGS.uiFontTitles.default.uiTitles || '');
        break;
      case SETTINGS.journalFontBody.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-body', value || customFonts.journalFontBody || customFonts.journalFontBody || '');
        break;
      case SETTINGS.journalFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-title', value || customFonts.journalFontTitles || customFonts.journalFontTitles || '');
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
    const SETTINGS = getSettings();
    const isMonksSettingsOn = GeneralUtil.isModuleOn('monks-player-settings');
    const isForceSettingsOn = GeneralUtil.isModuleOn('force-client-settings');
    const forceDarkModeOn = SettingsUtil.get(SETTINGS.enforceDarkMode.tag);
    if(forceDarkModeOn && isMonksSettingsOn){
      if(game.user?.isGM) {
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksPlayerSettingsConflict"), {permanent: true});
        SettingsUtil.set(SETTINGS.enforceDarkMode.tag, false);
      }
      return;
    }
    if(forceDarkModeOn && isForceSettingsOn){
      if(game.user?.isGM) {
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.forceClientSettingsConflict"), {permanent: true});
        SettingsUtil.set(SETTINGS.enforceDarkMode.tag, false);
      }
      return;
    }

    const foundryColorScheme = game.settings.get('core','colorScheme');

    LogUtil.log("resetFoundryThemeSettings", ["color scheme", foundryColorScheme, " / dark mode",  forceDarkModeOn])

    if(!foundryColorScheme && forceDarkModeOn){
      game.settings.set('core','colorScheme','dark');
    }
  }

  /* Enforce GM settings to client */
  static enforceGMSettings(){
    LogUtil.log("enforceGMSettings - start", []);
    const SETTINGS = getSettings();
    const isMonksSettingsOn = GeneralUtil.isModuleOn('monks-player-settings');
    const isForceSettingsOn = GeneralUtil.isModuleOn('force-client-settings');
    const enforceGMSettingsOn = SettingsUtil.get(SETTINGS.enforceGMSettings.tag);
    const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag);
    if(!enforceGMSettingsOn || !defaultSettings){ 
      LogUtil.log("enforceGMSettings - disabled", [enforceGMSettingsOn, defaultSettings]);
      return; 
    }

    // if(enforceGMSettingsOn && defaultSettings && isMonksSettingsOn){
    //   if(game.user?.isGM) {
    //     ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksPlayerSettingsConflict"), {permanent: true});
    //     SettingsUtil.set(SETTINGS.enforceGMSettings.tag, false);
    //   }
    //   return;
    // }
    // if(enforceGMSettingsOn && defaultSettings && isForceSettingsOn){
    //   if(game.user?.isGM) {
    //     ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.forceClientSettingsConflict"), {permanent: true});
    //     SettingsUtil.set(SETTINGS.enforceGMSettings.tag, false);
    //   }
    //   return;
    // }
    // // if(game.user?.isGM){ return; }

    for(const key in defaultSettings){
      const settingValue = defaultSettings[key];
      
      if(SETTINGS[key] && SETTINGS[key].scope === SETTING_SCOPE.client){
        SettingsUtil.set(SETTINGS[key].tag, settingValue);
        LogUtil.log("enforcedGMSettings - setting", [key, SETTINGS[key].tag, settingValue]);
      }
    }
  }

  static saveDefaultSettings(settingKey, value){
    const SETTINGS = getSettings();
    if(!game.user?.isGM || settingKey === SETTINGS.defaultSettings.tag){ return; }
    
    const modifiedSettings = {...(SettingsUtil.get(SETTINGS.defaultSettings.tag) || {})};
    if(DEFAULT_SETTINGS[settingKey] !== undefined){
      modifiedSettings[settingKey] = value;
    }

    LogUtil.log("saveDefaultSettings", [settingKey]);
    if(game.user?.isGM){
      SettingsUtil.set(SETTINGS.defaultSettings.tag, modifiedSettings);
    }
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
    const themeName = value || SettingsUtil.get(SETTINGS.colorTheme.tag) || "";
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

  /**
   * Applies the list of other modules to adjust styles for
   * @param {string} [value] - Comma-separated list of module names wrapped in single quotes, if not provided uses stored setting
   */
  static applyOtherModulesList = (value) => {
    const SETTINGS = getSettings();
    const currSetting = value || SettingsUtil.get(SETTINGS.otherModulesList.tag);
    LogUtil.log("applyOtherModulesList", [currSetting, currSetting.split(",")]);
    if(currSetting.split(",").length===0){
      SettingsUtil.set(SETTINGS.adjustOtherModules.tag, false);
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

}