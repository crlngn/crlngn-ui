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
  static #sceneHoverTimeout = null;
  static #previewedScene = '';
  static #visitedScenes = [];
  static #preventNavRender = false;
  static #originalRenderMethod;
  // settings
  static useFadeOut = true;
  static hidden = false;
  static sceneNavEnabled;
  static useSceneFolders;
  static navFoldersForPlayers;
  static navShowRootFolders;
  static navStartCollapsed;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useSceneBackButton;
  static useSceneLookup;
  static sceneClickToView;
  static isCollapsed;
  static navPos;

  static init = () => {
    const SETTINGS = getSettings();

    // execute on render scene navigation
    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, TopNavigation.onRender);
    // Load settings first
    TopNavigation.loadSettings();

    LogUtil.log("SCENE NAV INIT", [TopNavigation.sceneNavEnabled]);
    const body = document.querySelector("body");
    if(TopNavigation.sceneNavEnabled){
      body.classList.add("crlngn-scene-nav");
    }else{
      body.classList.remove("crlngn-scene-nav");
    }
    if(TopNavigation.sceneNavEnabled){
      this.checkSceneNavCompat();
      this.preloadTemplates();
      SceneNavFolders.init();
      
      Hooks.on(HOOKS_CORE.READY, () => {
        TopNavigation.handleSceneFadeOut();
        if(GeneralUtil.isModuleOn("forien-quest-log")){
          Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 42);
        }
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
          TopNavigation.updateToggleButton(!collapsed);
        }, 250);
      });

      // execute once on start
      if(ui.sidebar){TopNavigation.checkSideBar(ui.sidebar.expanded);}
      TopNavigation.placeNavButtons();
    }

    Hooks.on(HOOKS_CORE.CREATE_SCENE, () => {
      ui.nav?.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, () => {
      if(TopNavigation.#preventNavRender){ 
        TopNavigation.#preventNavRender = false;
        return; 
      }
      LogUtil.log(HOOKS_CORE.UPDATE_SCENE, [TopNavigation.#preventNavRender]);
      // ui.nav?.render();
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, () => {
      ui.nav?.render();
    });

    Hooks.on(HOOKS_CORE.CANVAS_INIT, ()=>{
      const sceneId = game.scenes?.viewed?.id;
      if(sceneId !== TopNavigation.#visitedScenes[TopNavigation.#visitedScenes.length-1]){
        TopNavigation.#visitedScenes.push(sceneId);
      }
      TopNavigation.handleSceneFadeOut();
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

  }

  static applyFadeOut(useFadeOut){
    TopNavigation.useFadeOut = useFadeOut;

    LogUtil.log("applyFadeOut", [useFadeOut]);
    TopNavigation.handleSceneFadeOut();
  }

  static applyHide(hidden){
    TopNavigation.hidden = hidden;
    TopNavigation.handleHide();
  }

  static handleHide(){
    const element = document.querySelector("#scene-navigation");
    const toggle = document.querySelector("#crlngn-scene-navigation-expand");
    const btns = document.querySelectorAll("#ui-left-column-2 .crlngn-btn");
    if(TopNavigation.hidden){
      element?.classList.add("hidden-ui");
      toggle?.classList.add("hidden-ui");
      btns.forEach((btn) => {
        btn.classList.add("hidden-ui");
      });
    }else{
      element?.classList.remove("hidden-ui");
      toggle?.classList.remove("hidden-ui");
      btns.forEach((btn) => {
        btn.classList.remove("hidden-ui");
      });
    }
    LogUtil.log("handle Hide", [TopNavigation.hidden]);
  }

  static applyCustomStyle(enabled){
    TopNavigation.sceneNavEnabled = enabled;
    LogUtil.log("applyCustomStyle - TopNavigation", [TopNavigation.sceneNavEnabled, ui.nav]);
    // if(ui.nav) ui.nav.render();
  }

  static onRender = (nav, navHtml, navData) => {
    const SETTINGS = getSettings();
    const scenePage = SettingsUtil.get(SETTINGS.sceneNavPos.tag);
    if(TopNavigation.preventNavRender){ return; }
    LogUtil.log("onRender - "+HOOKS_CORE.RENDER_SCENE_NAV, [navHtml]);

    TopNavigation.resetLocalVars();
    if(TopNavigation.sceneNavEnabled){
      TopNavigation.handleExtraButtons(nav, navHtml, navData);
      TopNavigation.handleSceneList(nav, navHtml, navData);
      TopNavigation.handleFolderList(nav, navHtml, navData);
      TopNavigation.setNavPosition(scenePage, false);
      TopNavigation.handleNavState();
      // TopNavigation.applyButtonSettings();
      TopNavigation.addSceneListeners(navHtml);
    }
    TopNavigation.addListeners();
    TopNavigation.resetLocalVars();

    if(TopNavigation.sceneNavEnabled && TopNavigation.navShowRootFolders && game.user.isGM){
      SceneNavFolders.init();
      SceneNavFolders.renderFolderList();
    }
    
    if(TopNavigation.sceneNavEnabled){
      clearTimeout(TopNavigation.#timeout);
      TopNavigation.#timeout = setTimeout(()=>{
        LogUtil.log("NAV no transition remove");
        TopNavigation.placeNavButtons();
      }, 500);
    }
    TopNavigation.handleSceneFadeOut(nav, navHtml, navData);
  }

  static setCollapsedClass = (collapsed) => {
    const body = document.querySelector("body");
    if(collapsed){
      TopNavigation.#uiLeft.classList.add('navigation-collapsed');
      body.classList.add('navigation-collapsed');

      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 10);
      }
    }else{
      TopNavigation.#uiLeft.classList.remove('navigation-collapsed');
      body.classList.remove('navigation-collapsed');
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
    TopNavigation.#navToggle = document.querySelector("#crlngn-scene-navigation-expand"); 
    TopNavigation.#uiLeft = document.querySelector("#ui-left");
    TopNavigation.#scenesList = document.querySelector("#scene-navigation-inactive");
  }

  /**
   * Add scene preview to nav, if the setting is enabled
   */
  static handleSceneList = async (nav, navHtml, navData) =>{
    LogUtil.log("handleSceneList", [nav, navHtml, navData]);

    const allSceneLi = navHtml.querySelectorAll(".scene-navigation-menu li.scene");
    // allSceneLi.forEach(async (li) => {
    for(const li of allSceneLi){
      const id = li.dataset.sceneId;

      // add scene preview
      if(TopNavigation.useScenePreview){
        const sceneData = game.scenes.find(sc => sc.id === id);
        sceneData.isGM = game.user?.isGM;

        const previewTemplate = await GeneralUtil.renderTemplate(
          `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`, 
          sceneData
        );
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
        li.classList.add('crlngn');
      }
    }

    // && game.scenes.size > 1
    LogUtil.log("handleSceneList #2", [TopNavigation.sceneNavEnabled]);
    if(TopNavigation.sceneNavEnabled){
      const column2 = document.querySelector("#ui-left-column-2");
      const existingToggle = document.querySelector("#crlngn-scene-navigation-expand");

      LogUtil.log("handleSceneList #3", [column2]);
      if(!column2){ return; }
      if(existingToggle){ existingToggle.remove(); }
      
      // Create toggle element from template
      const toggleHtml = await GeneralUtil.renderTemplate(
        `modules/${MODULE_ID}/templates/scene-nav-toggle.hbs`,
        {
          isExpanded: ui.nav?.expanded || false
        }
      );
      
      // Insert the template HTML
      column2.insertAdjacentHTML('afterbegin', toggleHtml);
      
      // Get the newly inserted element and add click listener
      const toggleElement = document.querySelector("#crlngn-scene-navigation-expand");
      if (toggleElement) {
        toggleElement.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          
          if (!ui.nav) return;
          
          LogUtil.log("Toggle nav clicked", ["expanded:", ui.nav.expanded]);
          
          // Toggle the navigation using the centralized method
          // toggleNav expects collapsed state, so we pass the current expanded state
          TopNavigation.toggleNav(ui.nav.expanded);
        });
      }

      TopNavigation.handleHide();
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

  // /**
  //  * Add back button to the active scenes menu,
  //  * unless it is turned off in settings
  //  * @param {SceneNavigation} nav - The scene navigation instance
  //  * @param {HTMLElement} navHtml - The navigation HTML element
  //  * @param {SceneNavData} navData - The scene navigation data
  //  * @returns {void}
  //  */
  // static handleBackButton(nav, navHtml, navData){
  //   const SETTINGS = getSettings();
  //   LogUtil.log("handleBackButton",[nav, navHtml, navData]);
  //   if(TopNavigation.useSceneBackButton){ 
  //     if(game.scenes.size < 2){ return; }
  //     const sceneNav = navHtml.querySelector("#scene-navigation-active");
  //     const backButton = document.createElement("button");
  //     backButton.id = "crlngn-back-button";
  //     backButton.innerHTML = "<i class='fa fa-turn-left'></i>";
      
  //     sceneNav.prepend(backButton);
  //   }else{
  //     const existingBackButton = document.querySelector("#crlngn-back-button");
  //     navHtml.classList.add("no-back-button");
  //     if(existingBackButton){ existingBackButton.remove(); }
  //   }
    
  // }

  /**
   * Handles the folder list in the scene navigation
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   * @returns {void}
   */
  static handleFolderList(nav, navHtml, navData){
    if(!TopNavigation.useSceneFolders || !game.user?.isGM){ return; }
    SceneNavFolders.addFolderButtons(nav, navHtml, navData);
  }

  /**
   * Add back button to the active scenes menu,
   * unless it is turned off in settings
   * @param {SceneNavigation} nav - The scene navigation instance
   * @param {HTMLElement} navHtml - The navigation HTML element
   * @param {SceneNavData} navData - The scene navigation data
   * @returns {void}
   */
  static handleExtraButtons = async(nav, navHtml, navData) => {
    const SETTINGS = getSettings();
    LogUtil.log("handleExtraButtons",[nav, navHtml, navData]);

    const extraButtonsTemplate = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-extra-buttons.hbs`, 
      {
        useSceneBackButton: TopNavigation.useSceneBackButton,
        useSceneFolders: game.user?.isGM ? TopNavigation.useSceneFolders : false,
        useSceneLookup: game.user?.isGM ? TopNavigation.useSceneLookup : false,
        backButtonTooltip: game.i18n.localize("CRLNGN_UI.ui.sceneNav.backButtonTooltip"),
        sceneLookupTooltip: game.i18n.localize("CRLNGN_UI.ui.sceneNav.sceneLookupTooltip"),
        isGM: game.user?.isGM,
      }
    );

    navHtml.querySelector("#scene-navigation-active")?.insertAdjacentHTML("afterbegin", extraButtonsTemplate);
    const backButton = navHtml.querySelector("#crlngn-back-button");
    if(backButton){
      backButton.addEventListener("click", TopNavigation.#onBackButton);
    }

    // folder lookup button and search block
    if(TopNavigation.sceneNavEnabled && TopNavigation.useSceneLookup && game.user?.isGM){
      SceneNavFolders.handleFolderLookup(nav, navHtml, navData);
    }
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
   * Updates the toggle button's visual state (icon, tooltip, aria-label)
   * @param {boolean} isExpanded - Whether the navigation is expanded
   */
  static updateToggleButton(isExpanded) {
    const toggleElement = document.querySelector("#crlngn-scene-navigation-expand");
    if (!toggleElement) return;
    
    const iconElement = toggleElement.querySelector("i");
    const sceneNav = document.querySelector("#scene-navigation");
    
    // Update scene nav expanded class
    sceneNav?.classList.toggle("expanded", isExpanded);
    
    // Update icon
    if (iconElement) {
      iconElement.classList.toggle("fa-caret-down", !isExpanded);
      iconElement.classList.toggle("fa-caret-up", isExpanded);
    }
    
    // Update tooltip and aria-label
    const tooltipKey = isExpanded ? "SCENE_NAVIGATION.COLLAPSE" : "SCENE_NAVIGATION.EXPAND";
    const tooltipText = game.i18n.localize(tooltipKey);
    toggleElement.setAttribute("data-tooltip", tooltipKey);
    toggleElement.setAttribute("aria-label", tooltipText);
  }

  /**
   * Toggles the navigation bar's collapsed state
   * @param {boolean} collapsed - Whether the navigation should be collapsed
   */
  static toggleNav(collapsed){
    // clearTimeout(TopNavigation.#collapseTimeout);
    // TopNavigation.#collapseTimeout = setTimeout(()=>{
      TopNavigation.resetLocalVars();

      if(collapsed===true){
        ui.nav.collapse();
        TopNavigation.isCollapsed = true;
        LogUtil.log("toggleNav collapse", [ui.nav.collapse, collapsed, TopNavigation.navStartCollapsed]);
        const existingButtons = document.querySelectorAll("#ui-left .crlngn-btn");
        existingButtons.forEach(b => b.remove());
        TopNavigation.updateToggleButton(false);
      }else if(collapsed===false){
        TopNavigation.isCollapsed = false;
        ui.nav.expand();
        LogUtil.log("toggleNav expand", [collapsed, TopNavigation.navStartCollapsed]);
        TopNavigation.updateToggleButton(true);
      }
    // }, 300);
    
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

    if(this.#isRipperSceneNavOn && TopNavigation.useSceneFolders){
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

  // static applyButtonSettings(){
  //   const SETTINGS = getSettings();
  //   let numButtons = 1;

  //   if(TopNavigation.useSceneBackButton){ numButtons++; }
  //   if(TopNavigation.useSceneLookup){ numButtons++; }
    
  //   // GeneralUtil.addCSSVars('--scene-list-left',`calc(var(--left-control-item-size) * ${numButtons})`);
  // }

  static #onSceneNavMouseOn = (e)=>{
    LogUtil.log("TopNavigation mouseenter", [ ]);

    if( !TopNavigation.isCollapsed ||
        !TopNavigation.showNavOnHover ){ 
          return;
    }
    e.stopPropagation();
    clearTimeout(TopNavigation.#navTimeout);

    const navigation = document.querySelector("#scene-navigation");
    navigation.classList.add("expanded");
  }

  static #onSceneNavMouseOff = (e)=>{
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
  }

  /**
   * Adds event listeners for navigation interactions
   * Handles hover and click events for navigation expansion/collapse
   */
  static addListeners(){
    TopNavigation.#navElem?.removeEventListener("mouseenter", TopNavigation.#onSceneNavMouseOn);
    TopNavigation.#navElem?.removeEventListener("mouseleave", TopNavigation.#onSceneNavMouseOff);
    TopNavigation.#navElem?.addEventListener("mouseenter", TopNavigation.#onSceneNavMouseOn);
    TopNavigation.#navElem?.addEventListener("mouseleave", TopNavigation.#onSceneNavMouseOff);
  }

  /**
   * Places navigation buttons for scrolling through scenes
   * Only adds buttons if navigation is overflowing and buttons don't already exist
   */
  static placeNavButtons = async() => { 
    const sceneNav = document.querySelector("#scene-navigation");
    if(!sceneNav){
      return;
    }
    
    const sceneList = sceneNav.querySelector("#scene-navigation-inactive");
    let existingButtons = document.querySelectorAll("button.crlngn-btn");
    // existingButtons.forEach(b => b.remove());
    
    const btnWidth = (TopNavigation.#navToggle?.offsetWidth * 2) || 0;
    const isNavOverflowing = (sceneNav.offsetWidth - btnWidth) < sceneNav.scrollWidth;
    LogUtil.log("placeNavButtons *", [TopNavigation.isCollapsed, isNavOverflowing, existingButtons]);
    
    if(!isNavOverflowing 
      || TopNavigation.isCollapsed 
      || TopNavigation.#uiLeft.classList.contains('navigation-collapsed')){
      existingButtons.forEach(b => {
        LogUtil.log("placeNavButtons remove", [b.remove, b]);
        b.remove();
      });
      existingButtons = [];
      return;
    }
    if(existingButtons.length > 0){ return; }
    // Render nav buttons template
    const buttonsHtml = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-buttons.hbs`, 
      {}
    );
    sceneNav.insertAdjacentHTML('afterend', buttonsHtml);
  
    // Add event listeners to the newly inserted buttons
    const btnLast = document.querySelector("#ui-left button.crlngn-btn.ui-nav-left");
    const btnNext = document.querySelector("#ui-left button.crlngn-btn.ui-nav-right");
  
    if (btnLast) btnLast.addEventListener("click", this.#onNavLast);
    if (btnNext) btnNext.addEventListener("click", this.#onNavNext);
    TopNavigation.handleHide();
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
        `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`,
        `modules/${MODULE_ID}/templates/scene-nav-toggle.hbs`
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
    scene.sheet.render = TopNavigation.#originalRenderMethod;

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
    if (scene && scene.sheet && !TopNavigation.#sceneClickTimer) {
      TopNavigation.#originalRenderMethod = scene?.sheet?.render;
      LogUtil.log("onSelectScene - originalRender",[TopNavigation.#originalRenderMethod]);
      scene.sheet.render = () => { };
      // Restore the original method after a short delay
      setTimeout(() => {
        scene.sheet.render = TopNavigation.#originalRenderMethod;
      }, 500);
    }

    // Clear any existing timer
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      scene.sheet.render = TopNavigation.#originalRenderMethod;
      TopNavigation.#sceneClickTimer = null;
    }

    // Set a new timer for the click action
    TopNavigation.#sceneClickTimer = setTimeout(() => {
      scene.view();
      scene.sheet.render = TopNavigation.#originalRenderMethod;
      TopNavigation.#sceneClickTimer = null;
    }, 350); // 350ms delay to wait for potential double-click
  }

  static onScenePreviewOn = (evt) => {
    LogUtil.log("onScenePreviewOn", []);
    // evt.stopPropagation();
    evt.preventDefault();
    if(TopNavigation.isCollapsed){ return; }

    const target = evt.currentTarget;
    const data = target.dataset;
    TopNavigation.#previewedScene = data.sceneId;
    TopNavigation.#sceneHoverTimeout = setTimeout(() => {
      clearTimeout(TopNavigation.#sceneHoverTimeout);
      target.querySelector(".scene-preview")?.classList.add('open');
    }, 200);
  }

  static onScenePreviewOff = (evt) => {
    LogUtil.log("onScenePreviewOff", []);
    // evt.stopPropagation();
    evt.preventDefault();
    clearTimeout(TopNavigation.#sceneHoverTimeout);
    if(TopNavigation.isCollapsed){ return; }
    const target = evt.currentTarget;
    TopNavigation.#previewedScene = '';

    target.querySelector(".scene-preview")?.classList.remove('open');
  }

  /**
   * Adds click event listeners to scene items in the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static addSceneListeners = (html) => {
    const sceneItems = html.querySelectorAll("li.scene");
    sceneItems.forEach(li => {
      // const isFolder = li.classList.contains("folder");
      LogUtil.log("addSceneListeners", [li]);
      li.querySelector(".scene-name").addEventListener("click", TopNavigation.onSelectScene);
      li.querySelector(".scene-name").addEventListener("dblclick", TopNavigation.onActivateScene);

      li.removeEventListener("mouseenter", TopNavigation.onScenePreviewOn);
      li.removeEventListener("mouseleave", TopNavigation.onScenePreviewOff);

      if(TopNavigation.useScenePreview){
        const id = li.dataset.sceneId;
        const sceneData = game.scenes.find(sc => sc.id === id);
        if (game.user?.isGM) {
          TopNavigation.addPreviewIconListeners(li, sceneData);          
        }
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
      ilumIcon.addEventListener('click', TopNavigation.#onIlumClick);
    }
    
    // Token vision icon
    const tokenVisionIcon = previewDiv.querySelector('.token-vision');
    if (tokenVisionIcon) {
      tokenVisionIcon.addEventListener('click', TopNavigation.#onTokenVisionClick);
    }
    
    // Sound icon - only if there's a playlist sound
    const soundIcon = previewDiv.querySelector('.sound');
    if (soundIcon && scene.playlistSound) {
      soundIcon.addEventListener('click', TopNavigation.#onSoundClick);
    }
    
    // Config icon
    const preloadIcon = previewDiv.querySelector('.preload');
    if (preloadIcon) {
      preloadIcon.addEventListener('click', TopNavigation.#onPreloadClick);
    }

    // Config icon
    const configIcon = previewDiv.querySelector('.config');
    if (configIcon) {
      configIcon.addEventListener('click', TopNavigation.#onConfigClick);
    }

  }

  /**
   * Event for when user opens scene configuration
   * @param {Event} event 
   */
  static #onConfigClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget.closest("li.scene");
    const scene = TopNavigation.getSceneFromElement(target);
    scene.sheet.render(true);
    LogUtil.log("Opened scene configuration");
  }

  /**
   * Event for when user opens scene configuration
   * @param {Event} event 
   */
  static #onPreloadClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget.closest("li.scene");
    const scene = TopNavigation.getSceneFromElement(target);
    game.scenes.preload(scene.id, true);
    LogUtil.log("Preloaded scene");
  }

  /**
   * Event for when user toggles playlist sound
   * @param {Event} event 
   */
  static #onSoundClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    const playlistSound = scene.playlistSound;
    if (playlistSound) {
      const playing = playlistSound.sound.playing;
      if (playing) {
        playlistSound.sound.pause();
      } else {
        playlistSound.sound.play();
      }
      // TopNavigation.#preventNavRender = true;
      // Update the preview with fresh scene data
      await TopNavigation.updateScenePreview(target, scene.id);
      LogUtil.log("Toggled playlist sound", [!playing]);
    }
  }

  /**
   * Event for when user toggles global illumination
   * @param {Event} event 
   */
  static #onIlumClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    const currentValue = scene.environment.globalLight.enabled;
    
    TopNavigation.#preventNavRender = true;
    // Update the scene
    await scene.update({
      'environment.globalLight.enabled': !currentValue
    });
    await TopNavigation.updateScenePreview(target, scene.id);
    LogUtil.log("Toggled global illumination", [!currentValue]);
  }

  /**
   * Event for when user toggles token vision
   * @param {Event} event 
   */
  static #onTokenVisionClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    const currentValue = scene.tokenVision;

    TopNavigation.#preventNavRender = true;
    await scene.update({
      'tokenVision': !currentValue
    });
    // Update the preview with fresh scene data
    await TopNavigation.updateScenePreview(target, scene.id);
    LogUtil.log("Toggled token vision", [!currentValue]);
  }

  /**
   * Gets the scene from the element
   * @param {HTMLElement} element 
   * @returns {Scene}
   */
  static getSceneFromElement = (target) => {
    const sceneId = target.dataset.sceneId;
    let scene = game.scenes.get(sceneId);
    return scene;
  }

  /**
   * Updates a scene preview with fresh data from the scene
   * @param {HTMLElement} sceneElement - The scene element containing the preview
   * @param {string} sceneId - The ID of the scene to update
   */
  static updateScenePreview = async (sceneElement, sceneId) => {
    if (!TopNavigation.sceneNavEnabled || !sceneElement || !sceneId) return;
    
    // Get fresh scene data directly from the game.scenes collection
    const scene = game.scenes.get(sceneId);
    if (!scene) return;
    
    const oldPreview = sceneElement.querySelector('.scene-preview');
    if (!oldPreview) return;
    
    // Store the open state before replacing
    const wasOpen = oldPreview.classList.contains('open');
    
    // Log the scene data for debugging
    LogUtil.log("Scene data for preview", [sceneId, scene.environment?.globalLight?.enabled, scene.tokenVision]);
    
    // Directly use the scene object for the template to ensure we have the latest data
    // This is important for properties like environment.globalLight.enabled
    const templateData = {
      id: scene.id,
      name: scene.name,
      thumb: scene.thumb || "",
      environment: scene.environment,
      tokenVision: scene.tokenVision,
      isGM: game.user?.isGM
    };
    
    // Render the new preview with the direct data
    const previewTemplate = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`, 
      templateData
    );
    
    // Replace the old preview with the new one
    oldPreview.outerHTML = previewTemplate;
    
    // Re-add event listeners to the new preview
    const newPreview = sceneElement.querySelector('.scene-preview');
    if (wasOpen && newPreview) {
      newPreview.classList.add('open');
    }
    
    // Re-attach all necessary event listeners
    if (TopNavigation.sceneNavEnabled && TopNavigation.useScenePreview) {
      // Reattach hover events
      sceneElement.removeEventListener("mouseenter", TopNavigation.onScenePreviewOn);
      sceneElement.removeEventListener("mouseleave", TopNavigation.onScenePreviewOff);
      sceneElement.addEventListener("mouseenter", TopNavigation.onScenePreviewOn);
      sceneElement.addEventListener("mouseleave", TopNavigation.onScenePreviewOff);
      
      // Reattach icon click events
      if (game.user?.isGM) {
        TopNavigation.addPreviewIconListeners(sceneElement, templateData);
      }
    }
  }

  static applySceneItemWidth = () => { 
    const SETTINGS = getSettings();
    const currWidth = SettingsUtil.get(SETTINGS.sceneItemWidth.tag) || 150;
    GeneralUtil.addCSSVars("--scene-nav-item-width", `${currWidth}px`);
  }

  /**
   * Load all settings from storage
   */
  static loadSettings() {
    const SETTINGS = getSettings();
    TopNavigation.navStartCollapsed = SettingsUtil.get(SETTINGS.navStartCollapsed.tag);
    TopNavigation.showNavOnHover = SettingsUtil.get(SETTINGS.showNavOnHover.tag);
    TopNavigation.sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    TopNavigation.useScenePreview = SettingsUtil.get(SETTINGS.useScenePreview.tag);
    TopNavigation.useSceneFolders = SettingsUtil.get(SETTINGS.useSceneFolders.tag);
    TopNavigation.navFoldersForPlayers = SettingsUtil.get(SETTINGS.navFoldersForPlayers.tag);
    TopNavigation.navShowRootFolders = SettingsUtil.get(SETTINGS.navShowRootFolders.tag);
    TopNavigation.useSceneIcons = SettingsUtil.get(SETTINGS.useSceneIcons.tag);
    TopNavigation.useSceneBackButton = SettingsUtil.get(SETTINGS.useSceneBackButton.tag);
    TopNavigation.useSceneLookup = SettingsUtil.get(SETTINGS.useSceneLookup.tag);
    TopNavigation.sceneClickToView = SettingsUtil.get(SETTINGS.sceneClickToView.tag);
    TopNavigation.isCollapsed = TopNavigation.navStartCollapsed;
  }

  /**
   * Refresh settings after GM enforcement
   */
  static refreshSettings() {
    // Reload all settings
    TopNavigation.loadSettings();
    
    // Update body classes
    const body = document.querySelector("body");
    if(TopNavigation.sceneNavEnabled){
      body.classList.add("crlngn-scene-nav");
    }else{
      body.classList.remove("crlngn-scene-nav");
    }
    
    // Re-render scene navigation if it exists
    if (ui.nav) {
      ui.nav.render();
    }
  }
  
}
