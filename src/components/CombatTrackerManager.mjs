import { LogUtil } from "./LogUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { CombatCarousel } from "./CombatCarouselUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";

/**
 * Manages the combat tracker popout, docking, and combat lifecycle events
 * Separate from CombatCarousel which handles only the infinite scroll animation
 */
export class CombatTrackerManager {
  static collapseNavDuringCombat = false;
  static enableCombatTrackerCarousel = false;
  static combatCarouselScale = 1;
  static combatTrackerTakeFullWidth = false;
  static carouselImageSource = "token";
  static carouselShowEffects = false;

  static #navCollapseCallback = null;
  static #navExpandCallback = null;
  static #getNavCollapsedState = null;
  static #getSceneNavEnabled = null;
  static #navStateBeforeCombat = null;
  static #combatTrackerPoppedOut = false;
  static #dockState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    boundDragMove: null,
    boundDragEnd: null,
    isDocked: false
  };
  static #pendingTurnChange = null;

  /**
   * Initialize combat tracker manager and register hooks
   */
  static init = (collapseCallback, expandCallback, getCollapsedState, getSceneNavEnabled) => {
    CombatTrackerManager.#navCollapseCallback = collapseCallback;
    CombatTrackerManager.#navExpandCallback = expandCallback;
    CombatTrackerManager.#getNavCollapsedState = getCollapsedState;
    CombatTrackerManager.#getSceneNavEnabled = getSceneNavEnabled;

    Hooks.on(HOOKS_CORE.COMBAT_START, (combat) => CombatTrackerManager.onCombatStart(combat));
    Hooks.on(HOOKS_CORE.DELETE_COMBAT, (combat) => CombatTrackerManager.onCombatEnd(combat));
    Hooks.on(HOOKS_CORE.UPDATE_COMBAT, (combat, updateData) => CombatTrackerManager.onCombatUpdate(combat, updateData));
    Hooks.on(HOOKS_CORE.CREATE_COMBATANT, (combatant) => CombatTrackerManager.onCombatantCreated(combatant));
    Hooks.on(HOOKS_CORE.DELETE_COMBATANT, (combatant) => CombatTrackerManager.onCombatantDeleted(combatant));
    Hooks.on(HOOKS_CORE.COMBAT_TURN, (combat, updateData, options) => CombatTrackerManager.onCombatTurnPre(combat, updateData, options));
    Hooks.on(HOOKS_CORE.COMBAT_ROUND, (combat, updateData, options) => CombatTrackerManager.onCombatRoundPre(combat, updateData, options));
    Hooks.on(HOOKS_CORE.RENDER_COMBAT_TRACKER, (app, html, data) => CombatTrackerManager.onRenderCombatTracker(app, html, data));
    Hooks.on(HOOKS_CORE.UPDATE_ACTOR, (actor, updateData, options, userId) => CombatTrackerManager.onActorUpdate(actor, updateData));

    Hooks.once(HOOKS_CORE.READY, () => {
      CombatCarousel.registerCombatWrappers();
    });
  }

  /**
   * Load settings directly from SettingsUtil
   */
  static loadSettings = () => {
    const SETTINGS = getSettings();

    CombatTrackerManager.collapseNavDuringCombat = SettingsUtil.get(SETTINGS.collapseNavDuringCombat.tag) ?? false;
    CombatTrackerManager.enableCombatTrackerCarousel = SettingsUtil.get(SETTINGS.enableCombatTrackerCarousel.tag) ?? false;
    CombatTrackerManager.combatCarouselScale = SettingsUtil.get(SETTINGS.combatCarouselScale.tag) ?? 1;
    CombatTrackerManager.combatTrackerTakeFullWidth = SettingsUtil.get(SETTINGS.combatTrackerTakeFullWidth.tag) ?? false;
    CombatTrackerManager.carouselImageSource = SettingsUtil.get(SETTINGS.carouselImageSource.tag) ?? "token";
    CombatTrackerManager.carouselShowEffects = SettingsUtil.get(SETTINGS.carouselShowEffects.tag) ?? false;

    CombatTrackerManager.#applyBodyClasses();
  }

  /**
   * Apply body classes based on current settings
   */
  static #applyBodyClasses = () => {
    if (CombatTrackerManager.combatTrackerTakeFullWidth) {
      document.body.classList.add('crlngn-carousel-full-width');
    } else {
      document.body.classList.remove('crlngn-carousel-full-width');
    }

    if (CombatTrackerManager.carouselShowEffects) {
      document.body.classList.add('crlngn-show-effects');
    } else {
      document.body.classList.remove('crlngn-show-effects');
    }
  }

  /**
   * Get if nav is currently collapsed
   */
  static #isNavCollapsed = () => {
    return CombatTrackerManager.#getNavCollapsedState?.() ?? false;
  }

  /**
   * Get if scene nav is enabled
   */
  static #isSceneNavEnabled = () => {
    return CombatTrackerManager.#getSceneNavEnabled?.() ?? false;
  }

  /**
   * Collapse the navigation
   */
  static #collapseNav = () => {
    CombatTrackerManager.#navCollapseCallback?.();
  }

  /**
   * Expand the navigation
   */
  static #expandNav = () => {
    CombatTrackerManager.#navExpandCallback?.();
  }

  /**
   * Check if there's a combat with any combatants
   * Used on initial load to handle existing combats
   */
  static checkForActiveCombat = () => {
    LogUtil.log("checkForActiveCombat - called", [
      "enableCombatTrackerCarousel:", CombatTrackerManager.enableCombatTrackerCarousel
    ]);

    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const combatWithCombatants = CombatTrackerManager.getCombatWithCombatants();

    LogUtil.log("checkForActiveCombat - combatWithCombatants", [
      "found:", !!combatWithCombatants,
      "combatants:", combatWithCombatants?.combatants?.size
    ]);

    if (combatWithCombatants) {
      CombatTrackerManager.popOutCombatTracker();

      if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled()) {
        if (CombatTrackerManager.#navStateBeforeCombat === null) {
          CombatTrackerManager.#navStateBeforeCombat = !CombatTrackerManager.#isNavCollapsed();
        }

        if (!CombatTrackerManager.#isNavCollapsed()) {
          CombatTrackerManager.#collapseNav();
        }
      }
    }
  }

  /**
   * Get any combat that has player-owned combatants
   * Only returns a combat if it includes at least one player character
   * @returns {Combat|null} The combat or null
   */
  static getCombatWithCombatants = () => {
    const combats = game.combats?.contents || [];

    for (const combat of combats) {
      if (combat.combatants?.size > 0) {
        const hasPlayerCombatant = combat.combatants.some(c => c.actor?.hasPlayerOwner);
        if (hasPlayerCombatant) {
          return combat;
        }
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

      CombatTrackerManager.popOutCombatTracker();
      CombatCarousel.updateCombatToggleButton();

      if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled() && !CombatTrackerManager.#isNavCollapsed()) {
        if (CombatTrackerManager.#navStateBeforeCombat === null) {
          CombatTrackerManager.#navStateBeforeCombat = true;
        }

        CombatTrackerManager.#collapseNav();
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

    CombatTrackerManager.popOutCombatTracker();
    setTimeout(() => CombatCarousel.updateCombatToggleButton(), 150);

    if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled()) {
      if (CombatTrackerManager.#navStateBeforeCombat === null) {
        CombatTrackerManager.#navStateBeforeCombat = !CombatTrackerManager.#isNavCollapsed();
      }

      if (!CombatTrackerManager.#isNavCollapsed()) {
        CombatTrackerManager.#collapseNav();
      }
    }
  }

  /**
   * Handle combat end - restore navigation and close combat tracker if setting is enabled
   * @param {Combat} combat - The combat that ended
   */
  static onCombatEnd = (combat) => {
    const combatWithCombatants = CombatTrackerManager.getCombatWithCombatants();
    if (combatWithCombatants) return;

    LogUtil.log("onCombatEnd - combat ended", [
      "wasExpanded:", CombatTrackerManager.#navStateBeforeCombat,
      "combat:", combat?.id
    ]);

    CombatTrackerManager.closeCombatTrackerPopout();

    if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled()) {
      if (CombatTrackerManager.#navStateBeforeCombat === true) {
        CombatTrackerManager.#expandNav();
      }

      CombatTrackerManager.#navStateBeforeCombat = null;
    }
  }

  /**
   * Handle combatant created - collapse nav and pop out combat tracker when any combatant is added
   * @param {Combatant} combatant - The combatant that was created
   */
  static onCombatantCreated = (combatant) => {
    LogUtil.log("onCombatantCreated - combatant added", [
      "combatant:", combatant.name,
      "isCollapsed:", CombatTrackerManager.#isNavCollapsed(),
      "enableCombatTrackerCarousel:", CombatTrackerManager.enableCombatTrackerCarousel
    ]);

    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    CombatTrackerManager.popOutCombatTracker();

    if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled()) {
      if (CombatTrackerManager.#navStateBeforeCombat === null && !CombatTrackerManager.#isNavCollapsed()) {
        CombatTrackerManager.#navStateBeforeCombat = true;
      }

      if (!CombatTrackerManager.#isNavCollapsed()) {
        CombatTrackerManager.#collapseNav();
      }
    }
  }

  /**
   * Handle actor update - refresh resource bars in carousel when HP changes
   * @param {Actor} actor - The actor that was updated
   * @param {object} updateData - The update data
   */
  static onActorUpdate = (actor, updateData) => {
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const combat = game.combat;
    if (!combat) return;

    const isInCombat = combat.combatants.some(c => c.actor?.id === actor.id);
    if (!isInCombat) return;

    CombatCarousel.updateResourceBars();
  }

  /**
   * Handle combatant deleted - restore nav and close combat tracker if no more combatants in any combat
   * @param {Combatant} combatant - The combatant that was deleted
   */
  static onCombatantDeleted = (combatant) => {
    setTimeout(() => {
      const combatWithCombatants = CombatTrackerManager.getCombatWithCombatants();

      if (!combatWithCombatants) {
        LogUtil.log("onCombatantDeleted - no more combatants", [
          "wasExpanded:", CombatTrackerManager.#navStateBeforeCombat
        ]);

        CombatTrackerManager.closeCombatTrackerPopout();

        if (CombatTrackerManager.collapseNavDuringCombat && CombatTrackerManager.#isSceneNavEnabled()) {
          if (CombatTrackerManager.#navStateBeforeCombat === true) {
            CombatTrackerManager.#expandNav();
          }

          CombatTrackerManager.#navStateBeforeCombat = null;
        }
      }
    }, 100);
  }

  /**
   * Handle combat turn PRE-change (fires BEFORE database update)
   * @param {Combat} combat - The combat instance
   * @param {object} updateData - Contains new round/turn values
   * @param {object} options - Update options (includes direction)
   */
  static onCombatTurnPre = (combat, updateData, options) => {
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const priorRound = combat.round;
    const priorTurn = combat.turn;
    const newRound = updateData.round ?? priorRound;
    const newTurn = updateData.turn ?? priorTurn;

    const isForward = (newRound > priorRound) ||
      (newRound === priorRound && newTurn > priorTurn);

    const isRoundWrap = newRound > priorRound && newTurn === 0;

    LogUtil.log("onCombatTurnPre - about to change turn", [
      "combat:", combat?.id,
      "prior:", { round: priorRound, turn: priorTurn },
      "new:", { round: newRound, turn: newTurn },
      "direction:", isForward ? "forward" : "backward",
      "isRoundWrap:", isRoundWrap
    ]);

    CombatTrackerManager.#pendingTurnChange = {
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
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const priorRound = combat.round;
    const priorTurn = combat.turn;
    const newRound = updateData.round ?? priorRound;
    const newTurn = updateData.turn ?? 0;

    const isForward = newRound > priorRound;
    const isRoundWrap = isForward && newTurn === 0;

    LogUtil.log("onCombatRoundPre - about to change round", [
      "combat:", combat?.id,
      "prior:", { round: priorRound, turn: priorTurn },
      "new:", { round: newRound, turn: newTurn },
      "direction:", isForward ? "forward" : "backward",
      "isRoundWrap:", isRoundWrap
    ]);

    CombatTrackerManager.#pendingTurnChange = {
      isForward,
      wrapCount: isRoundWrap ? priorTurn + 1 : 0
    };
  }

  /**
   * Handle combat tracker render - add toggle button to popout
   * @param {Application} app - The combat tracker application
   * @param {jQuery|HTMLElement} html - The rendered HTML
   * @param {object} data - The render data
   */
  static onRenderCombatTracker = (app, html, data) => {
    const element = html?.[0] || html;
    const elementId = element?.id || app.element?.[0]?.id || app.id;

    const popoutExists = document.querySelector('#combat-popout') !== null;
    const isPopout = elementId === 'combat-popout' || (popoutExists && app.id === 'combat-popout');

    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;
    if (!isPopout) return;

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    CombatTrackerManager.initDocking();

    requestAnimationFrame(() => {
      const combatPopout = document.querySelector('#combat-popout');
      if (!combatPopout) return;

      CombatCarousel.applyScale(combatPopout, CombatTrackerManager.combatCarouselScale);
      CombatCarousel.flattenCombatantGroups(combatPopout);

      const windowHeader = combatPopout.querySelector('.window-header');
      if (windowHeader) {
        CombatCarousel.addCombatToggleButton(combatPopout, windowHeader);
      }

      const navControls = combatPopout.querySelector('nav.combat-controls');
      if (navControls) {
        navControls.querySelectorAll('button').forEach(btn => {
          btn.setAttribute('data-tooltip-direction', 'LEFT');
        });
        if (!navControls.querySelector('.crlngn-round-counter')) {
          const combat = game.combat;
          const isStarted = combat?.started;
          const round = combat?.round || 0;
          const roundBadge = document.createElement('span');
          roundBadge.className = 'crlngn-round-counter';
          roundBadge.textContent = round;
          roundBadge.style.display = isStarted && round > 0 ? '' : 'none';
          navControls.appendChild(roundBadge);
        }
      }

      const tracker = combatPopout.querySelector('.combat-tracker');
      const combatants = tracker?.querySelectorAll(':scope > li.combatant');
      const hasCombatants = combatants && combatants.length > 0;

      CombatTrackerManager.#updateNoCombatantsMessage(combatPopout, !hasCombatants);

      if (hasCombatants) {
        CombatTrackerManager.#pendingTurnChange = null;
        CombatTrackerManager.#updateCombatantImages(tracker);
        CombatTrackerManager.#copyEffectsTooltips(tracker);
        CombatCarousel.init(combatPopout);

        if (tracker && CombatCarousel.state.allCombatantIds.length > 0) {
          CombatCarousel.adjustTrackerWidth(tracker);
        }
      }

      CombatTrackerManager.#updateRollInitiativeBar(combatPopout);
      CombatTrackerManager.#updateEndTurnBar(combatPopout);
    });
  }

  /**
   * Update combatant images based on the carouselImageSource setting
   * When set to "actor", replaces token images with actor portraits
   * @param {HTMLElement} tracker - The combat tracker element
   */
  static #updateCombatantImages = (tracker) => {
    if (CombatTrackerManager.carouselImageSource !== "actor") return;

    const combat = game.combat;
    if (!combat) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant');
    combatantElements.forEach(element => {
      const combatantId = element.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant?.actor) return;

      const actorImg = combatant.actor.img;
      if (!actorImg) return;

      const tokenImage = element.querySelector('.token-image');
      if (tokenImage && tokenImage.src !== actorImg) {
        tokenImage.src = actorImg;
      }
    });
  }

  /**
   * Copy data-tooltip-html from .token-effects to the parent li.combatant
   * Also creates visible effects display when carouselShowEffects is enabled
   * @param {HTMLElement} tracker - The combat tracker element
   */
  static #copyEffectsTooltips = (tracker) => {
    const combatantElements = tracker.querySelectorAll(':scope > li.combatant');
    combatantElements.forEach(element => {
      const tokenEffects = element.querySelector('.token-effects');
      if (!tokenEffects) return;

      const tooltipHtml = tokenEffects.getAttribute('data-tooltip-html');
      if (tooltipHtml) {
        element.setAttribute('data-tooltip-html', tooltipHtml);
        element.classList.add('effects-tooltip');

        if (CombatTrackerManager.carouselShowEffects) {
          CombatTrackerManager.#createEffectsDisplay(element, tokenEffects);
        }
      }
    });
  }

  /**
   * Create a visible effects display element below the combatant card
   * Parses the tooltip HTML and appends the effects list structure
   * @param {HTMLElement} combatantEl - The combatant li element
   * @param {HTMLElement} tokenEffects - The token-effects element containing effect data
   */
  static #createEffectsDisplay = (combatantEl, tokenEffects) => {
    let existingDisplay = combatantEl.querySelector('.crlngn-effects-display');
    if (existingDisplay) existingDisplay.remove();

    const tooltipHtml = tokenEffects.getAttribute('data-tooltip-html');
    if (!tooltipHtml) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tooltipHtml;

    const effectsList = tempDiv.querySelector('ul');
    if (!effectsList || effectsList.children.length === 0) return;

    const display = document.createElement('div');
    display.className = 'crlngn-effects-display';
    display.appendChild(effectsList.cloneNode(true));

    combatantEl.appendChild(display);
  }

  /**
   * Apply the combat tracker carousel body class based on settings
   */
  static applyBodyClass = () => {
    const body = document.body;
    if (CombatTrackerManager.enableCombatTrackerCarousel) {
      body.classList.add("crlngn-combat-tracker");
      CombatTrackerManager.applyScale();
    } else {
      body.classList.remove("crlngn-combat-tracker");
    }
  }

  /**
   * Apply combat carousel scale to the popout element
   */
  static applyScale = () => {
    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    CombatCarousel.applyScale(combatPopout, CombatTrackerManager.combatCarouselScale);
  }

  /**
   * Pop out the combat tracker when combat has combatants
   * @param {number} retryCount - Number of retries attempted (internal use)
   */
  static popOutCombatTracker = (retryCount = 0) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 200;

    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const combatWithCombatants = CombatTrackerManager.getCombatWithCombatants();
    if (!combatWithCombatants) return;

    if (CombatTrackerManager.#combatTrackerPoppedOut) {
      const existingPopout = document.querySelector('#combat-popout');
      if (existingPopout) {
        CombatTrackerManager.initDocking();
      }
      return;
    }

    if (ui.combat?.popout && ui.combat.popout.rendered) {
      CombatTrackerManager.#combatTrackerPoppedOut = true;
      CombatTrackerManager.initDocking();
      return;
    }

    if (!ui.combat || typeof ui.combat.renderPopout !== 'function') {
      if (retryCount < MAX_RETRIES) {
        LogUtil.log("popOutCombatTracker - ui.combat not ready, retrying...", [
          "retryCount:", retryCount
        ]);
        setTimeout(() => CombatTrackerManager.popOutCombatTracker(retryCount + 1), RETRY_DELAY);
      } else {
        LogUtil.log("popOutCombatTracker - ui.combat not ready after max retries", [
          "ui.combat:", !!ui.combat
        ]);
      }
      return;
    }

    LogUtil.log("popOutCombatTracker - popping out combat tracker");

    ui.combat.renderPopout();
    CombatTrackerManager.#combatTrackerPoppedOut = true;
  }

  /**
   * Close the combat tracker popout when combat ends
   */
  static closeCombatTrackerPopout = () => {
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;
    if (!CombatTrackerManager.#combatTrackerPoppedOut) return;

    LogUtil.log("closeCombatTrackerPopout - closing combat tracker popout");

    CombatCarousel.cleanup();

    const combatPopout = document.querySelector('#combat-popout');
    if (combatPopout) {
      const closeBtn = combatPopout.querySelector('[data-action="close"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        ui.combat?.popout?.close();
      }
    }
    CombatTrackerManager.#combatTrackerPoppedOut = false;
  }

  /**
   * Initialize docking behavior for combat tracker popout
   */
  static initDocking = () => {
    const combatPopout = document.querySelector('#combat-popout');

    LogUtil.log("initDocking - called", [
      "enableCombatTrackerCarousel:", CombatTrackerManager.enableCombatTrackerCarousel
    ]);

    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;
    if (!combatPopout) {
      LogUtil.log("initDocking - no popout found, aborting");
      return;
    }

    const savedState = game.user?.getFlag(MODULE_ID, 'combatTrackerDocked');
    const shouldDock = savedState !== false;
    const hasDockClass = combatPopout.classList.contains('docked-top');
    LogUtil.log("initDocking - checking saved state", [
      "savedState:", savedState,
      "shouldDock:", shouldDock,
      "hasDockClass:", hasDockClass
    ]);
    if (shouldDock && !hasDockClass) {
      CombatTrackerManager.#dockState.isDocked = true;
      CombatTrackerManager.#applyDockedStyles(combatPopout);
    } else if (savedState === false) {
      CombatTrackerManager.#dockState.isDocked = false;
      const savedPosition = game.user?.getFlag(MODULE_ID, 'combatTrackerPosition');
      LogUtil.log("initDocking - restoring undocked position", [
        "savedPosition:", savedPosition
      ]);
      if (savedPosition) {
        setTimeout(() => {
          combatPopout.style.position = 'fixed';
          combatPopout.style.left = `${savedPosition.left}px`;
          combatPopout.style.top = `${savedPosition.top}px`;
          LogUtil.log("initDocking - position applied after delay", [
            "left:", combatPopout.style.left,
            "top:", combatPopout.style.top
          ]);
        }, 50);
      }
    }

    if (combatPopout.dataset.crlngnDockingInitialized === 'true') {
      LogUtil.log("initDocking - already initialized, skipping");
      return;
    }

    const windowHeader = combatPopout.querySelector('.window-header');
    const windowContent = combatPopout.querySelector('.window-content');

    LogUtil.log("initDocking - elements found", [
      "windowHeader:", windowHeader,
      "windowContent:", windowContent
    ]);

    if (windowHeader) {
      windowHeader.addEventListener('mousedown', CombatTrackerManager.#onDragStart, true);
      LogUtil.log("initDocking - added listener to windowHeader");
    }

    combatPopout.dataset.crlngnDockingInitialized = 'true';
    CombatCarousel.addCombatToggleButton(combatPopout, windowHeader);

    LogUtil.log("initDocking - initialized", [combatPopout]);
  }

  /**
   * Handle combat tracker drag start
   * @param {MouseEvent} event
   */
  static #onDragStart = (event) => {
    if (event.button !== 0) return;

    const combatPopout = event.target.closest('#combat-popout');
    if (!combatPopout) {
      return;
    }

    LogUtil.log("Combat tracker drag start - handler called", [
      "button:", event.button,
      "target:", event.target,
      "target.tagName:", event.target?.tagName
    ]);

    if (event.target.closest('button') ||
        event.target.closest('a') ||
        event.target.closest('input') ||
        event.target.closest('.combatant-controls') ||
        event.target.closest('.token-initiative')) {
      LogUtil.log("Combat tracker drag start - skipped due to interactive element");
      return;
    }

    const state = CombatTrackerManager.#dockState;
    state.isDragging = true;
    state.startX = event.clientX;
    state.startY = event.clientY;

    const rect = combatPopout.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    state.startLeft = rect.left;
    state.startTop = rect.top;

    if (state.isDocked) {
      CombatTrackerManager.#undock(combatPopout);
      state.startLeft = event.clientX - offsetX;
      state.startTop = event.clientY - offsetY;
      combatPopout.style.left = `${state.startLeft}px`;
      combatPopout.style.top = `${state.startTop}px`;
    }

    state.boundDragMove = CombatTrackerManager.#onDragMove;
    state.boundDragEnd = CombatTrackerManager.#onDragEnd;

    document.addEventListener('mousemove', state.boundDragMove);
    document.addEventListener('mouseup', state.boundDragEnd);

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    LogUtil.log("Combat tracker drag start", [state]);
  }

  /**
   * Handle combat tracker drag move
   * @param {MouseEvent} event
   */
  static #onDragMove = (event) => {
    const state = CombatTrackerManager.#dockState;
    if (!state.isDragging) return;

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    const newLeft = state.startLeft + deltaX;
    const newTop = state.startTop + deltaY;

    combatPopout.style.left = `${newLeft}px`;
    combatPopout.style.top = `${newTop}px`;

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
  static #onDragEnd = (event) => {
    const state = CombatTrackerManager.#dockState;
    if (!state.isDragging) return;

    document.removeEventListener('mousemove', state.boundDragMove);
    document.removeEventListener('mouseup', state.boundDragEnd);

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    combatPopout.classList.remove('near-dock');

    const SNAP_DISTANCE = 50;
    const rect = combatPopout.getBoundingClientRect();

    if (rect.top <= SNAP_DISTANCE) {
      CombatTrackerManager.#dock(combatPopout);
    } else {
      const finalLeft = parseInt(combatPopout.style.left, 10) || rect.left;
      const finalTop = parseInt(combatPopout.style.top, 10) || rect.top;
      game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', false);
      game.user?.setFlag(MODULE_ID, 'combatTrackerPosition', { left: finalLeft, top: finalTop });
      state.isDocked = false;
    }

    state.isDragging = false;

    LogUtil.log("Combat tracker drag end", [state.isDocked]);
  }

  /**
   * Apply docked styles to combat tracker
   * @param {HTMLElement} combatPopout
   */
  static #applyDockedStyles = (combatPopout) => {
    combatPopout.classList.add('docked-top');
    combatPopout.style.zIndex = 'calc(var(--z-index-app) - 1)';
    combatPopout.style.left = '50%';
    combatPopout.style.top = 'var(--crlngn-top-offset)';

    const interfaceEl = document.getElementById('interface');
    if (interfaceEl && combatPopout.parentElement !== interfaceEl) {
      interfaceEl.appendChild(combatPopout);
    }
  }

  /**
   * Dock combat tracker to top of screen
   * @param {HTMLElement} combatPopout
   */
  static #dock = (combatPopout) => {
    const state = CombatTrackerManager.#dockState;

    combatPopout.classList.add('snapping');
    setTimeout(() => combatPopout.classList.remove('snapping'), 200);

    CombatTrackerManager.#applyDockedStyles(combatPopout);

    game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', true);
    state.isDocked = true;

    LogUtil.log("Combat tracker docked to top");
  }

  /**
   * Undock combat tracker from top
   * @param {HTMLElement} combatPopout
   */
  static #undock = (combatPopout) => {
    const state = CombatTrackerManager.#dockState;

    const rect = combatPopout.getBoundingClientRect();
    const currentLeft = rect.left;
    const currentTop = rect.top;

    combatPopout.classList.remove('docked-top');
    combatPopout.style.transform = '';
    combatPopout.style.zIndex = '';

    if (combatPopout.parentElement?.id === 'interface') {
      document.body.appendChild(combatPopout);
    }

    combatPopout.style.left = `${currentLeft}px`;
    combatPopout.style.top = `${currentTop}px`;

    game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', false);
    state.isDocked = false;

    LogUtil.log("Combat tracker undocked", ["parent:", combatPopout.parentElement?.tagName]);
  }

  /**
   * Update the "no combatants" message visibility
   * @param {HTMLElement} combatPopout - The combat popout element
   * @param {boolean} show - Whether to show the message
   */
  static #updateNoCombatantsMessage = (combatPopout, show) => {
    const windowContent = combatPopout?.querySelector('.window-content');
    if (!windowContent) return;

    let messageEl = windowContent.querySelector('.crlngn-no-combatants');

    if (show) {
      if (!messageEl) {
        messageEl = document.createElement('p');
        messageEl.className = 'crlngn-no-combatants';
        messageEl.textContent = game.i18n.localize('CRLNGN_UI.combat.noCombatants');
        windowContent.appendChild(messageEl);
      }
      messageEl.style.display = '';
    } else if (messageEl) {
      messageEl.style.display = 'none';
    }
  }

  /**
   * Update the floating roll initiative bar visibility
   * Shows when combatants exist but haven't all rolled initiative (GM only)
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #updateRollInitiativeBar = (combatPopout) => {
    if (!combatPopout) return;

    if (!game.user?.isGM) {
      CombatTrackerManager.#hideRollInitiativeBar(combatPopout);
      return;
    }

    const combat = game.combat;
    if (!combat) {
      CombatTrackerManager.#hideRollInitiativeBar(combatPopout);
      return;
    }

    const combatants = combat.combatants;
    if (!combatants || combatants.size === 0) {
      CombatTrackerManager.#hideRollInitiativeBar(combatPopout);
      return;
    }

    const hasUnrolledInitiative = combatants.some(c => c.initiative === null || c.initiative === undefined);

    if (hasUnrolledInitiative) {
      CombatTrackerManager.#showRollInitiativeBar(combatPopout);
    } else {
      CombatTrackerManager.#hideRollInitiativeBar(combatPopout);
    }
  }

  /**
   * Show the floating roll initiative bar
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #showRollInitiativeBar = (combatPopout) => {
    if (!combatPopout) return;

    const windowContent = combatPopout.querySelector('.window-content');
    if (!windowContent) return;

    let bar = windowContent.querySelector('.crlngn-roll-initiative-bar');

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'crlngn-roll-initiative-bar';

      const rollAllBtn = document.createElement('button');
      rollAllBtn.type = 'button';
      rollAllBtn.className = 'inline-control combat-control icon fa-solid fa-users';
      rollAllBtn.setAttribute('data-action', 'rollAll');
      rollAllBtn.setAttribute('data-tooltip', 'COMBAT.RollAll');
      rollAllBtn.setAttribute('aria-label', game.i18n.localize('COMBAT.RollAll'));
      rollAllBtn.addEventListener('click', () => game.combat?.rollAll());

      const rollNpcBtn = document.createElement('button');
      rollNpcBtn.type = 'button';
      rollNpcBtn.className = 'inline-control combat-control icon fa-solid fa-users-cog';
      rollNpcBtn.setAttribute('data-action', 'rollNPC');
      rollNpcBtn.setAttribute('data-tooltip', 'COMBAT.RollNPC');
      rollNpcBtn.setAttribute('aria-label', game.i18n.localize('COMBAT.RollNPC'));
      rollNpcBtn.addEventListener('click', () => game.combat?.rollNPC());

      bar.appendChild(rollAllBtn);
      bar.appendChild(rollNpcBtn);

      windowContent.appendChild(bar);
    }

    bar.style.display = '';
  }

  /**
   * Hide the floating roll initiative bar
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #hideRollInitiativeBar = (combatPopout) => {
    const windowContent = combatPopout?.querySelector('.window-content');
    const bar = windowContent?.querySelector('.crlngn-roll-initiative-bar');
    if (bar) {
      bar.style.display = 'none';
    }
  }

  /**
   * Update the floating End Turn bar visibility
   * Shows for players when it's their turn
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #updateEndTurnBar = (combatPopout) => {
    if (!combatPopout) return;

    const combat = game.combat;
    if (!combat || !combat.started) {
      CombatTrackerManager.#hideEndTurnBar(combatPopout);
      return;
    }

    const currentCombatant = combat.combatant;
    if (!currentCombatant) {
      CombatTrackerManager.#hideEndTurnBar(combatPopout);
      return;
    }

    const isPlayersTurn = currentCombatant.isOwner && !game.user?.isGM;

    if (isPlayersTurn) {
      CombatTrackerManager.#showEndTurnBar(combatPopout);
    } else {
      CombatTrackerManager.#hideEndTurnBar(combatPopout);
    }
  }

  /**
   * Show the floating End Turn bar
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #showEndTurnBar = (combatPopout) => {
    if (!combatPopout) return;

    const windowContent = combatPopout.querySelector('.window-content');
    if (!windowContent) return;

    let bar = windowContent.querySelector('.crlngn-end-turn-bar');

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'crlngn-end-turn-bar';

      const endTurnLabel = game.i18n.localize('COMBAT.TurnEnd');
      const endTurnBtn = document.createElement('button');
      endTurnBtn.type = 'button';
      endTurnBtn.className = 'combat-control';
      endTurnBtn.setAttribute('data-action', 'endTurn');
      endTurnBtn.setAttribute('data-tooltip', endTurnLabel);
      endTurnBtn.setAttribute('aria-label', endTurnLabel);
      endTurnBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>${endTurnLabel}</span>`;
      endTurnBtn.addEventListener('click', () => game.combat?.nextTurn());

      bar.appendChild(endTurnBtn);
      windowContent.appendChild(bar);
    }

    bar.style.display = '';
  }

  /**
   * Hide the floating End Turn bar
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #hideEndTurnBar = (combatPopout) => {
    const windowContent = combatPopout?.querySelector('.window-content');
    const bar = windowContent?.querySelector('.crlngn-end-turn-bar');
    if (bar) {
      bar.style.display = 'none';
    }
  }
}
