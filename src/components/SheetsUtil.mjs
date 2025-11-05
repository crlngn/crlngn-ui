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
    if(game.system.id !== "dnd5e" && game.system.id !== "daggerheart"){ return; }
    SheetsUtil.themeStylesEnabled = SettingsUtil.get(SETTINGS.applyThemeToSheets.tag);
    SheetsUtil.horizontalSheetTabsEnabled = SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag);

    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderActorSheet);
    Hooks.on(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, SheetsUtil.#onRenderCompendiumBrowser);
    Hooks.on(HOOKS_CORE.RENDER_ADVANCEMENT_MANAGER, SheetsUtil.#onRenderAdvancementManager);
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, SheetsUtil.#onUpdateSetting);
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
    
    if(SheetsUtil.horizontalSheetTabsEnabled){
      setTimeout(() => {
        SheetsUtil.#addTabScrollButtons();
      }, 100);
    }
  }

  static #onRenderCompendiumBrowser(app, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, [app, html, data]);

    if(SheetsUtil.horizontalSheetTabsEnabled){
      setTimeout(() => {
        SheetsUtil.#addTabScrollButtons();
      }, 100);
    }
  }

  static #onRenderAdvancementManager(app, html, data){
    // Check if Foundry's core application theme is dark
    const uiConfig = game.settings.get('core', 'uiConfig');
    const applicationTheme = uiConfig?.colorScheme?.applications;

    LogUtil.log(HOOKS_CORE.RENDER_ADVANCEMENT_MANAGER, [app, html, data, uiConfig?.colorScheme]);

    if(applicationTheme === "dark"){
      html.classList.add("theme-dark");
      html.classList.remove("theme-light");
    }
  }

  static #onUpdateSetting(setting, value, options, userId){
    // When Foundry's core uiConfig setting changes, reapply theme to any open advancement managers
    if(setting.key === 'core.uiConfig'){
      LogUtil.log(HOOKS_CORE.UPDATE_SETTING, ["core.uiConfig changed", value]);

      const applicationTheme = value?.colorScheme?.applications;
      const advancementManagers = document.querySelectorAll('.advancement-manager');

      advancementManagers.forEach(manager => {
        if(applicationTheme === "dark"){
          manager.classList.add("theme-dark");
          manager.classList.remove("theme-light");
        } else {
          manager.classList.remove("theme-dark");
          manager.classList.add("theme-light");
        }
      });
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
      // Re-add scroll buttons if horizontal tabs were enabled
      if(SheetsUtil.horizontalSheetTabsEnabled){
        document.body.classList.add("crlngn-sheet-tabs");
        SheetsUtil.#addTabScrollButtons();
      }
    }else{
      document.body.classList.remove("crlngn-sheets");
      document.body.classList.remove("crlngn-sheet-tabs");
      SheetsUtil.horizontalSheetTabsEnabled = false;
      SheetsUtil.#removeTabScrollButtons();
    }
  }

  static applyHorizontalSheetTabs(value){
    SheetsUtil.horizontalSheetTabsEnabled = value;

    if(SheetsUtil.horizontalSheetTabsEnabled && 
      SheetsUtil.themeStylesEnabled){
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

      // Check if tabs are scrollable and update button visibility
      const updateButtonVisibility = () => {
        const isScrollable = nav.scrollWidth > nav.clientWidth;
        if (isScrollable) {
          prevBtn.classList.remove("hidden");
          nextBtn.classList.remove("hidden");
        } else {
          prevBtn.classList.add("hidden");
          nextBtn.classList.add("hidden");
        }
      };

      // Initial check
      setTimeout(updateButtonVisibility, 150);

      // Create observer and store reference for cleanup
      const resizeObserver = new ResizeObserver(updateButtonVisibility);
      resizeObserver.observe(nav);

      // Store observer on the wrapper for cleanup later
      wrapper._resizeObserver = resizeObserver;
    });
  }

  static #removeTabScrollButtons(){
    const wrappers = document.querySelectorAll(".crlngn-tab-scroll-wrapper");
    wrappers.forEach(wrapper => {
      // Disconnect observer to prevent memory leaks
      if(wrapper._resizeObserver){
        wrapper._resizeObserver.disconnect();
        delete wrapper._resizeObserver;
      }

      const nav = wrapper.querySelector("nav.tabs");
      if(nav && wrapper.parentElement){
        wrapper.parentElement.insertBefore(nav, wrapper);
        wrapper.remove();
      }
    });
  }
}
