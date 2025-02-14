import { MODULE_ID, MODULE_SHORT } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
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

      Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, SettingsUtil.applyLeftControlsSettings);
      Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, SettingsUtil.applyPlayersListSettings); 
      Hooks.on(HOOKS_CORE.RENDER_HOTBAR, () => {
        SettingsUtil.applyHotBarSettings();
        SettingsUtil.applyHotBarCollapse();
      });
      SettingsUtil.applySceneNavSettings();
      
      // apply chat style settings
      if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
        document.querySelector("body").classList.add("crlngn-chat"); 
      }

      // apply custom font settings
      const customFont = SettingsUtil.get(SETTINGS.customFont.tag);
      if(customFont){
        const root = document.querySelector("body.crlngn-ui");
        root.style.setProperty('--crlngn-font-family', customFont);
      }

      // apply icon size setting
      const iconSizeOption = SettingsUtil.get(SETTINGS.controlIconSize.tag);
      if(iconSizeOption) SettingsUtil.applyControlIconSize(iconSizeOption);
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

      if(value===undefined){
        value = SettingsUtil.get(settingTag);
      }
      LogUtil.log("SettingsUtil.apply",[settingTag, value, SettingsUtil.get(settingTag)]); 
      switch(settingTag){
        case SETTINGS.enableMacroLayout.tag: 
          SettingsUtil.applyHotBarSettings(); break; 
        case SETTINGS.collapseMacroBar.tag:
          SettingsUtil.applyHotBarCollapse(); break; 
        case SETTINGS.autoHideLeftControls.tag: 
          SettingsUtil.applyLeftControlsSettings(); break; 
        case SETTINGS.autoHidePlayerList.tag: 
          SettingsUtil.applyPlayersListSettings(); break; 
        case SETTINGS.cameraDockPosX.tag: 
          SettingsUtil.applyCameraPosX(value); break; 
        case SETTINGS.cameraDockPosY.tag: 
          SettingsUtil.applyCameraPosY(value); break; 
        case SETTINGS.cameraDockWidth.tag:
          SettingsUtil.applyCameraWidth(value); break;
        case SETTINGS.cameraDockHeight.tag:
          SettingsUtil.applyCameraHeight(value); break;
        case SETTINGS.controlIconSize.tag:
          SettingsUtil.applyControlIconSize(value); break;
        default:
          // do nothing
      }
      
    }


    static applySettings(){
      // const settingsList = Object.entries(SETTINGS);
      // settingsList.forEach((entry) => {
      //   const setting = entry[1]; 
      //   let currSetting = SettingsUtil.get(setting.tag);
      //   SettingsUtil.apply(setting.tag, currSetting);
      // });
    }

    static applyHotBarSettings(){
      const macroSizeOption = SettingsUtil.get(SETTINGS.enableMacroLayout.tag);
      const hotbar = document.querySelector("#hotbar");

      if(!macroSizeOption && hotbar){
        hotbar.classList.add("foundry-default");
      }else if(hotbar){
        hotbar.classList.remove("foundry-default");
      }
    }
    static applyHotBarCollapse(){
      const macroCollapseOption = SettingsUtil.get(SETTINGS.collapseMacroBar.tag);

      if(macroCollapseOption){
        ui.hotbar.collapse();
      }
    }

    static applyLeftControlsSettings(){
      const controlsAutoHide = SettingsUtil.get(SETTINGS.autoHideLeftControls.tag);
      const controls = document.querySelector("#ui-left");

      if(controlsAutoHide){
        controls.classList.add("auto-hide");
      }else{
        controls.classList.remove("auto-hide");
      }
    }

    static applyPlayersListSettings(){
      LogUtil.log("applyPlayersListSettings",[document.querySelector("#players"), SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
      if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
        document.querySelector("#players")?.classList.add("auto-hide");
      }else{
        document.querySelector("#players")?.classList.remove("auto-hide");
      }
    }

    static applySceneNavSettings(){
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, 0);
    }

    static applyCameraPosX(pos){
      const xPos = pos || SettingsUtil.get(SETTINGS.cameraDockPosX.tag); 
      CameraUtil.resetPositionAndSize({ x: xPos });
    }
    static applyCameraPosY(pos){
      const yPos = pos || SettingsUtil.get(SETTINGS.cameraDockPosY.tag); 
      CameraUtil.resetPositionAndSize({ y: yPos });
    }

    static applyCameraWidth(value){
      const width = value || SettingsUtil.get(SETTINGS.cameraDockWidth.tag);
      CameraUtil.resetPositionAndSize({ w: width });
    }

    static applyCameraHeight(value){
      const height = value || SettingsUtil.get(SETTINGS.cameraDockHeight.tag); 
      CameraUtil.resetPositionAndSize({ h: height });
    }

    static applyControlIconSize(value){
      const root = document.querySelector("body.crlngn-ui");
      const size = value == 1 ? '36px' : '42px';

      root.style.setProperty('--left-control-item-size', size);
    }
}

