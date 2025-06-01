import { HOOKS_CORE, HOOKS_DND5E } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * DnD5e style sheets initialization and setup
 */
export class SheetsUtil {
  static themeStylesEnabled = true;
  static horizontalSheetTabsEnabled = true;

  static init(){
    const SETTINGS = getSettings();
    LogUtil.log("SheetsUtil.init", []);
    if(game.system.id !== "dnd5e"){ return; }
    SheetsUtil.themeStylesEnabled = SettingsUtil.get(SETTINGS.applyThemeToSheets.tag);
    SheetsUtil.horizontalSheetTabsEnabled = SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag);

    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderActorSheet);
  }

  static #onRenderActorSheet(actorSheet, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_ACTOR_SHEET, [actorSheet, html.querySelector(".sheet-body"), data]);

    html.querySelector(".sheet-body .main-content")?.addEventListener("scroll", SheetsUtil.#onSheetBodyScroll);
    
    const tabs = html.querySelectorAll("nav.tabs > a.item");
    for (const tab of tabs) {
      tab.removeAttribute("data-tooltip");
      tab.removeAttribute("data-tooltip-delay");
    }

    SheetsUtil.applyThemeToSheets(SheetsUtil.themeStylesEnabled);
    SheetsUtil.applyHorizontalSheetTabs(SheetsUtil.horizontalSheetTabsEnabled);
  }

  static #onSheetBodyScroll(event){
    // LogUtil.log("SheetsUtil.#onSheetBodyScroll", [event]);
    const sheetBody = event.target.closest(".window-content");
    const abilityScores = sheetBody?.querySelector(".ability-scores");
    if(abilityScores){
      if(event.target.scrollTop > 30){
        abilityScores.classList.add("fadeout");
      }else{
        abilityScores.classList.remove("fadeout");
      }
    }

  }

  static applyThemeToSheets(value){
    SheetsUtil.themeStylesEnabled = value;

    if(value){
      document.body.classList.add("crlngn-sheets");
    }else{
      document.body.classList.remove("crlngn-sheets");
    }
  }

  static applyHorizontalSheetTabs(value){
    SheetsUtil.horizontalSheetTabsEnabled = value;

    if(value){
      document.body.classList.add("crlngn-sheet-tabs");
    }else{
      document.body.classList.remove("crlngn-sheet-tabs");
    }
  }
}
