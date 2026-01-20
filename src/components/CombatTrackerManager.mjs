import { LogUtil } from "./LogUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { CombatCarousel } from "./CombatCarouselUtil.mjs";

/**
 * Manages the combat tracker popout, docking, and combat lifecycle events
 * Separate from CombatCarousel which handles only the infinite scroll animation
 */
export class CombatTrackerManager {
  static collapseNavDuringCombat = false;
  static enableCombatTrackerCarousel = false;
  static combatCarouselScale = 1;
  static combatTrackerTakeFullWidth = false;

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

    Hooks.once(HOOKS_CORE.READY, () => {
      CombatCarousel.registerCombatWrappers();
    });
  }

  /**
   * Update settings from external source (TopNavUtil)
   */
  static updateSettings = (settings) => {
    CombatTrackerManager.collapseNavDuringCombat = settings.collapseNavDuringCombat;
    CombatTrackerManager.enableCombatTrackerCarousel = settings.enableCombatTrackerCarousel;
    CombatTrackerManager.combatCarouselScale = settings.combatCarouselScale;
    CombatTrackerManager.combatTrackerTakeFullWidth = settings.combatTrackerTakeFullWidth;

    if (settings.combatTrackerTakeFullWidth) {
      document.body.classList.add('crlngn-carousel-full-width');
    } else {
      document.body.classList.remove('crlngn-carousel-full-width');
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

      const tracker = combatPopout.querySelector('.combat-tracker');
      const combatants = tracker?.querySelectorAll(':scope > li.combatant');
      const hasCombatants = combatants && combatants.length > 0;

      CombatTrackerManager.#updateNoCombatantsMessage(combatPopout, !hasCombatants);

      if (hasCombatants) {
        CombatTrackerManager.#pendingTurnChange = null;
        CombatCarousel.init(combatPopout);

        if (tracker && CombatCarousel.state.allCombatantIds.length > 0) {
          CombatCarousel.adjustTrackerWidth(tracker);
        }
      }
    });
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
        messageEl.textContent = game.i18n.localize('COMBAT.NoCombatants');
        windowContent.appendChild(messageEl);
      }
      messageEl.style.display = '';
    } else if (messageEl) {
      messageEl.style.display = 'none';
    }
  }
}
