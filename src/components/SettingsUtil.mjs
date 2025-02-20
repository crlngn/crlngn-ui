import { MODULE_ID, MODULE_SHORT } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettingMenus } from "../constants/SettingMenus.mjs";
import { getSettings, ICON_SIZES, SETTING_SCOPE } from "../constants/Settings.mjs";
// import { CameraUtil } from "./CameraUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { Main } from "./Main.mjs";

export class SettingsUtil {
  static firstLoad = true; 

  /**
   * Registers settings for this module
   */
  static registerSettings(){
    const SETTINGS = getSettings();
    /**
     * Register each of the settings defined in the SETTINGS constant 
     */
    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach(async(entry) => {
      const setting = entry[1]; 
      LogUtil.log("Registering setting... ",[setting, entry]);

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
    
    // apply chat style settings
    // if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
    //   document.querySelector("body").classList.add("crlngn-chat"); 
    // }

    // apply custom font settings
    SettingsUtil.applyCustomFonts();

    // apply left controls settings
    // SettingsUtil.applyLeftControlsSettings(); 
    // SettingsUtil.applyControlIconSize();
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
      const client = game.settings.storage.get(SETTING_SCOPE.client);
      let selectedSetting = client[`${moduleName}.${settingName}`];
      //
      if(selectedSetting===undefined){
        const world = game.settings.storage.get(SETTING_SCOPE.world);
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
    
    switch(settingTag){
      case SETTINGS.customFontsMenu.tag:
        SettingsUtil.applyCustomFonts(value); break;
      default:
        // do nothing
    }
    
  }

  static applyCustomFonts(){
    const SETTINGS = getSettings();
    const customFonts = SettingsUtil.get(SETTINGS.customFontsMenu.tag);
    LogUtil.log("applyCustomFonts", [customFonts]);

    if(customFonts){
      const root = document.querySelector("body.crlngn-ui");
      if(customFonts.uiFont!==undefined){
        root.style.setProperty('--crlngn-font-family', customFonts.uiFont || '');
      }
      if(customFonts.uiTitles!==undefined){
        root.style.setProperty('--crlngn-font-titles', customFonts.uiTitles || '');
      }
      if(customFonts.journalBody!==undefined){
        root.style.setProperty('--crlngn-font-journal-body', customFonts.journalBody|| '');
      }
      if(customFonts.journalTitles!==undefined){
        root.style.setProperty('--crlngn-font-journal-title', customFonts.journalTitles || '');
      }
    }
  }
}