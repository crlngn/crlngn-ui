import { LogUtil } from "../LogUtil.mjs";
import { LibWrapperUtil } from "../LibWrapperUtil.mjs";
import { CarouselTransforms } from "./CarouselTransforms.mjs";
import { CarouselInteraction } from "./CarouselInteraction.mjs";
import { CombatTrackerManager } from "./CombatTrackerManager.mjs";

/**
 * Handles libWrapper integration for intercepting Combat turn navigation
 * Allows the carousel to animate before the actual turn change occurs
 */
export const CarouselCombatWrappers = {
  wrappersRegistered: false,
  suppressPopoutRenderUntil: 0,

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
    if (!state || !config) return wrapped.call(this, ...args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return wrapped.call(this, ...args);
    }

    const currentTurn = combat.turn ?? -1;
    let nextTurn = currentTurn + 1;
    const shouldSkipDefeated = combat.settings.skipDefeated || CombatTrackerManager.carouselHideDefeated;

    if (shouldSkipDefeated) {
      nextTurn = null;
      for (let i = currentTurn + 1; i < combat.turns.length; i++) {
        if (!combat.turns[i].isDefeated) {
          nextTurn = i;
          break;
        }
      }
    }

    if (nextTurn === null || nextTurn >= combat.turns.length) {
      return wrapped.call(this, ...args);
    }

    const nextCombatant = combat.turns[nextTurn];
    const nextIndex = state.allCombatantIds.indexOf(nextCombatant.id);

    if (nextIndex !== -1) {
      CarouselCombatWrappers.removeActiveClass();
      const delta = CarouselInteraction.getShortestPath(nextIndex, state, config.STEP, config.TRACK);
      state.targetScrollX = state.scrollX + delta;
      CarouselInteraction.startAnimationLoop(state, config);
      await CarouselInteraction.waitForAnimation(state);
      CarouselCombatWrappers.updateActiveClass(nextCombatant.id);
      CarouselCombatWrappers.skipNextCenterSetter?.(true);
      CarouselCombatWrappers.setSuppressPopoutRender();
    }

    return wrapped.call(this, ...args);
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
    if (!state || !config) return wrapped.call(this, ...args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return wrapped.call(this, ...args);
    }

    if (combat.round === 0) {
      return wrapped.call(this, ...args);
    }

    if ((combat.turn === 0) || (combat.turns.length === 0)) {
      return wrapped.call(this, ...args);
    }

    let previousTurn = (combat.turn ?? combat.turns.length) - 1;
    const shouldSkipDefeated = combat.settings.skipDefeated || CombatTrackerManager.carouselHideDefeated;

    if (shouldSkipDefeated) {
      while (previousTurn >= 0 && combat.turns[previousTurn]?.isDefeated) {
        previousTurn--;
      }
      if (previousTurn < 0) return wrapped.call(this, ...args);
    }

    const prevCombatant = combat.turns[previousTurn];
    const prevIndex = state.allCombatantIds.indexOf(prevCombatant.id);

    if (prevIndex !== -1) {
      CarouselCombatWrappers.removeActiveClass();
      const delta = CarouselInteraction.getShortestPath(prevIndex, state, config.STEP, config.TRACK);
      state.targetScrollX = state.scrollX + delta;
      CarouselInteraction.startAnimationLoop(state, config);
      await CarouselInteraction.waitForAnimation(state);
      CarouselCombatWrappers.updateActiveClass(prevCombatant.id);
      CarouselCombatWrappers.skipNextCenterSetter?.(true);
      CarouselCombatWrappers.setSuppressPopoutRender();
    }

    return wrapped.call(this, ...args);
  },

  /**
   * Wrapper for Combat.prototype.nextRound
   */
  async wrapNextRound(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return wrapped.call(this, ...args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return wrapped.call(this, ...args);
    }

    let turn = (combat.turn === null) || (combat.turns.length === 0) ? null : 0;
    if ((combat.settings.skipDefeated || CombatTrackerManager.carouselHideDefeated) && (turn !== null)) {
      turn = combat.turns.findIndex(t => !t.isDefeated);
      if (turn === -1) turn = 0;
    }

    if (turn !== null && combat.turns[turn]) {
      const targetCombatant = combat.turns[turn];
      const targetIndex = state.allCombatantIds.indexOf(targetCombatant.id);

      if (targetIndex !== -1) {
        CarouselCombatWrappers.removeActiveClass();
        const delta = CarouselInteraction.getShortestPath(targetIndex, state, config.STEP, config.TRACK);
        state.targetScrollX = state.scrollX + delta;
        CarouselInteraction.startAnimationLoop(state, config);
        await CarouselInteraction.waitForAnimation(state);
        CarouselCombatWrappers.updateActiveClass(targetCombatant.id);
        CarouselCombatWrappers.skipNextCenterSetter?.(true);
        CarouselCombatWrappers.setSuppressPopoutRender();
      }
    }

    return wrapped.call(this, ...args);
  },

  /**
   * Wrapper for Combat.prototype.previousRound
   */
  async wrapPreviousRound(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CarouselCombatWrappers.isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CarouselCombatWrappers.stateGetter?.();
    const config = CarouselCombatWrappers.configGetter?.();
    if (!state || !config) return wrapped.call(this, ...args);

    if (state.allCombatantIds.length === 0 || !CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return wrapped.call(this, ...args);
    }

    if (combat.round === 0) {
      return wrapped.call(this, ...args);
    }

    let turn = (combat.round === 1) || (combat.turn === null) || (combat.turns.length === 0)
      ? null
      : combat.turns.length - 1;

    if ((combat.settings.skipDefeated || CombatTrackerManager.carouselHideDefeated) && turn !== null) {
      while (turn >= 0 && combat.turns[turn]?.isDefeated) {
        turn--;
      }
      if (turn < 0) turn = null;
    }

    if (turn !== null && combat.turns[turn]) {
      const targetCombatant = combat.turns[turn];
      const targetIndex = state.allCombatantIds.indexOf(targetCombatant.id);

      if (targetIndex !== -1) {
        CarouselCombatWrappers.removeActiveClass();
        const delta = CarouselInteraction.getShortestPath(targetIndex, state, config.STEP, config.TRACK);
        state.targetScrollX = state.scrollX + delta;
        CarouselInteraction.startAnimationLoop(state, config);
        await CarouselInteraction.waitForAnimation(state);
        CarouselCombatWrappers.updateActiveClass(targetCombatant.id);
        CarouselCombatWrappers.skipNextCenterSetter?.(true);
        CarouselCombatWrappers.setSuppressPopoutRender();
      }
    }

    return wrapped.call(this, ...args);
  }
};
