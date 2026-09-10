import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class SidebarTabs {
  static useFadeOut = true;
  static hidden = false;
  static customStylesEnabled = true;
  static folderStylesEnabled = true;
  static openChatLogOnLoad = false;
  static closeSidebarWhenIdle = false;
  static useHorizontalSidebarTabs = false;
  static useHorizontalTabsSingleRow = true;
  static showChatNotificationsOnTop = false;
  static #idleTimeout = null;
  static #overflowUpdateTimeout = null;
  static #tabsAtEnd = false;
  static #followActiveTab = true;
  static #menuResizeObserver = null;
  static #observedMenu = null;

  static init(){
    const SETTINGS = getSettings();
    SidebarTabs.folderStylesEnabled = SettingsUtil.get(SETTINGS.useFolderStyle.tag) ?? true;
    SidebarTabs.useHorizontalSidebarTabs = SettingsUtil.get(SETTINGS.useHorizontalSidebarTabs.tag) ?? false;
    SidebarTabs.useHorizontalTabsSingleRow = SettingsUtil.get(SETTINGS.horizontalTabsSingleRow.tag) ?? true;
    SidebarTabs.showChatNotificationsOnTop = SettingsUtil.get(SETTINGS.showChatNotificationsOnTop.tag) ?? false;
    Hooks.on(HOOKS_CORE.RENDER_SIDE_BAR, SidebarTabs.onRender);
    Hooks.on(HOOKS_CORE.CHANGE_SIDEBAR_TAB, SidebarTabs.onChangeTab);
    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, SidebarTabs.onCollapseSidebar);
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
    SidebarTabs.applyHiddenTabs();

    // Reapply horizontal tabs if enabled
    if(SidebarTabs.useHorizontalSidebarTabs){
      SidebarTabs.applyHorizontalSidebarTabs(SidebarTabs.useHorizontalSidebarTabs);
    }

    // Reapply chat notifications on top if enabled
    if(SidebarTabs.showChatNotificationsOnTop){
      SidebarTabs.applyShowChatNotificationsOnTop(SidebarTabs.showChatNotificationsOnTop);
    }


    LogUtil.log("SidebarTabs onRender", [foundry.applications?.sidebar?.tabs]);
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

  static applySideBarWidth = () => {
    const SETTINGS = getSettings();
    const currWidth = SettingsUtil.get(SETTINGS.sideBarWidth.tag) || 300;
    GeneralUtil.addCSSVars("--sidebar-width", `${currWidth}px`);

    if(SidebarTabs.useHorizontalSidebarTabs){
      SidebarTabs.debouncedUpdateOverflow();
    }
  }

  static onReady = () => {
    const SETTINGS = getSettings();
    SidebarTabs.openChatLogOnLoad = SettingsUtil.get(SETTINGS.openChatLogOnLoad.tag);
    SidebarTabs.closeSidebarWhenIdle = SettingsUtil.get(SETTINGS.closeSidebarWhenIdle.tag);

    // Open chat log on load if setting is enabled
    if(SidebarTabs.openChatLogOnLoad){
      setTimeout(() => {
        if(ui.sidebar && !ui.sidebar.expanded){
          ui.sidebar.expand();
        }
      }, 2000);
    }

    // Set up mouseout handler if closeSidebarWhenIdle is enabled
    if(SidebarTabs.closeSidebarWhenIdle){
      SidebarTabs.setupIdleClose();
    }
  }

  static applyOpenChatLogOnLoad = (enabled) => {
    SidebarTabs.openChatLogOnLoad = enabled;
    LogUtil.log("applyOpenChatLogOnLoad", [SidebarTabs.openChatLogOnLoad]);
  }

  static applyCloseSidebarWhenIdle = (enabled) => {
    SidebarTabs.closeSidebarWhenIdle = enabled;
    if(enabled){
      SidebarTabs.setupIdleClose();
    } else {
      SidebarTabs.removeIdleClose();
    }
    LogUtil.log("applyCloseSidebarWhenIdle", [SidebarTabs.closeSidebarWhenIdle]);
  }

  static setupIdleClose = () => {
    const sidebar = document.querySelector("#sidebar");
    if(!sidebar) return;

    // Remove any existing listener first
    SidebarTabs.removeIdleClose();

    // Add mouseout and mouseenter event listeners
    sidebar.addEventListener("mouseout", SidebarTabs.handleMouseOut);
    sidebar.addEventListener("mouseenter", SidebarTabs.handleMouseEnter);
  }

  static removeIdleClose = () => {
    const sidebar = document.querySelector("#sidebar");
    if(!sidebar) return;

    sidebar.removeEventListener("mouseout", SidebarTabs.handleMouseOut);
    sidebar.removeEventListener("mouseenter", SidebarTabs.handleMouseEnter);

    // Clear any pending timeout
    if(SidebarTabs.#idleTimeout){
      clearTimeout(SidebarTabs.#idleTimeout);
      SidebarTabs.#idleTimeout = null;
    }
  }

  static handleMouseEnter = () => {
    // Clear the timeout when mouse enters sidebar again
    if(SidebarTabs.#idleTimeout){
      clearTimeout(SidebarTabs.#idleTimeout);
      SidebarTabs.#idleTimeout = null;
    }
  }

  static handleMouseOut = (event) => {
    // Only trigger if mouse left the sidebar completely
    if(!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)){
      // Clear any existing timeout
      if(SidebarTabs.#idleTimeout){
        clearTimeout(SidebarTabs.#idleTimeout);
      }

      // Set new timeout to collapse sidebar after 3 seconds
      SidebarTabs.#idleTimeout = setTimeout(() => {
        if(ui.sidebar && ui.sidebar.expanded){
          ui.sidebar.collapse();
        }
        SidebarTabs.#idleTimeout = null;
      }, 3000);
    }
  }

  static applyHorizontalSidebarTabs = (enabled) => {
    SidebarTabs.useHorizontalSidebarTabs = enabled;
    const body = document.querySelector("body.crlngn-ui");

    if(enabled){
      body?.classList.add("crlngn-horiz-sidebar-tabs");
      SidebarTabs.debouncedUpdateOverflow();
    } else {
      body?.classList.remove("crlngn-horiz-sidebar-tabs");
      SidebarTabs.removeOverflowControls();
    }
    SidebarTabs.updateTabsTooltipDirection();

    LogUtil.log("applyHorizontalSidebarTabs", [SidebarTabs.useHorizontalSidebarTabs]);
  }

  /**
   * Points sidebar tab tooltips downward while the tabs are laid out horizontally,
   * and restores Foundry's default left direction otherwise
   */
  static updateTabsTooltipDirection = () => {
    const nav = document.querySelector("#sidebar-tabs");
    if(!nav) return;
    const horizontal = SidebarTabs.useHorizontalSidebarTabs
      && document.body.classList.contains("crlngn-sidebar-expanded");
    nav.dataset.tooltipDirection = horizontal ? "DOWN" : "LEFT";
  }

  /**
   * Toggles single-row mode for horizontal sidebar tabs.
   * When enabled, tabs that do not fit in one row are paged behind overflow buttons
   * @param {boolean} enabled
   */
  static applyHorizontalTabsSingleRow = (enabled) => {
    SidebarTabs.useHorizontalTabsSingleRow = enabled !== false;
    const body = document.querySelector("body.crlngn-ui");

    if(SidebarTabs.useHorizontalTabsSingleRow){
      body?.classList.add("crlngn-sidebar-tabs-single-row");
      SidebarTabs.debouncedUpdateOverflow();
    } else {
      body?.classList.remove("crlngn-sidebar-tabs-single-row");
      SidebarTabs.removeOverflowControls();
    }

    LogUtil.log("applyHorizontalTabsSingleRow", [SidebarTabs.useHorizontalTabsSingleRow]);
  }

  static applyShowChatNotificationsOnTop = (enabled) => {
    SidebarTabs.showChatNotificationsOnTop = enabled;
    const chatNotifications = document.querySelector("#chat-notifications");

    if(enabled){
      chatNotifications?.classList.add("messages-on-top");
    } else {
      chatNotifications?.classList.remove("messages-on-top");
    }

    LogUtil.log("applyShowChatNotificationsOnTop", [SidebarTabs.showChatNotificationsOnTop]);
  }

  /**
   * Re-evaluates tab paging when a sidebar tab becomes active,
   * so the active tab is always on the visible page
   */
  static onChangeTab = () => {
    SidebarTabs.#followActiveTab = true;
    SidebarTabs.debouncedUpdateOverflow();
  }

  /**
   * Re-evaluates tab paging after the sidebar expands or collapses
   */
  static onCollapseSidebar = () => {
    setTimeout(SidebarTabs.updateTabsTooltipDirection, 0);
    SidebarTabs.debouncedUpdateOverflow();
  }

  static debouncedUpdateOverflow = () => {
    if(SidebarTabs.#overflowUpdateTimeout){
      clearTimeout(SidebarTabs.#overflowUpdateTimeout);
    }

    SidebarTabs.#overflowUpdateTimeout = setTimeout(() => {
      SidebarTabs.updateHorizontalTabsOverflow();
      SidebarTabs.#overflowUpdateTimeout = null;
    }, 100);
  }

  /**
   * Whether single-row paging of horizontal tabs is currently in effect
   * @returns {boolean}
   */
  static isSingleRowActive = () => {
    return SidebarTabs.useHorizontalSidebarTabs
      && SidebarTabs.useHorizontalTabsSingleRow
      && document.body.classList.contains("crlngn-sidebar-expanded");
  }

  /**
   * Returns the tab items that take part in paging (excludes collapse button, overflow buttons and hidden tabs)
   * @param {HTMLElement} menu
   * @returns {HTMLElement[]}
   */
  static getPageableTabItems = (menu) => {
    return Array.from(menu.querySelectorAll(":scope > li")).filter(li =>
      !li.classList.contains("crlngn-tab-overflow")
      && !li.classList.contains("crlngn-hidden-tab")
      && !li.querySelector("button.collapse, [data-action='toggleState']")
    );
  }

  /**
   * Keeps horizontal tabs in a single row. When they do not all fit, the row shows either
   * the first tabs that fit (with an overflow button on the right) or the last tabs that fit
   * (with an overflow button on the left) - like scrolling, but with only the two end positions
   */
  static updateHorizontalTabsOverflow = () => {
    const menu = document.querySelector("#sidebar-tabs > menu");
    if(!menu) return;

    if(!SidebarTabs.isSingleRowActive()){
      SidebarTabs.removeOverflowControls(menu);
      return;
    }

    SidebarTabs.observeMenu(menu);

    const items = SidebarTabs.getPageableTabItems(menu);
    const style = getComputedStyle(menu);
    const slotWidth = parseFloat(style.getPropertyValue("--crlngn-htab-min")) || 26;
    const innerWidth = menu.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const capacity = Math.max(3, Math.floor(innerWidth / slotWidth));
    const total = items.length;

    if(total <= capacity - 1){
      items.forEach(li => li.classList.remove("crlngn-tab-paged-out"));
      SidebarTabs.removeOverflowControls(menu);
      return;
    }

    const visibleCount = capacity - 2;
    const activeIndex = items.findIndex(li => li.querySelector("[aria-pressed='true']"));
    if(SidebarTabs.#followActiveTab && activeIndex >= 0){
      if(activeIndex >= visibleCount){ SidebarTabs.#tabsAtEnd = true; }
      else if(activeIndex < total - visibleCount){ SidebarTabs.#tabsAtEnd = false; }
    }
    SidebarTabs.#followActiveTab = false;

    const atEnd = SidebarTabs.#tabsAtEnd;
    const start = atEnd ? total - visibleCount : 0;
    const end = start + visibleCount;
    let hiddenPip = false;

    items.forEach((li, i) => {
      const visible = i >= start && i < end;
      li.classList.toggle("crlngn-tab-paged-out", !visible);
      if(!visible && li.querySelector(".notification-pip.active")){
        hiddenPip = true;
      }
    });

    SidebarTabs.setOverflowControl(menu, "left", atEnd, hiddenPip);
    SidebarTabs.setOverflowControl(menu, "right", !atEnd, hiddenPip);

    LogUtil.log("updateHorizontalTabsOverflow", [{ capacity, total, visibleCount, atEnd }]);
  }

  /**
   * Creates, updates or removes the overflow button on one side of the tab row
   * @param {HTMLElement} menu
   * @param {"left"|"right"} side
   * @param {boolean} show
   * @param {boolean} hasPip - whether any hidden tab has an active notification pip
   */
  static setOverflowControl = (menu, side, show, hasPip) => {
    let li = menu.querySelector(`li.crlngn-tab-overflow-${side}`);

    if(!show){
      li?.remove();
      return;
    }

    if(!li){
      li = document.createElement("li");
      li.className = `crlngn-tab-overflow crlngn-tab-overflow-${side}`;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "ui-control plain icon fa-solid fa-ellipsis";
      button.setAttribute("aria-label", game.i18n.localize("CRLNGN_UI.ui.moreSidebarTabs"));
      button.dataset.tooltip = "";
      button.addEventListener("click", () => SidebarTabs.setTabsAtEnd(side === "right"));

      const pip = document.createElement("div");
      pip.className = "notification-pip";

      li.append(button, pip);
      menu.append(li);
    }

    li.querySelector(".notification-pip")?.classList.toggle("active", hasPip);
  }

  /**
   * Scrolls the single-row tabs all the way to the end or back to the start
   * @param {boolean} atEnd
   */
  static setTabsAtEnd = (atEnd) => {
    SidebarTabs.#tabsAtEnd = atEnd;
    SidebarTabs.#followActiveTab = false;
    SidebarTabs.updateHorizontalTabsOverflow();
  }

  /**
   * Removes overflow buttons and restores all tabs to visible
   * @param {HTMLElement} [menu]
   */
  static removeOverflowControls = (menu) => {
    menu = menu || document.querySelector("#sidebar-tabs > menu");
    if(!menu) return;
    menu.querySelectorAll("li.crlngn-tab-overflow").forEach(li => li.remove());
    menu.querySelectorAll("li.crlngn-tab-paged-out").forEach(li => li.classList.remove("crlngn-tab-paged-out"));
    SidebarTabs.#tabsAtEnd = false;
  }

  /**
   * Watches the tab menu for size changes (sidebar width, UI scale) and re-pages the tabs
   * @param {HTMLElement} menu
   */
  static observeMenu = (menu) => {
    if(SidebarTabs.#observedMenu === menu) return;
    if(typeof ResizeObserver === "undefined") return;

    SidebarTabs.#menuResizeObserver?.disconnect();
    SidebarTabs.#menuResizeObserver = new ResizeObserver(() => SidebarTabs.debouncedUpdateOverflow());
    SidebarTabs.#menuResizeObserver.observe(menu);
    SidebarTabs.#observedMenu = menu;
  }

  /**
   * Applies hidden tab settings based on user role (GM vs player)
   * Hides sidebar tab icons according to the hiddenSidebarTabs setting
   * Also applies custom tab order if configured
   */
  static applyHiddenTabs = () => {
    const SETTINGS = getSettings();
    const hiddenTabs = SettingsUtil.get(SETTINGS.hiddenSidebarTabs?.tag) || [];
    const isGM = game.user?.isGM;

    // Get the sidebar tabs container
    const sidebarTabs = document.querySelector("#sidebar-tabs menu");
    if (!sidebarTabs) return;

    // Get all li elements (tab containers) and reset hidden class
    const allTabItems = sidebarTabs.querySelectorAll("li");
    allTabItems.forEach(li => {
      li.classList.remove("crlngn-hidden-tab");
    });

    // Separate collapse button from regular tabs
    const collapseItem = sidebarTabs.querySelector("li:has(button.collapse), li:has([data-action='toggleState'])");
    const regularTabItems = Array.from(allTabItems).filter(li =>
      !li.querySelector("button.collapse") && !li.querySelector("[data-action='toggleState']")
    );

    // Apply custom tab order if we have saved settings
    if (hiddenTabs.length > 0) {
      const savedOrder = hiddenTabs.map(t => t.tabId);

      // Sort regular tabs by saved order
      regularTabItems.sort((a, b) => {
        const aTab = a.querySelector("[data-tab]");
        const bTab = b.querySelector("[data-tab]");
        const aIndex = aTab ? savedOrder.indexOf(aTab.dataset.tab) : -1;
        const bIndex = bTab ? savedOrder.indexOf(bTab.dataset.tab) : -1;

        // If both are in saved order, use that order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        // If only a is in saved order, it comes first
        if (aIndex !== -1) return -1;
        // If only b is in saved order, it comes first
        if (bIndex !== -1) return 1;
        // Neither in saved order, maintain current order
        return 0;
      });
    }

    // Re-append regular tabs in the new order
    regularTabItems.forEach(li => {
      sidebarTabs.appendChild(li);
    });

    // Always ensure collapse button is at the end
    if (collapseItem) {
      sidebarTabs.appendChild(collapseItem);
    }

    // Then hide the appropriate tabs based on settings and user role
    hiddenTabs.forEach(tabSetting => {
      const shouldHide = (isGM && tabSetting.hideForGM) || (!isGM && tabSetting.hideForPlayer);

      if (shouldHide) {
        // Find the li containing the tab button and add hidden class to the li
        const tabButton = sidebarTabs.querySelector(`[data-tab="${tabSetting.tabId}"]`);
        const tabLi = tabButton?.closest("li");
        if (tabLi) {
          tabLi.classList.add("crlngn-hidden-tab");
        }
      }
    });

    LogUtil.log("applyHiddenTabs", [hiddenTabs, "isGM:", isGM]);
    SidebarTabs.debouncedUpdateOverflow();
  }

}