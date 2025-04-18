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
        await loadTemplates(templatePaths);
        
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
  static initSceneControls(){
    LogUtil.log("initSceneControls", [])
    LeftControls.resetLocalVars();
    LeftControls.observeControlsWidth();
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
