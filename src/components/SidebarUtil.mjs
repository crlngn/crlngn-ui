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
  static showChatNotificationsOnTop = false;
  static #idleTimeout = null;
  static #arrowUpdateTimeout = null;

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

    // Update horizontal tabs arrows after width changes
    if(SidebarTabs.useHorizontalSidebarTabs){
      SidebarTabs.debouncedUpdateArrows();
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
      // Wait for sidebar width to be applied, then check for overflow
      SidebarTabs.debouncedUpdateArrows();
    } else {
      body?.classList.remove("crlngn-horiz-sidebar-tabs");
      SidebarTabs.removeHorizontalTabsArrows();
    }

    LogUtil.log("applyHorizontalSidebarTabs", [SidebarTabs.useHorizontalSidebarTabs]);
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

  static debouncedUpdateArrows = () => {
    // Clear existing timeout
    if(SidebarTabs.#arrowUpdateTimeout){
      clearTimeout(SidebarTabs.#arrowUpdateTimeout);
    }

    // Set new timeout
    SidebarTabs.#arrowUpdateTimeout = setTimeout(() => {
      SidebarTabs.updateHorizontalTabsArrows();
      SidebarTabs.#arrowUpdateTimeout = null;
    }, 100);
  }

  static updateHorizontalTabsArrows = () => {
    if(!SidebarTabs.useHorizontalSidebarTabs) return;

    const sidebarTabs = document.querySelector("#sidebar-tabs");
    const menu = sidebarTabs?.querySelector("menu");

    if(!sidebarTabs || !menu) return;

    // Check if content overflows
    const menuScrollWidth = menu.scrollWidth;
    const menuClientWidth = menu.clientWidth;
    const hasOverflow = menuScrollWidth > menuClientWidth;

    LogUtil.log("updateHorizontalTabsArrows", [{
      scrollWidth: menuScrollWidth,
      clientWidth: menuClientWidth,
      hasOverflow
    }]);

    if(hasOverflow){
      SidebarTabs.addHorizontalTabsArrows();
    } else {
      SidebarTabs.removeHorizontalTabsArrows();
    }
  }

  static addHorizontalTabsArrows = () => {
    const sidebarTabs = document.querySelector("#sidebar-tabs");
    if(!sidebarTabs) return;

    // Check if arrows already exist
    if(sidebarTabs.querySelector(".crlngn-tab-arrow")) return;

    const menu = sidebarTabs.querySelector("menu");
    if(!menu) return;

    // Create left arrow
    const leftArrow = document.createElement("button");
    leftArrow.className = "crlngn-tab-arrow crlngn-tab-arrow-left";
    leftArrow.innerHTML = '<i class="fas fa-caret-left"></i>';
    leftArrow.type = "button";
    leftArrow.addEventListener("click", () => {
      menu.scrollBy({ left: -100, behavior: "smooth" });
    });

    // Create right arrow
    const rightArrow = document.createElement("button");
    rightArrow.className = "crlngn-tab-arrow crlngn-tab-arrow-right";
    rightArrow.innerHTML = '<i class="fas fa-caret-right"></i>';
    rightArrow.type = "button";
    rightArrow.addEventListener("click", () => {
      menu.scrollBy({ left: 100, behavior: "smooth" });
    });

    // Insert arrows
    sidebarTabs.insertBefore(leftArrow, menu);
    menu.parentNode.insertBefore(rightArrow, menu.nextSibling);

    LogUtil.log("addHorizontalTabsArrows", "Arrows added");
  }

  static removeHorizontalTabsArrows = () => {
    const arrows = document.querySelectorAll(".crlngn-tab-arrow");
    arrows.forEach(arrow => arrow.remove());
    LogUtil.log("removeHorizontalTabsArrows", "Arrows removed");
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
  }

}