import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class SidebarTabs {
  static useFadeOut = true;
  static hidden = false;
  static customStylesEnabled = true;
  static folderStylesEnabled = true;

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_SIDE_BAR, SidebarTabs.onRender);
  }

  static applyFadeOut(useFadeOut){
    SidebarTabs.useFadeOut = useFadeOut;
    SidebarTabs.handleFadeOut();
  }

  static applyHide(hidden){
    SidebarTabs.hidden = hidden;
    SidebarTabs.handleHide();
  }

  static handleHide(component, html, data){
    const element = html ? html.querySelector("#sidebar-tabs") : document.querySelector("#sidebar-tabs");

    if(SidebarTabs.hidden){
      if(!game.user?.isGM){
        element?.classList.add("hidden-ui");
      }
    }else{
      element?.classList.remove("hidden-ui");
    }

    LogUtil.log("handle Hide", [SidebarTabs.hidden]);
  }

  static applyCustomStyle(enabled){
    SidebarTabs.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [SidebarTabs.customStylesEnabled]);
    ui.sidebar?.render();
  }

  static applyFolderStyles(enabled){
    SidebarTabs.folderStylesEnabled = enabled;
    if(SidebarTabs.folderStylesEnabled){
      document.querySelector("body").classList.add("crlngn-folder-style");
    }else{
      document.querySelector("body").classList.remove("crlngn-folder-style");
    }
    LogUtil.log("applyFolderStyles", [SidebarTabs.folderStylesEnabled]);
  }

  static onRender(component, html, data){
    SidebarTabs.handleClassApplication();
    SidebarTabs.handleFadeOut(component, html, data);
    SidebarTabs.handleHide(component, html, data);
    SidebarTabs.applyFolderStyles(SidebarTabs.folderStylesEnabled);
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