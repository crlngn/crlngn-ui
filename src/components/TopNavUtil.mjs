import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE, HOOKS_CRLNGN } from "../constants/Hooks.mjs";
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
  static #isMonksSceneNavOn = false;
  static #isMonksNotificationOn = false;
  // settings
  static useFadeOut = true;
  static hidden = false;
  static sceneNavEnabled;
  static useSceneFolders;
  static navFoldersForPlayers;
  static navShowRootFolders;
  static hideInactiveOnFolderToggle;
  static navStartCollapsed;
  static showNavOnHover;
  static useSceneIcons;
  static useScenePreview;
  static useSceneBackButton;
  static useSceneLookup;
  static sceneClickToView;
  static sceneItemWidth;
  static disableActiveSceneSeparation;
  static subFoldersLayout;
  static expandScrimToSubfolders;
  static isCollapsed;
  static navPos;
  static collapseNavDuringCombat;
  static enableCombatTrackerCarousel;
  static combatCarouselScale;
  // Track nav state before combat for restoration
  static #navStateBeforeCombat = null;
  // Track if we popped out the combat tracker
  static #combatTrackerPoppedOut = false;
  // Combat tracker docking state
  static #combatTrackerDockState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    boundDragMove: null,
    boundDragEnd: null,
    isDocked: false
  };
  // Stacked carousel state for combat tracker
  static #carouselStackState = {
    allCombatantIds: [],
    visibleCount: 0,
    visibleStartIndex: 0,
    leftStackCount: 0,
    rightStackCount: 0,
    containerWidth: 0
  };
  // ResizeObserver for carousel responsiveness
  static #carouselResizeObserver = null;

  // Initialization state flags for coordinating hook-based setup
  static #sceneNavRendered = false;
  static #moduleClassesReady = false;
  // Track pending turn change to coordinate with render
  static #pendingTurnChange = null;

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

    // Add classes for extra buttons (back button and scene lookup)
    TopNavigation.updateExtraButtonClasses();

    // add class to ui nav when sidebar changes state (needed for horizontal sidebar tabs)
    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, (sidebar) => {
      LogUtil.log(HOOKS_CORE.COLLAPSE_SIDE_BAR, [sidebar]);
      TopNavigation.checkSideBar(sidebar.expanded || false);
      if(TopNavigation.sceneNavEnabled){
        TopNavigation.placeNavButtons();
      }
    });

    // Listen for module classes to be ready (fired by ModuleCompatUtil)
    Hooks.once(HOOKS_CRLNGN.MODULE_CLASSES_READY, () => {
      TopNavigation.#moduleClassesReady = true;
      LogUtil.log("MODULE_CLASSES_READY received", [
        "sceneNavRendered:", TopNavigation.#sceneNavRendered
      ]);
      TopNavigation.#tryApplySceneNavOffset();
    });

    // Listen for READY hook to check for active combat on load
    // Use a delay to ensure ui.combat is fully initialized
    Hooks.once(HOOKS_CORE.READY, () => {
      // Wait for sidebar and combat tracker to be fully ready
      setTimeout(() => {
        LogUtil.log("READY + delay - checking for active combat", [
          "ui.combat:", !!ui.combat,
          "ui.combat.renderPopout:", typeof ui.combat?.renderPopout
        ]);
        TopNavigation.checkForActiveCombat();
      }, 500);
    });

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
          TopNavigation.applySceneNavOffset();
        }, 30);
      });


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

    // Combat hooks for auto-collapse during combat
    Hooks.on(HOOKS_CORE.COMBAT_START, (combat, updateData) => {
      TopNavigation.onCombatStart(combat);
    });

    Hooks.on(HOOKS_CORE.DELETE_COMBAT, (combat, options, userId) => {
      TopNavigation.onCombatEnd(combat);
    });

    // Also check on combat update (when combatants are added or combat state changes)
    Hooks.on(HOOKS_CORE.UPDATE_COMBAT, (combat, updateData, options, userId) => {
      TopNavigation.onCombatUpdate(combat, updateData);
    });

    // Check when combatants are added to combat tracker
    Hooks.on(HOOKS_CORE.CREATE_COMBATANT, (combatant, options, userId) => {
      TopNavigation.onCombatantCreated(combatant);
    });

    // Check when combatants are removed from combat tracker
    Hooks.on(HOOKS_CORE.DELETE_COMBATANT, (combatant, options, userId) => {
      TopNavigation.onCombatantDeleted(combatant);
    });

    // Hook into combatTurn (fires BEFORE database update) to prepare for animation
    Hooks.on(HOOKS_CORE.COMBAT_TURN, (combat, updateData, options) => {
      TopNavigation.onCombatTurnPre(combat, updateData, options);
    });

    // Hook into combatRound (fires BEFORE database update for round changes)
    Hooks.on(HOOKS_CORE.COMBAT_ROUND, (combat, updateData, options) => {
      TopNavigation.onCombatRoundPre(combat, updateData, options);
    });

    // Hook into combat tracker render to add our toggle button
    Hooks.on(HOOKS_CORE.RENDER_COMBAT_TRACKER, (app, html, data) => {
      TopNavigation.onRenderCombatTracker(app, html, data);
    });

    Hooks.on(HOOKS_CORE.RENDER_SCENE_DIRECTORY, (directory) => {
      LogUtil.log(HOOKS_CORE.RENDER_SCENE_DIRECTORY,[directory]);
      const sceneNav = document.querySelector('#scenes .directory-list');

      // apply settings to scene directory
      const directoryScenes = sceneNav.querySelectorAll(".directory-item.scene");
      directoryScenes.forEach(sc => {
        const scene = game.scenes.get(sc.dataset.entryId);
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
              iconElem.classList.add('fa-crown');
              sc.prepend(iconElem);
            }
          }else{
            iconElem.classList.add('fa-eye-slash');
            sc.prepend(iconElem);
          }
        }
      });
    });

    TopNavigation.handleHide();
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
    if(TopNavigation.hidden || document.querySelector("body").classList.contains("hide-player-ui-navigation")){
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
    LogUtil.log("onRender - "+HOOKS_CORE.RENDER_SCENE_NAV, [navHtml, navData]);
    TopNavigation.checkSceneNavCompat();
    TopNavigation.resetLocalVars();
    TopNavigation.handleHide();

    if(TopNavigation.sceneNavEnabled){
      TopNavigation.handleExtraButtons(nav, navHtml, navData);
      TopNavigation.handleSceneList(nav, navHtml, navData);
      TopNavigation.handleActiveSceneSeparation(navHtml);
      TopNavigation.handleFolderList(nav, navHtml, navData);
      TopNavigation.setNavPosition(scenePage, false);
      TopNavigation.handleNavState();
      TopNavigation.addListeners();
      // TopNavigation.applyButtonSettings();
      TopNavigation.addSceneListeners(navHtml);

      GeneralUtil.addCSSVars("--region-legend-offset", "calc(-100vw + 500px)");
    }else{
      GeneralUtil.addCSSVars("--region-legend-offset", "0px");
    }
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

        // Mark scene nav as rendered and try to apply offset
        TopNavigation.#sceneNavRendered = true;
        TopNavigation.#tryApplySceneNavOffset();
      }, 100);
    }

    // Hide inactive scenes if folders are open (GM only)
    if(game.user?.isGM){
      const folderToggleOn = SettingsUtil.get(SETTINGS.navShowRootFolders.tag);
      const hideInactiveOnToggle = SettingsUtil.get(SETTINGS.hideInactiveOnFolderToggle.tag);
      const inactiveToggledScenes = navHtml.querySelectorAll("#scene-navigation-inactive .scene");
      const folderToggleExists = document.querySelector("#crlngn-folder-toggle");
      LogUtil.log("hideInactiveOnToggle", [folderToggleOn, hideInactiveOnToggle, inactiveToggledScenes, folderToggleExists]);
      if(hideInactiveOnToggle && folderToggleOn && folderToggleExists){
        inactiveToggledScenes.forEach(sc => sc.classList.add('hidden'));
      }else if(hideInactiveOnToggle){
        inactiveToggledScenes.forEach(sc => sc.classList.remove('hidden'));
      }
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

  static checkSideBar = (isExpanded=false) => {
    TopNavigation.placeNavButtons(); 
    const body = document.querySelector("body");
    LogUtil.log("TopNavigation.checkSideBar", [ui.sidebar, isExpanded]);
    if(isExpanded){
      body.classList.add("crlngn-sidebar-expanded");
    }else{
      body.classList.remove("crlngn-sidebar-expanded");
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
    LogUtil.log("handleSceneList", [nav, navHtml, navData, TopNavigation.useScenePreview, game.user?.isGM]);

    const allSceneLi = navHtml.querySelectorAll(".scene-navigation-menu li.scene");

    for(const li of allSceneLi){
      const id = li.dataset.sceneId;

      // add scene preview
      if(TopNavigation.useScenePreview && game.user?.isGM){
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
        TopNavigation.addPreviewIconListeners(li, sceneData);          
      }
      
      // add custom scene icons
      if(TopNavigation.useSceneIcons){
        li.classList.add('crlngn');
      }
    }

    if(TopNavigation.sceneNavEnabled){
      const column2 = document.querySelector("#ui-left-column-2");
      const existingToggle = document.querySelector("#crlngn-scene-navigation-expand");

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
    }
  }

  /**
   * Handles moving active scenes to inactive list when disableActiveSceneSeparation is enabled
   * Sorts all scenes by navOrder to maintain proper drag-drop ordering
   * @param {HTMLElement} navHtml - The navigation HTML element
   */
  static handleActiveSceneSeparation(navHtml) {
    if (!TopNavigation.disableActiveSceneSeparation) return;

    const activeList = navHtml.querySelector("#scene-navigation-active");
    const inactiveList = navHtml.querySelector("#scene-navigation-inactive");

    if (!activeList || !inactiveList) return;

    // Get all scene items from both lists
    const activeScenes = Array.from(activeList.querySelectorAll("li.scene"));
    const inactiveScenes = Array.from(inactiveList.querySelectorAll("li.scene"));
    const allSceneElements = [...activeScenes, ...inactiveScenes];

    // Sort by navOrder from the scene document
    allSceneElements.sort((a, b) => {
      const sceneA = game.scenes.get(a.dataset.sceneId);
      const sceneB = game.scenes.get(b.dataset.sceneId);
      return (sceneA?.navOrder ?? 0) - (sceneB?.navOrder ?? 0);
    });

    LogUtil.log("handleActiveSceneSeparation", [allSceneElements.length, "scenes combined and sorted"]);

    // Clear the inactive list and re-add all scenes in sorted order
    inactiveList.innerHTML = "";
    allSceneElements.forEach(scene => {
      inactiveList.appendChild(scene);
    });
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
      TopNavigation.toggleNav(SettingsUtil.get(SETTINGS.navStartCollapsed.tag));
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
    TopNavigation.#collapseTimeout = setTimeout(()=>{
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
    }, 200);
    
  }

  /**
   * If Monk's Scene Navigation or Compact Scene Navigation are enabled, disable Carolingian UI Top Navigation
   */
  static checkSceneNavCompat(){
    const SETTINGS = getSettings();
    const uiLeft = document.querySelector("#ui-left");
    
    this.#isMonksSceneNavOn = GeneralUtil.isModuleOn("monks-scene-navigation");
    LogUtil.log("checkSceneNavCompat", [this.#isMonksSceneNavOn]);

    if(TopNavigation.sceneNavEnabled && !this.#isMonksNotificationOn){
      if(game.user?.isGM && this.#isMonksSceneNavOn){
        ui.notifications.warn(game.i18n.localize("CRLNGN_UI.ui.notifications.monksScenesNotSupported"), {localize: true, permanent: true, console:false});
        this.#isMonksNotificationOn = true;
      }
    }
    
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
    if(!sceneNav || !TopNavigation.sceneNavEnabled){
      return;
    }

    const sceneList = sceneNav.querySelector("#scene-navigation-inactive");
    let existingButtons = document.querySelectorAll("button.crlngn-btn");
    // existingButtons.forEach(b => b.remove());

    const btnWidth = (TopNavigation.#navToggle?.offsetWidth * 2) || 0;
    // Check if the scene navigation content is actually scrollable
    // We need to account for the button width when checking if content overflows
    const navClientWidth = sceneNav.clientWidth;
    const navScrollWidth = sceneNav.scrollWidth;
    let isNavOverflowing = navScrollWidth > navClientWidth;

    // When subFoldersLayout is rowStart, also check if active folder contents overflow
    // since absolute positioning doesn't contribute to parent's scrollWidth
    if (!isNavOverflowing && TopNavigation.subFoldersLayout === "rowStart") {
      const activeContents = sceneNav.querySelector(".crlngn-folder-active menu.contents");
      if (activeContents) {
        const contentsRight = activeContents.getBoundingClientRect().right;
        const navRight = sceneNav.getBoundingClientRect().right;
        isNavOverflowing = contentsRight > navRight;
      }
    }

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

    // Update scene nav offset after rendering
    TopNavigation.applySceneNavOffset();
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
      await GeneralUtil.loadTemplates(templatePaths);
      
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

    if (!scene) return;

    // Temporarily override the sheet.render method to prevent scene configuration
    if (scene.sheet && !TopNavigation.#sceneClickTimer) {
      TopNavigation.#originalRenderMethod = scene.sheet.render;
      LogUtil.log("onSelectScene - originalRender",[TopNavigation.#originalRenderMethod]);
      scene.sheet.render = () => { };
      // Restore the original method after a short delay
      setTimeout(() => {
        if (scene.sheet) scene.sheet.render = TopNavigation.#originalRenderMethod;
      }, 500);
    }

    // Clear any existing timer
    if (TopNavigation.#sceneClickTimer) {
      clearTimeout(TopNavigation.#sceneClickTimer);
      if (scene.sheet) scene.sheet.render = TopNavigation.#originalRenderMethod;
      TopNavigation.#sceneClickTimer = null;
    }

    // Set a new timer for the click action
    TopNavigation.#sceneClickTimer = setTimeout(() => {
      scene.view();
      if (scene.sheet) scene.sheet.render = TopNavigation.#originalRenderMethod;
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
      // LogUtil.log("addSceneListeners", [li]);
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
    
    const scene = game.scenes.get(sceneId);
    if (!scene) return;
    
    const oldPreview = sceneElement.querySelector('.scene-preview');
    if (!oldPreview) return;
    
    const wasOpen = oldPreview.classList.contains('open');
    
    LogUtil.log("Scene data for preview", [sceneId, scene.environment?.globalLight?.enabled, scene.tokenVision]);
    
    const templateData = {
      id: scene.id,
      name: scene.name,
      thumb: scene.thumb || "",
      environment: scene.environment,
      tokenVision: scene.tokenVision,
      isGM: game.user?.isGM
    };
    
    const previewTemplate = await GeneralUtil.renderTemplate(
      `modules/${MODULE_ID}/templates/scene-nav-preview.hbs`, 
      templateData
    );
    
    oldPreview.outerHTML = previewTemplate;
    
    const newPreview = sceneElement.querySelector('.scene-preview');
    if (wasOpen && newPreview) {
      newPreview.classList.add('open');
    }
    
    // Re-attach all necessary event listeners
    if (TopNavigation.sceneNavEnabled && TopNavigation.useScenePreview) {
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

  static applySubFoldersLayout = () => {
    const body = document.querySelector("body");
    if (TopNavigation.subFoldersLayout === "rowStart") {
      body.classList.add("crlngn-subnav-start");
    } else {
      body.classList.remove("crlngn-subnav-start");
    }
  }

  static applyExpandScrimToSubfolders = () => {
    const body = document.querySelector("body");
    if (TopNavigation.expandScrimToSubfolders) {
      body.classList.add("crlngn-expand-scrim");
    } else {
      body.classList.remove("crlngn-expand-scrim");
    }
  }

  static applyTopNavHeight = () => {
    const SETTINGS = getSettings();
    const sceneNavEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    GeneralUtil.addCSSVars("--top-nav-height", `${sceneNavEnabled ? "calc(var(--control-item-size) + 1px)" : "0px"}`);
  }

  /**
   * Attempts to apply scene nav offset only when all prerequisites are met.
   * This ensures proper coordination between scene nav rendering and module class application.
   * Called from both renderSceneNavigation and moduleClassesReady hooks.
   * @static
   * @private
   */
  static #tryApplySceneNavOffset = () => {
    if (TopNavigation.#sceneNavRendered && TopNavigation.#moduleClassesReady) {
      LogUtil.log("tryApplySceneNavOffset", ["Both conditions met, applying offset"]);
      TopNavigation.applySceneNavOffset();
    } else {
      LogUtil.log("tryApplySceneNavOffset", [
        "Waiting for conditions:",
        "sceneNavRendered:", TopNavigation.#sceneNavRendered,
        "moduleClassesReady:", TopNavigation.#moduleClassesReady
      ]);
    }
  }

  /**
   * Calculates and applies the scene navigation offset based on folder height
   * This is used to position elements that need to be offset by the scene nav
   * @static
   */
  static applySceneNavOffset = () => {
    const sceneNav = document.querySelector("#scene-navigation");
    if (!sceneNav || !TopNavigation.sceneNavEnabled) {
      GeneralUtil.addCSSVars("--scene-nav-offset", "0px");
      return;
    }

    const isExpanded = sceneNav.classList.contains('expanded');

    if (!isExpanded) {
      GeneralUtil.addCSSVars("--scene-nav-offset", "0px");
      return;
    }

    if (TopNavigation.navShowRootFolders) {
      const activeSceneFolders = game.user?.getFlag(MODULE_ID, "activeSceneFolders") || [];

      const validFolderIds = activeSceneFolders.filter(folderId => {
        return game.folders?.get(folderId)?.type === 'Scene';
      });

      const rowCount = validFolderIds.length + 1;

      GeneralUtil.addCSSVars("--scene-nav-offset", `calc(var(--control-item-size) * ${rowCount})`);
      LogUtil.log("applySceneNavOffset", ["Rows:", rowCount, "Valid folders:", validFolderIds.length, validFolderIds]);
    } else {
      GeneralUtil.addCSSVars("--scene-nav-offset", "var(--control-item-size)");
      LogUtil.log("applySceneNavOffset", ["Single nav height"]);
    }
  }

  /**
   * Updates body classes for extra buttons (back button and scene lookup)
   * These classes are used by CSS to calculate scene nav width
   * @static
   */
  static updateExtraButtonClasses = () => {
    const body = document.querySelector("body");

    if (TopNavigation.useSceneBackButton) {
      body.classList.add("crlngn-back-btn");
    } else {
      body.classList.remove("crlngn-back-btn");
    }

    if (TopNavigation.useSceneLookup && game.user?.isGM) {
      body.classList.add("crlngn-scene-lookup");
    } else {
      body.classList.remove("crlngn-scene-lookup");
    }

    LogUtil.log("updateExtraButtonClasses", [
      "useSceneBackButton:", TopNavigation.useSceneBackButton,
      "useSceneLookup:", TopNavigation.useSceneLookup,
      "isGM:", game.user?.isGM
    ]);
  }

  /**
   * Check if there's a combat with any combatants
   * Used on initial load to handle existing combats
   */
  static checkForActiveCombat = () => {
    LogUtil.log("checkForActiveCombat - called", [
      "enableCombatTrackerCarousel:", TopNavigation.enableCombatTrackerCarousel
    ]);

    // Early exit if feature is disabled
    if (!TopNavigation.enableCombatTrackerCarousel) return;

    const combatWithCombatants = TopNavigation.getCombatWithCombatants();

    LogUtil.log("checkForActiveCombat - combatWithCombatants", [
      "found:", !!combatWithCombatants,
      "combatants:", combatWithCombatants?.combatants?.size
    ]);

    if (combatWithCombatants) {
      // Call directly since we're hooked into renderSidebar which means ui.combat is ready
      TopNavigation.popOutCombatTracker();

      if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled) {
        if (TopNavigation.#navStateBeforeCombat === null) {
          TopNavigation.#navStateBeforeCombat = !TopNavigation.isCollapsed;
        }

        if (!TopNavigation.isCollapsed) {
          TopNavigation.toggleNav(true);
        }
      }
    }
  }

  /**
   * Get any combat that has combatants (any token, not just players)
   * @returns {Combat|null} The combat or null
   */
  static getCombatWithCombatants = () => {
    const combats = game.combats?.contents || [];

    for (const combat of combats) {
      if (combat.combatants?.size > 0) {
        return combat;
      }
    }

    return null;
  }

  /**
   * Handle combat update - check if combat has combatants
   * @param {Combat} combat - The combat that was updated
   * @param {object} updateData - The update data
   */
  static onCombatUpdate = (combat, updateData) => {
    if (combat.combatants?.size > 0) {
      LogUtil.log("onCombatUpdate - combat with combatants", [
        "combat:", combat.id,
        "combatants:", combat.combatants?.size
      ]);

      TopNavigation.popOutCombatTracker();

      // Update the combat toggle button state
      TopNavigation.#updateCombatToggleButton();

      if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled && !TopNavigation.isCollapsed) {
        if (TopNavigation.#navStateBeforeCombat === null) {
          TopNavigation.#navStateBeforeCombat = true; // was expanded
        }

        TopNavigation.toggleNav(true);
      }
    }
  }

  /**
   * Handle combat start - pop out combat tracker and collapse navigation if settings are enabled
   * @param {Combat} combat - The combat that started
   */
  static onCombatStart = (combat) => {
    if (combat.combatants?.size === 0) {
      LogUtil.log("onCombatStart - no combatants, skipping", [combat.id]);
      return;
    }

    LogUtil.log("onCombatStart - combat started", [
      "combat:", combat?.id,
      "combatants:", combat.combatants?.size
    ]);

    TopNavigation.popOutCombatTracker();

    // Update the combat toggle button state
    setTimeout(() => TopNavigation.#updateCombatToggleButton(), 150);

    if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled) {
      if (TopNavigation.#navStateBeforeCombat === null) {
        TopNavigation.#navStateBeforeCombat = !TopNavigation.isCollapsed; // true = was expanded
      }

      if (!TopNavigation.isCollapsed) {
        TopNavigation.toggleNav(true);
      }
    }
  }

  /**
   * Handle combat end - restore navigation and close combat tracker if setting is enabled
   * @param {Combat} combat - The combat that ended
   */
  static onCombatEnd = (combat) => {
    const combatWithCombatants = TopNavigation.getCombatWithCombatants();
    if (combatWithCombatants) return;

    LogUtil.log("onCombatEnd - combat ended", [
      "wasExpanded:", TopNavigation.#navStateBeforeCombat,
      "combat:", combat?.id
    ]);

    TopNavigation.closeCombatTrackerPopout();

    if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled) {
      if (TopNavigation.#navStateBeforeCombat === true) {
        TopNavigation.toggleNav(false); // Expand
      }

      TopNavigation.#navStateBeforeCombat = null;
    }
  }

  /**
   * Handle combatant created - collapse nav and pop out combat tracker when any combatant is added
   * @param {Combatant} combatant - The combatant that was created
   */
  static onCombatantCreated = (combatant) => {
    LogUtil.log("onCombatantCreated - combatant added", [
      "combatant:", combatant.name,
      "isCollapsed:", TopNavigation.isCollapsed,
      "enableCombatTrackerCarousel:", TopNavigation.enableCombatTrackerCarousel
    ]);

    // Early exit if feature is disabled
    if (!TopNavigation.enableCombatTrackerCarousel) return;

    TopNavigation.popOutCombatTracker();

    if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled) {
      if (TopNavigation.#navStateBeforeCombat === null && !TopNavigation.isCollapsed) {
        TopNavigation.#navStateBeforeCombat = true; // was expanded
      }

      if (!TopNavigation.isCollapsed) {
        TopNavigation.toggleNav(true);
      }
    }
  }

  /**
   * Handle combatant deleted - restore nav and close combat tracker if no more combatants in any combat
   * @param {Combatant} combatant - The combatant that was deleted
   */
  static onCombatantDeleted = (combatant) => {
    setTimeout(() => {
      const combatWithCombatants = TopNavigation.getCombatWithCombatants();

      if (!combatWithCombatants) {
        LogUtil.log("onCombatantDeleted - no more combatants", [
          "wasExpanded:", TopNavigation.#navStateBeforeCombat
        ]);

        TopNavigation.closeCombatTrackerPopout();

        if (TopNavigation.collapseNavDuringCombat && TopNavigation.sceneNavEnabled) {
          if (TopNavigation.#navStateBeforeCombat === true) {
            TopNavigation.toggleNav(false); // Expand
          }

          TopNavigation.#navStateBeforeCombat = null;
        }
      }
    }, 100);
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
    TopNavigation.sceneItemWidth = SettingsUtil.get(SETTINGS.sceneItemWidth.tag);
    TopNavigation.disableActiveSceneSeparation = SettingsUtil.get(SETTINGS.disableActiveSceneSeparation.tag);
    TopNavigation.subFoldersLayout = SettingsUtil.get(SETTINGS.subFoldersLayout.tag);
    TopNavigation.expandScrimToSubfolders = SettingsUtil.get(SETTINGS.expandScrimToSubfolders.tag);
    TopNavigation.collapseNavDuringCombat = SettingsUtil.get(SETTINGS.collapseNavDuringCombat.tag);
    TopNavigation.enableCombatTrackerCarousel = SettingsUtil.get(SETTINGS.enableCombatTrackerCarousel.tag);
    TopNavigation.combatCarouselScale = SettingsUtil.get(SETTINGS.combatCarouselScale.tag) ?? 1;
    TopNavigation.isCollapsed = TopNavigation.navStartCollapsed;

    TopNavigation.applyCombatTrackerCarouselClass();

    TopNavigation.applySceneItemWidth();
    TopNavigation.applySubFoldersLayout();
    TopNavigation.applyExpandScrimToSubfolders();
  }

  /**
   * Refresh settings after GM enforcement
   */
  static refreshSettings() {
    TopNavigation.loadSettings();

    const body = document.querySelector("body");
    if(TopNavigation.sceneNavEnabled){
      body.classList.add("crlngn-scene-nav");
    }else{
      body.classList.remove("crlngn-scene-nav");
    }

    if (ui.nav) {
      ui.nav.render();
    }
  }

  /**
   * Apply the combat tracker carousel body class and scale based on settings
   */
  static applyCombatTrackerCarouselClass = () => {
    const body = document.querySelector("body");
    if (TopNavigation.enableCombatTrackerCarousel) {
      body.classList.add("crlngn-combat-tracker");
      // Apply scale to existing popout if present
      TopNavigation.applyCombatCarouselScale();
    } else {
      body.classList.remove("crlngn-combat-tracker");
    }
  }

  /**
   * Apply combat carousel scale to the popout element
   */
  static applyCombatCarouselScale = () => {
    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    const scale = TopNavigation.combatCarouselScale ?? 1;
    combatPopout.style.setProperty('--carousel-scale', scale);
  }

  /**
   * Handle combat tracker render - add toggle button to popout
   * @param {Application} app - The combat tracker application
   * @param {jQuery|HTMLElement} html - The rendered HTML
   * @param {object} data - The render data
   */
  static onRenderCombatTracker = (app, html, data) => {
    // Check if this is the popout by looking at the element ID
    // The popout has id="combat-popout" while the sidebar version has id="combat"
    // The html parameter can be jQuery or HTMLElement, and may be the inner content
    const element = html?.[0] || html;
    const elementId = element?.id || app.element?.[0]?.id || app.id;

    // Also check if the popout exists in DOM (more reliable for V2 apps)
    const popoutExists = document.querySelector('#combat-popout') !== null;
    const isPopout = elementId === 'combat-popout' || (popoutExists && app.id === 'combat-popout');

    // Log unconditionally to verify the hook fires
    LogUtil.log("onRenderCombatTracker - hook fired", [
      "enableCombatTrackerCarousel:", TopNavigation.enableCombatTrackerCarousel,
      "app.id:", app?.id,
      "elementId:", elementId,
      "popoutExists:", popoutExists,
      "isPopout:", isPopout
    ]);

    if (!TopNavigation.enableCombatTrackerCarousel) return;

    // Only process the popout version
    if (!isPopout) return;

    LogUtil.log("onRenderCombatTracker - popout rendered", [app, html]);

    // Wait a frame for the DOM to be ready
    requestAnimationFrame(() => {
      const combatPopout = document.querySelector('#combat-popout');
      if (!combatPopout) return;

      // Apply scale setting
      TopNavigation.applyCombatCarouselScale();

      // Flatten combatant groups for carousel display
      TopNavigation.#flattenCombatantGroups(combatPopout);

      const windowHeader = combatPopout.querySelector('.window-header');
      if (windowHeader) {
        TopNavigation.#addCombatToggleButton(combatPopout, windowHeader);
      }

      // Also initialize docking behavior
      TopNavigation.initCombatTrackerDocking();

      // Initialize the stacked carousel system
      TopNavigation.#pendingTurnChange = null;
      TopNavigation.#initStackedCarousel(combatPopout);
    });
  }

  /**
   * Handle combat turn PRE-change (fires BEFORE database update)
   * Sets up pending turn change so renderApplicationV2 can hide tracker
   * @param {Combat} combat - The combat instance
   * @param {object} updateData - Contains new round/turn values
   * @param {object} options - Update options (includes direction)
   */
  static onCombatTurnPre = (combat, updateData, options) => {
    if (!TopNavigation.enableCombatTrackerCarousel) return;

    const priorRound = combat.round;
    const priorTurn = combat.turn;
    const newRound = updateData.round ?? priorRound;
    const newTurn = updateData.turn ?? priorTurn;

    // Determine direction based on turn/round comparison
    const isForward = (newRound > priorRound) ||
      (newRound === priorRound && newTurn > priorTurn);

    // Detect round wrap (going from last turn to first turn of new round)
    const isRoundWrap = newRound > priorRound && newTurn === 0;

    LogUtil.log("onCombatTurnPre - about to change turn", [
      "combat:", combat?.id,
      "prior:", { round: priorRound, turn: priorTurn },
      "new:", { round: newRound, turn: newTurn },
      "direction:", isForward ? "forward" : "backward",
      "isRoundWrap:", isRoundWrap
    ]);

    // Store pending turn change
    TopNavigation.#pendingTurnChange = {
      isForward,
      wrapCount: isRoundWrap ? priorTurn + 1 : 0
    };
  }

  /**
   * Handle combat round PRE-change (fires BEFORE database update for round changes)
   * @param {Combat} combat - The combat instance
   * @param {object} updateData - Contains new round/turn values
   * @param {object} options - Update options (includes direction)
   */
  static onCombatRoundPre = (combat, updateData, options) => {
    if (!TopNavigation.enableCombatTrackerCarousel) return;

    const priorRound = combat.round;
    const priorTurn = combat.turn;
    const newRound = updateData.round ?? priorRound;
    const newTurn = updateData.turn ?? 0;

    // Determine direction
    const isForward = newRound > priorRound;

    // For round wrap forward, we need to wrap all remaining combatants
    const isRoundWrap = isForward && newTurn === 0;

    LogUtil.log("onCombatRoundPre - about to change round", [
      "combat:", combat?.id,
      "prior:", { round: priorRound, turn: priorTurn },
      "new:", { round: newRound, turn: newTurn },
      "direction:", isForward ? "forward" : "backward",
      "isRoundWrap:", isRoundWrap
    ]);

    // Store pending turn change
    TopNavigation.#pendingTurnChange = {
      isForward,
      wrapCount: isRoundWrap ? priorTurn + 1 : 0
    };
  }

  /**
   * Flatten combatant groups for carousel display
   * Foundry groups NPCs with same initiative - we need to unpack them as flat items
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #flattenCombatantGroups = (combatPopout) => {
    const tracker = combatPopout.querySelector('.combat-tracker');
    if (!tracker) return;

    const groups = tracker.querySelectorAll('li.combatant-group');
    if (groups.length === 0) return;

    groups.forEach(group => {
      const childCombatants = group.querySelectorAll('.group-children > li.combatant');
      if (childCombatants.length === 0) return;

      childCombatants.forEach(combatant => {
        tracker.insertBefore(combatant, group);
      });

      group.remove();
    });

    LogUtil.log("flattenCombatantGroups - flattened groups", [
      "groups flattened:", groups.length
    ]);
  }

  /**
   * Calculate how many combatant cards can fit in the visible area
   * @param {number} containerWidth - Width of the container in pixels
   * @param {number} totalCombatants - Total number of combatants
   * @returns {number} Number of visible cards (odd number when stacks needed)
   */
  static #calculateVisibleCount = (containerWidth, totalCombatants) => {
    const scale = TopNavigation.combatCarouselScale ?? 1;
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.25 * baseFontSize;
    const stackWidth = 4.5 * baseFontSize * scale;

    const allCardsWidth = (totalCombatants * cardWidth) + ((totalCombatants - 1) * gap);
    if (allCardsWidth <= containerWidth) {
      return totalCombatants;
    }

    const availableForCards = containerWidth - (2 * stackWidth) - (4 * gap);
    let visibleCount = Math.floor((availableForCards + gap) / (cardWidth + gap));

    if (visibleCount % 2 === 0) {
      visibleCount = Math.max(1, visibleCount - 1);
    }

    return Math.max(1, visibleCount);
  }

  /**
   * Initialize the stacked carousel system
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #initStackedCarousel = (combatPopout) => {
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    TopNavigation.#recalculateStackState(tracker);
    TopNavigation.#buildStackedCarouselDOM(tracker);
    TopNavigation.#initCarouselResizeObserver(combatPopout);
  }

  /**
   * Recalculate the stacked carousel state based on current combatants and container size
   * @param {HTMLElement} tracker - The .combat-tracker element
   */
  static #recalculateStackState = (tracker) => {
    const state = TopNavigation.#carouselStackState;
    const combatants = Array.from(tracker.querySelectorAll(':scope > li.combatant'));

    state.allCombatantIds = combatants.map(c => c.dataset.combatantId);

    const windowContent = tracker.closest('.window-content');
    state.containerWidth = windowContent?.clientWidth || tracker.parentElement?.clientWidth || 800;

    const totalCount = state.allCombatantIds.length;
    state.visibleCount = TopNavigation.#calculateVisibleCount(state.containerWidth, totalCount);

    if (state.visibleCount >= totalCount) {
      state.visibleStartIndex = 0;
      state.leftStackCount = 0;
      state.rightStackCount = 0;
      return;
    }

    const combat = game.combat;
    const activeId = combat?.combatant?.id;
    let activeIndex = activeId ? state.allCombatantIds.indexOf(activeId) : 0;
    if (activeIndex === -1) activeIndex = 0;

    const centerOffset = Math.floor(state.visibleCount / 2);
    let idealStart = activeIndex - centerOffset;

    if (idealStart < 0) {
      idealStart = 0;
    } else if (idealStart + state.visibleCount > totalCount) {
      idealStart = totalCount - state.visibleCount;
    }

    state.visibleStartIndex = idealStart;
    state.leftStackCount = idealStart;
    state.rightStackCount = totalCount - idealStart - state.visibleCount;
  }

  /**
   * Create a stack element for the left or right side
   * @param {HTMLElement} tracker - The tracker element (to find combatant data)
   * @param {'left'|'right'} side - Which side the stack is on
   * @param {number} count - Number of items in the stack
   * @param {number} topIndex - Index of the topmost combatant in the stack
   * @returns {HTMLElement} The stack element
   */
  static #createStackElement = (tracker, side, count, topIndex) => {
    const state = TopNavigation.#carouselStackState;
    const topCombatantId = state.allCombatantIds[topIndex];

    const stack = document.createElement('li');
    stack.className = `crlngn-card-stack stack-${side}`;
    stack.dataset.stackCount = count;
    stack.dataset.side = side;
    stack.dataset.topIndex = topIndex;

    const back = document.createElement('div');
    back.className = 'stack-card-back';
    stack.appendChild(back);

    const front = document.createElement('div');
    front.className = 'stack-card-front';

    const combat = game.combat;
    const combatant = combat?.combatants.get(topCombatantId);
    if (combatant) {
      const img = document.createElement('img');
      img.src = combatant.token?.texture?.src || combatant.img || '';
      img.className = 'token-image';
      img.alt = combatant.name || '';
      front.appendChild(img);
    }
    stack.appendChild(front);

    const caret = document.createElement('i');
    caret.className = `stack-caret fas fa-caret-${side}`;
    stack.appendChild(caret);

    const badge = document.createElement('span');
    badge.className = 'stack-count-badge';
    badge.textContent = count;
    stack.appendChild(badge);

    stack.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      TopNavigation.#onStackClick(side);
    });

    return stack;
  }

  /**
   * Build the stacked carousel DOM based on current state
   * @param {HTMLElement} tracker - The .combat-tracker element
   * @param {'left'|'right'|'none'} animateDirection - Direction of animation or 'none'
   */
  static #buildStackedCarouselDOM = (tracker, animateDirection = 'none') => {
    const state = TopNavigation.#carouselStackState;

    tracker.querySelectorAll('.crlngn-card-stack').forEach(el => el.remove());

    const allCombatants = Array.from(tracker.querySelectorAll(':scope > li.combatant'));

    allCombatants.forEach((c) => {
      c.style.display = 'none';
      c.classList.remove('slide-in-left', 'slide-in-right');
    });

    const visibleEnd = state.visibleStartIndex + state.visibleCount;
    for (let i = state.visibleStartIndex; i < visibleEnd && i < allCombatants.length; i++) {
      const combatant = allCombatants[i];
      combatant.style.display = '';

      if (animateDirection === 'right' && i === visibleEnd - 1) {
        combatant.classList.add('slide-in-right');
      } else if (animateDirection === 'left' && i === state.visibleStartIndex) {
        combatant.classList.add('slide-in-left');
      }
    }

    if (state.leftStackCount > 0) {
      const topLeftIndex = state.visibleStartIndex - 1;
      const leftStack = TopNavigation.#createStackElement(tracker, 'left', state.leftStackCount, topLeftIndex);

      const firstVisible = allCombatants[state.visibleStartIndex];
      if (firstVisible) {
        tracker.insertBefore(leftStack, firstVisible);
      }
    }

    if (state.rightStackCount > 0) {
      const topRightIndex = state.visibleStartIndex + state.visibleCount;
      const rightStack = TopNavigation.#createStackElement(tracker, 'right', state.rightStackCount, topRightIndex);
      tracker.appendChild(rightStack);
    }

    tracker.classList.add('crlngn-stacked-carousel');

    LogUtil.log("buildStackedCarouselDOM", [
      "visibleCount:", state.visibleCount,
      "visibleStartIndex:", state.visibleStartIndex,
      "leftStackCount:", state.leftStackCount,
      "rightStackCount:", state.rightStackCount,
      "animateDirection:", animateDirection
    ]);
  }

  /**
   * Handle click on a stack to reveal one card
   * @param {'left'|'right'} side - Which stack was clicked
   */
  static #onStackClick = (side) => {
    const state = TopNavigation.#carouselStackState;
    const combatPopout = document.querySelector('#combat-popout');
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    if (side === 'right' && state.rightStackCount > 0) {
      state.visibleStartIndex++;
      state.leftStackCount++;
      state.rightStackCount--;
      TopNavigation.#buildStackedCarouselDOM(tracker, 'right');
    } else if (side === 'left' && state.leftStackCount > 0) {
      state.visibleStartIndex--;
      state.leftStackCount--;
      state.rightStackCount++;
      TopNavigation.#buildStackedCarouselDOM(tracker, 'left');
    }
  }

  /**
   * Center the carousel view on the active combatant
   * Called when turn changes to auto-scroll to the new active
   * @param {boolean} animate - Whether to animate the transition
   */
  static #centerOnActiveCombatant = (animate = true) => {
    const combatPopout = document.querySelector('#combat-popout');
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    const state = TopNavigation.#carouselStackState;
    const combat = game.combat;
    if (!combat) return;

    const activeId = combat.combatant?.id;
    if (!activeId) return;

    const activeIndex = state.allCombatantIds.indexOf(activeId);
    if (activeIndex === -1) return;

    const totalCount = state.allCombatantIds.length;

    if (state.visibleCount >= totalCount) {
      return;
    }

    const isCurrentlyVisible = activeIndex >= state.visibleStartIndex &&
                               activeIndex < state.visibleStartIndex + state.visibleCount;
    if (isCurrentlyVisible) {
      return;
    }

    const oldStartIndex = state.visibleStartIndex;
    const centerOffset = Math.floor(state.visibleCount / 2);
    let idealStart = activeIndex - centerOffset;

    if (idealStart < 0) {
      idealStart = 0;
    } else if (idealStart + state.visibleCount > totalCount) {
      idealStart = totalCount - state.visibleCount;
    }

    state.visibleStartIndex = idealStart;
    state.leftStackCount = idealStart;
    state.rightStackCount = totalCount - idealStart - state.visibleCount;

    const direction = animate ? (idealStart > oldStartIndex ? 'right' : 'left') : 'none';
    TopNavigation.#buildStackedCarouselDOM(tracker, direction);
  }

  /**
   * Initialize ResizeObserver for carousel responsiveness
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #initCarouselResizeObserver = (combatPopout) => {
    if (TopNavigation.#carouselResizeObserver) {
      TopNavigation.#carouselResizeObserver.disconnect();
    }

    const windowContent = combatPopout.querySelector('.window-content');
    if (!windowContent) return;

    TopNavigation.#carouselResizeObserver = new ResizeObserver(
      GeneralUtil.debounce(() => {
        const tracker = combatPopout.querySelector('.combat-tracker');
        if (tracker) {
          TopNavigation.#recalculateStackState(tracker);
          TopNavigation.#buildStackedCarouselDOM(tracker);
        }
      }, 100)
    );

    TopNavigation.#carouselResizeObserver.observe(windowContent);
  }

  /**
   * Clean up the carousel ResizeObserver
   */
  static #cleanupCarouselResizeObserver = () => {
    if (TopNavigation.#carouselResizeObserver) {
      TopNavigation.#carouselResizeObserver.disconnect();
      TopNavigation.#carouselResizeObserver = null;
    }
  }

  /**
   * Pop out the combat tracker when combat has combatants
   * @param {number} retryCount - Number of retries attempted (internal use)
   */
  static popOutCombatTracker = (retryCount = 0) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 200;

    LogUtil.log("popOutCombatTracker - called", [
      "enableCombatTrackerCarousel:", TopNavigation.enableCombatTrackerCarousel,
      "combatTrackerPoppedOut:", TopNavigation.#combatTrackerPoppedOut,
      "retryCount:", retryCount,
      "ui.combat:", !!ui.combat,
      "ui.combat.renderPopout:", typeof ui.combat?.renderPopout
    ]);

    if (!TopNavigation.enableCombatTrackerCarousel) return;

    // If already popped out, check if popout element exists and reinitialize if needed
    if (TopNavigation.#combatTrackerPoppedOut) {
      const existingPopout = document.querySelector('#combat-popout');
      if (existingPopout) {
        // Re-initialize docking in case it wasn't set up
        TopNavigation.initCombatTrackerDocking();
      }
      return;
    }

    // Check if popout already exists and is rendered
    if (ui.combat?.popout && ui.combat.popout.rendered) {
      TopNavigation.#combatTrackerPoppedOut = true;
      // The onRenderCombatTracker hook will handle initialization
      // But in case it already rendered, try to initialize now
      TopNavigation.initCombatTrackerDocking();
      return;
    }

    // Check if ui.combat is ready - use renderPopout() for Foundry V13+ (ApplicationV2)
    if (!ui.combat || typeof ui.combat.renderPopout !== 'function') {
      if (retryCount < MAX_RETRIES) {
        LogUtil.log("popOutCombatTracker - ui.combat not ready, retrying...", [
          "retryCount:", retryCount
        ]);
        setTimeout(() => TopNavigation.popOutCombatTracker(retryCount + 1), RETRY_DELAY);
      } else {
        LogUtil.log("popOutCombatTracker - ui.combat not ready after max retries", [
          "ui.combat:", !!ui.combat
        ]);
      }
      return;
    }

    LogUtil.log("popOutCombatTracker - popping out combat tracker");

    // Use renderPopout() for Foundry V13+ (ApplicationV2)
    ui.combat.renderPopout();
    TopNavigation.#combatTrackerPoppedOut = true;
  }

  /**
   * Close the combat tracker popout when combat ends
   */
  static closeCombatTrackerPopout = () => {
    if (!TopNavigation.enableCombatTrackerCarousel) return;
    if (!TopNavigation.#combatTrackerPoppedOut) return;

    LogUtil.log("closeCombatTrackerPopout - closing combat tracker popout");

    // Clean up the resize observer
    TopNavigation.#cleanupCarouselResizeObserver();

    // Close the combat tracker popout - try multiple methods for V2 compatibility
    const combatPopout = document.querySelector('#combat-popout');
    if (combatPopout) {
      // Try to find and click the close button
      const closeBtn = combatPopout.querySelector('[data-action="close"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        // Fallback: try the old API
        ui.combat?.popout?.close();
      }
    }
    TopNavigation.#combatTrackerPoppedOut = false;
  }

  /**
   * Initialize docking behavior for combat tracker popout
   * Called when combat tracker is popped out
   */
  static initCombatTrackerDocking = () => {
    // Log unconditionally to verify this is called
    LogUtil.log("initCombatTrackerDocking - called", [
      "enableCombatTrackerCarousel:", TopNavigation.enableCombatTrackerCarousel
    ]);

    if (!TopNavigation.enableCombatTrackerCarousel) return;

    // Wait for the popout to render
    setTimeout(() => {
      const combatPopout = document.querySelector('#combat-popout');
      if (!combatPopout) {
        LogUtil.log("initCombatTrackerDocking - no popout found, aborting");
        return;
      }

      // Check if already initialized to avoid duplicate listeners
      if (combatPopout.dataset.crlngnDockingInitialized === 'true') {
        LogUtil.log("initCombatTrackerDocking - already initialized, skipping");
        return;
      }

      const windowHeader = combatPopout.querySelector('.window-header');
      const windowContent = combatPopout.querySelector('.window-content');

      LogUtil.log("initCombatTrackerDocking - elements found", [
        "windowHeader:", windowHeader,
        "windowContent:", windowContent
      ]);

      // Add drag listener only to window header (not content, to avoid interfering with combatant clicks)
      if (windowHeader) {
        windowHeader.addEventListener('mousedown', TopNavigation.#onCombatTrackerDragStart, true);
        LogUtil.log("initCombatTrackerDocking - added listener to windowHeader");
      }

      // Mark as initialized
      combatPopout.dataset.crlngnDockingInitialized = 'true';

      // Add combat toggle button to window header
      TopNavigation.#addCombatToggleButton(combatPopout, windowHeader);

      // Load saved dock state - default to docked if no preference saved
      const savedState = game.user?.getFlag(MODULE_ID, 'combatTrackerDocked');
      // If savedState is undefined (never set), default to true (docked)
      const shouldDock = savedState !== false;
      if (shouldDock) {
        TopNavigation.#combatTrackerDockState.isDocked = true;
        TopNavigation.#applyCombatTrackerDockedStyles(combatPopout);
      }

      LogUtil.log("initCombatTrackerDocking - initialized", [combatPopout]);
    }, 150); // Slightly longer delay to ensure render is complete
  }

  /**
   * Add combat toggle button to the window header
   * @param {HTMLElement} combatPopout - The combat tracker popout element
   * @param {HTMLElement} windowHeader - The window header element
   */
  static #addCombatToggleButton = (combatPopout, windowHeader) => {
    if (!windowHeader) return;

    // Check if button already exists
    if (windowHeader.querySelector('.crlngn-combat-toggle')) return;

    const combat = game.combat;
    const isStarted = combat?.started;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `crlngn-combat-toggle ${isStarted ? 'combat-active' : ''}`;
    toggleBtn.dataset.tooltip = isStarted
      ? game.i18n.localize('COMBAT.End')
      : game.i18n.localize('COMBAT.Begin');
    toggleBtn.innerHTML = `<i class="fas ${isStarted ? 'fa-stop' : 'fa-play'}"></i>`;

    // Add click handler
    toggleBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const combat = game.combat;
      if (!combat) return;

      if (combat.started) {
        // End combat
        await combat.endCombat();
      } else {
        // Start combat
        await combat.startCombat();
      }

      // Update button state
      TopNavigation.#updateCombatToggleButton(combatPopout);
    });

    // Insert at the end of window header
    windowHeader.appendChild(toggleBtn);
  }

  /**
   * Update the combat toggle button state
   * @param {HTMLElement} combatPopout - The combat tracker popout element
   */
  static #updateCombatToggleButton = (combatPopout) => {
    if (!combatPopout) {
      combatPopout = document.querySelector('#combat-popout');
    }
    if (!combatPopout) return;

    const toggleBtn = combatPopout.querySelector('.crlngn-combat-toggle');
    if (!toggleBtn) return;

    const combat = game.combat;
    const isStarted = combat?.started;

    toggleBtn.className = `crlngn-combat-toggle ${isStarted ? 'combat-active' : ''}`;
    toggleBtn.dataset.tooltip = isStarted
      ? game.i18n.localize('COMBAT.End')
      : game.i18n.localize('COMBAT.Begin');
    toggleBtn.innerHTML = `<i class="fas ${isStarted ? 'fa-stop' : 'fa-play'}"></i>`;
  }

  /**
   * Handle combat tracker drag start
   * @param {MouseEvent} event
   */
  static #onCombatTrackerDragStart = (event) => {
    if (event.button !== 0) return; // Only left mouse button

    // Verify the event is from the combat popout specifically
    const combatPopout = event.target.closest('#combat-popout');
    if (!combatPopout) {
      // This event is from a different window, let it pass through
      return;
    }

    LogUtil.log("Combat tracker drag start - handler called", [
      "button:", event.button,
      "target:", event.target,
      "target.tagName:", event.target?.tagName
    ]);

    // Skip if clicking on buttons, links, inputs, or other interactive elements
    if (event.target.closest('button') ||
        event.target.closest('a') ||
        event.target.closest('input') ||
        event.target.closest('.combatant-controls') ||
        event.target.closest('.token-initiative')) {
      LogUtil.log("Combat tracker drag start - skipped due to interactive element");
      return;
    }

    const state = TopNavigation.#combatTrackerDockState;
    state.isDragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;

    const rect = combatPopout.getBoundingClientRect();
    state.startLeft = rect.left;
    state.startTop = rect.top;

    // If currently docked, undock first
    if (state.isDocked) {
      TopNavigation.#undockCombatTracker(combatPopout);
      // Center element on cursor after undocking
      const newRect = combatPopout.getBoundingClientRect();
      state.startLeft = event.clientX - (newRect.width / 2);
      state.startTop = event.clientY - 15; // Offset for header
      combatPopout.style.left = `${state.startLeft}px`;
      combatPopout.style.top = `${state.startTop}px`;
    }

    // Create bound handlers
    state.boundDragMove = TopNavigation.#onCombatTrackerDragMove;
    state.boundDragEnd = TopNavigation.#onCombatTrackerDragEnd;

    document.addEventListener('mousemove', state.boundDragMove);
    document.addEventListener('mouseup', state.boundDragEnd);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // Prevent Foundry's drag handler

    LogUtil.log("Combat tracker drag start", [state]);
  }

  /**
   * Handle combat tracker drag move
   * @param {MouseEvent} event
   */
  static #onCombatTrackerDragMove = (event) => {
    const state = TopNavigation.#combatTrackerDockState;
    if (!state.isDragging) return;

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    const newLeft = state.startLeft + deltaX;
    const newTop = state.startTop + deltaY;

    combatPopout.style.left = `${newLeft}px`;
    combatPopout.style.top = `${newTop}px`;

    // Check if in snap zone (within 50px of top edge)
    const SNAP_DISTANCE = 50;
    const rect = combatPopout.getBoundingClientRect();

    LogUtil.log("Combat tracker drag move", [
      "rect.top:", rect.top,
      "SNAP_DISTANCE:", SNAP_DISTANCE,
      "inSnapZone:", rect.top <= SNAP_DISTANCE
    ]);

    if (rect.top <= SNAP_DISTANCE) {
      combatPopout.classList.add('near-dock');
    } else {
      combatPopout.classList.remove('near-dock');
    }
  }

  /**
   * Handle combat tracker drag end
   * @param {MouseEvent} event
   */
  static #onCombatTrackerDragEnd = (event) => {
    const state = TopNavigation.#combatTrackerDockState;
    if (!state.isDragging) return;

    document.removeEventListener('mousemove', state.boundDragMove);
    document.removeEventListener('mouseup', state.boundDragEnd);

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    combatPopout.classList.remove('near-dock');

    // Check if should dock (within 50px of top edge)
    const SNAP_DISTANCE = 50;
    const rect = combatPopout.getBoundingClientRect();

    if (rect.top <= SNAP_DISTANCE) {
      TopNavigation.#dockCombatTracker(combatPopout);
    } else {
      // Save undocked position
      game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', false);
      state.isDocked = false;
    }

    state.isDragging = false;

    LogUtil.log("Combat tracker drag end", [state.isDocked]);
  }

  /**
   * Apply docked styles to combat tracker
   * @param {HTMLElement} combatPopout
   */
  static #applyCombatTrackerDockedStyles = (combatPopout) => {
    combatPopout.classList.add('docked-top');
    combatPopout.style.zIndex = '101';
    combatPopout.style.left = '50%';
    combatPopout.style.top = 'var(--crlngn-top-offset)';
    // Scale is applied via CSS using --carousel-scale variable
  }

  /**
   * Dock combat tracker to top of screen
   * @param {HTMLElement} combatPopout
   */
  static #dockCombatTracker = (combatPopout) => {
    const state = TopNavigation.#combatTrackerDockState;

    // Add snapping animation
    combatPopout.classList.add('snapping');
    setTimeout(() => combatPopout.classList.remove('snapping'), 300);

    // Apply docked styles
    TopNavigation.#applyCombatTrackerDockedStyles(combatPopout);

    // Save state
    game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', true);
    state.isDocked = true;

    LogUtil.log("Combat tracker docked to top");
  }

  /**
   * Undock combat tracker from top
   * @param {HTMLElement} combatPopout
   */
  static #undockCombatTracker = (combatPopout) => {
    const state = TopNavigation.#combatTrackerDockState;

    combatPopout.classList.remove('docked-top');
    combatPopout.style.transform = '';

    // Save state
    game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', false);
    state.isDocked = false;

    LogUtil.log("Combat tracker undocked");
  }

}
