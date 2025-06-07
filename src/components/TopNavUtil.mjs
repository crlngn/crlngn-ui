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
  static navElem;
  static scenesList;
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
  static preventReposition = false;
  static preventRerender = false;
  // settings
  static sceneNavEnabled;
  static useSceneFolders;
  static openFolderOnSceneLoad;
  static navFoldersForPlayers;
  static navShowSceneFolders;
  static navStartCollapsed;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useSceneBackButton;
  static sceneClickToView;
  static isCollapsed;
  static navPos;
  // compatibility
  static isMonksSceneNavOn = false;
  static isRipperSceneNavOn = false;

  static init = () => {
    const SETTINGS = getSettings();
    
    this.isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    this.isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");

    if(TopNavigation.sceneNavEnabled){
      this.checkSceneNavCompat(); 
      if(TopNavigation.isMonksSceneNavOn){ return; }
    }

    // execute on render scene navigation
    Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, TopNavigation.onRender);
    // Load settings first
    TopNavigation.navStartCollapsed = SettingsUtil.get(SETTINGS.navStartCollapsed.tag);
    TopNavigation.showNavOnHover = SettingsUtil.get(SETTINGS.showNavOnHover.tag);
    TopNavigation.sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    TopNavigation.useScenePreview = SettingsUtil.get(SETTINGS.useScenePreview.tag);
    TopNavigation.useSceneFolders = SettingsUtil.get(SETTINGS.useSceneFolders.tag);
    TopNavigation.navFoldersForPlayers = SettingsUtil.get(SETTINGS.navFoldersForPlayers.tag);
    TopNavigation.useSceneIcons = SettingsUtil.get(SETTINGS.useSceneIcons.tag);
    TopNavigation.isCollapsed = TopNavigation.navStartCollapsed;
    if(TopNavigation.isCollapsed){
      TopNavigation.toggleNav(TopNavigation.isCollapsed);
    }

    LogUtil.log("SCENE NAV INIT", [TopNavigation.sceneNavEnabled], true);
    const body = document.querySelector("body");
    if(TopNavigation.sceneNavEnabled){
      body.classList.add("crlngn-scene-nav");
    }else{
      body.classList.remove("crlngn-scene-nav");
    }
    if(TopNavigation.sceneNavEnabled){
      this.preloadTemplates();
      SceneNavFolders.init();
      
      Hooks.on(HOOKS_CORE.READY, () => {
        if(GeneralUtil.isModuleOn("forien-quest-log")){
          Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 42);
        }
        LogUtil.log(HOOKS_CORE.READY, [ui.sidebar]);
        TopNavigation.checkSideBar(!ui.sidebar._collapsed);
      })

      // add class to ui nav when sidebar changes state
      Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (sidebar) => { 
        LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, [sidebar, sidebar.expanded, sidebar._collapsed]);
        if(sidebar){TopNavigation.checkSideBar(!sidebar._collapsed);}
      });

      // re-add buttons when scene nav collapses or expands
      Hooks.on(HOOKS_CORE.COLLAPSE_SCENE_NAV, (nav, collapsed) => {
        clearTimeout(TopNavigation.#timeout);
        TopNavigation.isCollapsed = collapsed;
        if(collapsed){
          const existingButtons = document.querySelectorAll("#ui-top .crlngn-btn");
          existingButtons.forEach(b => b.remove());
        }
        
        TopNavigation.setCollapsedClass(collapsed);
        TopNavigation.#timeout = setTimeout(()=>{
          TopNavigation.setCollapsedClass(collapsed);
        }, 500);
      });

      // execute once on start
      if(ui.sidebar){TopNavigation.checkSideBar(ui.sidebar.expanded);}
      TopNavigation.placeNavButtons();
    }

    Hooks.on(HOOKS_CORE.CREATE_SCENE, (a, b) => {
      TopNavigation.preventReposition = true;
      LogUtil.log("CREATE_SCENE", [a, b]);
      ui.nav?.render();
    });
    Hooks.on(HOOKS_CORE.UPDATE_SCENE, (a, b) => {
      TopNavigation.preventReposition = true;
      LogUtil.log("UPDATE_SCENE", [a, b]);
      if(TopNavigation.preventRerender){
        TopNavigation.preventRerender = false;
      }else{
        ui.nav?.render();
      }
    });
    Hooks.on(HOOKS_CORE.DELETE_SCENE, (a, b) => {
      TopNavigation.preventReposition = true;
      LogUtil.log("DELETE_SCENE", [a, b]);
      ui.nav?.render();
    });

    Hooks.on(HOOKS_CORE.CANVAS_INIT, ()=>{
      const sceneId = game.scenes?.viewed?.id;
      if(sceneId !== TopNavigation.#visitedScenes[TopNavigation.#visitedScenes.length-1]){
        TopNavigation.#visitedScenes.push(sceneId);

        if(TopNavigation.useSceneFolders && TopNavigation.openFolderOnSceneLoad){
          const scene = game.scenes.get(sceneId);
          LogUtil.log(HOOKS_CORE.CANVAS_INIT, [scene]);
          if(scene?.folder && game.user?.isGM){ 
            SceneNavFolders.activateFolder(scene.folder.id); 
          }
        }
      }
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
        // LogUtil.log(HOOKS_CORE.RENDER_SCENE_DIRECTORY,["directoryScenes", sc.dataset.entryId, TopNavigation.sceneClickToView]);
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

  static applyCustomStyle(enabled){
    TopNavigation.sceneNavEnabled = enabled;
    LogUtil.log("applyCustomStyle - TopNavigation", [TopNavigation.sceneNavEnabled, ui.nav]);
    // if(ui.nav) ui.nav.render();
  }

  static applyButtonSettings(){
    const SETTINGS = getSettings();
    let numButtons = 1;
    // if(!TopNavigation.useSceneFolders){
    //   numButtons = 0;
    // }
    if(game.user?.isGM && TopNavigation.useSceneBackButton){ numButtons++; }
    if(game.user?.isGM && TopNavigation.useSceneLookup){ numButtons++; }
    
    GeneralUtil.addCSSVars('--scene-list-left',`calc(var(--left-control-item-size) * ${numButtons})`);
  }

  static onRender = async(nav, navHtml, navData) => {
    if(TopNavigation.isMonksSceneNavOn){ return; }
    LogUtil.log("onRender", []);
    navHtml = navHtml?.[0] || navHtml;
    const SETTINGS = getSettings();
    const scenePos = TopNavigation.navPos;

    TopNavigation.resetLocalVars(navHtml);
    
    if(TopNavigation.sceneNavEnabled){
      TopNavigation.handleExtraButtons(nav, navHtml, navData);
      TopNavigation.handleFolderList(nav, navHtml, navData);
      TopNavigation.handleSceneList(nav, navHtml, navData);
      if(TopNavigation.navShowSceneFolders){
        SceneNavFolders.init();
        await SceneNavFolders.renderFolderList();
      }
      TopNavigation.handleNavState(navHtml);
    }
    if(!TopNavigation.useSceneFolders || !game.user?.isGM){
      document.body.classList.add("crlngn-no-folders");
    }
    
    TopNavigation.addSceneListeners(navHtml);
    TopNavigation.resetLocalVars(navHtml);

    // if(TopNavigation.isCollapsed){
    //   TopNavigation.toggleNav(true);
    // }
    
    if(TopNavigation.sceneNavEnabled){
      TopNavigation.addListeners();
      LogUtil.log("onRender - preventReposition?", [TopNavigation.preventReposition]);
      if(TopNavigation.preventReposition){
        TopNavigation.preventReposition = false;
      }else{
        TopNavigation.setNavPosition(scenePos, false);
      }
      clearTimeout(TopNavigation.#timeout);
      TopNavigation.#timeout = setTimeout(()=>{
        TopNavigation.placeNavButtons();
      }, 500);
    }
    TopNavigation.applyButtonSettings();

    if(TopNavigation.#navToggle){
      TopNavigation.#navToggle.dataset.tooltipDirection = "RIGHT";
    }

    TopNavigation.navElem?.addEventListener("scrollend", ()=>{
      const selectedItem = TopNavigation.navElem?.querySelector(`#scene-list > li.scene.view`);
      const itemWidth = selectedItem.offsetWidth;
      const closestPos = Math.round(TopNavigation.navElem.scrollLeft / itemWidth);
      TopNavigation.navPos = closestPos;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, closestPos);
    });
  }

  static setCollapsedClass = (collapsed) => {
    const body = document.querySelector("body");
    if(collapsed){
      TopNavigation.navElem?.classList.add('collapsed');
      body.classList.add('navigation-collapsed');

      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 10);
      }
    }else{
      TopNavigation.navElem?.classList.remove('collapsed');
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
    // document.body.classList.toggle("sidebar-collapsed", !isExpanded);
  }

  /**
   * Resets and reinitializes local DOM element references
   */
  static resetLocalVars(navHtml){
    let navElem = navHtml?.[0] || navHtml || document.querySelector("#navigation"); 

    TopNavigation.navElem = navElem; 
    TopNavigation.#navToggle = navElem.querySelector("#nav-toggle"); 
    TopNavigation.#uiLeft = navElem.querySelector("#ui-left");
    TopNavigation.scenesList = navElem.querySelector("#scene-list");
  }

  /**
   * Add scene preview to nav, if the setting is enabled
   */
  static handleSceneList = async (nav, navHtml, navData) =>{
    navHtml = navHtml[0] || navHtml; // get element from jquery object
    if(TopNavigation.sceneNavEnabled){
      LogUtil.log("handleSceneList", [nav, navHtml, navData]);

      const allSceneLi = navHtml.querySelectorAll("#scene-list li.scene");
      // allSceneLi.forEach(async (li) => {
      for(const li of allSceneLi){
        const id = li.dataset.sceneId;

        // add scene preview
        if(TopNavigation.useScenePreview){
          const sceneData = game.scenes.find(sc => sc.id === id);
          sceneData.isGM = game.user?.isGM;
          sceneData.thumb = sceneData.thumb || null;
          const previewTemplate = await renderTemplate(
            `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`, 
            sceneData
          );
          // LogUtil.log("sceneData", [sceneData]);
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
          li.classList.add('crlngn-icons');
        }
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
  static handleExtraButtons = async(nav, navHtml, navData) => {
    const SETTINGS = getSettings();
    navHtml = navHtml[0] || navHtml; // get element from jquery object
    LogUtil.log("handleExtraButtons",[nav, navHtml, navData]);

    const extraButtonsTemplate = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-extra-buttons.hbs`, 
      {
        useSceneBackButton: game.user.isGM ? TopNavigation.useSceneBackButton : false,
        useSceneFolders: game.user.isGM ? TopNavigation.useSceneFolders : false,
        useSceneLookup: game.user.isGM ? TopNavigation.useSceneLookup : false,
        backButtonTooltip: game.i18n.localize("CRLNGN_UI.ui.sceneNav.backButtonTooltip"),
        sceneLookupTooltip: game.i18n.localize("CRLNGN_UI.ui.sceneNav.sceneLookupTooltip"),
        isGM: game.user?.isGM,
      }
    );

    navHtml.querySelector("#nav-toggle").insertAdjacentHTML("afterend", extraButtonsTemplate);
    const backButton = navHtml.querySelector("#crlngn-back-button");
    if(backButton){
      backButton.addEventListener("click", TopNavigation.#onBackButton);
    }

    // folder lookup button and search block
    if(TopNavigation.sceneNavEnabled && TopNavigation.useSceneLookup && game.user.isGM){
      SceneNavFolders.handleFolderLookup(nav, navHtml, navData);
    }

    // if(TopNavigation.useSceneBackButton){
    //   if(game.scenes.size < 2){ return; }
    //   const sceneNav = navHtml.querySelector("#scene-list");
    //   const backButton = document.createElement("button");
    //   backButton.id = "crlngn-back-button";
    //   backButton.innerHTML = "<i class='fa fa-turn-left'></i>";
    //   backButton.addEventListener("click", TopNavigation.#onBackButton);
    //   navHtml.insertBefore(backButton, sceneNav);
    // }else{
    //   const existingBackButton = document.querySelector("#crlngn-back-button");
    //   navHtml.classList.add("no-back-button");
    //   if(existingBackButton){ existingBackButton.remove(); }
    // }
    
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
    if(!TopNavigation.useSceneFolders){ return; }
    
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
  static handleNavState(navHtml){
    const SETTINGS = getSettings();
    navHtml = navHtml[0] || navHtml;
    if(TopNavigation.#navFirstLoad) {
      TopNavigation.#navFirstLoad = false;
      TopNavigation.toggleNav(TopNavigation.navStartCollapsed);
      // try to set the initial scene position
      const selectedItem = navHtml.querySelector(`#scene-list > li.scene.active`);
      const sceneOffsetLeft = selectedItem ? selectedItem.offsetLeft : 0;
      const itemWidth = selectedItem?.offsetWidth || 0;
      const scenePos = Math.floor(sceneOffsetLeft / itemWidth);
      LogUtil.log("onLoad - scenePos", [sceneOffsetLeft, scenePos]);
      TopNavigation.navPos = scenePos;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, scenePos);
      // TopNavigation.setNavPosition(scenePos, false);
    }
    // else{
    //   TopNavigation.toggleNav(TopNavigation.navStartCollapsed);
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

      if(collapsed===true){
        ui.nav?.collapse();
        TopNavigation.isCollapsed = true;
        LogUtil.log("toggleNav collapse", [ui.nav, collapsed, TopNavigation.navStartCollapsed]);
        const existingButtons = document.querySelectorAll("#ui-top .crlngn-btn");
        existingButtons.forEach(b => b.remove());
      }else if(collapsed===false){
        TopNavigation.isCollapsed = false;
        ui.nav?.expand();
        LogUtil.log("toggleNav expand", [collapsed, TopNavigation.navStartCollapsed]);
      }
    }, 300);
    
  }

  /**
   * If Monk's Scene Navigation or Compact Scene Navigation are enabled, disable Carolingian UI Top Navigation
   */
  static checkSceneNavCompat(){
    const SETTINGS = getSettings();
    const uiMiddle = document.querySelector("#ui-middle");
    
    this.isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    this.isRipperSceneNavOn = GeneralUtil.isModuleOn("compact-scene-navigation");

    if(this.isRipperSceneNavOn && TopNavigation.useSceneFolders){
      if(game.user?.isGM && this.isRipperSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.ripperScenesCompat"), {permanent: true});
      }
    }
    if((this.isMonksSceneNavOn) && TopNavigation.sceneNavEnabled){
      uiMiddle.classList.remove("crlngn-ui");
      
      if(game.ready){
        SettingsUtil.set(SETTINGS.sceneNavEnabled.tag, false);
        TopNavigation.sceneNavEnabled = false;
      }

      LogUtil.log("checkSceneNavCompat", [TopNavigation.isMonksSceneNavOn, TopNavigation.isRipperSceneNavOn]);
      
      if(game.user?.isGM && TopNavigation.isMonksSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {permanent: true});
      }
      
    }
  }

  /**
   * Adds event listeners for navigation interactions
   * Handles hover and click events for navigation expansion/collapse
   */
  static addListeners(){
    TopNavigation.navElem?.addEventListener("mouseenter", (e)=>{
      LogUtil.log("TopNavigation mouseenter", [ TopNavigation.isCollapsed, TopNavigation.showNavOnHover ]); 

      if( !TopNavigation.isCollapsed ||
          !TopNavigation.showNavOnHover ){
            return;
      }
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(TopNavigation.#navTimeout);

      const navigation = document.querySelector("#navigation");
      navigation.classList.remove("collapsed");
    });

    TopNavigation.navElem?.addEventListener("mouseleave", (e)=>{
      // LogUtil.log("TopNavigation mouseleave", [TopNavigation.isCollapsed, TopNavigation.showNavOnHover, e.relatedTarget?.id || e.relatedTarget?.tagName]);

      // Only apply hover-based collapse if:
      // 1. The nav is supposed to be collapsed by default (TopNavigation.isCollapsed is true)
      // 2. The showNavOnHover feature is enabled.
      if (!TopNavigation.isCollapsed || !TopNavigation.showNavOnHover) {
        return;
      }

      // If the mouse is leaving navElem to go to one of its children, do not start the collapse timeout.
      // This handles cases where interaction with children (like clicks)
      // might inadvertently trigger mouseleave on the parent.
      if (e.relatedTarget && TopNavigation.navElem.contains(e.relatedTarget)) {
        LogUtil.log("TopNavigation mouseleave: relatedTarget is within navElem, not starting collapse timeout.", [e.relatedTarget?.id || e.relatedTarget?.tagName]);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      TopNavigation.#navTimeout = setTimeout(() => {
        clearTimeout(TopNavigation.#navTimeout);
        TopNavigation.#navTimeout = null;
        const navigation = document.querySelector("#navigation");

        // Re-check conditions before actually collapsing, as state might have changed during the timeout
        if (TopNavigation.isCollapsed && TopNavigation.showNavOnHover) {
          navigation.classList.add("collapsed");
          // LogUtil.log("TopNavigation mouseleave: timeout executed, collapsing.");
        } else {
          // LogUtil.log("TopNavigation mouseleave: timeout executed, but conditions no longer met for collapsing.");
        }
      }, 700);
    });
  }

  /**
   * Only adds buttons if navigation is overflowing and buttons don't already exist
   */
  static placeNavButtons = async() => { 
    const sceneNav = document.querySelector("#navigation");
    LogUtil.log("placeNavButtons #1", [sceneNav]);
    if(!sceneNav || sceneNav.nodeName == 'TEMPLATE'){
      return;
    }
    TopNavigation.resetLocalVars();
    const sceneList = sceneNav.querySelector("#scene-list");
    let existingButtons = document.querySelectorAll("button.crlngn-btn");
    // existingButtons.forEach(b => b.remove());
    
    const btnWidth = (TopNavigation.#navToggle?.offsetWidth * 2) || 0;
    const isNavOverflowing = (sceneNav.offsetWidth - btnWidth) < sceneNav.scrollWidth;
    LogUtil.log("placeNavButtons #2", [sceneNav.offsetWidth, btnWidth, sceneNav.scrollWidth]);
    
    if(!isNavOverflowing 
      || TopNavigation.isCollapsed 
      || TopNavigation.#uiLeft?.classList.contains('navigation-collapsed')){
      existingButtons.forEach(b => {
        LogUtil.log("placeNavButtons remove", [b.remove, b]);
        b.remove();
      });
      existingButtons = [];
      return;
    }
    if(existingButtons.length > 0){ return; }
    // Render nav buttons template
    const buttonsHtml = await renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-buttons.hbs`, 
      {}
    );
    sceneNav.insertAdjacentHTML('beforeend', buttonsHtml);
  
    // Add event listeners to the newly inserted buttons
    const btnLast = document.querySelector("#ui-top .crlngn-btn.ui-nav-left");
    const btnNext = document.querySelector("#ui-top .crlngn-btn.ui-nav-right");
    LogUtil.log("placeNavButtons #3", [btnLast, btnNext]);
    
    btnLast?.addEventListener("click", TopNavigation.#onNavLast);
    btnNext?.addEventListener("click", TopNavigation.#onNavNext);
  }

  /**
   * @private
   * Handles click on the 'last' navigation button
   * Scrolls the scene list backward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavLast = async (e) => {
    if(TopNavigation.navElem.scrollLeft <= 0){ return; }
    e.preventDefault();
    const itemsPerPage = await TopNavigation.getItemsPerPage();
    const navElem = document.querySelector("#navigation");
    const scenes = navElem?.querySelectorAll("li.nav-item") || [];
    const firstScene = Array.from(scenes)[0];
    const activeScene = document.querySelector("#scene-list > li.scene.active");
    const itemWidth = firstScene?.offsetWidth || 0;
    const currPos = TopNavigation.navPos || 0;
    TopNavigation.navPos = currPos;
    // const foldersBlock = TopNavigation.navElem?.querySelector("#folders-group");
    // const folderToggle = TopNavigation.navElem?.querySelector("#crlngn-folder-toggle");
    // const extrasWidth = TopNavigation.navShowSceneFolders ? ((foldersBlock?.offsetWidth||0)) : 0;//+ (folderToggle?.offsetWidth||0)

    if(!TopNavigation.scenesList || !TopNavigation.navElem){ return; }

    let newPos = currPos - (itemsPerPage - 1);
    let newPosPx = newPos * itemWidth;
    LogUtil.log("onNavLast", [currPos, newPos, newPosPx]);
    // if(newPosPx < 0){
    //   newPos = 0;
    // }
    // newPos = newPos < 0 ? 0 : newPos;
    TopNavigation.setNavPosition(newPos);
  }

  /**
   * @private 
   * Handles click on the 'next' navigation button
   * Scrolls the scene list forward by one page
   * @param {Event} e - The pointer event
   */
  static #onNavNext = async (e) => {
    e.preventDefault();
    if(TopNavigation.navElem.scrollLeft >= TopNavigation.navElem.scrollWidth){ return; }
    const itemsPerPage = await TopNavigation.getItemsPerPage();

    const navElem = document.querySelector("#navigation");
    const scenes = navElem?.querySelectorAll("li.nav-item") || [];
    const firstScene = Array.from(scenes)[0] || null;
    const activeScene = document.querySelector("#scene-list > li.scene.active");
    const itemWidth = firstScene?.offsetWidth || 0;
    const currPos = TopNavigation.navPos || 0;
    const scrollWidth = TopNavigation.navElem?.scrollWidth || 0; 
    LogUtil.log("onNavNext", [itemsPerPage, itemWidth, firstScene, scrollWidth]);

    if(!itemWidth || !TopNavigation.navElem){ return; }

    let newPos = currPos + (itemsPerPage - 1);
    let newPosPx = newPos * itemWidth;

    // if(newPosPx >= scrollWidth){
    //   newPos = Math.ceil(scrollWidth/itemWidth);
    // }
    LogUtil.log("onNavNext", ["pos", currPos, newPos, itemWidth, newPosPx, scrollWidth]);
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
      LogUtil.log("setNavPosition #1", [pos, TopNavigation.navElem]);
      
      if(!TopNavigation.navElem){ return; }

      const foldersBlock = TopNavigation.navElem?.querySelector("#folders-group");
      const folderToggle = TopNavigation.navElem?.querySelector("#crlngn-folder-toggle");
      const scenes = TopNavigation.navElem?.querySelectorAll("#scene-list > li.scene") || [];
      const firstScene = Array.from(scenes)[0];
      const itemWidth = firstScene?.offsetWidth || 0;
      const extrasWidth = TopNavigation.navShowSceneFolders ? ((foldersBlock?.offsetWidth||0) + (folderToggle?.offsetWidth||0)) : 0 
      let position = pos!==null ? pos : TopNavigation.navPos || 0; //
      
      if(!firstScene){ return; }
      // if (scenes.length === 0 || position > Math.ceil(TopNavigation.navElem.scrollWidth/itemWidth)) { return; }
      // const activeScene = scenes[0];

      TopNavigation.navPos = position;
      SettingsUtil.set(SETTINGS.sceneNavPos.tag, position);

      const w = firstScene?.offsetWidth || 0;
      const offsetLeft = (parseInt(w) * position);
      LogUtil.log("setNavPosition #2", [pos, position, w, offsetLeft, extrasWidth, itemWidth ]);
      
      // if (typeof offsetLeft !== 'number') { return; }

      let newMargin = offsetLeft;
      // LogUtil.log("setNavPosition #2.5", [position, offsetLeft, extrasWidth, newMargin]);
      if(newMargin > TopNavigation.navElem?.scrollWidth){ newMargin = TopNavigation.navElem?.scrollWidth; }
      
      
      if (animate) {
        // Use custom animation with specified duration from GeneralUtil
        GeneralUtil.smoothScrollTo(TopNavigation.navElem, newMargin, "horizontal", duration);
      } else {
        // Use instant scroll without animation
        TopNavigation.navElem.scrollTo({
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
  static getItemsPerPage = () => {
    // TopNavigation.resetLocalVars(); 
    try {
      const folderListWidth = 0; 
      const extrasWidth = 0; 
      const toggleWidth = TopNavigation.#navToggle?.offsetWidth || TopNavigation.#navToggle?.clientWidth || 0;
      const firstScene = document.querySelector("#navigation li.nav-item.scene.active");
      
      if (!firstScene) {
        LogUtil.log('getItemsPerPage', ['No scene items found']);
        return 1;
      }

      const itemWidth = firstScene.offsetWidth;
      const navWidth = document.querySelector("#navigation").offsetWidth;
      if (!navWidth) {
        LogUtil.log('getItemsPerPage', ['Nav element has no width']);
        return 1;
      }

      const itemsPerPage = Math.floor((navWidth - (toggleWidth*2))/itemWidth);
      LogUtil.log('getItemsPerPage', ['Calculated:', itemsPerPage]);
      return itemsPerPage || 1;
    } catch (error) {
      LogUtil.log('getItemsPerPage', ['Error:', error]);
      LogUtil.error('Error in getItemsPerPage:', error);
      return 1;
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
        `modules/${MODULE_ID}/templates/scene-nav-extra-buttons.hbs`
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
      if (!TopNavigation.navElem || !id) {
        return 0;
      }

      const itemsPerPage = await TopNavigation.getItemsPerPage() || 1;
      const sceneItems = TopNavigation.navElem.querySelectorAll("li.nav-item");

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
    const isOnFolder = isInner ? target.parentNode.classList.contains("on-folder") : target.classList.contains("on-folder");
    const scene = game.scenes.get(data.entryId || data.sceneId);
    LogUtil.log("onActivateScene",[data, scene, evt.currentTarget.classList, evt.target.classList]);
    
    if(isOnFolder){
      TopNavigation.preventReposition = true;
    }
    scene.activate();
    ui.nav?.render();
    
    // Clear the single-click timer if it exists
    clearTimeout(TopNavigation.#sceneClickTimer);
    
  }

  static onSelectScene = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const target = evt.currentTarget;
    const isInner = target.classList.contains("scene-name");
    const data = isInner ? target.parentNode.dataset : target.dataset;
    const isOnFolder = isInner ? target.parentNode.classList.contains("on-folder") : target.classList.contains("on-folder");
    const scene = game.scenes.get(data.entryId || data.sceneId);
    // const isSearchResult = target.parentElement?.classList.contains('search-results');
    
    TopNavigation.#previewedScene = '';
    LogUtil.log("onSelectScene",[]);

    // Temporarily override the sheet.render method to prevent scene configuration
    if (scene && scene.sheet) {
      const originalRender = scene.sheet.render;
      scene.sheet.render = function() { return this; };
      // Restore the original method after a short delay
      setTimeout(() => {
        scene.sheet.render = originalRender;
        LogUtil.log("onSelectScene test",[]);
      }, 500);
    }

    // Clear any existing timer
    clearTimeout(TopNavigation.#sceneClickTimer);

    // Set a new timer for the click action
    TopNavigation.#sceneClickTimer = setTimeout(() => {
      if(isOnFolder){
        TopNavigation.preventReposition = true;
      }
      scene.view();
      
      TopNavigation.#sceneClickTimer = null;
    }, 350); // 350ms delay to wait for potential double-click
  }

  static onScenePreviewOn = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    if(!TopNavigation.showNavOnHover){ return; }

    const target = evt.currentTarget;
    const data = target.dataset;
    TopNavigation.#previewedScene = data.sceneId;
    TopNavigation.#sceneHoverTimeout = setTimeout(() => {
      clearTimeout(TopNavigation.#sceneHoverTimeout);
      target.querySelector(".scene-preview").classList.add('open');
    }, 200);
  }

  static onScenePreviewOff = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    clearTimeout(TopNavigation.#sceneHoverTimeout);
    if(!TopNavigation.showNavOnHover){ return; }
    const target = evt.currentTarget;
    TopNavigation.#previewedScene = '';

    target.querySelector(".scene-preview").classList.remove('open');
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
      thumb: scene.thumb || null,
      environment: scene.environment,
      tokenVision: scene.tokenVision,
      isGM: game.user?.isGM
    };
    
    // Render the new preview with the direct data
    const previewTemplate = await renderTemplate(
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
  
  /**
   * Adds click event listeners to scene items in the scene folders UI
   * @param {HTMLElement} html - The HTML element containing the scene folders UI
   */
  static addSceneListeners = (html) => {
    if(!TopNavigation.sceneNavEnabled){ return; }
    html = html[0] || html; // convert jquery object to dom element
    const sceneItems = html.querySelectorAll("li.scene");
    sceneItems.forEach(li => {
      const isFolder = li.classList.contains("folder");
      li.querySelector(".scene-name").removeEventListener("click", TopNavigation.onSelectScene);
      li.querySelector(".scene-name").removeEventListener("dblclick", TopNavigation.onActivateScene);
      li.querySelector(".scene-name").addEventListener("click", TopNavigation.onSelectScene);
      li.querySelector(".scene-name").addEventListener("dblclick", TopNavigation.onActivateScene);
      if(TopNavigation.useScenePreview){
        li.addEventListener("mouseenter", TopNavigation.onScenePreviewOn);
        li.addEventListener("mouseleave", TopNavigation.onScenePreviewOff);
        const id = li.dataset.sceneId;
        const sceneData = game.scenes.find(sc => sc.id === id);
        if (game.user?.isGM) {
          TopNavigation.addPreviewIconListeners(li, sceneData);          
        }
      }else{
        li.removeEventListener("mouseenter", TopNavigation.onScenePreviewOn);
        li.removeEventListener("mouseleave", TopNavigation.onScenePreviewOff);
      }
    });
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

  static onSceneConfigClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const parent = event.currentTarget.closest("li.scene");
    const scene = game.scenes.get(parent.dataset.sceneId);
    scene.sheet.render(true);
  }

  static onIlumClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    TopNavigation.preventRerender = true;
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    
    const currentValue = scene.environment.globalLight.enabled;
  
    // Update the scene
    await scene.update({
      'environment.globalLight.enabled': !currentValue
    });
    
    // Get the updated scene after the update
    scene = game.scenes.get(scene.id);
    LogUtil.log("Toggled global illumination", [!currentValue, scene.environment.globalLight.enabled]);
    
    // Update the preview with fresh scene data
    await TopNavigation.updateScenePreview(target, scene.id);
  }

  static onTokenVisionClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    TopNavigation.preventRerender = true;
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    
    const currentValue = scene.tokenVision;
    
    // Update the scene
    await scene.update({
      'tokenVision': !currentValue
    });
    
    // Get the updated scene after the update
    scene = game.scenes.get(scene.id);
    LogUtil.log("Toggled token vision", [!currentValue, scene.tokenVision]);
    
    // Update the preview with fresh scene data
    await TopNavigation.updateScenePreview(target, scene.id);
  }

  static onGenerateThumbnailClick = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    TopNavigation.preventRerender = true;
    const target = event.currentTarget.closest("li.scene");
    let scene = TopNavigation.getSceneFromElement(target);
    
    // Generate the thumbnail
    await scene.createThumbnail();
    
    // Get the updated scene after generating the thumbnail
    scene = game.scenes.get(scene.id);
    LogUtil.log("Generated thumbnail", [scene.thumb ? 'Thumbnail created' : 'No thumbnail']);
    
    // Update the preview with fresh scene data
    await TopNavigation.updateScenePreview(target, scene.id);
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
      ilumIcon.removeEventListener('click', TopNavigation.onIlumClick);
      ilumIcon.addEventListener('click', TopNavigation.onIlumClick);
    }
    
    // Token vision icon
    const tokenVisionIcon = previewDiv.querySelector('.token-vision');
    if (tokenVisionIcon) {
      tokenVisionIcon.removeEventListener('click', TopNavigation.onTokenVisionClick);
      tokenVisionIcon.addEventListener('click', TopNavigation.onTokenVisionClick);
    }

    // Preload icon
    const preloadIcon = previewDiv.querySelector('.preload');
    if (preloadIcon) {
      preloadIcon.removeEventListener('click', TopNavigation.#onPreloadClick);
      preloadIcon.addEventListener('click', TopNavigation.#onPreloadClick);
    }
    
    // Config icon
    const configIcon = previewDiv.querySelector('.config');
    if (configIcon) {
      configIcon.removeEventListener('click', TopNavigation.onSceneConfigClick);
      configIcon.addEventListener('click', TopNavigation.onSceneConfigClick);
    }

    // Generate thumbnail icon
    const thumbIcon = previewDiv.querySelector('.gen-thumb');
    if (thumbIcon) {
      thumbIcon.addEventListener('click', TopNavigation.onGenerateThumbnailClick);
    }
  }

  static applySceneItemWidth = () => { 
    const SETTINGS = getSettings();
    const currWidth = SettingsUtil.get(SETTINGS.sceneItemWidth.tag) || 150;
    GeneralUtil.addCSSVars("--scene-nav-item-width", `${currWidth}px`);
  } 
  
}