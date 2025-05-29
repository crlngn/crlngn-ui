import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class MacroHotbar {
  static useFadeOut = true;
  static customStylesEnabled = true;
  static macroStartCollapsed = false;
  static hidden = false;

  static init(){
    this.preloadTemplates();
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, MacroHotbar.onRender);
  }

  /**
   * Preloads the Handlebars templates used by MacroHotbar
   * @returns {Promise<boolean>} True when templates are successfully loaded
   */
  static preloadTemplates = async () => {
    try {
      const templatePaths = [
        `modules/${MODULE_ID}/templates/macro-buttons.hbs`
      ];
      
      // Load the templates
      await loadTemplates(templatePaths);
      
      return true;
    } catch (error) {
      console.error("Error loading navigation button templates:", error);
      return false;
    }
  }

  static applyFadeOut(useFadeOut){
    MacroHotbar.useFadeOut = useFadeOut;
    MacroHotbar.handleFadeOut();
  }

  static applyHide(hidden){
    MacroHotbar.hidden = hidden;
    MacroHotbar.handleHide();
  }

  static handleHide(component, html, data){
    const element = html ? html : document.querySelector("#hotbar");

    if(MacroHotbar.hidden){
      element?.classList.add("hidden-ui");
    }else{
      element?.classList.remove("hidden-ui");
    }

    LogUtil.log("handle Hide", [MacroHotbar.hidden]);
  }

  static onRender(component, html, data){
    LogUtil.log("MacroHotbar onRender", [MacroHotbar.customStylesEnabled]);
    MacroHotbar.applyCustomStyle(MacroHotbar.customStylesEnabled);
    MacroHotbar.handleFadeOut(component, html, data);
    MacroHotbar.handleHide(component, html, data);
    MacroHotbar.addCollapseButton();
    MacroHotbar.applyHotBarCollapse();
  }

  static addCollapseButton = async() => {
    const macroControls = document.querySelector("#hotbar #hotbar-controls-right");
    if(!macroControls) return;

    // Render nav buttons template
    const isCollapsed = game.user.getFlag(MODULE_ID, "hotbarCollapsed");
    const buttonsHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/macro-buttons.hbs`, 
      {}
    );
    macroControls.insertAdjacentHTML('beforeend', buttonsHtml);

    const collapseBtn = macroControls.querySelector("button[data-action=collapse]");
    const directoryBtn = macroControls.querySelector("button[data-action=openDirectory]");

    collapseBtn?.addEventListener("click", MacroHotbar.handleCollapse);
    directoryBtn?.addEventListener("click", MacroHotbar.handleOpenDirectory);
  }

  static handleCollapse(evt){
    const isCollapsed = game.user.getFlag(MODULE_ID, "hotbarCollapsed");
    
    MacroHotbar.applyHotBarCollapse(!isCollapsed);
  }

  static handleOpenDirectory(evt){
    LogUtil.log("open directory");
  }

  static handleFadeOut(component, html, data){
    const element = html ? html : document.querySelector("#hotbar");

    if(MacroHotbar.useFadeOut){
      element?.classList.add("faded-ui");
    } else {
      element?.classList.remove("faded-ui");
    }
  }

  static applyCustomStyle(isEnabled){
    const SETTINGS = getSettings();
    MacroHotbar.customStylesEnabled = isEnabled !== undefined ? isEnabled : SettingsUtil.get(SETTINGS.enableMacroLayout.tag);
    LogUtil.log("applyCustomStyle", [MacroHotbar.customStylesEnabled]);
    MacroHotbar.applyHotBarLayout();
  }

  /**
   * Applies layout setting for the macro hotbar
   */
  static applyHotBarLayout(){
    const hotbar = document.querySelector("#hotbar");

    if(!hotbar){return;}

    if(MacroHotbar.customStylesEnabled){
      hotbar.classList.add("crlngn-macro");
    }else{
      hotbar.classList.remove("crlngn-macro");
    }
  }

  /**
   * Applies collapse state to the macro hotbar
   * Controls visibility and expansion state of the macro bar
   */
  static applyHotBarCollapse = async(isCollapsed) => {
    const SETTINGS = getSettings();
    MacroHotbar.macroStartCollapsed = isCollapsed!==undefined ? isCollapsed : SettingsUtil.get(SETTINGS.collapseMacroBar.tag);
    if(game.user){
      await game.user.setFlag(MODULE_ID, "hotbarCollapsed", MacroHotbar.macroStartCollapsed);
    }

    const macroControls = document.querySelector("#hotbar #hotbar-controls-right");
    const collapseBtn = macroControls?.querySelector("button[data-action=collapse]");
    const hotbar = document.querySelector("#hotbar");
    if(MacroHotbar.macroStartCollapsed && hotbar){
      hotbar.classList.add("collapsed");
      if(collapseBtn){
        collapseBtn.classList.remove("fa-angle-down");
        collapseBtn.classList.add("fa-angle-up");
        collapseBtn.dataset.tooltip = game.i18n.localize("CRLNGN_UI.ui.macroBarTooltipKeepOpen");
      }
    } else {
      hotbar?.classList.remove("collapsed");
      if(collapseBtn){
        collapseBtn.classList.add("fa-angle-down");
        collapseBtn.classList.remove("fa-angle-up");
        collapseBtn.dataset.tooltip = game.i18n.localize("CRLNGN_UI.ui.macroBarTooltipAutoHide");
      }
    }
  }
}