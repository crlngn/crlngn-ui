import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE, HOOKS_DND5E, HOOKS_PF2E } from "../constants/Hooks.mjs";
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

    SheetsUtil.themeStylesEnabled = SettingsUtil.get(SETTINGS.applyThemeToSheets.tag);
    SheetsUtil.horizontalSheetTabsEnabled = SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag);

    // PF2e-specific hooks
    Hooks.on(HOOKS_PF2E.RENDER_CHAR_SHEET_PF2E, SheetsUtil.#onRenderPF2eSheet);
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, SheetsUtil.#onUpdateSettingPF2e);

    // DnD5e and Daggerheart hooks
    if(game.system.id !== "dnd5e" && game.system.id !== "daggerheart"){ return; }

    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET_V2, SheetsUtil.#onRenderActorSheet);
    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderActorSheet);
    Hooks.on(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, SheetsUtil.#onRenderCompendiumBrowser);
    Hooks.on(HOOKS_CORE.RENDER_ADVANCEMENT_MANAGER, SheetsUtil.#onRenderAdvancementManager);
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, SheetsUtil.#onUpdateSetting);
  }

  static #onRenderPF2eSheet(actorSheet, html, data){
    if(game.system.id !== "pf2e"){ return; }
    const element = html instanceof HTMLElement ? html : html[0] || html;
    LogUtil.log(HOOKS_PF2E.RENDER_CHAR_SHEET_PF2E, [actorSheet, element, data]);

    SheetsUtil.adjustPF2eSheet(element);
    SheetsUtil.applyThemeToSheets(SheetsUtil.themeStylesEnabled);
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
    if(game.system.id==="dnd5e"){
      SheetsUtil.applyHorizontalSheetTabs(SheetsUtil.horizontalSheetTabsEnabled);
      
      if(SheetsUtil.horizontalSheetTabsEnabled){
        setTimeout(() => {
          SheetsUtil.#addTabScrollButtons();
        }, 100);
      }
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

  static #onUpdateSettingPF2e(setting, value, options, userId){
    if(game.system.id !== "pf2e"){ return; }
    const SETTINGS = getSettings();
    // When applyThemeToSheets setting changes, re-render open PF2e actor sheets
    if(setting.key === `crlngn-ui.${SETTINGS.applyThemeToSheets.tag}`){
      LogUtil.log(HOOKS_CORE.UPDATE_SETTING, ["applyThemeToSheets changed", value]);
      SheetsUtil.themeStylesEnabled = value;
      SheetsUtil.applyThemeToSheets(value);

      // Re-render all open actor sheets
      Object.values(ui.windows).forEach(app => {
        if(app.constructor.name === "CharacterSheetPF2e" ||
           app.constructor.name === "NPCSheetPF2e" ||
           app.constructor.name === "FamiliarSheetPF2e" ||
           app.constructor.name === "LootSheetPF2e" ||
           app.constructor.name === "VehicleSheetPF2e" ||
           app.constructor.name === "PartySheetPF2e"){
          app.render(false);
        }
      });
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

  /**
   * Adjusts PF2e character sheet layout
   * Moves the image container from sheet-body to be the first child of the sidebar
   * @param {HTMLElement} html - The sheet HTML element
   */
  static adjustPF2eSheet(html){
    LogUtil.log("adjustPF2eSheet", []);
    if(!SheetsUtil.themeStylesEnabled) return;

    const isImgMinimized = game.user?.getFlag(MODULE_ID, 'pf2eActorImgMinimized');
    const imageContainer = html.querySelector(".sheet-body .image-container");
    const actorImg = imageContainer.querySelector("img.actor-image");
    const sheetSidebar = html.querySelector("aside .sidebar");
    actorImg.setAttribute("data-tooltip", "Right-click to toggle minimize")

    if(imageContainer && sheetSidebar){
      sheetSidebar.insertBefore(imageContainer, sheetSidebar.firstChild);
      LogUtil.log("adjustPF2eSheet", ["Moved image-container to sidebar"]);
    }
    if(isImgMinimized){
      actorImg.classList.add('minimized');
    }

    actorImg.addEventListener('mousedown', function(event) {
      // event.stopPropagation();
      if (event.button === 2) {
        game.user?.setFlag(MODULE_ID, 'pf2eActorImgMinimized', !actorImg.classList.contains('minimized'));
        actorImg.classList.toggle('minimized');
      }
    });

  }
}
