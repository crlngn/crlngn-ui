import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

/**
 * Manages the left controls panel UI and its responsive behavior
 */
export class LeftControls {
  /** @type {HTMLElement} @private @static */
  static #leftControls;
  /** @type {HTMLElement} @private @static */
  static #uiLeft;
  /** @type {ResizeObserver} @private @static */
  static #resizeObserver;
  static useFadeOut = true;
  static hidden = false;
  static customStylesEnabled = true;

  /**
   * Initializes the left controls functionality and sets up event hooks
   * @static
   */
  static init(){
    LogUtil.log("LeftControls - init", []);
    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, LeftControls.initSceneControls);
    Hooks.on(HOOKS_CORE.ACTIVATE_SCENE_CONTROLS, LeftControls.onActivateSceneControls);
    window.addEventListener("resize", LeftControls.onActivateSceneControls)
    LeftControls.initSceneControls()
  } 

  static applyFadeOut(useFadeOut){
    LeftControls.useFadeOut = useFadeOut;
    LogUtil.log("applyFadeOut", [useFadeOut]);
    LeftControls.handleFadeOut();
  }

  static applyHide(hidden){
    LeftControls.hidden = hidden;
    LeftControls.handleHide();
  }

  static handleHide(component, html, data){
    const element = html ? html : document.querySelector("#scene-controls");

    if(LeftControls.hidden){
      element?.classList.add("hidden-ui");
    }else{
      element?.classList.remove("hidden-ui");
    }

    LogUtil.log("handle Hide", [LeftControls.hidden]);
  }

  static handleFadeOut(component, html, data){
    const element = html ? html : document.querySelector("#scene-controls");
    const touchVttBtn = document.querySelector("#touch-vtt-controls");

    if(LeftControls.useFadeOut){
      element?.classList.add("faded-ui");
      touchVttBtn?.classList.add("faded-ui");
    }else{
      element?.classList.remove("faded-ui");
      touchVttBtn?.classList.remove("faded-ui");
    }

    LogUtil.log("handle FadeOut", [LeftControls.customStylesEnabled, LeftControls.useFadeOut]);
  }

  static applyCustomStyle(enabled){
    LeftControls.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [LeftControls.customStylesEnabled, ui.controls]);
    ui.controls?.render();
  }

  /**
     * Preloads the Handlebars templates used by this component
     * @returns {Promise<boolean>} True when templates are successfully loaded
     */
    static preloadTemplates = async () => {
      try {
        const templatePaths = [
          `modules/${MODULE_ID}/templates/chat-toggle-button.hbs`
        ];
        
        // Load the templates
        await GeneralUtil.loadTemplates(templatePaths);
        
        return true;
      } catch (error) {
        LogUtil.log("Error loading navigation button templates:", [error]);
        return false;
      }
    }

  /**
   * Resets and updates the local DOM element references
   * @static
   * @private
   */
  static resetLocalVars(){
    LeftControls.#leftControls = document.querySelector("#ui-left #controls"); 
    LeftControls.#uiLeft = document.querySelector("#ui-left"); 
  }

  /**
   * Initializes the scene controls by resetting variables and setting up width observation
   * @static
   */
  static initSceneControls(component, html, data){
    LogUtil.log("initSceneControls", [])
    LeftControls.resetLocalVars();
    const ui = document.querySelector("#interface");
    if(LeftControls.customStylesEnabled){
      ui?.classList.add("crlngn-controls");
    }else{
      ui?.classList.remove("crlngn-controls");
    }
    LeftControls.handleFadeOut(component, html, data);
    LeftControls.handleHide(component, html, data);
  }


  /**
   * Sets up a ResizeObserver to monitor changes in the controls width
   * Implements throttling to limit update frequency
   * @static
   * @private
   */
  static observeControlsWidth(){
    LogUtil.log("observeControlsWidth", []);
    if(!LeftControls.#leftControls){ return; }
  
    let timeout;
    const throttle = (callback, limit) => {
      if (!timeout) {
        timeout = setTimeout(() => {
          callback();
          timeout = null;
        }, limit);
      }
    };
  
    LeftControls.#resizeObserver = new ResizeObserver(entries => {
      throttle(() => LeftControls.updateCSSVars(), 250);
    });

    LeftControls.#resizeObserver.observe(LeftControls.#leftControls, {
      box: 'border-box'
    });
    LeftControls.updateCSSVars();
  }

  /**
   * Updates CSS variables based on current control panel dimensions
   * @static
   * @private
   */
  static updateCSSVars() {
    if(!LeftControls.#leftControls){ return; }

    let leftOffset = parseInt(LeftControls.#uiLeft.offsetWidth); 
    let controlsWidth = parseInt(LeftControls.#leftControls.offsetWidth); 
    let controlsMarginLeft = -leftOffset + controlsWidth;
    LogUtil.log("updateCSSVars", [controlsWidth, leftOffset]);

    if(!isNaN(controlsWidth) && !isNaN(leftOffset)){
      GeneralUtil.addCSSVars('--ui-controls-margin-left', controlsMarginLeft + 'px');
    }
  }

  static onActivateSceneControls(nav, buttons) {
    const mainButtons = document.querySelectorAll("#scene-controls-layers .ui-control");
    const secondaryButtons = document.querySelectorAll("#scene-controls-tools .ui-control");
    const columns = getComputedStyle(document.querySelector("#ui-left")).getPropertyValue("--control-columns");
    if(secondaryButtons.length >= mainButtons.length){
      document.querySelector("#scene-controls").classList.add("more-tools");
      if(Number(columns) > 2){
        document.querySelector("#scene-controls").classList.add("extra-columns");
      }else{
        document.querySelector("#scene-controls").classList.remove("extra-columns");
      }
    }else{
      document.querySelector("#scene-controls").classList.remove("more-tools");
      document.querySelector("#scene-controls").classList.remove("extra-columns");
    }
    LogUtil.log("onActivateSceneControls", [columns, secondaryButtons.length, mainButtons.length]);
  }
}
