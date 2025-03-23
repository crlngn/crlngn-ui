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
  static #navBtnsTimeout;
  static #navFirstLoad = true;
  static #isMonksSceneNavOn = false;
  static #isRipperSceneNavOn = false;
  // settings
  static sceneNavEnabled;
  static navFoldersEnabled;
  static navFoldersForPlayers;
  static navStartCollapsed;
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

    this.checkSceneNavCompat();

    // Load settings first
    TopNavigation.navStartCollapsed = SettingsUtil.get(SETTINGS.navStartCollapsed.tag);
    TopNavigation.showNavOnHover = SettingsUtil.get(SETTINGS.showNavOnHover.tag);
    TopNavigation.sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    TopNavigation.navFoldersEnabled = SettingsUtil.get(SETTINGS.navFoldersEnabled.tag);
    TopNavigation.navFoldersForPlayers = SettingsUtil.get(SETTINGS.navFoldersForPlayers.tag);
    TopNavigation.showFolderListOnClick = SettingsUtil.get(SETTINGS.showFolderListOnClick.tag);
    
    // Then determine initial collapse state
    TopNavigation.isCollapsed = TopNavigation.#navFirstLoad
      ? TopNavigation.navStartCollapsed
      : SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag);
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
    
    if(!this.#isMonksSceneNavOn && !this.#isRipperSceneNavOn){
      await SceneNavFolders.renderSceneFolders();
      
      const scenePage = SettingsUtil.get(SETTINGS.sceneNavPos.tag);
      TopNavigation.setNavPosition(scenePage);
      TopNavigation.placeNavButtons();
      TopNavigation.addListeners();
      TopNavigation.handleNavState();
      //
    }else if(this.#isMonksSceneNavOn){
      uiMiddle.classList.add('with-monks-scene');
    }
    // LogUtil.log("RENDER_NAV", [ui.nav, game]);

    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, async() => { 
      LogUtil.log("SCENE NAV", [TopNavigation.navPos]);
      LogUtil.log("TopNavigation", [TopNavigation.isCollapsed, TopNavigation.navStartCollapsed]);

      const SETTINGS = getSettings();
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV, [ this.#isMonksSceneNavOn, this.#isRipperSceneNavOn ]);
      
      if(!this.#isMonksSceneNavOn && !this.#isRipperSceneNavOn){
        LogUtil.log("NAV no transition add");
        TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

        SceneNavFolders.init();
        await SceneNavFolders.renderSceneFolders();
        if(this.#scenesList) {this.#scenesList.classList.add("no-transition")};
        const scenePage = TopNavigation.navPos;
        TopNavigation.setNavPosition(scenePage);
        TopNavigation.placeNavButtons();
        TopNavigation.addListeners();

        TopNavigation.handleNavState();
        
        clearTimeout(TopNavigation.#timeout);
        TopNavigation.#timeout = setTimeout(()=>{
          LogUtil.log("NAV no transition remove");
          if(this.#scenesList) this.#scenesList.classList.remove("no-transition");
        }, 250);
      }
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (value) => { 
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, ["isMonksSceneNavOn", this.#isMonksSceneNavOn]);
      if(!this.#isMonksSceneNavOn && !this.#isRipperSceneNavOn){
        TopNavigation.placeNavButtons(); 
      }
      
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, collapsed) => {
      const SETTINGS = getSettings();
      SettingsUtil.set(SETTINGS.sceneNavCollapsed.tag, collapsed); 
      LogUtil.log("NAV toggle", [nav, collapsed]); 

      TopNavigation.isCollapsed = collapsed;
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
      
      if(!this.#isMonksSceneNavOn && !this.#isRipperSceneNavOn){
        TopNavigation.placeNavButtons();
      }
    });

    LogUtil.log("TopNavigation - init", [TopNavigation.sceneNavEnabled])
    
    // if(TopNavigation.sceneNavEnabled){ 
    //   // TopNavigation.observeNavOffset(); 
    // } 

  } 

  /**
   * Handles the first load of the navigation bar
   * Only checks sceneNavCollapsed setting if not first load
   */
  static handleNavState(){
    const SETTINGS = getSettings();
    if(game.ready && TopNavigation.#navFirstLoad) {
      TopNavigation.#navFirstLoad = false;
      TopNavigation.toggleNav(TopNavigation.navStartCollapsed);
    }else{
      TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.sceneNavCollapsed.tag));
    }
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
   * If Monk's Scene Navigation or Compact Scene Navigation are enabled, disable Carolingian UI Top Navigation
   */
  static checkSceneNavCompat(){
    const SETTINGS = getSettings();
    const uiMiddle = document.querySelector("#ui-middle");
    
    this.#isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    this.#isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");

    if((this.#isMonksSceneNavOn || this.#isRipperSceneNavOn) && TopNavigation.sceneNavEnabled){
      uiMiddle.classList.remove("crlngn-ui");
      SettingsUtil.set(SETTINGS.sceneNavEnabled.tag, false);
      SettingsUtil.set(SETTINGS.navFoldersEnabled.tag, false);
      TopNavigation.sceneNavEnabled = false;
      TopNavigation.navFoldersEnabled = false;

      LogUtil.log("checkSceneNavCompat", [isMonksSceneNavOn, isRipperSceneNavOn]);
      
      if(game.user.isGM && this.#isMonksSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
      if(game.user.isGM && this.#isRipperSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.ripperScenesNotSupported"), {permanent: true});
      }
    }
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
      TopNavigation.#scenesList = document.querySelector("#crlngn-scene-list"); 
    }
    // TopNavigation.#leftControls = document.querySelector("#ui-left #controls"); 
  }

  /**
   * Adds event listeners for navigation interactions
   * Handles hover and click events for navigation expansion/collapse
   */
  static addListeners(){
    TopNavigation.#navElem?.addEventListener("mouseenter", (e)=>{
      LogUtil.log("TopNavigation mouseenter", [ ]);
    
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
            return;
      }
      e.stopPropagation();
      clearTimeout(TopNavigation.#navTimeout);

      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    this.#navElem?.addEventListener("mouseleave", (e)=>{
      LogUtil.log("TopNavigation mouseleave", [ ]);
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
          return;
      }
      e.stopPropagation();

      this.#navTimeout = setTimeout(()=>{
        clearTimeout(this.#navTimeout);
        this.#navTimeout = null;
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
    clearTimeout(this.#navBtnsTimeout);
    TopNavigation.#navBtnsTimeout = setTimeout(() => {
      clearTimeout(this.#navBtnsTimeout);
      TopNavigation.resetLocalVars();

      const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
      const existingButtons = this.#navElem?.querySelectorAll("button.crlngn-nav");
      const isNavOverflowing = this.#scenesList?.scrollWidth + folderListWidth >= this.#navElem?.offsetWidth;
      LogUtil.log("placeNavButtons", [ this.#scenesList, isNavOverflowing ]);
      
      if(!isNavOverflowing){
        return;
      }
      existingButtons.forEach(b => b.remove());

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
      if(this.#scenesList) this.#scenesList.classList.remove("no-transition");
    }, 250);
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
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? folderListWidth : 0) - (toggleWidth*2))/itemWidth);

    let newPos = currPos - (itemsPerPage - 1);
    newPos = newPos < 0 ? 0 : newPos;
    LogUtil.log("onNavLast", ["currPos", currPos, "items", itemsPerPage, newPos]);

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
    const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const itemWidth = firstScene.offsetWidth;
    const currPos = TopNavigation.navPos || 0;
    const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? folderListWidth : 0) - (toggleWidth*2))/itemWidth);

    let newPos = currPos + (itemsPerPage - 1);
    newPos = newPos > scenes.length-1 ? scenes.length-1 : newPos;

    LogUtil.log("onNavNext", ["currPos", currPos, "items", itemsPerPage, newPos]);


    TopNavigation.setNavPosition(newPos); 
  }

  /**
   * Sets the position of the scene navigation list
   * @param {number} [pos] - The position to scroll to. If undefined, uses stored position
   */
  static setNavPosition(pos) { 
    const SETTINGS = getSettings();
    if(!this.#scenesList){ return; }
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const position = pos!==undefined ? pos : TopNavigation.navPos || 0;

    const newMargin = parseInt(scenes[position]?.offsetLeft) * -1;
    this.#scenesList.style.marginLeft = newMargin + 'px';

    TopNavigation.navPos = position;
    SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);

    LogUtil.log("setNavPosition", [pos, position, scenes, scenes[position], newMargin]);
  }
}
