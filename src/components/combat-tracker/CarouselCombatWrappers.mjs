import { LogUtil } from "../LogUtil.mjs";
import { LibWrapperUtil } from "../LibWrapperUtil.mjs";
import { CarouselTransforms } from "./CarouselTransforms.mjs";
import { CarouselInteraction } from "./CarouselInteraction.mjs";
import { CombatTrackerManager } from "./CombatTrackerManager.mjs";

/**
 * Handles libWrapper integration for intercepting Combat turn navigation
 * Animates the carousel AFTER the actual turn change to ensure visual state
 * always matches Foundry's actual combat state
 */
export const CarouselCombatWrappers = {
  wrappersRegistered: false,
  suppressPopoutRenderUntil: 0,
  _animatingTurnChange: false,

  // These will be set by CombatCarousel during registration
  stateGetter: null,
  configGetter: null,
  initializedGetter: null,
  skipNextCenterSetter: null,

  /**
   * Initialize the wrappers with required getters from main class
   * @param {object} options - Getter functions for state access
   */
  init(options) {
    CarouselCombatWrappers.stateGetter = options.getState;
    CarouselCombatWrappers.configGetter = options.getConfig;
    CarouselCombatWrappers.initializedGetter = options.isInitialized;
    CarouselCombatWrappers.skipNextCenterSetter = options.setSkipNextCenter;
  },

  /**
   * Check if the carousel popout is active (exists and initialized)
   */
  isCarouselActive() {
    return CarouselCombatWrappers.initializedGetter?.() &&
           document.querySelector('#combat-popout') !== null;
  },

  /**
   * Check if popout render should be suppressed
   * @returns {boolean} True if render should be suppressed for #combat-popout
   */
  shouldSuppressPopoutRender() {
    return Date.now() < CarouselCombatWrappers.suppressPopoutRenderUntil;
  },

  /**
   * Suppress popout renders for a duration
   * @param {number} duration - Duration in ms to suppress renders (default 500ms)
   */
  setSuppressPopoutRender(duration = 500) {
    CarouselCombatWrappers.suppressPopoutRenderUntil = Date.now() + duration;
  },

  /**
   * Remove the .active class from the current active combatant (popout only)
   */
  removeActiveClass() {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const oldActive = tracker.querySelector('li.combatant.active');
    if (oldActive) {
      oldActive.classList.remove('active');
    }
  },

  /**
   * Update the .active class from old combatant to new combatant
   * @param {string} newCombatantId - The ID of the new active combatant
   */
  updateActiveClass(newCombatantId) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const oldActive = tracker.querySelector('li.combatant.active');
    if (oldActive) {
      oldActive.classList.remove('active');
    }

    const newActive = tracker.querySelector(`li.combatant[data-combatant-id="${newCombatantId}"]`);
    if (newActive) {
      newActive.classList.add('active');
    }
  },

  /**
   * Update the round counter display in the header
   * @param {number} newRound - The new round number
   */
  updateRoundCounter(newRound) {
    const roundBadge = document.querySelector('#combat-popout .crlngn-round-counter');
    if (roundBadge) {
      roundBadge.textContent = newRound;
      roundBadge.style.display = newRound > 0 ? '' : 'none';
    }
  },

  /**
   * Whether combatants hidden by the "hide defeated" carousel setting must be
   * skipped during turn navigation
   * @param {object} combat - The Combat instance
   * @returns {boolean}
   */
  shouldSkipHiddenDefeated(combat) {
    return CombatTrackerManager.carouselHideDefeated &&
           CarouselCombatWrappers.isCarouselActive() &&
           !!combat?.started;
  },

  /**
   * Call a wrapped forward navigation method with core skipDefeated forced on,
   * so combatants hidden by the carousel are passed over in a single combat
   * update (core nextTurn/nextRound read this.settings.skipDefeated). The
   * instance-level settings shadow is removed afterwards.
   * @param {object} combat - The Combat instance
   * @param {Function} wrapped - The wrapped method from libWrapper
   * @param {Array} args - Original call arguments
   */
  async callSkippingHiddenDefeated(combat, wrapped, args) {
    if (!CarouselCombatWrappers.shouldSkipHiddenDefeated(combat)) {
      return wrapped.call(combat, ...args);
    }
    Object.defineProperty(combat, 'settings', {
      value: { ...combat.settings, skipDefeated: true },
      configurable: true
    });
    try {
      return await wrapped.call(combat, ...args);
    } finally {
      delete combat.settings;
    }
  },

  /**
   * Call a wrapped backward navigation method, then keep rewinding while the
   * turn landed on a combatant the carousel hides (core previousTurn and
   * previousRound never skip defeated). Guarded against combats where every
   * combatant is defeated; core stops the recursion at round 0.
   * @param {object} combat - The Combat instance
   * @param {Function} wrapped - The wrapped method from libWrapper
   * @param {Array} args - Original call arguments
   */
  async callRewindingPastDefeated(combat, wrapped, args) {
    const result = await wrapped.call(combat, ...args);
    const mustRewind = CarouselCombatWrappers.shouldSkipHiddenDefeated(combat) &&
                       combat.combatant?.isDefeated &&
                       combat.turns.some(t => !t.isDefeated);
    if (mustRewind) return combat.previousTurn();
    return result;
  },

  /**
   * Register libWrapper wrappers for Combat prototype methods
   */
  registerCombatWrappers() {
    if (CarouselCombatWrappers.wrappersRegistered) return;

    LogUtil.log("CarouselCombatWrappers - Registering combat wrappers...", [
      "libWrapper available:", LibWrapperUtil.isAvailable(),
      "globalThis.libWrapper:", typeof globalThis.libWrapper
    ]);

    const r1 = LibWrapperUtil.register(
      'Combat.prototype.nextTurn',
      CarouselCombatWrappers.wrapNextTurn,
      'WRAPPER'
    );
    const r2 = LibWrapperUtil.register(
      'Combat.prototype.previousTurn',
      CarouselCombatWrappers.wrapPreviousTurn,
      'WRAPPER'
    );
    const r3 = LibWrapperUtil.register(
      'Combat.prototype.nextRound',
      CarouselCombatWrappers.wrapNextRound,
      'WRAPPER'
    );
    const r4 = LibWrapperUtil.register(
      'Combat.prototype.previousRound',
      CarouselCombatWrappers.wrapPreviousRound,
      'WRAPPER'
    );
    const r5 = LibWrapperUtil.register(
      'foundry.applications.sidebar.tabs.CombatTracker.prototype.render',
      CarouselCombatWrappers.wrapCombatTrackerRender,
      'MIXED'
    );

    CarouselCombatWrappers.wrappersRegistered = true;
    LogUtil.log("CarouselCombatWrappers - Combat wrappers registered", [
      "nextTurn:", r1,
      "previousTurn:", r2,
      "nextRound:", r3,
      "previousRound:", r4,
      "CombatTracker.render:", r5
    ]);
  },

  /**
   * Wrapper for CombatTracker.prototype.render - skip render for popout during turn animation
   */
  wrapCombatTrackerRender(wrapped, ...args) {
    const app = this;
    const isPopout = app.isPopout === true || app.id === 'combat-popout' || app.element?.[0]?.id === 'combat-popout';

    if (isPopout && CarouselCombatWrappers.shouldSuppressPopoutRender()) {
      LogUtil.log("CarouselCombatWrappers - Suppressing popout render");
      return app;
    }

    return wrapped.call(this, ...args);
  },

  /**
   * Animate the carousel to the current active combatant after a turn change
   * @param {object} combat - The Combat instance
   * @param {object} state - Carousel state object
   * @param {object} config - Carousel config object
   * @param {number} forceDirection - 1=forward, -1=backward
   */
  async _animateToActiveCombatant(combat, state, config, forceDirection) {
    const newCombatant = combat.combatant;
    if (!newCombatant) return;

    const newIndex = state.allCombatantIds.indexOf(newCombatant.id);
    if (newIndex === -1) return;

    const delta = CarouselInteraction.getShortestPath(
      newIndex, state, config.STEP, config.TRACK, forceDirection
    );
    state.targetScrollX = state.scrollX + delta;
    CarouselInteraction.startAnimationLoop(state, config);
    await CarouselInteraction.waitForAnimation(state);
    CarouselCombatWrappers.updateActiveClass(newCombatant.id);
    CarouselCombatWrappers.skipNextCenterSetter?.(true);
    CombatTrackerManager.refreshAdvanceTurnButton();
  },

  /**
   * Wrapper for Combat.prototype.nextTurn
   */
  async wrapNextTurn(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);
    }

    CarouselCombatWrappers.setSuppressPopoutRender();
    CarouselCombatWrappers._animatingTurnChange = true;
    CarouselInteraction.cancelScheduledSnap();

    let result;
    try {
      result = await CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);
    } catch(e) {
      CarouselCombatWrappers.suppressPopoutRenderUntil = 0;
      CarouselCombatWrappers._animatingTurnChange = false;
      throw e;
    }

    await CarouselCombatWrappers._animateToActiveCombatant(combat, state, config, 1);
    CarouselCombatWrappers._animatingTurnChange = false;
    return result;
  },

  /**
   * Wrapper for Combat.prototype.previousTurn
   */
  async wrapPreviousTurn(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);
    }

    CarouselCombatWrappers.setSuppressPopoutRender();
    CarouselCombatWrappers._animatingTurnChange = true;
    CarouselInteraction.cancelScheduledSnap();

    let result;
    try {
      result = await CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);
    } catch(e) {
      CarouselCombatWrappers.suppressPopoutRenderUntil = 0;
      CarouselCombatWrappers._animatingTurnChange = false;
      throw e;
    }

    await CarouselCombatWrappers._animateToActiveCombatant(combat, state, config, -1);
    CarouselCombatWrappers._animatingTurnChange = false;
    return result;
  },

  /**
   * Wrapper for Combat.prototype.nextRound
   */
  async wrapNextRound(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (CarouselCombatWrappers._animatingTurnChange) {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);
    }

    CarouselCombatWrappers.setSuppressPopoutRender();
    CarouselInteraction.cancelScheduledSnap();

    let result;
    try {
      result = await CarouselCombatWrappers.callSkippingHiddenDefeated(combat, wrapped, args);
    } catch(e) {
      CarouselCombatWrappers.suppressPopoutRenderUntil = 0;
      throw e;
    }

    await CarouselCombatWrappers._animateToActiveCombatant(combat, state, config, 1);
    return result;
  },

  /**
   * Wrapper for Combat.prototype.previousRound
   */
  async wrapPreviousRound(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (CarouselCombatWrappers._animatingTurnChange) {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);
    }

    CarouselCombatWrappers.setSuppressPopoutRender();
    CarouselInteraction.cancelScheduledSnap();

    let result;
    try {
      result = await CarouselCombatWrappers.callRewindingPastDefeated(combat, wrapped, args);
    } catch(e) {
      CarouselCombatWrappers.suppressPopoutRenderUntil = 0;
      throw e;
    }

    await CarouselCombatWrappers._animateToActiveCombatant(combat, state, config, -1);
    return result;
  }
};
