import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class MacroHotbar {
  static useFadeOut = true;
  static customStylesEnabled = true;

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, MacroHotbar.handleFadeOut);
  }

  static applyFadeOut(useFadeOut){
    MacroHotbar.useFadeOut = useFadeOut;
    MacroHotbar.handleFadeOut();
  }

  static handleFadeOut(component, html, data){
    const element = html ? html : document.querySelector("#hotbar");

    if(MacroHotbar.useFadeOut){
      element?.classList.add("faded-ui");
    } else {
      element?.classList.remove("faded-ui");
    }
    LogUtil.log("MacroHotbat handle fade out", [MacroHotbar.useFadeOut]);
  }

  static applyCustomStyle(enabled){
    MacroHotbar.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [MacroHotbar.customStylesEnabled]);
  }

}