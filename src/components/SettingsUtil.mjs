import { MODULE_ID, MODULE_SHORT } from "../constants/General.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class SettingsUtil {
    /**
     * Registers settings for this module
     */
    static registerSettings(){
      document.querySelector("body").classList.add(MODULE_SHORT); 
      
      /**
       * Register each of the settings defined in the SETTINGS constant 
       */
      const settingsList = Object.entries(SETTINGS);
      settingsList.forEach(async(entry) => {
        const setting = entry[1]; 
        LogUtil.log("Registering... ",[entry]);

        await game.settings.register(MODULE_ID, setting.tag, { 
          name: setting.label,
          hint: setting.hint,
          default: setting.default,
          type: setting.propType,
          scope: setting.scope,
          config: setting.config,
          onChange: value => SettingsUtil.apply(setting.tag, value)
        });

        if(SettingsUtil.get(setting.tag)===undefined){
          SettingsUtil.set(setting.tag, setting.default);
        }
        LogUtil.log("registerSettings",[setting.tag, SettingsUtil.get(setting.tag)]);
      });
      
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

      try{
        if(selectedSetting){
          // game.settings.set(moduleName, settingName, newValue);
          selectedSetting.update({value: newValue});
        }
        LogUtil.log("Able to change setting",[settingName, selectedSetting]);
      }catch(e){
        LogUtil.log("Unable to change setting",[settingName, selectedSetting]);
      }

      return true;
    }

    /**
     * Apply current setting for Text Size
     */
    static apply(settingTag, value=undefined){

      if(value===undefined){
        value = SettingsUtil.get(settingTag);
      }
      LogUtil.log("SettingsUtil.apply",[settingTag, value, SettingsUtil.get(settingTag)]); 
      switch(settingTag){
        case SETTINGS.sceneNavState.tag: 
          if(value){ 
            ui.nav.collapse();
            // document.querySelector("#interface #ui-top #navigation").classList.add("collapsed");
          }else{
            ui.nav.expand();
          }
          break;
        default:
          // do nothing
      }
      
    }


    static applySettings(){
      const settingsList = Object.entries(SETTINGS);
      settingsList.forEach((entry) => {
        const setting = entry[1]; 
        let currSetting = SettingsUtil.get(setting.tag);
        SettingsUtil.apply(setting.tag, currSetting);
      });
    }
}

