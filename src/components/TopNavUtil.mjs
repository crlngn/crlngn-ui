import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Manages the top navigation bar for scenes in FoundryVTT
 * Handles scene navigation, folder organization, and UI state
 */
export class TopNavigation {
  static #navElem;
  static #scenesList;
  static #navTimeout;
  static #navExtras;
  static #navToggle;
  static #uiMiddle;
  static sceneFoldersTemplate;
  static #timeout;
  static #collapseTimeout;
  // settings
  static sceneNavEnabled;
  static navFoldersEnabled;
  static navFoldersForPlayers;
  static showFolderListOnClick;
  static showNavOnHover;
  static isCollapsed;
  static navPos;

  /**
   * Initializes the top navigation system
   * Sets up initial state, renders folders, and registers event hooks
   * @returns {Promise<void>}
   */
  static init = async() => {
    const SETTINGS = getSettings();
    TopNavigation.isCollapsed = SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag);
    TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

    TopNavigation.resetLocalVars();
    // if user disabled Scene Navigation Styles,
    // skip everything
    const uiMiddle = document.querySelector("#ui-middle");

    LogUtil.log("SCENE NAV INIT", [TopNavigation.sceneNavEnabled]);
    if(TopNavigation.sceneNavEnabled && uiMiddle){
      uiMiddle.classList.add("crlngn-ui");
    }else if(uiMiddle){
      uiMiddle.classList.remove("crlngn-ui");
      return;
    }

