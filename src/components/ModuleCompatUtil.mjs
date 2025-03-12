import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ModuleCompatUtil {

  static init(){
    // taskbar
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    const body = document.querySelector('body.crlngn-ui');

    if(isTaskbarOn){
      const taskbarReduceSidebar = game.settings.get('foundry-taskbar','reduceSidebar');
      if(!taskbarReduceSidebar){
        body.style.setProperty('--crlngn-sidebar-bottom', '0px');
      }else{
        body.style.setProperty('--crlngn-sidebar-bottom', '50px');
      }
    }else{
      body.style.setProperty('--crlngn-sidebar-bottom', '0px');
    }
  }


}