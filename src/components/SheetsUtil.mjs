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
    Hooks.on(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, SheetsUtil.#onRenderCompendiumBrowser);
  }

  static #onRenderActorSheet(actorSheet, html, data){
    html = html[0] || html;
    LogUtil.log(HOOKS_CORE.RENDER_ACTOR_SHEET, [actorSheet, html.querySelector(".sheet-body"), data]);

    html.querySelector(".sheet-body .main-content")?.addEventListener("scroll", SheetsUtil.#onSheetBodyScroll);
    
    const tabs = html.querySelectorAll("nav.tabs > a.item");
    for (const tab of tabs) {
      const label = game.i18n.localize(tab.getAttribute("aria-label"));
      tab.setAttribute("data-label", label);
      tab.removeAttribute("data-tooltip");
      tab.removeAttribute("data-tooltip-delay");
    }

    SheetsUtil.applyThemeToSheets(SheetsUtil.themeStylesEnabled);
    SheetsUtil.applyHorizontalSheetTabs(SheetsUtil.horizontalSheetTabsEnabled);
  }

  static #onRenderCompendiumBrowser(app, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, [app, html, data]);
    
    if(SheetsUtil.horizontalSheetTabsEnabled){
      setTimeout(() => {
        SheetsUtil.#addTabScrollButtons();
      }, 100);
    }
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
      SheetsUtil.#addTabScrollButtons();
    }else{
      document.body.classList.remove("crlngn-sheet-tabs");
      SheetsUtil.#removeTabScrollButtons();
    }
  }

  static #addTabScrollButtons(){
    const tabContainers = document.querySelectorAll(".dnd5e2.vertical-tabs nav.tabs");
    
    tabContainers.forEach(nav => {
      const parent = nav.parentElement;
      if(parent.querySelector(".crlngn-tab-scroll-btn")) return;
      
      const wrapper = document.createElement("div");
      wrapper.className = "crlngn-tab-scroll-wrapper";
      // wrapper.style.position = "relative";
      // wrapper.style.display = "flex";
      // wrapper.style.alignItems = "center";
      
      const prevBtn = document.createElement("button");
      prevBtn.className = "crlngn-tab-scroll-btn crlngn-tab-scroll-prev";
      prevBtn.innerHTML = '<i class="fas fa-caret-left"></i>';
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        nav.scrollBy({ left: -150, behavior: "smooth" });
      });
      
      const nextBtn = document.createElement("button");
      nextBtn.className = "crlngn-tab-scroll-btn crlngn-tab-scroll-next";
      nextBtn.innerHTML = '<i class="fas fa-caret-right"></i>';
      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        nav.scrollBy({ left: 150, behavior: "smooth" });
      });
      
      parent.insertBefore(wrapper, nav);
      wrapper.appendChild(prevBtn);
      wrapper.appendChild(nav);
      wrapper.appendChild(nextBtn);
    });
  }

  static #removeTabScrollButtons(){
    const wrappers = document.querySelectorAll(".crlngn-tab-scroll-wrapper");
    wrappers.forEach(wrapper => {
      const nav = wrapper.querySelector("nav.tabs");
      if(nav && wrapper.parentElement){
        wrapper.parentElement.insertBefore(nav, wrapper);
        wrapper.remove();
      }
    });
  }
}