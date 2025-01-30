import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class TopNavigation {
  static #navElem;
  static #scenesList;
  static #navTimeout;

  static init(){

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, (a, b, c) => { 
      TopNavigation.addListeners()

      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ui.nav, SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)]); 
      TopNavigation.setNavPosition();
      TopNavigation.placeNavButtons(); 

      if(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)){ 
        ui.nav.collapse();
      }else{
        ui.nav.expand();
      }
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, value) => {
      SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, value); 
      LogUtil.log("NAV toggle", [nav, value]); 
    }); 

    Hooks.on(HOOKS_CORE.EXPAND_SCENE_NAV, (nav, value) => {
      SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, false); 
      LogUtil.log("NAV expand", [nav, false]); 
    }); 

    SettingsUtil.apply(SETTINGS.sceneNavCollapsed.tag); 
    
  } 

  static addListeners(){
    this.#navElem = document.querySelector("#navigation"); 
    this.#scenesList = document.querySelector("#scene-list"); 

    this.#navElem.addEventListener("mouseenter", ()=>{
      clearTimeout(this.#navTimeout);
      ui.nav.expand();
    });

    this.#navElem.addEventListener("mouseleave", (e)=>{
      if (!e) var e = window.event;
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();

      this.#navTimeout = setTimeout(()=>{
        clearTimeout(this.#navTimeout);
        this.#navTimeout = null;
        ui.nav.collapse();
      }, 700);
    });

  }

  static placeNavButtons(){ 

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

    this.#navElem.appendChild(btnLast);
    this.#navElem.appendChild(btnNext);
  }

  static #onNavLast = (e) => {
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const itemWidth = firstElem.offsetWidth;
    const itemsPerPage = Math.floor(this.#scenesList?.offsetWidth/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    let newPos = 0;

    if(currScrollPos < 0){
      const newMargin = Number(currScrollPos + (itemWidth*itemsPerPage));
      newPos = (newMargin < 0 ? newMargin : 0);
    }
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, newPos);
    TopNavigation.setNavPosition(newPos);
    
    LogUtil.log("onNavLast", [itemsPerPage, itemWidth, currScrollPos, newPos]);
  }

  static #onNavNext = (e) => {
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const itemWidth = firstElem.offsetWidth;
    const itemsPerPage = Math.floor(this.#scenesList?.offsetWidth/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    let newPos = 0;
    LogUtil.log("onNavNext", [firstElem.style.marginLeft, currScrollPos]);

    if(this.#scenesList?.scrollWidth + currScrollPos > this.#scenesList?.offsetWidth ){
      const newMargin = Number(currScrollPos - (itemWidth*itemsPerPage));
      const minMargin = -(this.#scenesList?.offsetWidth - itemWidth);
      newPos = (newMargin > minMargin ? newMargin : minMargin);
    }
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, newPos);
    TopNavigation.setNavPosition(newPos);
    
    LogUtil.log("onNavNext", [itemsPerPage, itemWidth, currScrollPos, newPos, this.#scenesList?.offsetWidth]);
  }

  static setNavPosition(pos){
    const position = pos || SettingsUtil.get(SETTINGS.sceneNavPos.tag);
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    firstElem.style.marginLeft = position + 'px';
  }
}

