import { HOOKS_CORE, HOOKS_DND5E } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs"; 

/**
 * Main class handling core module initialization and setup
 * Manages module lifecycle, hooks, and core functionality
 */
export class SheetsUtil {

  static init(){
    LogUtil.log("SheetsUtil.init", []);
    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderActorSheet);
    // Hooks.on(HOOKS_CORE.RENDER_ITEM_SHEET, SheetsUtil.#onRenderItemSheet);
  }

  static #onRenderActorSheet(actorSheet, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_ACTOR_SHEET, [actorSheet, html.querySelector(".sheet-body"), data]);

    // for (const child of html.children) {
    //   // Access each child element here
    //   console.log(child);
    //   child.addEventListener("scroll", SheetsUtil.#onSheetBodyScroll);
    // }

    html.querySelector(".sheet-body .main-content")?.addEventListener("scroll", SheetsUtil.#onSheetBodyScroll);
    
  }

  static #onRenderItemSheet(itemSheet, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_ITEM_SHEET, [itemSheet, html, data]);
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
}
