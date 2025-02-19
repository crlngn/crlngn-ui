import { MODULE_ID, MODULE_SHORT } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { getSettings, ICON_SIZES } from "../constants/Settings.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { Main } from "./Main.mjs";

export class SettingsUtil {
  static firstLoad = true;
  /**
   * Registers settings for this module
   */
  static registerSettings(){
    document.querySelector("body").classList.add(MODULE_SHORT); 
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    const settingsList = Object.entries(Main.SETTINGS);
    settingsList.forEach(async(entry) => {
      const setting = entry[1]; 
      LogUtil.log("Registering... ",[entry]);

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

      LogUtil.log("registerSettings",[setting.tag, SettingsUtil.get(setting.tag)]);
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
    SettingsUtil.applySceneNavPos();
    
    // apply chat style settings
    if(SettingsUtil.get(Main.SETTINGS.enableChatStyles.tag)){ 
      document.querySelector("body").classList.add("crlngn-chat"); 
    }

    // apply custom font settings
    SettingsUtil.applyCustomFonts();
    

    // apply left controls settings
    SettingsUtil.applyLeftControlsSettings(); 
    SettingsUtil.applyControlIconSize();
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
        SettingsUtil.applyHotBarSettings(); break; 
      case SETTINGS.collapseMacroBar.tag:
        SettingsUtil.applyHotBarCollapse(); break; 
      case SETTINGS.autoHidePlayerList.tag: 
        SettingsUtil.applyPlayersListSettings(); break;
      case SETTINGS.customFontsMenu.tag:
        SettingsUtil.applyCustomFonts(value);
      case SETTINGS.leftControlsMenu.tag:
        SettingsUtil.applyLeftControlsSettings(); 
        SettingsUtil.applyControlIconSize();
        break;
      case SETTINGS.cameraDockMenu.tag: 
        SettingsUtil.applyCameraPosX();
        SettingsUtil.applyCameraPosY();
        SettingsUtil.applyCameraWidth();
        SettingsUtil.applyCameraHeight();
        break;
      default:
        // do nothing
    }
    
  }


  static applySettings(){
    
  }

  static applyHotBarSettings(){
    const macroSizeOption = SettingsUtil.get(Main.SETTINGS.enableMacroLayout.tag);
    const hotbar = document.querySelector("#hotbar");

    if(!macroSizeOption && hotbar){
      hotbar.classList.add("foundry-default");
    }else if(hotbar){
      hotbar.classList.remove("foundry-default");
    }
  }
  static applyHotBarCollapse(){
    const macroCollapseOption = SettingsUtil.get(Main.SETTINGS.collapseMacroBar.tag);

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
    const controls = document.querySelector("#ui-left");

    if(leftControls.autoHideSecondary){ 
      controls.classList.add("auto-hide"); 
    }else{
      controls.classList.remove("auto-hide"); 
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

  static applyPlayersListSettings(){
    LogUtil.log("applyPlayersListSettings",[document.querySelector("#players"), SettingsUtil.get(Main.SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(Main.SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("auto-hide");
    }else{
      document.querySelector("#players")?.classList.remove("auto-hide");
    }
  }

  static applySceneNavPos(){
    SettingsUtil.set(Main.SETTINGS.sceneNavPos.tag, 0);
  }

  /**
   * Apply Camera dock settings
   */
  static applyCameraPosX(pos){
    const cameraSettings = SettingsUtil.get(Main.SETTINGS.cameraDockMenu.tag);
    const xPos = pos || cameraSettings.dockPosX; 
    CameraUtil.resetPositionAndSize({ x: xPos });
  }
  static applyCameraPosY(pos){
    const cameraSettings = SettingsUtil.get(Main.SETTINGS.cameraDockMenu.tag);
    const yPos = pos || cameraSettings.dockPosY;
    CameraUtil.resetPositionAndSize({ y: yPos });
  }
  static applyCameraWidth(value){
    const cameraSettings = SettingsUtil.get(Main.SETTINGS.cameraDockMenu.tag);
    const width = value || cameraSettings.dockWidth;
    CameraUtil.resetPositionAndSize({ w: width });
  }
  static applyCameraHeight(value){
    const cameraSettings = SettingsUtil.get(Main.SETTINGS.cameraDockMenu.tag);
    const height = value || cameraSettings.dockHeight;
    CameraUtil.resetPositionAndSize({ h: height });
  }
  /*******/


  static applyCustomFonts(){
    const customFonts = SettingsUtil.get(Main.SETTINGS.customFontsMenu.tag);
    LogUtil.log("applyCustomFonts", [customFonts]);

    if(customFonts){
      const root = document.querySelector("body.crlngn-ui");
      if(customFonts.uiFont!==undefined){
        root.style.setProperty('--crlngn-font-family', customFonts.uiFont || '');
      }
      if(customFonts.journalBodyFont!==undefined){
        root.style.setProperty('--crlngn-font-journal-body', customFonts.journalBodyFont || '');
      }
      if(customFonts.journalTitleFont!==undefined){
        root.style.setProperty('--crlngn-font-journal-title', customFonts.journalTitleFont || '');
      }
    }
  }
}