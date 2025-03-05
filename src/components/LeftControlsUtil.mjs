import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class LeftControls {
  static #navElem;
  static #leftControls;
  static #uiMiddle;
  static #uiLeft;
  static #resizeObserver;
  static #lastWidth;

  static init(){
    LogUtil.log("LeftControls - init", []);
    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, LeftControls.initSceneControls);

    LeftControls.initSceneControls()
  } 

  static resetLocalVars(){
    LeftControls.#navElem = document.querySelector("#ui-top #navigation"); 
    LeftControls.#leftControls = document.querySelector("#ui-left #controls"); 
    LeftControls.#uiMiddle = document.querySelector("#ui-middle"); 
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
      // for (const entry of entries) {
        // LogUtil.log('ResizeObserver', [{
        //   contentRectWidth: entry.contentRect.width,
        //   borderBoxSize: entry.borderBoxSize?.[0]?.inlineSize,
        //   offsetWidth: entry.target.offsetWidth,
        //   clientWidth: entry.target.clientWidth,
        //   boundingWidth: entry.target.getBoundingClientRect().width
        // }]);
        /*LeftControls.updateCSSVars();*/
        throttle(() => LeftControls.updateCSSVars(), 250);
      //}
    }, {
      box: 'border-box'
    });

    LeftControls.#resizeObserver.observe(LeftControls.#leftControls);
  
    LeftControls.updateCSSVars();
  }

  static updateCSSVars() {
    // LogUtil.log("updateCSSVars", [LeftControls.#leftControls]);
    if(!LeftControls.#leftControls){ return; }

    let leftOffset = Number(LeftControls.#uiLeft.offsetWidth); 
    let controlsWidth = Number(LeftControls.#leftControls.offsetWidth); 
    let controlsMarginLeft = -leftOffset + controlsWidth + 24;
    LogUtil.log("updateCSSVars", [controlsWidth, leftOffset]);

    if(!isNaN(controlsWidth) && !isNaN(leftOffset)){
      const root = document.querySelector("body.crlngn-ui");
      root?.style.setProperty('--ui-controls-margin-left', controlsMarginLeft + 'px');
    }
    LeftControls.#lastWidth = controlsWidth;
  }

  
}

