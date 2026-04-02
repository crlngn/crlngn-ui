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
  static iconsOnSheetsEnabled = true;

  static init(){
    const SETTINGS = getSettings();
    LogUtil.log("SheetsUtil.init", []);

    SheetsUtil.themeStylesEnabled = SettingsUtil.get(SETTINGS.applyThemeToSheets.tag);
    SheetsUtil.horizontalSheetTabsEnabled = SettingsUtil.get(SETTINGS.useHorizontalSheetTabs.tag);
    SheetsUtil.iconsOnSheetsEnabled = SettingsUtil.get(SETTINGS.enableIconsOnSheets.tag);

    // PF2e / SF2e hooks (sf2e reuses PF2e sheet classes and hook names)
    Hooks.on(HOOKS_PF2E.RENDER_CHAR_SHEET_PF2E, SheetsUtil.#onRenderPF2eSheet);
    Hooks.on(HOOKS_PF2E.RENDER_NPC_SHEET_PF2E, SheetsUtil.#onRenderPF2eNpcSheet);
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, SheetsUtil.#onUpdateSettingPF2e);

    // Blade Runner hooks
    if(game.system.id === "blade-runner"){
      const brTweaksEnabled = SettingsUtil.get(SETTINGS.applyBladeRunnerTweaks.tag);
      if(brTweaksEnabled){
        document.body.classList.add("crlngn-br-ui");
        Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderBladeRunnerSheet);
      } else {
        document.body.classList.remove("crlngn-br-ui");
      }
      return;
    }

    // DnD5e and Daggerheart hooks
    if(game.system.id !== "dnd5e" && game.system.id !== "daggerheart"){ return; }

    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET_V2, SheetsUtil.#onRenderActorSheet);
    Hooks.on(HOOKS_CORE.RENDER_ACTOR_SHEET, SheetsUtil.#onRenderActorSheet);
    Hooks.on(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, SheetsUtil.#onRenderCompendiumBrowser);
    Hooks.on(HOOKS_CORE.RENDER_ADVANCEMENT_MANAGER, SheetsUtil.#onRenderAdvancementManager);
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, SheetsUtil.#onUpdateSetting);
  }

  static #onRenderPF2eSheet(actorSheet, html, data){
    if(game.system.id !== "pf2e" && game.system.id !== "sf2e"){ return; }
    const element = html instanceof HTMLElement ? html : html[0] || html;
    LogUtil.log(HOOKS_PF2E.RENDER_CHAR_SHEET_PF2E, [actorSheet, element, data]);

    SheetsUtil.adjustPF2eSheet(element);
    SheetsUtil.applyThemeToSheets(SheetsUtil.themeStylesEnabled);
  }

  static #onRenderPF2eNpcSheet(actorSheet, html, data){
    if(game.system.id !== "pf2e" && game.system.id !== "sf2e"){ return; }
    const element = html instanceof HTMLElement ? html : html[0] || html;
    LogUtil.log(HOOKS_PF2E.RENDER_NPC_SHEET_PF2E, [actorSheet, element, data]);

    SheetsUtil.adjustPF2eNpcSheet(element);
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
        // Use requestAnimationFrame to wait for DOM paint instead of arbitrary timeout
        requestAnimationFrame(() => {
          SheetsUtil.#addTabScrollButtons();
        });
      }

      // Add "Display in Chat" overlay and tooltip icons (only when theme styles and icons enabled)
      if(SheetsUtil.themeStylesEnabled && SheetsUtil.iconsOnSheetsEnabled){
        SheetsUtil.#addChatOverlays(html, actorSheet);

        // Convert item tooltips to click-to-show icons
        SheetsUtil.#convertItemTooltips(html);
      }
    }
  }

  static #onRenderCompendiumBrowser(app, html, data){
    LogUtil.log(HOOKS_CORE.RENDER_COMPENDIUM_BROWSER, [app, html, data]);

    if(SheetsUtil.horizontalSheetTabsEnabled){
      requestAnimationFrame(() => {
        SheetsUtil.#addTabScrollButtons();
      });
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
    if(game.system.id !== "pf2e" && game.system.id !== "sf2e"){ return; }
    const SETTINGS = getSettings();
    if(setting.key === `crlngn-ui.${SETTINGS.applyThemeToSheets.tag}`){
      LogUtil.log(HOOKS_CORE.UPDATE_SETTING, ["applyThemeToSheets changed", value]);
      SheetsUtil.themeStylesEnabled = value;
      SheetsUtil.applyThemeToSheets(value);

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

      // Remove tabs-left/tabs-right so dnd5e _updatePosition doesn't
      // use the now-horizontal nav's offsetWidth as side overhang
      if(nav.classList.contains("tabs-right")){
        nav.classList.remove("tabs-right");
        nav.dataset.crlngnOrigTabSide = "tabs-right";
      } else if(nav.classList.contains("tabs-left")){
        nav.classList.remove("tabs-left");
        nav.dataset.crlngnOrigTabSide = "tabs-left";
      }

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

      // Initial check - use double rAF to ensure layout is computed
      requestAnimationFrame(() => {
        requestAnimationFrame(updateButtonVisibility);
      });

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
        // Restore original tabs-left/tabs-right class
        if(nav.dataset.crlngnOrigTabSide){
          nav.classList.add(nav.dataset.crlngnOrigTabSide);
          delete nav.dataset.crlngnOrigTabSide;
        }
        wrapper.parentElement.insertBefore(nav, wrapper);
        wrapper.remove();
      }
    });
  }

  /**
   * Adds "Display in Chat" overlay icons to item images on D&D 5e actor sheets
   * All tab content is rendered at once, so we just need to add overlays once
   * @param {HTMLElement} html - The sheet HTML element
   * @param {ActorSheet} actorSheet - The actor sheet application
   */
  static #addChatOverlays(html, actorSheet){
    // Select the img.item-image elements, excluding effects (which don't have displayCard)
    const itemImages = html.querySelectorAll(".items-section .item:not(.effect) .item-row img.item-image");

    itemImages.forEach(img => {
      const parent = img.parentElement;
      // Skip if overlay already exists in the parent
      if(parent.querySelector(".crlngn-chat-overlay")) return;

      // Create a wrapper div to contain both img and overlay
      const wrapper = document.createElement("div");
      wrapper.className = "crlngn-chat-img-wrapper";

      // Insert wrapper before the image, then move image into wrapper
      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      const overlay = document.createElement("div");
      overlay.className = "crlngn-chat-overlay";
      overlay.innerHTML = '<i class="fa-solid fa-comment"></i>';
      overlay.setAttribute("data-tooltip", game.i18n.localize("DND5E.DisplayCard"));

      overlay.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        // Get the item UUID from the parent li.item element
        const itemLi = img.closest("li.item");
        const itemUuid = itemLi?.dataset?.uuid;

        if(itemUuid){
          const item = await fromUuid(itemUuid);
          if(item?.displayCard){
            item.displayCard();
          } else {
            LogUtil.log("SheetsUtil.#addChatOverlays", ["Item not found or displayCard not available", itemUuid]);
          }
        }
      });

      wrapper.appendChild(overlay);
    });
  }

  /**
   * Converts item hover tooltips to click-to-show scroll icons
   * Removes the automatic tooltip behavior and adds a scroll icon that shows the tooltip on click
   * @param {HTMLElement} html - The sheet HTML element
   */
  static #convertItemTooltips(html){
    // Find all item-name elements that have item-tooltip class (already-converted items won't match since the class is removed)
    const itemNames = html.querySelectorAll(".items-section .item .item-row .item-name.item-tooltip");

    itemNames.forEach(itemName => {
      // Store the tooltip data before removing it
      const tooltipContent = itemName.getAttribute("data-tooltip");
      const tooltipClass = itemName.getAttribute("data-tooltip-class");
      const tooltipDirection = itemName.getAttribute("data-tooltip-direction");
      const itemUuid = itemName.querySelector("section.loading")?.getAttribute("data-uuid");

      // Remove tooltip attributes and class from the item name
      itemName.classList.remove("item-tooltip");
      itemName.removeAttribute("data-tooltip");
      itemName.removeAttribute("data-tooltip-class");
      itemName.removeAttribute("data-tooltip-direction");

      // Create the scroll icon button
      const scrollBtn = document.createElement("a");
      scrollBtn.className = "crlngn-tooltip-btn item-tooltip";
      scrollBtn.innerHTML = '<i class="fa-solid fa-scroll"></i>';

      // Re-apply tooltip attributes to the scroll button
      if(tooltipContent) scrollBtn.setAttribute("data-tooltip", tooltipContent);
      if(tooltipClass) scrollBtn.setAttribute("data-tooltip-class", tooltipClass);
      if(tooltipDirection) scrollBtn.setAttribute("data-tooltip-direction", tooltipDirection);

      // Append scroll button to the end of item-name so it's always last
      itemName.appendChild(scrollBtn);
    });
  }

  /**
   * Adjusts PF2e character sheet layout
   * Moves the image container from sheet-body to be the first child of the sidebar
   * @param {HTMLElement} html - The sheet HTML element
   */
  static adjustPF2eSheet(html){
    const SETTINGS = getSettings();
    if(SettingsUtil.get(SETTINGS.disableUI.tag) || !SheetsUtil.themeStylesEnabled) return;

    const isImgMinimized = game.user?.getFlag(MODULE_ID, 'pf2eActorImgMinimized');
    const imageContainer = html.querySelector(".sheet-body .image-container");
    const actorImg = imageContainer.querySelector("img.actor-image");
    const sheetSidebar = html.querySelector("aside .sidebar");
    actorImg.setAttribute("data-tooltip", "Right-click to toggle minimize");
    actorImg.setAttribute("data-tooltip-delay", "2000");

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

  /**
   * Adjusts PF2e NPC sheet layout
   * Adds right-click minimize functionality to the actor image
   * @param {HTMLElement} html - The sheet HTML element
   */
  static #onRenderBladeRunnerSheet(actorSheet, html, data){
    if(game.system.id !== "blade-runner") return;
    const element = html instanceof HTMLElement ? html : html[0] || html;
    SheetsUtil.#addCapacityButtons(element, actorSheet);
    SheetsUtil.#addHeaderButtonTooltips(element);
    SheetsUtil.applyThemeToSheets(SheetsUtil.themeStylesEnabled);
  }

  /**
   * Adds data-tooltip to header buttons using their text content,
   * so text hidden by CSS overflow can still appear as a Foundry tooltip.
   * @param {HTMLElement} html - The sheet HTML element
   */
  static #addHeaderButtonTooltips(html){
    const header = html.closest(".window-app")?.querySelector(".window-header");
    if(!header) return;
    const buttons = header.querySelectorAll("a.header-button");
    buttons.forEach(btn => {
      if(btn.dataset.tooltip) return;
      const text = btn.textContent?.trim();
      if(text) btn.setAttribute("data-tooltip", text);
    });
  }

  static #addCapacityButtons(html, actorSheet){
    const capacityBoxes = html.querySelectorAll("a.capacity-boxes");

    capacityBoxes.forEach(boxes => {
      if(boxes.parentElement.querySelector(".crlngn-capacity-btn")) return;

      const field = boxes.dataset.field;
      const min = parseInt(boxes.dataset.min) || 0;
      const max = parseInt(boxes.dataset.max) || 0;

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "crlngn-capacity-btn crlngn-capacity-minus";
      minusBtn.innerHTML = '<i class="fas fa-minus"></i>';
      minusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const actor = actorSheet.actor || actorSheet.document;
        if(!actor || !field) return;
        const current = foundry.utils.getProperty(actor, field) ?? 0;
        if(current > min) actor.update({[field]: current - 1});
      });

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "crlngn-capacity-btn crlngn-capacity-plus";
      plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
      plusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const actor = actorSheet.actor || actorSheet.document;
        if(!actor || !field) return;
        const current = foundry.utils.getProperty(actor, field) ?? 0;
        if(current < max) actor.update({[field]: current + 1});
      });

      boxes.parentElement.insertBefore(minusBtn, boxes);
      boxes.after(plusBtn);
    });
  }

  static adjustPF2eNpcSheet(html){
    LogUtil.log("adjustPF2eNpcSheet", []);
    if(!SheetsUtil.themeStylesEnabled) return;

    const isImgMinimized = game.user?.getFlag(MODULE_ID, 'pf2eNpcImgMinimized');
    const imageContainer = html.querySelector(".sidebar .image-container");
    if(!imageContainer) return;

    // NPC sheets use img.profile-img instead of img.actor-image
    const actorImg = imageContainer.querySelector("img.profile-img") || imageContainer.querySelector("img.actor-image");
    if(!actorImg) return;

    actorImg.setAttribute("data-tooltip", "Right-click to toggle minimize");
    actorImg.setAttribute("data-tooltip-delay", "2000");

    if(isImgMinimized){
      actorImg.classList.add('minimized');
    }

    actorImg.addEventListener('mousedown', function(event) {
      if (event.button === 2) {
        game.user?.setFlag(MODULE_ID, 'pf2eNpcImgMinimized', !actorImg.classList.contains('minimized'));
        actorImg.classList.toggle('minimized');
      }
    });
  }
}
