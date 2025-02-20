import { HOOKS_CORE } from "../constants/Hooks.mjs"; 
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs"; 
// import { TopNavigation } from "./TopNavUtil.mjs"; 
// import { ChatUtil } from "./ChatUtil.mjs";
// import { CameraUtil } from "./CameraUtil.mjs";
// import { PlayersListUtil } from "./PlayersListUtil.mjs";
// import { getSettings } from "../constants/Settings.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class Main {
  static SETTINGS;

  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      document.querySelector("body").classList.add(MODULE_ID); 

      SettingsUtil.registerSettings();
    }); 

    Hooks.once(HOOKS_CORE.READY, () => {
      var isDebugOn = SettingsUtil.get('debug-mode');
      if(isDebugOn){CONFIG.debug.hooks = true};
    })
    
  }
}
