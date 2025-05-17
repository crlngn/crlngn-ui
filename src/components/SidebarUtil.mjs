import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class SidebarTabs {
  static useFadeOut = true;
  static customStylesEnabled = true;

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_SIDE_BAR, SidebarTabs.onRender);
  }

  static applyFadeOut(useFadeOut){
    SidebarTabs.useFadeOut = useFadeOut;
    SidebarTabs.handleFadeOut();
  }

  static applyCustomStyle(enabled){
    SidebarTabs.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [SidebarTabs.customStylesEnabled]);
    ui.sidebar?.render();
  }

  static onRender(component, html, data){
    SidebarTabs.handleClassApplication();
    SidebarTabs.handleFadeOut(component, html, data);
  }

  static handleClassApplication(){
    if(SidebarTabs.customStylesEnabled){
      document.querySelector("body").classList.add("crlngn-tabs");
    }else{
      document.querySelector("body").classList.remove("crlngn-tabs");
    }
  }

  static handleFadeOut(component, html, data){
    const element = html ? html.querySelector("#sidebar-tabs") : document.querySelector("#sidebar-tabs");

    if(SidebarTabs.useFadeOut){
      element?.classList.add("faded-ui");
    } else {
      element?.classList.remove("faded-ui");
    }
    LogUtil.log("SidebarTabs handle fade out", [SidebarTabs.useFadeOut]);
  }

}