    // If Monk's Scene Navigation is enabled, disable Carolingian UI Top Navigation
    const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    if(isMonksScenenNavOn && TopNavigation.sceneNavEnabled){
      // &.navigation-collapsed, &.with-monks-scene
      if(game.user.isGM){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
      uiMiddle.classList.remove("crlngn-ui");
      SettingsUtil.set(SETTINGS.sceneNavEnabled.tag, false);
    }
    
    LogUtil.log("TopNavigation - init", [ isMonksScenenNavOn ]);

    if(!isMonksScenenNavOn){
      TopNavigation.resetLocalVars();
      SceneNavFolders.renderSceneFolders();
      
      TopNavigation.setNavPosition();
      TopNavigation.placeNavButtons(); 
      TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag));
    }else{
      uiMiddle.classList.add('with-monks-scene');
    }
    // LogUtil.log("RENDER_NAV", [ui.nav, game]);

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, (a, b, c, d) => { 
      LogUtil.log("SCENE NAV", [a, b, c, d]);
      const SETTINGS = getSettings();
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ isMonksScenenNavOn ]);
      
      if(!isMonksScenenNavOn){
        LogUtil.log("NAV no transition add");
        TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);


        SceneNavFolders.init();
        TopNavigation.resetLocalVars();
        SceneNavFolders.renderSceneFolders();
        if(this.#scenesList) this.#scenesList.classList.add("no-transition");
        LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, []); 
        
        TopNavigation.placeNavButtons();
        TopNavigation.addListeners();
        // TopNavigation.observeNavOffset();
        TopNavigation.setNavPosition();
        TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag));
        //
        clearTimeout(TopNavigation.#timeout);
        TopNavigation.#timeout = setTimeout(()=>{
          if(this.#scenesList) this.#scenesList.classList.remove("no-transition");
          LogUtil.log("NAV no transition remove");
        }, 500);
      }

      LogUtil.log("SCENE NAV STATE", [SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag)]);
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (value) => { 
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, ["isMonksScenenNavOn",isMonksScenenNavOn]);
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons(); 
      }
      
      
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, collapsed) => {
      const SETTINGS = getSettings();
      SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, collapsed); 
      LogUtil.log("NAV toggle", [nav, collapsed]); 


      TopNavigation.isCollapsed = collapsed;
      // const uiMiddle = document.querySelector("#ui-middle");

      TopNavigation.toggleNav(collapsed);
    }); 

    Hooks.on(HOOKS_CORE.EXPAND_SCENE_NAV, (nav, value) => {
      // const SETTINGS = getSettings();
      LogUtil.log("NAV expand", [nav, false]); 
      // SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, false); 
      // TopNavigation.isCollapsed = false;
    }); 

    // SettingsUtil.apply(SETTINGS.sceneNavCollapsed.tag); 
    window.addEventListener('resize', ()=>{
      const isMonksScenenNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
      if(!isMonksScenenNavOn){
        TopNavigation.placeNavButtons();
      }
    });

    LogUtil.log("TopNavigation - init", [TopNavigation.sceneNavEnabled])
    
    // if(TopNavigation.sceneNavEnabled){ 
    //   // TopNavigation.observeNavOffset(); 
    // } 

  } 

  /**
   * Toggles the navigation bar's collapsed state
   * @param {boolean} collapsed - Whether the navigation should be collapsed
   */
  static toggleNav(collapsed){
    clearTimeout(TopNavigation.#collapseTimeout);
    TopNavigation.#collapseTimeout = setTimeout(()=>{
      TopNavigation.resetLocalVars();
      if(collapsed){
        ui.nav.collapse();
        TopNavigation.#uiMiddle.classList.add('navigation-collapsed');
      }else{
        ui.nav.expand();
        TopNavigation.#uiMiddle.classList.remove('navigation-collapsed');
      }
    }, 500);
    
  }

  /**
   * Resets and reinitializes local DOM element references
   */
  static resetLocalVars(){
    TopNavigation.#navElem = document.querySelector("#navigation"); 
    TopNavigation.#navExtras = document.querySelector("#navigation .nav-item.is-root"); 
    TopNavigation.#navToggle = document.querySelector("#nav-toggle"); 
    TopNavigation.#uiMiddle = document.querySelector("#ui-middle");

    if(TopNavigation.navFoldersEnabled){
      TopNavigation.#scenesList = document.querySelector("#crlngn-scene-list"); 
      LogUtil.log("TopNavigation resetLocalVars", [TopNavigation.#scenesList]);
    }else{
      TopNavigation.#scenesList = document.querySelector("#scene-list"); 
    }
    // TopNavigation.#leftControls = document.querySelector("#ui-left #controls"); 
  }

  /**
   * Adds event listeners for navigation interactions
   * Handles hover and click events for navigation expansion/collapse
   */
  static addListeners(){
    TopNavigation.#navElem?.addEventListener("mouseenter", ()=>{
      LogUtil.log("TopNavigation mouseenter", [ ]);
    
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
            return;
      }
      clearTimeout(this.#navTimeout);

      const list = document.querySelector("#scene-list");
      if(list) {list.style.display = "flex";}
      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    this.#navElem?.addEventListener("mouseleave", (e)=>{
      LogUtil.log("TopNavigation mouseleave", [ ]);
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
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

  /**
   * Places navigation buttons for scrolling through scenes
   * Only adds buttons if navigation is overflowing and buttons don't already exist
   */
  static placeNavButtons(){ 
    TopNavigation.resetLocalVars();

    const existingButtons = this.#navElem?.querySelectorAll("button.crlngn-nav");
    const isNavOverflowing = this.#scenesList?.scrollWidth >= this.#navElem?.offsetWidth;
    LogUtil.log("placeNavButtons", [ this.#scenesList ]);
    
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


  /**
   * @private
   * Handles click on the 'previous' navigation button
   * Scrolls the scene list backward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavLast = (e) => {
    const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth + folderListWidth : folderListWidth;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavLast", [folderListWidth, "currPos", currPos, "items", itemsPerPage, e]);

    let newPos = currPos - itemsPerPage;
    newPos = newPos < 0 ? 0 : newPos;

    LogUtil.log("onNavLast", ["sceneCount", scenes.length, currPos, newPos]);
    TopNavigation.setNavPosition(newPos); 
  }

  /**
   * @private
   * Handles click on the 'next' navigation button
   * Scrolls the scene list forward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavNext = (e) => {
    // const SETTINGS = getSettings();
    const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
    const toggleWidth = this.#navToggle?.offsetWidth;
    const extrasWidth = GeneralUtil.isModuleOn("compact-scene-navigation") ? this.#navExtras?.offsetWidth + folderListWidth : folderListWidth;
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth : 0) - (toggleWidth*2))/itemWidth);

    LogUtil.log("onNavNext", [folderListWidth, "currPos", currPos, "items", itemsPerPage, e]);

    let newPos = currPos + itemsPerPage;
    newPos = newPos > scenes.length ? scenes.length : newPos;

    TopNavigation.setNavPosition(newPos); 
  }

  /**
   * Sets the position of the scene navigation list
   * @param {number} [pos] - The position to scroll to. If undefined, uses stored position
   */
  static setNavPosition(pos) { 
    const SETTINGS = getSettings();
    if(!this.#scenesList){ return; }
    const position = pos !== undefined ? pos : TopNavigation.navPos || 0;
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];

    const newMargin = scenes[position]?.offsetLeft * -1;
    this.#scenesList.style.marginLeft = newMargin + 'px';

    SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);

    LogUtil.log("setNavPosition", [pos, position, scenes[position], newMargin]);
  }
}
