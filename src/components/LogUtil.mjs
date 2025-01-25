import { DEBUG_TAG } from "../constants/General.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class LogUtil {
    /**
     * Outputs information on console, adding module name and reference
     * @param {string} ref - Reference information to log after module name
     * @param {any[]} data - data to log on console
     */
    static log(ref="", data=[], bypassSettings=false){
      try{
        const debugSetting = SettingsUtil.get(SETTINGS.debugMode.tag);
        const isDebugModeOn = bypassSettings || debugSetting;
        if(!isDebugModeOn){ return };

        console.log(...DEBUG_TAG, ref, ...data);
      }catch(e){
        console.log(...DEBUG_TAG, ref, ...data);
      }
    }

    /**
     * Outputs information on console, adding module name and reference
     * @param {string} ref - Reference information to log after module name
     * @param {any[]} data - data to log on console
     */
    static warn(ref="", data=[]){
      console.warn(...DEBUG_TAG, ref, ...data);
    }

    /**
     * Logs an error on the console and/or ui notification
     * @param {string} strRef - Reference string for the error. 
     * @param {object} options - 
     */
    static logError(strRef, options){ // = { ui:false, console:true, permanent:false }) {
        if(options.ui){
            // console.log(ui.notifications);
            ui.notifications?.error(strRef, { localize: true, permanent: options.permanent });
        }
        if(options.console) console.error(...DEBUG_TAG, strRef);
    }
}

