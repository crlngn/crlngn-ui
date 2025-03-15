import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class LeftControls {
  static #leftControls;
  static #uiLeft;
  static #resizeObserver;

  static init(){
    LogUtil.log("LeftControls - init", []);
    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, LeftControls.initSceneControls);

    LeftControls.initSceneControls()
  } 

  static resetLocalVars(){
    LeftControls.#leftControls = document.querySelector("#ui-left #controls"); 
    LeftControls.#uiLeft = document.querySelector("#ui-left"); 
  }

  static initSceneControls(){
    LogUtil.log("initSceneControls", [])
    LeftControls.resetLocalVars();
    LeftControls.observeControlsWidth();   
  }

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
    }, {
      box: 'border-box'
    });

    LeftControls.#resizeObserver.observe(LeftControls.#leftControls);
    LeftControls.updateCSSVars();
  }

  static updateCSSVars() {
    if(!LeftControls.#leftControls){ return; }

    let leftOffset = Number(LeftControls.#uiLeft.offsetWidth); 
    let controlsWidth = Number(LeftControls.#leftControls.offsetWidth); 
    let controlsMarginLeft = -leftOffset + controlsWidth + 24;
    LogUtil.log("updateCSSVars", [controlsWidth, leftOffset]);

    if(!isNaN(controlsWidth) && !isNaN(leftOffset)){
      GeneralUtil.addCSSVars('--ui-controls-margin-left', controlsMarginLeft + 'px');
    }
  }
}
