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
  static #previewedScene = '';
  static #visitedScenes = [];
  // settings
  static useFadeOut = true;
  static sceneNavEnabled;
  static navFoldersEnabled;
  static navFoldersForPlayers;
  static navShowRootFolders;
  static navStartCollapsed;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useSceneBackButton;
  static sceneClickToView;
  static isCollapsed;
  static navPos;

  static init = () => {
    const SETTINGS = getSettings();

    // Load settings first
    TopNavigation.navStartCollapsed = SettingsUtil.get(SETTINGS.navStartCollapsed.tag);
    TopNavigation.showNavOnHover = SettingsUtil.get(SETTINGS.showNavOnHover.tag);
    TopNavigation.sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    TopNavigation.useScenePreview = SettingsUtil.get(SETTINGS.useScenePreview.tag);
    TopNavigation.navFoldersEnabled = SettingsUtil.get(SETTINGS.navFoldersEnabled.tag);
    TopNavigation.navFoldersForPlayers = SettingsUtil.get(SETTINGS.navFoldersForPlayers.tag);
    TopNavigation.isCollapsed = TopNavigation.navStartCollapsed;

    LogUtil.log("SCENE NAV INIT", [TopNavigation.sceneNavEnabled]);
    const body = document.querySelector("body");
    if(TopNavigation.sceneNavEnabled){
      body.classList.add("crlngn-scene-nav");
    }else{
      body.classList.remove("crlngn-scene-nav");
      return;
    }
    this.checkSceneNavCompat();
    this.preloadTemplates();
    SceneNavFolders.init();

    Hooks.on(HOOKS_CORE.READY, () => {
      TopNavigation.handleSceneFadeOut();
      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 42);
      }
    })

    // execute on render scene navigation
    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, TopNavigation.onRender);
    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => {
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => {
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => {
      ui.nav.render();
    });
    Hooks.on(HOOKS_CORE.CANVAS_INIT, ()=>{
      const sceneId = game.scenes?.viewed?.id;
      if(sceneId !== TopNavigation.#visitedScenes[TopNavigation.#visitedScenes.length-1]){
        TopNavigation.#visitedScenes.push(sceneId);
      }
      TopNavigation.handleSceneFadeOut();
    })

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
      if(collapsed){
        const existingButtons = document.querySelectorAll("#ui-left .crlngn-btn");
        existingButtons.forEach(b => b.remove());
      }
      
      TopNavigation.#timeout = setTimeout(()=>{
        TopNavigation.setCollapsedClass(collapsed);
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
          sc.addEventListener("dblclick", TopNavigation.onActivateScene); // onActivateScene
          sc.addEventListener("click", TopNavigation.onSelectScene);
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

  static applyFadeOut(useFadeOut){
    TopNavigation.useFadeOut = useFadeOut;

    LogUtil.log("applyFadeOut", [useFadeOut]);
    TopNavigation.handleSceneFadeOut();
  }

  static applyCustomStyle(enabled){
    TopNavigation.sceneNavEnabled = enabled;
    LogUtil.log("applyCustomStyle - TopNavigation", [TopNavigation.sceneNavEnabled, ui.nav]);
    // if(ui.nav) ui.nav.render();
  }

  static onRender = (nav, navHtml, navData) => {
    const SETTINGS = getSettings();
    const scenePage = SettingsUtil.get(SETTINGS.sceneNavPos.tag);
    LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV , [navHtml]);

    TopNavigation.resetLocalVars();
    TopNavigation.handleSceneFadeOut(nav, navHtml, navData);
    if(TopNavigation.sceneNavEnabled){
      TopNavigation.handleBackButton(nav, navHtml, navData);
      TopNavigation.handleSceneList(nav, navHtml, navData);
      TopNavigation.handleFolderList(nav, navHtml, navData);
      TopNavigation.setNavPosition(scenePage, false);
      TopNavigation.handleNavState();
    }
    
    TopNavigation.addSceneListeners(navHtml);
    TopNavigation.addListeners();
    TopNavigation.resetLocalVars();

    if(TopNavigation.sceneNavEnabled && TopNavigation.navShowRootFolders){
      SceneNavFolders.init();
      SceneNavFolders.renderFolderList();
    }
    
    LogUtil.log(HOOKS_CORE.RENDER_SCENE_NAV);
    
    if(TopNavigation.sceneNavEnabled){
      clearTimeout(TopNavigation.#timeout);
      TopNavigation.#timeout = setTimeout(()=>{
        LogUtil.log("NAV no transition remove");
        TopNavigation.placeNavButtons();
      }, 500);
    }
  }

  static setCollapsedClass = (collapsed) => {
    if(collapsed){
      TopNavigation.#uiLeft.classList.add('navigation-collapsed');

      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 10);
      }
    }else{
      TopNavigation.#uiLeft.classList.remove('navigation-collapsed');
      TopNavigation.placeNavButtons();

      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 42);
      }
    }
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
  static handleSceneList = async (nav, navHtml, navData) =>{
    if(TopNavigation.sceneNavEnabled){
      LogUtil.log("handleSceneList", [nav, navHtml, navData]);

      const allSceneLi = navHtml.querySelectorAll(".scene-navigation-menu li.scene");
      // allSceneLi.forEach(async (li) => {
      for(const li of allSceneLi){
        const id = li.dataset.sceneId;

        // add scene preview
        if(TopNavigation.useScenePreview){
          const sceneData = game.scenes.find(sc => sc.id === id);
          sceneData.isGM = game.user?.isGM;
          const previewTemplate = await renderTemplate(
            `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`, 
            sceneData
          );
          LogUtil.log("sceneData", [sceneData]);
          li.classList.add('nav-item');
          li.insertAdjacentHTML('beforeend', previewTemplate);

          if(sceneData.isGM && TopNavigation.#previewedScene === id){
            const mouseEnterEvent = new MouseEvent('mouseenter');
            li.dispatchEvent(mouseEnterEvent);
          }
          
          // Add click handlers to the preview icons if user is GM
          if (game.user?.isGM) {
            TopNavigation.addPreviewIconListeners(li, sceneData);          
          }
        }
        
        // add custom scene icons
        if(TopNavigation.useSceneIcons){
          if(li.classList.contains('active') || li.classList.contains('view')){
            li.classList.add('crlngn');
          }
        }
      }
    }

    if(TopNavigation.sceneNavEnabled && game.scenes.size > 1){
      const navToggle = navHtml.querySelector("#scene-navigation-expand");
      const column2 = document.querySelector("#ui-left-column-2");
      const existingToggle = document.querySelector("#crlngn-scene-navigation-expand");
      if(existingToggle){ existingToggle.remove(); }
      
      const toggleClone = navToggle?.cloneNode(true);
      toggleClone.id = "crlngn-scene-navigation-expand";
      toggleClone.addEventListener("click", () => {
        navToggle.click(); // This will trigger the original handler
      });
      LogUtil.log("toggle events", [nav, toggleClone]);

      column2.prepend(toggleClone);
    }
  }

  static handleSceneFadeOut(nav, navHtml, navData){
    const uiLeftColumn2 = document.querySelector("#ui-left-column-2");
    const currNav = navHtml ? navHtml : document.querySelector("#ui-left-column-2 #scene-navigation") || null;

    LogUtil.log("handleSceneFadeOut",[navHtml, currNav, document.querySelector("#ui-left-column-2 #scene-navigation")]);
    
    if(TopNavigation.sceneNavEnabled){
      // Custom layout is enabled
      currNav?.classList.remove("faded-ui");
      if(TopNavigation.useFadeOut){
        uiLeftColumn2?.classList.add("faded-ui");
      }else{
        uiLeftColumn2?.classList.remove("faded-ui");
      }
    }else{
      // Custom layout is disabled
      if(TopNavigation.useFadeOut){
        currNav?.classList.add("faded-ui");
      }else{
        currNav?.classList.remove("faded-ui");
      }
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
    if(game.scenes.size < 2){ return; }
    const SETTINGS = getSettings();
    LogUtil.log("handleBackButton",[nav, navHtml, navData]);
    if(!TopNavigation.useSceneBackButton){ return; }
    const sceneNav = navHtml.querySelector("#scene-navigation-active");
    const backButton = document.createElement("button");
    backButton.id = "crlngn-back-button";
    backButton.innerHTML = "<i class='fa fa-turn-left'></i>";
    backButton.addEventListener("click", TopNavigation.#onBackButton);

    sceneNav.prepend(backButton);
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

    const length = TopNavigation.#visitedScenes.length
    const previousSceneId = TopNavigation.#visitedScenes[length-2];
    let scene;

    LogUtil.log("#onBackButton before",[ length, previousSceneId, TopNavigation.#visitedScenes ]);
    if(previousSceneId && previousSceneId !== game.scenes.current?.id){
      scene = game.scenes.get(previousSceneId);
      if(scene) scene.view();
      TopNavigation.#visitedScenes.pop();
    }
    LogUtil.log("#onBackButton after",[ TopNavigation.#visitedScenes ]);

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
      TopNavigation.resetLocalVars();

      if(collapsed===true){
        ui.nav.collapse();
        TopNavigation.isCollapsed = true;
        LogUtil.log("toggleNav collapse", [collapsed, TopNavigation.navStartCollapsed]);
        const existingButtons = document.querySelectorAll("#ui-left .crlngn-btn");
        existingButtons.forEach(b => b.remove());
      }else if(collapsed===false){
        TopNavigation.isCollapsed = false;
        ui.nav.expand();
        LogUtil.log("toggleNav expand", [collapsed, TopNavigation.navStartCollapsed]);
      }
    }, 300);
    
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
      LogUtil.log("TopNavigation mouseenter", [ TopNavigation.isCollapsed, TopNavigation.showNavOnHover ]);;

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
  static placeNavButtons = async() => { 
    const sceneNav = document.querySelector("#scene-navigation");
    const sceneList = sceneNav.querySelector("#scene-navigation-inactive");
    const existingButtons = document.querySelectorAll("#ui-left .crlngn-btn");

    if(!sceneNav){
      return;
    }
    
    const btnWidth = (TopNavigation.#navToggle?.offsetWidth * 2) || 0;
    const isNavOverflowing = (sceneNav.offsetWidth - btnWidth) < sceneNav.scrollWidth;
    LogUtil.log("placeNavButtons *", [TopNavigation.isCollapsed, isNavOverflowing, existingButtons]);
    
    existingButtons.forEach(b => b.remove());
    if(!isNavOverflowing 
      || TopNavigation.isCollapsed 
      || TopNavigation.#uiLeft.classList.contains('navigation-collapsed')){
      return;
    }
    // Render nav buttons template
    const buttonsHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-buttons.hbs`, 
      {}
    );
    sceneNav.insertAdjacentHTML('afterend', buttonsHtml);
  
    // Add event listeners to the newly inserted buttons
    const btnLast = sceneNav.parentNode.querySelector("button.crlngn-btn.ui-nav-left");
    const btnNext = sceneNav.parentNode.querySelector("button.crlngn-btn.ui-nav-right");
  
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

    if(!TopNavigation.#scenesList || !TopNavigation.#navElem){ return; }

    let newPos = currPos - (itemsPerPage - 1);
    LogUtil.log("onNavLast", ["pos", newPos, TopNavigation.#navElem.scrollWidth]);
    
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
    // const scenes = TopNavigation.#scenesList?.querySelectorAll("li.nav-item") || [];
    const currPos = TopNavigation.navPos || 0;
    const firstScene = TopNavigation.#navElem?.querySelector("li.nav-item:first-of-type");
    const itemWidth = firstScene?.offsetWidth || 0;
    const scrollWidth = TopNavigation.#navElem?.scrollWidth || 0;

    if(!itemWidth || !TopNavigation.#navElem){ return; }

    let newPos = currPos + (itemsPerPage - 1);
    let newPosPx = newPos * itemWidth;
    LogUtil.log("onNavNext", ["pos", currPos, newPos, firstScene?.offsetWidth, newPosPx, scrollWidth]);

    if(newPosPx >= scrollWidth){
      newPos = Math.floor(scrollWidth/itemWidth);
    }
    TopNavigation.setNavPosition(newPos);
  }

  /**
   * Sets the position of the scene navigation list, with or without animation
   * @param {number} [pos] - The position to scroll to. If undefined, uses stored position
   * @param {boolean} [animate=true] - Whether to animate the scroll
   * @param {number} [duration=400] - Duration of the animation in milliseconds (only used when animate is true)
   */
  static setNavPosition(pos=null, animate=true, duration=400) { 
    try {
      const SETTINGS = getSettings();
      
      if(!TopNavigation.#navElem){ return; }

      const scenes = TopNavigation.#navElem?.querySelectorAll("li.nav-item") || [];
      const extrasWidth = 0;//this.#isRipperSceneNavOn ? this.#navExtras?.offsetWidth || 0 : 0;
      const position = pos!==null ? pos : TopNavigation.navPos || 0;
      const firstScene = TopNavigation.#navElem?.querySelector("li.nav-item:first-of-type");
      
      if(!firstScene){ return; }
      // if (scenes.length === 0 || position > Math.ceil(TopNavigation.#navElem.scrollWidth/itemWidth)) { return; }
      // const firstScene = scenes[0];

      const targetScene = scenes[position];
      const w = firstScene.offsetWidth || 0;
      const offsetLeft = parseInt(w) * position; //parseInt(targetScene?.offsetLeft);
      LogUtil.log("setNavPosition", ['position', position, offsetLeft, TopNavigation.#navElem.scrollWidth ]);
      
      // if (typeof offsetLeft !== 'number') { return; }

      const newMargin = (offsetLeft - extrasWidth);
      if(newMargin > TopNavigation.#navElem.scrollWidth){ return; }
      
      TopNavigation.navPos = position;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);
      
      if (animate) {
        // Use custom animation with specified duration from GeneralUtil
        GeneralUtil.smoothScrollTo(TopNavigation.#navElem, newMargin, "horizontal", duration);
        // TopNavigation.#navElem.scrollTo({
        //   left: newMargin,
        //   behavior: "smooth"
        // })
      } else {
        // Use instant scroll without animation
        TopNavigation.#navElem.scrollTo({
          left: newMargin,
          behavior: "instant"
        });
      }
    } catch (error) {
      LogUtil.log("setNavPosition", ['Error:', error]);
      console.error('Error in setNavPosition:', error);
    }
  }

  /**
   * Calculates the number of scenes that can fit in the navigation area
   * @returns {Promise<number>} The number of scenes that can fit in the navigation area
   */
  static getItemsPerPage = async () => {
    try {
      LogUtil.log('getItemsPerPage', ['Starting']);
      TopNavigation.resetLocalVars();

      const folderListWidth = 0; 
      const extrasWidth = 0; 
      const toggleWidth = TopNavigation.#navToggle?.offsetWidth || 0;
      const firstScene = TopNavigation.#navElem?.querySelector("li.nav-item:first-of-type");
      
      if (!firstScene || !TopNavigation.#navElem) {
        LogUtil.log('getItemsPerPage', ['No scene items found']);
        return 0;
      }

      const itemWidth = firstScene.offsetWidth;
      const navWidth = TopNavigation.#navElem.offsetWidth;
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
      const templatePaths = [
        `modules/${MODULE_ID}/templates/scene-nav-buttons.hbs`,
        `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`
      ];
      
      // Load the templates
      await loadTemplates(templatePaths);
      
      return true;
    } catch (error) {
      console.error("Error loading navigation button templates:", error);
      return false;
    }
  }

  static getCurrScenePosition = async (id) => {
    try {
      if (!TopNavigation.#navElem || !id) {
        return 0;
      }

      const itemsPerPage = await TopNavigation.getItemsPerPage() || 1;
      const sceneItems = TopNavigation.#navElem.querySelectorAll("li.nav-item");

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

  static onActivateScene = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const isInner = target.classList.contains("scene-name");
    const data = isInner ? target.parentNode.dataset : target.dataset;
    const scene = game.scenes.get(data.entryId || data.sceneId);
    LogUtil.log("onActivateScene",[data, scene]);
    scene.activate();
    // Clear the single-click timer if it exists
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      TopNavigation.#sceneClickTimer = null;
    }
    
  }

  static onSelectScene = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const target = evt.currentTarget;
    const isInner = target.classList.contains("scene-name");
    const data = isInner ? target.parentNode.dataset : target.dataset;
    const scene = game.scenes.get(data.entryId || data.sceneId);
    // const isSearchResult = target.parentElement?.classList.contains('search-results');
    
    TopNavigation.#previewedScene = '';
    LogUtil.log("onSelectScene",[scene, target, isInner]);

    // Temporarily override the sheet.render method to prevent scene configuration
    if (scene && scene.sheet) {
      const originalRender = scene.sheet.render;
      LogUtil.log("onSelectScene - originalRender",[originalRender]);
      scene.sheet.render = function() { return this; };
      // Restore the original method after a short delay
      setTimeout(() => {
        scene.sheet.render = originalRender;
      }, 250);
    }

    // Clear any existing timer
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      TopNavigation.#sceneClickTimer = null;
    }

    // Set a new timer for the click action
    TopNavigation.#sceneClickTimer = setTimeout(() => {
      scene.view();
      TopNavigation.#sceneClickTimer = null;
    }, 250); // 250ms delay to wait for potential double-click
  }

  static onScenePreviewOn = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    const data = target.dataset;
    TopNavigation.#previewedScene = data.sceneId;
    LogUtil.log("onScenePreviewOn", [TopNavigation.#previewedScene]);

    target.querySelector(".scene-preview").classList.add('open');
  }

  static onScenePreviewOff = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    const target = evt.currentTarget;
    TopNavigation.#previewedScene = '';
    LogUtil.log("onScenePreviewOff", []);

    target.querySelector(".scene-preview").classList.remove('open');
  }

  /**
   * Adds click event listeners to scene items in the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static addSceneListeners = (html) => {
    const sceneItems = html.querySelectorAll("li.scene");
    sceneItems.forEach(li => {
      const isFolder = li.classList.contains("folder");
      li.querySelector(".scene-name").addEventListener("click", TopNavigation.onSelectScene);
      li.querySelector(".scene-name").addEventListener("dblclick", TopNavigation.onActivateScene);
      if(TopNavigation.useScenePreview){
        li.addEventListener("mouseenter", TopNavigation.onScenePreviewOn);
        li.addEventListener("mouseleave", TopNavigation.onScenePreviewOff);
      }
    });
  }
  
  /**
   * Adds click event listeners to the icons in the scene preview
   * @param {HTMLElement} sceneElement - The scene element containing the preview
   * @param {Scene} sceneData - The scene data
   */
  static addPreviewIconListeners = (sceneElement, sceneData) => {
    if (!sceneElement || !sceneData) return;
    
    const scene = game.scenes.get(sceneData.id);
    if (!scene) return;
    
    const previewDiv = sceneElement.querySelector('.scene-preview');
    if (!previewDiv) return;
    
    // Global illumination icon
    const ilumIcon = previewDiv.querySelector('.ilum');
    if (ilumIcon) {
      ilumIcon.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        // Toggle global illumination
        const currentValue = scene.environment.globalLight.enabled;
        
        // Update the scene
        await scene.update({
          'environment.globalLight.enabled': !currentValue
        });
        LogUtil.log("Toggled global illumination", [!currentValue]);
      });
    }
    
    // Token vision icon
    const tokenVisionIcon = previewDiv.querySelector('.token-vision');
    if (tokenVisionIcon) {
      tokenVisionIcon.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        // Toggle token vision
        const currentValue = scene.tokenVision;
        
        // Update the scene
        await scene.update({
          'tokenVision': !currentValue
        });
        LogUtil.log("Toggled token vision", [!currentValue]);
      });
    }
    
    // Sound icon - only if there's a playlist sound
    const soundIcon = previewDiv.querySelector('.sound');
    if (soundIcon && scene.playlistSound) {
      soundIcon.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        // Toggle playlist sound
        const playlistSound = scene.playlistSound;
        if (playlistSound) {
          const playing = playlistSound.sound.playing;
          
          // Toggle the sound
          if (playing) {
            await playlistSound.sound.pause();
          } else {
            await playlistSound.sound.play();
          }
          ui.nav.render();
          LogUtil.log("Toggled playlist sound", [!playing]);
        }
      });
    }
    
    // Config icon
    const configIcon = previewDiv.querySelector('.config');
    if (configIcon) {
      configIcon.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        
        // Open scene configuration
        scene.sheet.render(true);
        LogUtil.log("Opened scene configuration");
      });
    }
    

  }
  
}
