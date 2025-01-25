import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class TopNavigation {
  static #navElem;
  static #scenesList;

  static init(){
    LogUtil.log("TopNavigation", [ ui, ui.nav.collapse ]);

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, (a, b, c) => { 
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [a, b, c]); 
      TopNavigation.placeNavButtons(); 
      // LogUtil.log("NAV render", [SettingsUtil.get(SETTINGS.sceneNavState.tag)]); 
      SettingsUtil.apply(SETTINGS.sceneNavState.tag); 
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, value) => {
      SettingsUtil.set(SETTINGS.sceneNavState.tag, value); 
      LogUtil.log("NAV toggle", [nav, value]); 
    }); 
    // SettingsUtil.apply(SETTINGS.sceneNavState.tag); 
    
  } 

  static placeNavButtons(){ 
    this.#navElem = document.querySelector("#navigation"); 
    this.#scenesList = document.querySelector("#scene-list"); 
    // btnLast.classList.add("ui-nav-left"); 

    const btnLast = document.createElement("button"); 
    btnLast.classList.add("crlngn"); 
    btnLast.classList.add("ui-nav-left"); 
    const arrowLeft = document.createElement("i"); 
    arrowLeft.classList.add("fa"); 
    arrowLeft.classList.add("fa-chevron-left"); 
    btnLast.addEventListener("click", this.#onNavLast);
    btnLast.append(arrowLeft); 

    const btnNext = document.createElement("button"); 
    btnNext.classList.add("crlngn"); 
    btnNext.classList.add("ui-nav-right"); 
    const arrowRight = document.createElement("i"); 
    arrowRight.classList.add("fa"); 
    arrowRight.classList.add("fa-chevron-right"); 
    btnNext.append(arrowRight); 
    btnNext.addEventListener("click", this.#onNavNext);
    // navElem.append(btnLast); 
    // navElem.append(btnNext); 

    // this.#navElem.insertBefore(btnLast, this.#scenesList);
    this.#navElem.appendChild(btnLast);
    this.#navElem.appendChild(btnNext);
  }

  static #onNavLast = (e) => {
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const itemWidth = firstElem.offsetWidth;
    const itemsPerPage = Math.floor(this.#scenesList?.offsetWidth/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    LogUtil.log("onNavLast", [firstElem.style.marginLeft]);

    if(currScrollPos < 0){
      const newMargin = Number(currScrollPos + (itemWidth*itemsPerPage));
      firstElem.style.marginLeft = (newMargin < 0 ? newMargin : 0) + 'px';
    }
    
    LogUtil.log("onNavLast", [itemsPerPage, itemWidth, currScrollPos, firstElem.style.marginLeft]);
  }

  static #onNavNext = (e) => {
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const itemWidth = firstElem.offsetWidth;
    const itemsPerPage = Math.floor(this.#scenesList?.offsetWidth/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    LogUtil.log("onNavNext", [firstElem.style.marginLeft, currScrollPos]);

    if(this.#scenesList?.scrollWidth + currScrollPos > this.#scenesList?.offsetWidth ){
      const newMargin = Number(currScrollPos - (itemWidth*itemsPerPage));
      const minMargin = -(this.#scenesList?.offsetWidth - itemWidth);
      firstElem.style.marginLeft = (newMargin > minMargin ? newMargin : minMargin) + 'px';
    }
    
    LogUtil.log("onNavNext", [itemsPerPage, itemWidth, currScrollPos, firstElem.style.marginLeft, this.#scenesList?.offsetWidth]);
  }
}

