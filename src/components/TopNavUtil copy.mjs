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
  static navShowSceneFolders;
  static navStartCollapsed;
  static showFolderListOnClick;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useSceneBackButton;
  static sceneNavAlias = "";
  static sceneClickToView;
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
    
    if(!this.#isMonksSceneNavOn){
      if(!this.#isRipperSceneNavOn){
        SceneNavFolders.init();
        SceneNavFolders.registerHooks();
        SceneNavFolders.renderSceneFolders();
      }
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
      
      if(!this.#isMonksSceneNavOn){
        LogUtil.log("NAV no transition add");
        TopNavigation.navPos = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

        if(!this.#isRipperSceneNavOn){
          SceneNavFolders.init();
          await SceneNavFolders.renderSceneFolders();
        }
        if(this.#scenesList) {this.#scenesList.classList.add("no-transition")};
        const scenePage = TopNavigation.navPos;
        TopNavigation.resetLocalVars();
        TopNavigation.setNavPosition(scenePage);
        TopNavigation.placeNavButtons();
        TopNavigation.addListeners();
        TopNavigation.handleNavState();
        
        clearTimeout(TopNavigation.#timeout);
        TopNavigation.#timeout = setTimeout(()=>{
          LogUtil.log("NAV no transition remove");
          if(this.#scenesList) this.#scenesList.classList.remove("no-transition");
          TopNavigation.placeNavButtons();
        }, 250);
      }
    }); 

    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (value) => { 
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, ["isMonksSceneNavOn", this.#isMonksSceneNavOn]);
      if(!this.#isMonksSceneNavOn){
        TopNavigation.placeNavButtons(); 

        if(value){
          document.querySelector("body").classList.add("nav-collapsed");
        }else{
          document.querySelector("body").classList.remove("nav-collapsed");
        }
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

    Hooks.on(HOOKS_CORE.CANVAS_INIT, async () => {
      try {
        const scene = game.scenes.viewed;
        if (!scene) {
          return;
        }
        const pos = await TopNavigation.getCurrScenePosition(scene.id);
        // Ensure DOM is ready before accessing element dimensions
        await new Promise(resolve => setTimeout(resolve, 100));
        TopNavigation.setNavPosition(pos);
      } catch (error) {
        LogUtil.warn(HOOKS_CORE.CANVAS_INIT, ['Error in canvas init:', error]);
        console.error('Error in canvas init:', error);
      }
    });

    // SettingsUtil.apply(SETTINGS.sceneNavCollapsed.tag); 
    window.addEventListener('resize', ()=>{
      
      if(!this.#isMonksSceneNavOn){
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
      if(!ui.nav){ 
        TopNavigation.toggleNav(collapsed);
        return; 
      }
      TopNavigation.resetLocalVars();

      if(collapsed===true){
        ui.nav.collapse();
        TopNavigation.#uiMiddle.classList.add('navigation-collapsed');
      }else if(collapsed===false){
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

    if(this.#isRipperSceneNavOn && TopNavigation.navFoldersEnabled){
      if(game.user?.isGM && this.#isRipperSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.ripperScenesCompat"), {permanent: true});
      }
    }
    if((this.#isMonksSceneNavOn) && TopNavigation.sceneNavEnabled){
      uiMiddle.classList.remove("crlngn-ui");
      
      if(game.ready){
        SettingsUtil.set(SETTINGS.sceneNavEnabled.tag, false);
        TopNavigation.sceneNavEnabled = false;
      }

      LogUtil.log("checkSceneNavCompat", [this.#isMonksSceneNavOn, this.#isRipperSceneNavOn]);
      
      if(game.user?.isGM && this.#isMonksSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
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
      TopNavigation.#scenesList = document.querySelector("#scene-list"); 
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

      const folderListWidth = TopNavigation.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
      // const extrasWidth = this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth : 0;
      const existingButtons = TopNavigation.#navElem?.querySelectorAll("button.crlngn-nav");
      const isNavOverflowing = TopNavigation.#scenesList?.scrollWidth + folderListWidth >= this.#navElem?.offsetWidth;
      LogUtil.log("placeNavButtons", [ TopNavigation.#scenesList, isNavOverflowing ]);
      
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
    }, 100);
  }


  /**
   * @private
   * Handles click on the 'previous' navigation button
   * Scrolls the scene list backward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavLast = async (e) => {
    // const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
    // const extrasWidth = this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth : 0;
    // const toggleWidth = this.#navToggle?.offsetWidth;
    // const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    // const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    // const itemWidth = firstScene.offsetWidth;
    // const currPos = TopNavigation.navPos || 0;
    // const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth + folderListWidth : 0) - (toggleWidth*2))/itemWidth);
    const itemsPerPage = await TopNavigation.getItemsPerPage();
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const currPos = TopNavigation.navPos || 0;

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
  static #onNavNext = async (e) => {
    // const SETTINGS = getSettings();
    // const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
    // const extrasWidth = this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth : 0;
    // const toggleWidth = this.#navToggle?.offsetWidth;
    // const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
    // const itemWidth = firstScene.offsetWidth;
    // const itemsPerPage = Math.floor((this.#navElem?.offsetWidth - (currPos === 0 ? extrasWidth + folderListWidth : 0) - (toggleWidth*2))/itemWidth);
    const itemsPerPage = await TopNavigation.getItemsPerPage();
    const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
    const currPos = TopNavigation.navPos || 0;

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
    try {
      LogUtil.log("setNavPosition", ['Starting with pos:', pos]);
      const SETTINGS = getSettings();
      
      if(!this.#scenesList){ 
        LogUtil.log("setNavPosition", ['No scenes list found']);
        return; 
      }

      const scenes = this.#scenesList?.querySelectorAll("li.nav-item:not(.is-root)") || [];
      if (scenes.length === 0) {
        LogUtil.log("setNavPosition", ['No scene items found']);
        return;
      }

      const extrasWidth = this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth || 0 : 0;
      const position = pos!==undefined ? pos : TopNavigation.navPos || 0;
      
      if (position >= scenes.length) {
        LogUtil.log("setNavPosition", ['Position out of bounds:', position, 'max:', scenes.length - 1]);
        return;
      }

      const targetScene = scenes[position];
      if (!targetScene) {
        LogUtil.log("setNavPosition", ['Target scene not found at position:', position]);
        return;
      }

      const offsetLeft = targetScene.offsetLeft;
      if (typeof offsetLeft !== 'number') {
        LogUtil.log("setNavPosition", ['Invalid offsetLeft for scene:', offsetLeft]);
        return;
      }

      const newMargin = (parseInt(offsetLeft) - extrasWidth) * -1;
      LogUtil.log("setNavPosition", ['Calculated margin:', newMargin]);
      
      this.#scenesList.style.marginLeft = newMargin + 'px';
      TopNavigation.navPos = position;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);
      
      LogUtil.log("setNavPosition", ['Complete:', { pos, position, newMargin }]);
    } catch (error) {
      LogUtil.log("setNavPosition", ['Error:', error]);
      console.error('Error in setNavPosition:', error);
    }
  }

  static getItemsPerPage = async () => {
    try {
      LogUtil.log('getItemsPerPage', ['Starting']);
      if(!this.#navElem) {
        LogUtil.log('getItemsPerPage', ['No nav element, resetting vars']);
        TopNavigation.resetLocalVars();
        // Ensure DOM is ready before accessing element dimensions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!this.#navElem) {
        LogUtil.log('getItemsPerPage', ['Nav element still not found after reset']);
        return 0;
      }

      const folderListWidth = this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
      const extrasWidth = this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth || 0 : 0;
      const toggleWidth = this.#navToggle?.offsetWidth || 0;
      const firstScene = this.#scenesList?.querySelector("li.nav-item:not(.is-root)");
      
      if (!firstScene) {
        LogUtil.log('getItemsPerPage', ['No scene items found']);
        return 0;
      }

      const itemWidth = firstScene.offsetWidth;
      if (!itemWidth) {
        LogUtil.log('getItemsPerPage', ['Scene item has no width']);
        return 0;
      }

      const currPos = TopNavigation.navPos || 0;
      const navWidth = this.#navElem?.offsetWidth;
      if (!navWidth) {
        LogUtil.log('getItemsPerPage', ['Nav element has no width']);
        return 0;
      }

      const itemsPerPage = Math.floor((navWidth - (currPos === 0 ? extrasWidth + folderListWidth : 0) - (toggleWidth*2))/itemWidth);
      LogUtil.log('getItemsPerPage', ['Calculated items per page:', itemsPerPage]);
      return itemsPerPage || 0;
    } catch (error) {
      LogUtil.log('getItemsPerPage', ['Error:', error]);
      console.error('Error in getItemsPerPage:', error);
      return 0;
    }
  }

  static getCurrScenePosition = async (id) => {
    try {
      LogUtil.log('getCurrScenePosition', ['Starting with id:', id]);

      if (!this.#scenesList) {
        LogUtil.log('getCurrScenePosition', ['No scenes list found']);
        return 0;
      }

      const itemsPerPage = await TopNavigation.getItemsPerPage() || 1;
      LogUtil.log('getCurrScenePosition', ['Items per page:', itemsPerPage]);

      const sceneItems = this.#scenesList.querySelectorAll("li.nav-item:not(.is-root)");
      if (!sceneItems || sceneItems.length === 0) {
        LogUtil.log('getCurrScenePosition', ['No scene items found']);
        return 0;
      }

      const sceneArray = Array.from(sceneItems);
      if (!id) {
        LogUtil.log('getCurrScenePosition', ['No scene ID provided']);
        return 0;
      }

      const sceneIndex = sceneArray.findIndex(item => item.dataset.sceneId === id);
      LogUtil.log('getCurrScenePosition', ['Found scene index:', sceneIndex]);
      
      if (sceneIndex === -1) {
        LogUtil.log('getCurrScenePosition', ['Scene not found with id:', id]);
        return 0;
      }

      const isSceneVisible = sceneIndex >= TopNavigation.navPos && 
                            sceneIndex <= TopNavigation.navPos + itemsPerPage;
      
      const pos = isSceneVisible ? TopNavigation.navPos : sceneIndex;
      LogUtil.log('getCurrScenePosition', ['Final position:', pos, 'isVisible:', isSceneVisible]);

      return pos;
    } catch (error) {
      LogUtil.log('getCurrScenePosition', ['Error:', error]);
      console.error('Error in getCurrScenePosition:', error);
      return 0;
    }
  }
}
