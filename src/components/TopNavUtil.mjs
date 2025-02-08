import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class TopNavigation {
  static #navElem;
  static #scenesList;
  static #navTimeout;
  static #navExtras;

  static init(){
    // if user disabled Scene Navigation Styles,
    // skip everything
    if(SettingsUtil.get(SETTINGS.sceneNavDisabled.tag)){
      document.querySelector("#ui-middle")?.classList.remove("crlngn-ui");
      return;
    }else{
      document.querySelector("#ui-middle")?.classList.add("crlngn-ui");
    }

    TopNavigation.addListeners(); 

    LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ui.nav, SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)]); 
    // TopNavigation.setNavPosition(0);
    
    TopNavigation.placeNavButtons(); 
    if(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)){ 
      ui.nav.collapse();
    }else{
      ui.nav.expand();
    }

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, () => { 
      TopNavigation.addListeners(); 

      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ui.nav, SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)]); 
      // TopNavigation.setNavPosition(0);
      
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
    this.#navExtras = document.querySelector("#navigation .nav-item.is-root"); 

    this.#navElem?.addEventListener("mouseenter", ()=>{
      if( !SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag) ||
          !SettingsUtil.get(SETTINGS.showSceneNavOnHover.tag) ){ 
            return;
      }
      clearTimeout(this.#navTimeout);
      /*ui.nav.expand();*/

      const list = document.querySelector("#scene-list");
      list.style.display = "flex";
      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    this.#navElem?.addEventListener("mouseleave", (e)=>{
      if( !SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag) ||
          !SettingsUtil.get(SETTINGS.showSceneNavOnHover.tag) ){ 
            return;
      }
      if (!e) var e = window.event;
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();

      this.#navTimeout = setTimeout(()=>{
        clearTimeout(this.#navTimeout);
        this.#navTimeout = null;
        /*ui.nav.collapse();*/
        const list = document.querySelector("#scene-list");
        list.style.display = "none";
        const navigation = document.querySelector("#navigation");
        navigation.classList.add("collapsed");
      }, 700);
    });

  }

  static placeNavButtons(){ 
    const isNavOverflowing = this.#scenesList?.scrollWidth >= this.#navElem?.offsetWidth;//this.#navElem?.scrollWidth >= this.#navElem?.offsetWidth;
    LogUtil.log("placeNavButtons", [ isNavOverflowing, this.#scenesList?.scrollWidth, this.#navElem?.offsetWidth]);
    if(!isNavOverflowing){
      return;
    }
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

    this.#navElem?.appendChild(btnLast);
    this.#navElem?.appendChild(btnNext);
  }

  static #onNavLast = (e) => {
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root):first-of-type");
    const itemWidth = firstElem.offsetWidth;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - extrasWidth)/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    let newMargin = 0;
    let newPos = 0;

    if(currScrollPos < 0){
      newMargin = Number(currScrollPos + (itemWidth*itemsPerPage) + extrasWidth);
      newPos = (newMargin < 0 ? newMargin : 0);
    }
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, newPos);
    TopNavigation.setNavPosition(newPos); 
    
    LogUtil.log("onNavLast", [itemsPerPage, newPos]);
  }

  static #onNavNext = (e) => {
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const itemWidth = firstScene.offsetWidth;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - extrasWidth)/itemWidth);
    const currScrollPos = parseInt(firstElem.style.marginLeft || 0); 
    let newMargin, minMargin = 0;
    let newPos = currScrollPos;
    LogUtil.log("onNavNext a", [itemWidth, itemsPerPage]);
    
    let diff = this.#scenesList?.scrollWidth - this.#navElem?.offsetWidth;
    // if(this.#scenesList?.offsetWidth + currScrollPos + 70 > this.#navElem?.offsetWidth){
    if(diff > -70){
      newMargin = currScrollPos - (itemWidth*itemsPerPage) + extrasWidth;
      minMargin = currScrollPos - this.#scenesList?.scrollWidth + itemWidth + extrasWidth;
      newPos = (newMargin > minMargin ? newMargin : minMargin);
    }
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, newPos);
    TopNavigation.setNavPosition(newPos);
    LogUtil.log("onNavNext b", [this.#scenesList?.scrollWidth, this.#navElem?.offsetWidth, newMargin, minMargin, currScrollPos]);
    LogUtil.log("onNavNext c", [itemsPerPage, newPos]);
  }

  static setNavPosition(pos){
    const position = pos || SettingsUtil.get(SETTINGS.sceneNavPos.tag);
    const firstElem = this.#scenesList?.querySelector("li:first-child");
    firstElem.style.marginLeft = position + 'px';
  }
}

