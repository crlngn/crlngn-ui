import { LogUtil } from "../LogUtil.mjs";
import { MODULE_ID } from "../../constants/General.mjs";
import { HOOKS_CORE } from "../../constants/Hooks.mjs";
import { CombatCarousel } from "./CombatCarouselUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
import { getSettings } from "../../constants/Settings.mjs";

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
  static combatTrackerLayout = "carousel";
  static carouselHideDefeated = false;
  static carouselShowAllHP = "gmOnly";

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
    isDocked: false // false | 'top' | 'bottom'
  };
  static #pendingTurnChange = null;
  static #programmaticClose = false;
  static #lastRenderTime = 0;
  static #renderThrottleMs = 150;
  static #pendingRenderTimeout = null;

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
    Hooks.on(HOOKS_CORE.PRE_RENDER_COMBAT_TRACKER, () => {
      if (!CombatTrackerManager.#shouldAllowRender()) {
        return false;
      }
      CombatCarousel.cacheImages();
    });
    Hooks.on(HOOKS_CORE.RENDER_COMBAT_TRACKER, (app, html, data) => CombatTrackerManager.onRenderCombatTracker(app, html, data));
    Hooks.on(HOOKS_CORE.UPDATE_ACTOR, (actor, updateData, options, userId) => CombatTrackerManager.onActorUpdate(actor, updateData));
    Hooks.on(HOOKS_CORE.CANVAS_READY, () => CombatTrackerManager.onCanvasReady());

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
    CombatTrackerManager.combatTrackerLayout = SettingsUtil.get(SETTINGS.combatTrackerLayout.tag) ?? "carousel";
    CombatTrackerManager.carouselHideDefeated = SettingsUtil.get(SETTINGS.carouselHideDefeated.tag) ?? false;
    CombatTrackerManager.carouselShowAllHP = SettingsUtil.get(SETTINGS.carouselShowAllHP.tag) ?? "gmOnly";

    CombatTrackerManager.#applyBodyClasses();
  }

  /**
   * Apply system-specific inline style overrides to combat popout
   * Uses inline styles to beat CSS layer !important rules from game systems
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #applySystemOverrides = (combatPopout) => {
    if (!combatPopout) return;

    if (game.system.id === 'gurps') {
      combatPopout.style.setProperty('overflow', 'visible', 'important');
      combatPopout.style.setProperty('overflow-y', 'visible', 'important');
      combatPopout.style.setProperty('resize', 'none', 'important');
    }
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

  }

  /**
   * Throttle rapid combat tracker renders to prevent flicker during batch operations.
   * Returns true if render should proceed, false to suppress.
   */
  static #shouldAllowRender = () => {
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return true;

    const now = Date.now();
    const timeSinceLastRender = now - CombatTrackerManager.#lastRenderTime;

    if (timeSinceLastRender < CombatTrackerManager.#renderThrottleMs) {
      if (CombatTrackerManager.#pendingRenderTimeout) {
        clearTimeout(CombatTrackerManager.#pendingRenderTimeout);
      }
      CombatTrackerManager.#pendingRenderTimeout = setTimeout(() => {
        CombatTrackerManager.#pendingRenderTimeout = null;
        ui.combat?.render();
      }, CombatTrackerManager.#renderThrottleMs);

      return false;
    }

    CombatTrackerManager.#lastRenderTime = now;
    return true;
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
   * Handle canvas ready - re-render combat tracker popout after scene changes
   * This ensures the carousel height is properly calculated after the canvas is fully loaded
   */
  static onCanvasReady = () => {
    if (!CombatTrackerManager.enableCombatTrackerCarousel) return;

    const combatPopout = document.querySelector('#combat-popout');
    if (!combatPopout) return;

    const combatWithCombatants = CombatTrackerManager.getCombatWithCombatants();
    if (!combatWithCombatants) return;

    LogUtil.log("onCanvasReady - re-rendering combat tracker after scene change");

    CombatCarousel.resetInitialization();

    setTimeout(() => {
      ui.combat?.popout?.render(true);
    }, 100);
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

    const closeBtn = combatPopout.querySelector('[data-action="close"]');
    if (closeBtn && !closeBtn.dataset.crlngnCloseNotice) {
      closeBtn.dataset.crlngnCloseNotice = 'true';
      closeBtn.addEventListener('click', () => {
        if (!CombatTrackerManager.#programmaticClose) {
          ui.notifications?.info(game.i18n.localize('CRLNGN_UI.combat.closedNotice'));
        }
      });
    }

    requestAnimationFrame(() => {
      const combatPopout = document.querySelector('#combat-popout');
      if (!combatPopout) return;

      CombatTrackerManager.#applySystemOverrides(combatPopout);
      CombatCarousel.applyScale(combatPopout, CombatTrackerManager.combatCarouselScale);
      CombatCarousel.flattenCombatantGroups(combatPopout);

      const tracker = combatPopout.querySelector('.combat-tracker');
      const windowHeader = combatPopout.querySelector('.window-header');
      if (windowHeader) {
        CombatCarousel.addCombatToggleButton(combatPopout, windowHeader);
      }

      const navControls = combatPopout.querySelector('nav.combat-controls');
      if (navControls) {
        const tooltipDir = CombatTrackerManager.#dockState.isDocked === 'bottom' ? 'DOWN' : 'UP';
        navControls.querySelectorAll('button').forEach(btn => {
          btn.setAttribute('data-tooltip-direction', tooltipDir);
        });
        if (game.system.id !== 'daggerheart') {
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
          CombatTrackerManager.#injectInitiativeButtons(navControls);
          CombatTrackerManager.#injectEndTurnButton(navControls);
        }
      }

      if (CombatTrackerManager.carouselHideDefeated && tracker) {
        tracker.querySelectorAll(':scope > li.combatant.defeated').forEach(el => el.remove());
      }

      if (CombatTrackerManager.carouselShowAllHP !== 'disabled' && tracker) {
        CombatCarousel.ensureResourceBars(tracker);
      }

      const combatants = tracker?.querySelectorAll(':scope > li.combatant');
      const hasCombatants = combatants && combatants.length > 0;

      CombatTrackerManager.#updateNoCombatantsMessage(combatPopout, !hasCombatants);

      if (hasCombatants) {
        CombatTrackerManager.#pendingTurnChange = null;
        CombatTrackerManager.#updateCombatantImages(tracker);
        CombatTrackerManager.#applyTokenScaleCorrection(tracker);
        CombatTrackerManager.#copyEffectsTooltips(tracker);
        CombatCarousel.init(combatPopout);

        if (tracker && CombatCarousel.state.allCombatantIds.length > 0) {
          CombatCarousel.adjustTrackerWidth(tracker);
        }
      }

      if (game.system.id !== 'daggerheart') {
        CombatTrackerManager.#updateInitiativeButtons(combatPopout);
        CombatTrackerManager.#updateEndTurnButton(combatPopout);
      }
      CombatTrackerManager.#updateNavBorderRadius(combatPopout);
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
   * Apply token ring subject scale correction to combatant images
   * Only applies when carouselImageSource is "token" (default)
   * @param {HTMLElement} tracker - The combat tracker element
   */
  static #applyTokenScaleCorrection = (tracker) => {
    if (CombatTrackerManager.carouselImageSource !== "token") return;

    const combat = game.combat;
    if (!combat) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant');
    combatantElements.forEach(element => {
      const combatantId = element.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant?.token) return;

      const scaleCorrection = combatant.token.ring?.subject?.scale;
      if (!scaleCorrection || scaleCorrection === 1) return;

      const tokenImage = element.querySelector('.token-image');
      if (tokenImage) {
        tokenImage.style.transform = `scale(${scaleCorrection})`;
      }
    });
  }

  /**
   * Copy data-tooltip-html from .token-effects to the parent li.combatant
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
    CombatTrackerManager.#programmaticClose = true;

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
    CombatTrackerManager.#programmaticClose = false;
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

    let savedState = game.user?.getFlag(MODULE_ID, 'combatTrackerDocked');

    if (savedState === true) {
      savedState = 'top';
      game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', 'top');
    }

    const dockPosition = (savedState === undefined) ? 'top' : savedState;
    const hasDockClass = combatPopout.classList.contains('docked-top') || combatPopout.classList.contains('docked-bottom');

    LogUtil.log("initDocking - checking saved state", [
      "savedState:", savedState,
      "dockPosition:", dockPosition,
      "hasDockClass:", hasDockClass
    ]);

    if (dockPosition && !hasDockClass) {
      CombatTrackerManager.#dockState.isDocked = dockPosition;
      if (dockPosition === 'bottom') {
        CombatTrackerManager.#applyDockedBottomStyles(combatPopout);
      } else {
        CombatTrackerManager.#applyDockedTopStyles(combatPopout);
      }
    } else if (dockPosition === false) {
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
   * Check if the combat tracker is near the bottom dock zone (hotbar)
   * @param {DOMRect} rect - Bounding rect of the combat popout
   * @returns {boolean}
   */
  static #isNearBottomDock = (rect) => {
    const hotbar = document.querySelector('#hotbar');
    if (!hotbar) return false;

    const SNAP_DISTANCE = 50;
    const hotbarRect = hotbar.getBoundingClientRect();
    const distanceToHotbar = hotbarRect.top - rect.bottom;

    return Math.abs(distanceToHotbar) <= SNAP_DISTANCE;
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
    const nearTop = rect.top <= SNAP_DISTANCE;
    const nearBottom = CombatTrackerManager.#isNearBottomDock(rect);

    LogUtil.log("Combat tracker drag move", [
      "rect.top:", rect.top,
      "nearTop:", nearTop,
      "nearBottom:", nearBottom
    ]);

    combatPopout.classList.toggle('near-dock', nearTop);
    combatPopout.classList.toggle('near-dock-bottom', nearBottom);
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

    combatPopout.classList.remove('near-dock', 'near-dock-bottom');

    const SNAP_DISTANCE = 50;
    const rect = combatPopout.getBoundingClientRect();

    if (rect.top <= SNAP_DISTANCE) {
      CombatTrackerManager.#dock(combatPopout, 'top');
    } else if (CombatTrackerManager.#isNearBottomDock(rect)) {
      CombatTrackerManager.#dock(combatPopout, 'bottom');
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
   * Apply top-docked styles to combat tracker
   * @param {HTMLElement} combatPopout
   */
  static #applyDockedTopStyles = (combatPopout) => {
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
   * Apply bottom-docked styles to combat tracker
   * @param {HTMLElement} combatPopout
   */
  static #applyDockedBottomStyles = (combatPopout) => {
    combatPopout.classList.add('docked-bottom');
    combatPopout.style.zIndex = 'calc(var(--z-index-app) - 1)';
    combatPopout.style.left = 'auto';
    combatPopout.style.top = 'auto';

    const uiBottom = document.querySelector('#ui-bottom');
    if (uiBottom && combatPopout.parentElement !== uiBottom) {
      uiBottom.prepend(combatPopout);
    }
  }

  /**
   * Dock combat tracker to top or bottom of screen
   * @param {HTMLElement} combatPopout
   * @param {'top'|'bottom'} position
   */
  static #dock = (combatPopout, position = 'top') => {
    const state = CombatTrackerManager.#dockState;

    combatPopout.classList.add('snapping');
    setTimeout(() => combatPopout.classList.remove('snapping'), 200);

    if (position === 'bottom') {
      CombatTrackerManager.#applyDockedBottomStyles(combatPopout);
    } else {
      CombatTrackerManager.#applyDockedTopStyles(combatPopout);
    }

    game.user?.setFlag(MODULE_ID, 'combatTrackerDocked', position);
    state.isDocked = position;

    LogUtil.log("Combat tracker docked to " + position);
  }

  /**
   * Undock combat tracker from top or bottom
   * @param {HTMLElement} combatPopout
   */
  static #undock = (combatPopout) => {
    const state = CombatTrackerManager.#dockState;

    const rect = combatPopout.getBoundingClientRect();
    const currentLeft = rect.left;
    const currentTop = rect.top;

    combatPopout.classList.remove('docked-top', 'docked-bottom');
    combatPopout.style.transform = '';
    combatPopout.style.zIndex = '';
    combatPopout.style.bottom = '';

    if (combatPopout.parentElement?.id === 'interface' || combatPopout.parentElement?.id === 'ui-bottom') {
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
   * Inject initiative roll buttons and separator into nav.combat-controls
   * Only creates elements if they don't already exist (GM only)
   * @param {HTMLElement} navControls - The nav.combat-controls element
   */
  static #injectInitiativeButtons = (navControls) => {
    if (!navControls) return;
    if (!game.user?.isGM) return;
    if (navControls.querySelector('.crlngn-initiative-group')) return;

    const group = document.createElement('div');
    group.className = 'crlngn-initiative-group';
    group.style.display = 'contents';

    const tooltipDir = CombatTrackerManager.#dockState.isDocked === 'bottom' ? 'DOWN' : 'UP';

    const rollAllBtn = document.createElement('button');
    rollAllBtn.type = 'button';
    rollAllBtn.className = 'inline-control combat-control icon fa-solid fa-users';
    rollAllBtn.setAttribute('data-action', 'rollAll');
    rollAllBtn.setAttribute('data-tooltip', 'COMBAT.RollAll');
    rollAllBtn.setAttribute('data-tooltip-direction', tooltipDir);
    rollAllBtn.setAttribute('aria-label', game.i18n.localize('COMBAT.RollAll'));
    rollAllBtn.addEventListener('click', () => game.combat?.rollAll());

    const rollNpcBtn = document.createElement('button');
    rollNpcBtn.type = 'button';
    rollNpcBtn.className = 'inline-control combat-control icon fa-solid fa-users-cog';
    rollNpcBtn.setAttribute('data-action', 'rollNPC');
    rollNpcBtn.setAttribute('data-tooltip', 'COMBAT.RollNPC');
    rollNpcBtn.setAttribute('data-tooltip-direction', tooltipDir);
    rollNpcBtn.setAttribute('aria-label', game.i18n.localize('COMBAT.RollNPC'));
    rollNpcBtn.addEventListener('click', () => game.combat?.rollNPC());

    const separator = document.createElement('span');
    separator.className = 'crlngn-nav-separator';

    group.appendChild(rollAllBtn);
    group.appendChild(rollNpcBtn);
    group.appendChild(separator);

    navControls.insertBefore(group, navControls.firstChild);
  }

  /**
   * Update initiative button visibility within nav.combat-controls
   * Shows when combatants exist but haven't all rolled initiative (GM only)
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #updateInitiativeButtons = (combatPopout) => {
    if (!combatPopout) return;

    const navControls = combatPopout.querySelector('nav.combat-controls');
    const group = navControls?.querySelector('.crlngn-initiative-group');
    if (!group) return;

    if (!game.user?.isGM) {
      group.style.display = 'none';
      return;
    }

    const combat = game.combat;
    if (!combat || !combat.combatants || combat.combatants.size === 0) {
      group.style.display = 'none';
      return;
    }

    const hasUnrolledInitiative = combat.combatants.some(c => c.initiative === null || c.initiative === undefined);
    group.style.display = hasUnrolledInitiative ? 'contents' : 'none';
  }

  /**
   * Inject an End Turn button and separator into nav.combat-controls
   * Only creates elements if they don't already exist (non-GM players only)
   * @param {HTMLElement} navControls - The nav.combat-controls element
   */
  static #injectEndTurnButton = (navControls) => {
    if (!navControls) return;
    if (game.user?.isGM) return;
    if (navControls.querySelector('.crlngn-end-turn-group')) return;

    const group = document.createElement('div');
    group.className = 'crlngn-end-turn-group';
    group.style.display = 'none';

    const separator = document.createElement('span');
    separator.className = 'crlngn-nav-separator';

    const tooltipDir = CombatTrackerManager.#dockState.isDocked === 'bottom' ? 'DOWN' : 'UP';
    const endTurnLabel = game.i18n.localize('COMBAT.TurnEnd');
    const endTurnBtn = document.createElement('button');
    endTurnBtn.type = 'button';
    endTurnBtn.className = 'combat-control icon fa-solid fa-check';
    endTurnBtn.setAttribute('data-action', 'endTurn');
    endTurnBtn.setAttribute('data-tooltip', endTurnLabel);
    endTurnBtn.setAttribute('data-tooltip-direction', tooltipDir);
    endTurnBtn.setAttribute('aria-label', endTurnLabel);
    endTurnBtn.addEventListener('click', () => game.combat?.nextTurn());

    group.appendChild(separator);
    group.appendChild(endTurnBtn);

    navControls.appendChild(group);
  }

  /**
   * Update End Turn button visibility within nav.combat-controls
   * Shows for non-GM players when it's their turn
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #updateEndTurnButton = (combatPopout) => {
    if (!combatPopout) return;

    const navControls = combatPopout.querySelector('nav.combat-controls');
    const group = navControls?.querySelector('.crlngn-end-turn-group');
    if (!group) return;

    const combat = game.combat;
    if (!combat || !combat.started) {
      group.style.display = 'none';
      return;
    }

    const currentCombatant = combat.combatant;
    if (!currentCombatant) {
      group.style.display = 'none';
      return;
    }

    const isPlayersTurn = currentCombatant.isOwner && !game.user?.isGM;
    group.style.display = isPlayersTurn ? 'contents' : 'none';
  }

  /**
   * Toggle fully rounded corners on nav.combat-controls when it is wider
   * than the combatant list, otherwise use flush top corners
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #updateNavBorderRadius = (combatPopout) => {
    const navControls = combatPopout?.querySelector('nav.combat-controls');
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!navControls || !tracker) return;

    const trackerWidth = tracker.offsetWidth;
    navControls.style.width = 'min-content';
    const navMinWidth = navControls.offsetWidth;
    navControls.style.width = '';

    navControls.classList.toggle('crlngn-nav-rounded', navMinWidth >= trackerWidth);
  }
}
