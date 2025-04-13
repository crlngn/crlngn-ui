import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { BACK_BUTTON_OPTIONS, getSettings } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/** @typedef {import("../types.mjs").SceneNavData} SceneNavData */
/** @typedef {import("../types.mjs").SceneNavItem} SceneNavItem */

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
  static #uiLeft;
  static sceneFoldersTemplate;
  static navButtonsTemplate;
  static #timeout;
  static #collapseTimeout;
  static #navBtnsTimeout;
  static #navFirstLoad = true;
  static #sceneClickTimer = null;
  // settings
  static sceneNavEnabled;
  static navFoldersEnabled;
  static navFoldersForPlayers;
  static navShowRootFolders;
  static navStartCollapsed;
  static showFolderListOnClick;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useNavBackButton;
  static sceneNavAlias = "";
  static sceneClickToView;
  static isCollapsed;
  static navPos;

  static init = () => {
    const SETTINGS = getSettings();
    this.checkSceneNavCompat();
    
    // Preload the navigation buttons template
    this.preloadTemplates();

    // Load settings first
    TopNavigation.navStartCollapsed = SettingsUtil.get(SETTINGS.navStartCollapsed.tag);
    TopNavigation.showNavOnHover = SettingsUtil.get(SETTINGS.showNavOnHover.tag);
    TopNavigation.sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    TopNavigation.useScenePreview = SettingsUtil.get(SETTINGS.useScenePreview.tag);
    TopNavigation.navFoldersEnabled = SettingsUtil.get(SETTINGS.navFoldersEnabled.tag);
    TopNavigation.navFoldersForPlayers = SettingsUtil.get(SETTINGS.navFoldersForPlayers.tag);
    TopNavigation.showFolderListOnClick = SettingsUtil.get(SETTINGS.showFolderListOnClick.tag);
    SceneNavFolders.init();

    LogUtil.log("SCENE NAV INIT", [TopNavigation.sceneNavEnabled]);
    const uiLeft = document.querySelector("#ui-left");
    if(TopNavigation.sceneNavEnabled && uiLeft){
      uiLeft.classList.add("crlngn-nav");
    }else if(uiLeft){
      uiLeft.classList.remove("crlngn-nav");
      return;
    }

    // execute on render scene navigation
    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, (nav, navHtml, navData) => {
      const SETTINGS = getSettings();
      TopNavigation.handleSceneList(nav, navHtml, navData);
      TopNavigation.handleBackButton(nav, navHtml, navData);
      TopNavigation.handleFolderList(nav, navHtml, navData);
      const scenePage = SettingsUtil.get(SETTINGS.sceneNavPos.tag);

      TopNavigation.resetLocalVars();
      TopNavigation.setNavPosition(scenePage, false);
      TopNavigation.addListeners();
      TopNavigation.handleNavState();
      TopNavigation.addSceneListeners(navHtml);

      if(TopNavigation.navShowRootFolders){
        SceneNavFolders.renderFolderList();
      }
      
      clearTimeout(TopNavigation.#timeout);
      TopNavigation.#timeout = setTimeout(()=>{
        LogUtil.log("NAV no transition remove");
        TopNavigation.placeNavButtons();
      }, 750);
    });
    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => {
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => {
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => {
      ui.nav.render();
    });

    // add class to ui nav when sidebar changes state
    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (sidebar) => { 
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, [sidebar]);
      if(sidebar){TopNavigation.checkSideBar(sidebar.expanded);}
      TopNavigation.placeNavButtons();
    }); 

    // re-add buttons when scene nav collapses or expands
    Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, collapsed) => {
      clearTimeout(TopNavigation.#timeout);
      TopNavigation.isCollapsed = collapsed;
      TopNavigation.#timeout = setTimeout(()=>{
        if(collapsed){
          TopNavigation.#uiLeft.classList.add('navigation-collapsed');
        }else{
          TopNavigation.#uiLeft.classList.remove('navigation-collapsed');
          TopNavigation.placeNavButtons();
        }
      }, 250);
    });

    // Hooks.on(HOOKS_CORE.RENDER_DOCUMENT_DIRECTORY, (directory) => {
    Hooks.on(HOOKS_CORE.RENDER_SCENE_DIRECTORY, (directory) => {
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_DIRECTORY,[directory]);
      // if(directory.entryType !== "Scene") return;
      
      const sceneNav = document.querySelector('#scenes .directory-list');

      // apply settings to scene directory
      const directoryScenes = sceneNav.querySelectorAll(".directory-item.scene");
      directoryScenes.forEach(sc => {
        const scene = game.scenes.get(sc.dataset.entryId);
        LogUtil.log(HOOKS_CORE.RENDER_SCENE_DIRECTORY,["directoryScenes", sc.dataset.entryId, TopNavigation.sceneClickToView]);
        if(TopNavigation.sceneClickToView){
          sc.addEventListener("dblclick", TopNavigation.#onActivateScene); // onActivateScene
          sc.addEventListener("click", TopNavigation.#onSelectScene);
        }
        
        if(TopNavigation.useSceneIcons && scene && game.user?.isGM){
          let iconElem = document.createElement('i');
          iconElem.classList.add('fas');
          iconElem.classList.add('icon');
          if(scene.ownership.default!==0){
            if(scene.active){
              iconElem.classList.add('fa-bullseye');
              sc.prepend(iconElem);
            }
            if(game.scenes.current?.id===scene.id){
              iconElem.classList.add('fa-star');
              sc.prepend(iconElem);
            }
          }else{
            iconElem.classList.add('fa-eye-slash');
            sc.prepend(iconElem);
          }
        }
      });
    });

    // execute once on start
    if(ui.sidebar){TopNavigation.checkSideBar(ui.sidebar.expanded);}
    TopNavigation.placeNavButtons();
  }

  static checkSideBar = (isExpanded) => {
    TopNavigation.placeNavButtons(); 
    const body = document.querySelector("body");
    if(isExpanded){
      body.classList.add("sidebar-expanded");

    }else{
      body.classList.remove("sidebar-expanded");
    }
  }

  /**
   * Resets and reinitializes local DOM element references
   */
  static resetLocalVars(){
    TopNavigation.#navElem = document.querySelector("#scene-navigation"); 
    TopNavigation.#navToggle = document.querySelector("#scene-navigation-expand"); 
    TopNavigation.#uiLeft = document.querySelector("#ui-left");
    TopNavigation.#scenesList = document.querySelector("#scene-navigation-inactive");
  }

  /**
   * Add scene preview to nav, if the setting is enabled
   */
  static handleSceneList(nav, navHtml, navData){
    if(TopNavigation.useScenePreview){
      LogUtil.log("handleSceneList", [nav, navHtml, navData]);

      const allSceneLi = navHtml.querySelectorAll(".scene-navigation-menu li.scene");
      allSceneLi.forEach(li => {
        const id = li.dataset.sceneId;
        const sceneData = game.scenes.find(sc => sc.id === id);
        LogUtil.log("sceneData", [sceneData]);

        const span = document.createElement('span');
        span.classList.add('scene-preview');
        span.style = `background-image: url('${sceneData.thumbnail || ''}')`;
        li.classList.add('nav-item');
        li.append(span);
        if(TopNavigation.useSceneIcons){
          if(li.classList.contains('active') || li.classList.contains('view')){
            li.classList.add('crlngn');
          }
        }
      });
    }
  }

  /**
   * Add back button to the active scenes menu,
   * unless it is turned off in settings
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   * @returns {void}
   */
  static handleBackButton(nav, navHtml, navData){
    const SETTINGS = getSettings();
    LogUtil.log("handleBackButton",[nav, navHtml, navData]);
    if(TopNavigation.useNavBackButton===SETTINGS.useNavBackButton.options.noButton){ return; }
    const activeScenesMenu = navHtml.querySelector("#scene-navigation-active");
    const backButton = document.createElement("button");
    backButton.classList.add("back-button");
    backButton.innerHTML = "<i class='fa fa-turn-left'></i>";

    backButton.addEventListener("click", TopNavigation.#onBackButton);

    activeScenesMenu.prepend(backButton);
  }

  /**
   * Handles the folder list in the scene navigation
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   * @returns {void}
   */
  static handleFolderList(nav, navHtml, navData){
    const SETTINGS = getSettings();
    if(!TopNavigation.navFoldersEnabled){ return; }
    
    SceneNavFolders.addFolderButtons(nav, navHtml, navData);
  }

  /**
   * Handle behavior when clicking the back button
   * @param {Event} evt 
   */
  static #onBackButton = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
  }

  /**
   * Handles the first load of the navigation bar
   * Only checks sceneNavCollapsed setting if not first load
   */
  static handleNavState(){
    const SETTINGS = getSettings();
    if(TopNavigation.#navFirstLoad) {
      TopNavigation.#navFirstLoad = false;
      TopNavigation.toggleNav(TopNavigation.navStartCollapsed);
    }else{
      // TopNavigation.toggleNav(TopNavigation.navStartCollapsed);
    }
  }

  /**
   * Toggles the navigation bar's collapsed state
   * @param {boolean} collapsed - Whether the navigation should be collapsed
   */
  static toggleNav(collapsed){
    clearTimeout(TopNavigation.#collapseTimeout);
    TopNavigation.#collapseTimeout = setTimeout(()=>{
      // if(!ui.nav){ 
      //   TopNavigation.toggleNav(collapsed);
      //   return; 
      // }
      TopNavigation.resetLocalVars();

      if(collapsed===true){
        // ui.nav.collapse();
        LogUtil.log("toggleNav collapse", [collapsed, TopNavigation.navStartCollapsed])
        // TopNavigation.#uiLeft.classList.add('navigation-collapsed');
      }else if(collapsed===false){
        ui.nav.expand();
        LogUtil.log("toggleNav expand", [collapsed, TopNavigation.navStartCollapsed])
        // TopNavigation.#uiLeft.classList.remove('navigation-collapsed');
      }
    }, 500);
    
  }

  /**
   * If Monk's Scene Navigation or Compact Scene Navigation are enabled, disable Carolingian UI Top Navigation
   */
  static checkSceneNavCompat(){
    const SETTINGS = getSettings();
    const uiLeft = document.querySelector("#ui-left");
    /*
    this.#isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    this.#isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");

    if(this.#isRipperSceneNavOn && TopNavigation.navFoldersEnabled){
      if(game.user?.isGM && this.#isRipperSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.ripperScenesCompat"), {permanent: true});
      }
    }
    if(TopNavigation.sceneNavEnabled){
      uiLeft.classList.remove("crlngn-ui");
      
      if(game.ready){
        SettingsUtil.set(SETTINGS.sceneNavEnabled.tag, false);
        TopNavigation.sceneNavEnabled = false;
      }

      LogUtil.log("checkSceneNavCompat", [this.#isMonksSceneNavOn, this.#isRipperSceneNavOn]);
      
      if(game.user?.isGM && this.#isMonksSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
    }
    */
  }

  /**
   * Adds event listeners for navigation interactions
   * Handles hover and click events for navigation expansion/collapse
   */
  static addListeners(){
    TopNavigation.#navElem?.addEventListener("mouseenter", (e)=>{
      LogUtil.log("TopNavigation mouseenter", [ TopNavigation.isCollapsed, TopNavigation.showNavOnHover ]);
    
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
            return;
      }
      e.stopPropagation();
      clearTimeout(TopNavigation.#navTimeout);

      const navigation = document.querySelector("#scene-navigation");
      navigation.classList.add("expanded");
    });

    TopNavigation.#navElem?.addEventListener("mouseleave", (e)=>{
      LogUtil.log("TopNavigation mouseleave", [ ]);
      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){ 
          return;
      }
      e.stopPropagation();

      TopNavigation.#navTimeout = setTimeout(()=>{
        clearTimeout(TopNavigation.#navTimeout);
        TopNavigation.#navTimeout = null;
        const navigation = document.querySelector("#scene-navigation");
        navigation.classList.remove("expanded");
      }, 700);
    });
  }

  /**
   * Places navigation buttons for scrolling through scenes
   * Only adds buttons if navigation is overflowing and buttons don't already exist
   */
  static placeNavButtons(){ 
    const sceneNav = document.querySelector("#scene-navigation");
    const inactiveList = sceneNav.querySelector("#scene-navigation-inactive");
    const existingButtons = sceneNav.querySelectorAll("button.crlngn-btn");

    if(!sceneNav || !inactiveList){
      return;
    }
    const btnWidth = (parseInt(existingButtons[0]?.clientWidth) * 2) || 0;
    const isNavOverflowing = inactiveList ? (inactiveList.clientWidth - btnWidth) < inactiveList.scrollWidth : false;
    LogUtil.log("isNavOverflowing", [isNavOverflowing, inactiveList.clientWidth, btnWidth, inactiveList.scrollWidth]);
  
    if(!isNavOverflowing){
      return;
    }
    existingButtons.forEach(b => b.remove());

    // Insert the preloaded template HTML
    if (typeof this.navButtonsTemplate === 'function') {
      const buttonsHtml = this.navButtonsTemplate();
      sceneNav.insertAdjacentHTML('beforeend', buttonsHtml);
    }
  
    // Add event listeners to the newly inserted buttons
    const btnLast = sceneNav.querySelector("button.crlngn-btn.ui-nav-left");
    const btnNext = sceneNav.querySelector("button.crlngn-btn.ui-nav-right");
  
    if (btnLast) btnLast.addEventListener("click", this.#onNavLast);
    if (btnNext) btnNext.addEventListener("click", this.#onNavNext);
  }

  /**
   * @private
   * Handles click on the 'last' navigation button
   * Scrolls the scene list backward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavLast = async (e) => {
    const itemsPerPage = await TopNavigation.getItemsPerPage();
    const currPos = TopNavigation.navPos || 0;

    let newPos = currPos - (itemsPerPage - 1);
    LogUtil.log("onNavLast", ["pos", currPos, newPos]);
    newPos = newPos < 0 ? 0 : newPos;
    TopNavigation.setNavPosition(newPos);
  }

  /**
   * @private
   * Handles click on the 'next' navigation button
   * Scrolls the scene list forward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavNext = async (e) => {
    const itemsPerPage = await TopNavigation.getItemsPerPage();
    const scenes = TopNavigation.#scenesList?.querySelectorAll("li.nav-item") || [];
    const currPos = TopNavigation.navPos || 0;

    let newPos = currPos + (itemsPerPage - 1);
    LogUtil.log("onNavNext", ["pos", currPos, newPos, itemsPerPage]);
    newPos = newPos > scenes.length - itemsPerPage - 1 ? scenes.length - itemsPerPage - 1 : newPos;
    TopNavigation.setNavPosition(newPos);
  }

  /**
   * Sets the position of the scene navigation list
   * @param {number} [pos] - The position to scroll to. If undefined, uses stored position
   * @param {boolean} [animate=true] - Whether to animate the scroll
   * @param {number} [duration=300] - Duration of the animation in milliseconds (only used when animate is true)
   */
  static setNavPosition(pos=null, animate=true, duration=300) { 
    try {
      const SETTINGS = getSettings();
      
      if(!TopNavigation.#scenesList){ return; }

      const scenes = TopNavigation.#scenesList?.querySelectorAll("li.nav-item") || [];
      const extrasWidth = 0;//this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth || 0 : 0;
      const position = pos!==undefined ? pos : TopNavigation.navPos || 0;
      
      if (scenes.length === 0 || position >= scenes.length) { return; }
      // const firstScene = scenes[0];

      const targetScene = scenes[position];
      const w = targetScene?.offsetWidth || 0;
      const offsetLeft = parseInt(w) * position; //parseInt(targetScene?.offsetLeft);
      if (typeof offsetLeft !== 'number') { return; }

      const newMargin = (offsetLeft - extrasWidth) * 1;
      LogUtil.log("setNavPosition", ['Calculated margin:', position, offsetLeft, newMargin ]);
      
      TopNavigation.navPos = position;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);
      if(newMargin > TopNavigation.#scenesList.scrollWidth){ return; }
      
      if (animate) {
        // Use custom animation with specified duration from GeneralUtil
        GeneralUtil.smoothScrollTo(TopNavigation.#scenesList, newMargin, "horizontal", duration);
      } else {
        // Use instant scroll without animation
        TopNavigation.#scenesList.scrollTo({
          left: newMargin,
          behavior: "instant"
        });
      }
      
      LogUtil.log("setNavPosition", ['Complete']);
    } catch (error) {
      LogUtil.log("setNavPosition", ['Error:', error]);
      console.error('Error in setNavPosition:', error);
    }
  }

  static getItemsPerPage = async () => {
    try {
      LogUtil.log('getItemsPerPage', ['Starting']);
      TopNavigation.resetLocalVars();
      // if(!TopNavigation.#navElem) {
      // //   LogUtil.log('getItemsPerPage', ['No nav element, resetting vars']);
      //   TopNavigation.resetLocalVars();
      // //   // Ensure DOM is ready before accessing element dimensions
      // //   await new Promise(resolve => setTimeout(resolve, 100));
      // }

      // if (!TopNavigation.#navElem) {
      //   LogUtil.log('getItemsPerPage', ['Nav element not found']);
      //   return 0;
      // }

      const folderListWidth = 0; // this.#navElem?.querySelector("#crlngn-scene-folders")?.offsetWidth || 0;
      const extrasWidth = 0; // this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth || 0 : 0;
      const toggleWidth = TopNavigation.#navToggle?.offsetWidth || 0;
      const firstScene = TopNavigation.#scenesList?.querySelector("li:first-child");
      
      if (!firstScene) {
        LogUtil.log('getItemsPerPage', [TopNavigation.#scenesList, 'No scene items found']);
        return 0;
      }

      const itemWidth = firstScene.offsetWidth;
      // const currPos = TopNavigation.navPos || 0;
      const navWidth = TopNavigation.#scenesList?.clientWidth;
      if (!navWidth) {
        LogUtil.log('getItemsPerPage', ['Nav element has no width']);
        return 0;
      }

      const itemsPerPage = Math.floor((navWidth - (toggleWidth*2))/itemWidth);
      LogUtil.log('getItemsPerPage', ['Calculated:', itemsPerPage, navWidth, itemWidth]);
      return itemsPerPage || 0;
    } catch (error) {
      LogUtil.log('getItemsPerPage', ['Error:', error]);
      LogUtil.error('Error in getItemsPerPage:', error);
      return 0;
    }
  }

  /**
   * Preloads the Handlebars templates used by TopNavigation
   * @returns {Promise<boolean>} True when templates are successfully loaded
   */
  static preloadTemplates = async () => {
    try {
      const templatePath = `modules/${MODULE_ID}/templates/scene-nav-buttons.hbs`;
      
      // Load the template
      await loadTemplates([templatePath]);
      
      // Store the compiled template function
      this.navButtonsTemplate = Handlebars.compile(await fetch(templatePath).then(r => r.text()));
      
      return true;
    } catch (error) {
      console.error("Error loading navigation button templates:", error);
      return false;
    }
  }



  static getCurrScenePosition = async (id) => {
    try {
      if (!TopNavigation.#scenesList || !id) {
        return 0;
      }

      const itemsPerPage = await TopNavigation.getItemsPerPage() || 1;
      const sceneItems = TopNavigation.#scenesList.querySelectorAll("li.nav-item");

      if (!sceneItems || sceneItems.length === 0) {
        return 0;
      }

      const sceneArray = Array.from(sceneItems);
      const sceneIndex = sceneArray.findIndex(item => item.dataset.sceneId === id);
      if (sceneIndex === -1) {
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

  static #onActivateScene = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.entryId || data.sceneId);
    LogUtil.log("#onActivateScene",[data, scene]);
    scene.activate();
    // Clear the single-click timer if it exists
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      TopNavigation.#sceneClickTimer = null;
    }
    
  }

  static #onSelectScene = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    
    // document.removeEventListener('click', SceneNavFolders.#onOutsideClick);
    const target = evt.currentTarget;
    const data = target.dataset;
    const scene = game.scenes.get(data.entryId || data.sceneId);
    // const isSearchResult = target.parentElement?.classList.contains('search-results');
    
    LogUtil.log("#onSelectScene",[scene]);
    // Temporarily override the sheet.render method to prevent scene configuration
    if (scene && scene.sheet) {
      const originalRender = scene.sheet.render;
      LogUtil.log("#onSelectScene - originalRender",[originalRender]);
      scene.sheet.render = function() { return this; };
      // Restore the original method after a short delay
      setTimeout(() => {
        scene.sheet.render = originalRender;
      }, 300);
    }

    // Clear any existing timer
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      TopNavigation.#sceneClickTimer = null;
    }

    // Set a new timer for the click action
    TopNavigation.#sceneClickTimer = setTimeout(() => {
      // if(isSearchResult){
      //   scene.navigation = true;
      //   // SceneNavFolders.selectedFolder = SceneNavFolders.selectFolder(DEFAULT_FOLDER_ID);
      // }
      scene.view();
      // SceneNavFolders.refreshFolderView();
      TopNavigation.#sceneClickTimer = null;
      
    }, 500); // 350ms delay to wait for potential double-click
  }

    /**
   * Adds click event listeners to scene items in the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static addSceneListeners = (html) => {
    const sceneItems = html.querySelectorAll("li.scene");
    sceneItems.forEach(li => {
      const isFolder = li.classList.contains("folder");
      li.addEventListener("click", TopNavigation.#onSelectScene);
      li.addEventListener("dblclick", TopNavigation.#onActivateScene);
    });
  }
  
}
