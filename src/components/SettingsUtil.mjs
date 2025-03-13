import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { BORDER_COLOR_TYPES, getSettings, ICON_SIZES } from "../constants/Settings.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
import { ChatUtil } from "./ChatUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { Main } from "./Main.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

export class SettingsUtil {
  static firstLoad = true;
  /**
   * Registers settings for this module
   */
  static registerSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("registerSettings - test", [SETTINGS], true);
    document.querySelector("body").classList.add(MODULE_ID); 
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    
    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach(async(entry) => {
      const setting = entry[1]; 
      LogUtil.log("Registering... ",[entry], true);

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

      if(setting.choices){
        settingObj.choices = setting.choices
      }

      await game.settings.register(MODULE_ID, setting.tag, settingObj);

      if(SettingsUtil.get(setting.tag)===undefined){
        SettingsUtil.set(setting.tag, setting.default);
      }

      // LogUtil.log("registerSettings",[setting.tag, SettingsUtil.get(setting.tag)]);
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
      await game.settings.registerMenu(MODULE_ID, settingMenu.tag, settingMenuObj); 
    });


    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, SettingsUtil.applyLeftControlsSettings);
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, SettingsUtil.applyPlayersListSettings); 
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, () => {
      if(SettingsUtil.firstLoad){
        SettingsUtil.firstLoad = false;
        SettingsUtil.applyHotBarCollapse();
      }
      SettingsUtil.applyHotBarSettings();
    });
    //apply debug Settings
    SettingsUtil.applyDebugSettings();
    //
    SettingsUtil.applySceneNavPos();
    // apply chat style settings
    SettingsUtil.applyChatStyles();
    // aply border colors
    SettingsUtil.applyBorderColors();

    // apply custom font settings
    const fields = SETTINGS.customFontsMenu.fields;

    LogUtil.log('AAAAA', [fields], true);
    fields.forEach(fieldName => {
      LogUtil.log('registerSettings', [SETTINGS[fieldName].tag]);
      SettingsUtil.applyCustomFonts(SETTINGS[fieldName].tag);
    });   

    // apply left controls settings
    SettingsUtil.applyLeftControlsSettings(); 
    SettingsUtil.applyControlIconSize();
    SettingsUtil.applyControlsBuffer();

    //apply dark mode settings
    // SettingsUtil.resetFoundryThemeSettings();


  }

  /**
   * Retrieve the value of a setting for this module
   * @param {String} settingName 
   * @param {String} moduleName 
   * @returns {*} // current value of the setting
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
  static apply(settingTag, value=undefined){
    const SETTINGS = getSettings();

    if(value===undefined){
      value = SettingsUtil.get(settingTag);
    }
    LogUtil.log("SettingsUtil.apply",[settingTag, value, SettingsUtil.get(settingTag)]); 
    switch(settingTag){
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
      case SETTINGS.leftControlsMenu.tag:
        SettingsUtil.applyLeftControlsSettings(); 
        SettingsUtil.applyControlIconSize();
        SettingsUtil.applyControlsBuffer();
        break;
      case SETTINGS.cameraDockMenu.tag: 
        SettingsUtil.applyCameraPosX();
        SettingsUtil.applyCameraPosY();
        SettingsUtil.applyCameraWidth();
        SettingsUtil.applyCameraHeight();
        break;
      case SETTINGS.chatBorderColor.tag:
        ChatUtil.chatBorderColor = SettingsUtil.get(SETTINGS.chatBorderColor.tag);
        LogUtil.log("SettingsUtil.apply",[settingTag]); 
        SettingsUtil.applyBorderColors();
        break;
      case SETTINGS.enableChatStyles.tag:
        ChatUtil.enableChatStyles = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
        LogUtil.log("SettingsUtil.apply",[settingTag]); 
        SettingsUtil.applyChatStyles();
        break;
      // case SETTINGS.chatMessagesMenu.tag:
      //   // ChatUtil.chatMsgSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);
      //   SettingsUtil.applyBorderColors();
      //   SettingsUtil.applyChatStyles();
      //   break;
      // case SETTINGS.enforceDarkMode.tag:
      //   SettingsUtil.resetFoundryThemeSettings();
      //   break;
      case SETTINGS.debugMode.tag:
        SettingsUtil.applyDebugSettings();
        break;
      case SETTINGS.sceneNavMenu.tag:
        TopNavigation.navSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
        break;
      case SETTINGS.sceneNavCollapsed.tag:
        TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag);
        break;
      default:
        // do nothing
    }
    
  }

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
  static applyHotBarCollapse(){
    const SETTINGS = getSettings();
    const macroCollapseOption = SettingsUtil.get(SETTINGS.collapseMacroBar.tag);

    if(macroCollapseOption){
      ui.hotbar.collapse();
    }
  }

  /**
   * Makes changes to left control auto-hide according to selected settings
   */
  static applyLeftControlsSettings(){
    const SETTINGS = getSettings();
    const leftControls = SettingsUtil.get(SETTINGS.leftControlsMenu.tag);
    const sceneNavMenu = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
    const controls = document.querySelector("#ui-left");
    const logo = document.querySelector("#ui-left #logo");

    if(leftControls.autoHideSecondary){ 
      controls.classList.add("auto-hide"); 
    }else{
      controls.classList.remove("auto-hide"); 
    }

    const body = document.querySelector('body.crlngn-ui');
    const bodyStyles = window.getComputedStyle(body);
    const topPadding = parseFloat(bodyStyles.getPropertyValue('--top-nav-height'));

    if(leftControls.hideFoundryLogo===undefined || leftControls.hideFoundryLogo===true){ 
      logo.classList.remove("visible");
      body.style.setProperty('--ui-top-padding', `${topPadding}px`);
      document.querySelector("body").classList.remove('logo-visible');
    }else{
      logo.classList.add("visible"); 
      if(sceneNavMenu.sceneNavEnabled){
        body.style.setProperty('--ui-top-padding',`${(72 + topPadding)}px`);
        document.querySelector("body").classList.add('logo-visible');
      }else{
        body.style.setProperty('--ui-top-padding', '72px');
      }
    }
  }
  /**
   * Makes changes to size of icons in left controls according to selected settings
   */
  static applyControlIconSize(){
    const SETTINGS = getSettings();
    const leftControls = SettingsUtil.get(SETTINGS.leftControlsMenu.tag);
    const root = document.querySelector("body.crlngn-ui");
    const size = leftControls.iconSize == ICON_SIZES.small.name ? ICON_SIZES.small.size : ICON_SIZES.regular.size;

    root.style.setProperty('--left-control-item-size', size);
  }

  /**
   * Apply bottom buffer to left controls 
   */
  static applyControlsBuffer(){
    const SETTINGS = getSettings();
    const leftControls = SettingsUtil.get(SETTINGS.leftControlsMenu.tag);
    const root = document.querySelector("body.crlngn-ui");
    const buffer = isNaN(leftControls.bottomBuffer) ? SETTINGS.leftControlsMenu.default.bottomBuffer : leftControls.bottomBuffer;
    root.style.setProperty('--controls-bottom-buffer', `${buffer || 0}px`);
  }

  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings",[document.querySelector("#players"), SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("auto-hide");
    }else{
      document.querySelector("#players")?.classList.remove("auto-hide");
    }
    Main.checkPlayersList();
  }

  static applySceneNavPos(){
    const SETTINGS = getSettings();
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, 0);
    TopNavigation.navPos = 0;
  }

  /**
   * Apply Camera dock settings
   */
  static applyCameraPosX(pos){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    const xPos = pos || cameraSettings.dockPosX; 
    CameraUtil.resetPositionAndSize({ x: xPos });
  }
  static applyCameraPosY(pos){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    const yPos = pos || cameraSettings.dockPosY;
    CameraUtil.resetPositionAndSize({ y: yPos });
  }
  static applyCameraWidth(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    const width = value || cameraSettings.dockWidth;
    CameraUtil.resetPositionAndSize({ w: width });
  }
  static applyCameraHeight(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    const height = value || cameraSettings.dockHeight;
    CameraUtil.resetPositionAndSize({ h: height });
  }
  /*******/


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
        body.style.setProperty('--crlngn-font-family', value || customFonts.uiFontBody || SETTINGS.uiFontBody.default.uiFont || '');
        break;
      case SETTINGS.uiFontTitles.tag:
        body.style.setProperty('--crlngn-font-titles', value || customFonts.uiFontTitles || SETTINGS.uiFontTitles.default.uiTitles || '');
        break;
      case SETTINGS.journalFontBody.tag:
        body.style.setProperty('--crlngn-font-journal-body', value || customFonts.journalFontBody || customFonts.journalFontBody || '');
        break;
      case SETTINGS.journalFontTitles:
        body.style.setProperty('--crlngn-font-journal-title', value || customFonts.journalFontTitles || customFonts.journalFontTitles || '');
        break;
      default:
        //
    }
  }

  static resetFoundryThemeSettings(){
    /*
    const SETTINGS = getSettings();
    const isMonksSettingsOn = GeneralUtil.isModuleOn('monks-player-settings');
    const isForceSettingsOn = GeneralUtil.isModuleOn('force-client-settings');
    const forceDarkModeOn = SettingsUtil.get(SETTINGS.enforceDarkMode.tag);
    if(forceDarkModeOn && isMonksSettingsOn){
      if(game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksPlayerSettingsConflict"), {permanent: true});
        SettingsUtil.set(SETTINGS.enforceDarkMode.tag, false);
      }
      return;
    }
    if(forceDarkModeOn && isForceSettingsOn){
      if(game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.forceClientSettingsConflict"), {permanent: true});
        SettingsUtil.set(SETTINGS.enforceDarkMode.tag, false);
      }
      return;
    }

    const foundryColorScheme = game.settings.get('core','colorScheme');

    LogUtil.log("resetFoundryThemeSettings", [foundryColorScheme, forceDarkModeOn])

    if(!foundryColorScheme && forceDarkModeOn){
      game.settings.set('core','colorScheme','dark');
    }
    */
  }

  static applyDebugSettings(value){
    const SETTINGS = getSettings();
    LogUtil.debugOn = value || SettingsUtil.get(SETTINGS.debugMode.tag);
  }
}