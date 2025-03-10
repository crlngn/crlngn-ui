import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { Main } from "./Main.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class TopNavigation {
  static #navElem;
  static #scenesList;
  static #navTimeout;
  static #navExtras;
  static #navToggle;
  static #settings;
  static SETTINGS;

  static init(){
    const SETTINGS = getSettings();
    TopNavigation.#settings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);

    // if user disabled Scene Navigation Styles,
    // skip everything
    const uiMiddle = document.querySelector("#ui-middle");
    let navSettings = TopNavigation.#settings;
    if(navSettings.sceneNavEnabled && uiMiddle){
      uiMiddle.classList.add("crlngn-ui");
    }else if(uiMiddle){
      uiMiddle.classList.remove("crlngn-ui");
      return;
    }

    TopNavigation.resetLocalVars();

    // If Monk's Scene Navigation is enabled, disable Carolingian UI Top Navigation
    const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    if(isMonksScenenNavOn && navSettings.sceneNavEnabled){
      if(game.user.isGM){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
      uiMiddle.classList.remove("crlngn-ui");
      SettingsUtil.set(SETTINGS.sceneNavMenu.tag, {
        ...navSettings,
        sceneNavEnabled: false
      });
    }
    
    LogUtil.log("TopNavigation - init", [ isMonksScenenNavOn ]);

    if(!isMonksScenenNavOn){
      TopNavigation.resetLocalVars();
      TopNavigation.addListeners(); 

      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, []); 
      
      TopNavigation.setNavPosition(0);
      TopNavigation.placeNavButtons(); 

      // if(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)){ 
      //   ui.nav.collapse();
      // }else{
      //   ui.nav.expand();
      // }
    }

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, () => { 
      const SETTINGS = getSettings();
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ isMonksScenenNavOn ]);
      
      if(!isMonksScenenNavOn){
        TopNavigation.resetLocalVars();
        LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, []); 
        
        TopNavigation.placeNavButtons();
        TopNavigation.setNavPosition();
        TopNavigation.addListeners();
        // TopNavigation.observeNavOffset();
      }
      
      // if(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)){ 
      //   ui.nav.collapse();
      // }else{
      //   ui.nav.expand();
      // }
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (value) => { 
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, ["isMonksScenenNavOn",isMonksScenenNavOn]);
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons(); 
      }
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, value) => {
      const SETTINGS = getSettings();
      // SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, value); 
      LogUtil.log("NAV toggle", [nav, value]); 
    }); 

    Hooks.on(HOOKS_CORE.EXPAND_SCENE_NAV, (nav, value) => {
      const SETTINGS = getSettings();
      // SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, false); 
      LogUtil.log("NAV expand", [nav, false]); 
    }); 

    // SettingsUtil.apply(SETTINGS.sceneNavCollapsed.tag); 
    window.addEventListener('resize', ()=>{
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons();
      }
    });



    LogUtil.log("TopNavigation - init", [navSettings.sceneNavEnabled])
    
    // if(navSettings.sceneNavEnabled){ 
    //   // TopNavigation.observeNavOffset(); 
    // } 
    
  } 

  static resetLocalVars(){
    TopNavigation.#navElem = document.querySelector("#navigation"); 
    TopNavigation.#scenesList = document.querySelector("#scene-list"); 
    TopNavigation.#navExtras = document.querySelector("#navigation .nav-item.is-root"); 
    TopNavigation.#navToggle = document.querySelector("#nav-toggle"); 
    // TopNavigation.#leftControls = document.querySelector("#ui-left #controls"); 
  }

  static addListeners(){
    const SETTINGS = getSettings();
    TopNavigation.#navElem?.addEventListener("mouseenter", ()=>{
      const sceneNavSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
      if( !SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag) ||
          !sceneNavSettings?.showNavOnHover ){ 
            return;
      }
      clearTimeout(this.#navTimeout);

      const list = document.querySelector("#scene-list");
      if(list) {list.style.display = "flex";}
      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    this.#navElem?.addEventListener("mouseleave", (e)=>{
      const sceneNavSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
      if( !SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag) ||
          !sceneNavSettings?.showNavOnHover ){ 
          return;
      }
      if (!e) var e = window.event;
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();

      this.#navTimeout = setTimeout(()=>{
        clearTimeout(this.#navTimeout);
        this.#navTimeout = null;
        const list = document.querySelector("#scene-list");
        if(list) {list.style.display = "none";}
        const navigation = document.querySelector("#navigation");
        navigation.classList.add("collapsed");
      }, 700);
    });
  }

  static placeNavButtons(){ 
    TopNavigation.resetLocalVars();

    const existingButtons = this.#navElem?.querySelectorAll("button.crlngn-nav");
    const isNavOverflowing = this.#scenesList?.scrollWidth >= this.#navElem?.offsetWidth;
    LogUtil.log("placeNavButtons", [ isNavOverflowing, existingButtons, this.#scenesList?.scrollWidth, this.#navElem?.offsetWidth]);
    
    if(!isNavOverflowing || existingButtons.length > 0){
      return;
    }

    const btnLast = document.createElement("button"); 
    btnLast.classList.add("crlngn-nav"); 
    btnLast.classList.add("ui-nav-left"); 
    const arrowLeft = document.createElement("i"); 
    arrowLeft.classList.add("fa"); 
    arrowLeft.classList.add("fa-chevron-left"); 
    btnLast.addEventListener("click", this.#onNavLast);
    btnLast.append(arrowLeft); 

    const btnNext = document.createElement("button"); 
    btnNext.classList.add("crlngn-nav"); 
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
    const SETTINGS = getSettings();
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag) || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavLast", ["currPos", currPos, itemsPerPage]);

    let newPos = currPos - itemsPerPage;
    newPos = newPos < 0 ? 0 : newPos;

    LogUtil.log("onNavLast", ["sceneCount", scenes.length, currPos, newPos]);
    TopNavigation.setNavPosition(newPos); 
  }

  static #onNavNext = (e) => {
    const SETTINGS = getSettings();
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth : 0;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag) || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavLast", ["currPos", currPos, itemsPerPage]);

    let newPos = currPos + itemsPerPage;
    newPos = newPos > scenes.length ? scenes.length : newPos;

    TopNavigation.setNavPosition(newPos); 
  }

  static setNavPosition(pos) { 
    const SETTINGS = getSettings();
    if(!this.#scenesList){ return; }
    const position = pos !== undefined ? pos : SettingsUtil.get(SETTINGS.sceneNavPos.tag);
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item") || [];

    const newMargin = scenes[position]?.offsetLeft * -1;
    this.#scenesList.style.marginLeft = newMargin + 'px';

    SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);

    LogUtil.log("setNavPosition", [pos, position, scenes[position], newMargin]);
  }

  /*
  static observeNavOffset(){
    LogUtil.log("observeNavOffset A", []);
    if(!TopNavigation.#navElem || !TopNavigation.#leftControls){ return; }
    const monksScenenNav = GeneralUtil.isModuleOn('monks-scene-navigation'); 
    // document.querySelector("#ui-top .monks-scene-navigation"); 

    function updateCSSVars() {
      const TopNavigation.#settings = getSettings();

      TopNavigation.#navElem = document.querySelector("#navigation"); 
      if(!TopNavigation.#navElem){ return; }

      const isNavCollapsed = SettingsUtil.get(TopNavigation.#settings.sceneNavCollapsed.tag); 
      // const navHeight = isNavCollapsed ? 0 : TopNavigation.#navElem.offsetHeight;

      // let topOffset = monksScenenNav ? 0 : navHeight + TopNavigation.#navElem.offsetTop;
      let topOffset = monksScenenNav ? 0 : TopNavigation.#navElem.offsetTop;

      const root = document.querySelector("body.crlngn-ui");
      root?.style.setProperty('--crlngn-top-offset', topOffset + 'px');
  
      LogUtil.log("TopNavigation updateCSSVars", [isNavCollapsed, topOffset, TopNavigation.#navElem.offsetTop, TopNavigation.#navElem.offsetHeight]);
    }

    // Create a MutationObserver to watch for changes
    TopNavigation.#observer = new MutationObserver(()=>{
      throttle(() => TopNavigation.updateCSSVars(), 250);
    });

    if(!monksScenenNav){
      TopNavigation.#observer.observe(TopNavigation.#navElem.parentNode, {
        // attributes: true,
        // childList: true,
        // subtree: true,
        // characterData: true
        attributes: true,           // attribute changes
        attributeFilter: ['style'], // Only style attribute changes 
        childList: true,            // child changes
        subtree: false,             // descendants
        characterData: false        // text changes
      });
    }

    updateCSSVars();
  }
  */

  
}

