import { SettingsUtil } from "../SettingsUtil.mjs";
import { getSettings } from "../../constants/Settings.mjs";

/**
 * Handles position calculations and transform updates for the combat carousel
 * All methods receive state and config objects from the main CombatCarousel class
 */
export const CarouselTransforms = {
  /**
   * Safe modulo that handles negative numbers
   */
  mod(n, m) {
    return ((n % m) + m) % m;
  },

  /**
   * Calculate STEP and TRACK constants based on card dimensions
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter
   * @returns {{STEP: number, TRACK: number}}
   */
  calculateTrackConstants(state, config) {
    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;

    const STEP = cardWidth + gap;
    const TRACK = state.allCombatantIds.length * STEP;

    return { STEP, TRACK };
  },

  /**
   * Get the maximum scroll value for simple list mode (clamped scrolling)
   * Returns 0 if all combatants fit in the visible area
   * @param {object} state - Carousel state object
   * @param {number} STEP - Step size between cards
   */
  getMaxScrollX(state, STEP) {
    const totalWidth = state.allCombatantIds.length * STEP;
    const visibleWidth = state.visibleCount * STEP;
    return Math.max(0, totalWidth - visibleWidth);
  },

  /**
   * Check if we should use infinite wrapping
   * Returns true for carousel mode with 2+ combatants, false for simple list mode
   * @param {object} state - Carousel state object
   */
  shouldUseInfiniteWrap(state) {
    const SETTINGS = getSettings();
    const interactionType = SettingsUtil.get(SETTINGS.combatTrackerLayout?.tag) ?? "carousel";
    if (interactionType === "simple") {
      return false;
    }
    return state.allCombatantIds.length >= 2;
  },

  /**
   * Get the wrapped position for an item at given index
   * @param {number} index - The item index
   * @param {object} state - Carousel state object
   * @param {number} STEP - Step size between cards
   * @param {number} TRACK - Total track length
   * @param {number} [wrapThreshold] - Optional custom wrap threshold (defaults to HALF_TRACK)
   * @returns {number} The wrapped position relative to viewport center
   */
  getWrappedPosition(index, state, STEP, TRACK, wrapThreshold) {
    const HALF_TRACK = TRACK / 2;
    const threshold = wrapThreshold ?? HALF_TRACK;

    const itemX = index * STEP;
    let pos = itemX - state.scrollX;

    if (CarouselTransforms.shouldUseInfiniteWrap(state)) {
      if (pos < -threshold) pos += TRACK;
      if (pos >= threshold) pos -= TRACK;
    }

    return pos;
  },

  /**
   * Update all card transforms based on current scrollX
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   */
  updateTransforms(state, config) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    // Skip update if tracker width hasn't been properly initialized
    if (!config.trackerWidth || config.trackerWidth <= 0) {
      return;
    }

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');
    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const STEP = config.STEP;

    const trackerWidth = config.trackerWidth;
    const containerCenter = trackerWidth / 2;
    const useInfiniteWrap = CarouselTransforms.shouldUseInfiniteWrap(state);

    const HALF_TRACK = config.TRACK / 2;
    const visualThreshold = containerCenter + (cardWidth / 2);
    const wrapThreshold = Math.min(HALF_TRACK, visualThreshold);

    const elementMap = new Map();
    combatantElements.forEach(el => elementMap.set(el.dataset.combatantId, el));

    state.allCombatantIds.forEach((id, index) => {
      const element = elementMap.get(id);
      if (!element) return;

      if (useInfiniteWrap) {
        const pos = CarouselTransforms.getWrappedPosition(index, state, STEP, config.TRACK, wrapThreshold);
        const screenX = Math.round(containerCenter + pos - (cardWidth / 2));
        element.style.transform = `translateX(${screenX}px)`;
        element.style.left = '0';
        element.style.position = 'absolute';
        element.classList.add('crlngn-positioned');
      } else {
        element.style.transform = state.scrollX ? `translateX(${-state.scrollX}px)` : '';
        element.style.left = '';
        element.style.position = '';
        element.classList.remove('crlngn-positioned');
      }
    });

    if (useInfiniteWrap) {
      CarouselTransforms.updateEdgeClones(tracker, containerCenter, cardWidth, STEP, state, wrapThreshold);
      CarouselTransforms.updateTurnIndicator(tracker, containerCenter, cardWidth, state, config, wrapThreshold);
    } else {
      tracker.querySelector('.crlngn-turn-indicator')?.remove();
      tracker.querySelector('.crlngn-clone')?.remove();
    }
  },

  /**
   * Rebuild clones to fill the visible area - called only on init/resize
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   */
  rebuildClones(state, config) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    tracker.querySelector('.crlngn-clone')?.remove();

    if (!CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return;
    }

    // Skip if tracker width hasn't been properly initialized
    if (!config.trackerWidth || config.trackerWidth <= 0) {
      return;
    }

    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const STEP = config.STEP;

    const trackerWidth = config.trackerWidth;
    const containerCenter = trackerWidth / 2;

    const HALF_TRACK = config.TRACK / 2;
    const visualThreshold = containerCenter + (cardWidth / 2);
    const wrapThreshold = Math.min(HALF_TRACK, visualThreshold);

    CarouselTransforms.updateEdgeClones(tracker, containerCenter, cardWidth, STEP, state, wrapThreshold);
  },

  /**
   * Update edge clones to fill gaps on both sides of the carousel
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} STEP - Step size (cardWidth + gap)
   * @param {object} state - Carousel state object
   * @param {number} wrapThreshold - The wrap threshold for positioning
   */
  updateEdgeClones(tracker, containerCenter, cardWidth, STEP, state, wrapThreshold) {
    const totalCount = state.allCombatantIds.length;
    if (totalCount < 2) return;

    const TRACK = totalCount * STEP;

    let leftmostIndex = 0;
    let leftmostScreenX = Infinity;
    let rightmostScreenX = -Infinity;

    state.allCombatantIds.forEach((id, index) => {
      const pos = CarouselTransforms.getWrappedPosition(index, state, STEP, TRACK, wrapThreshold);
      const screenX = Math.round(containerCenter + pos - (cardWidth / 2));
      if (screenX < leftmostScreenX) {
        leftmostScreenX = screenX;
        leftmostIndex = index;
      }
      if (screenX > rightmostScreenX) {
        rightmostScreenX = screenX;
      }
    });

    const sourceId = state.allCombatantIds[leftmostIndex];
    const cloneScreenX = Math.round(rightmostScreenX + STEP);

    let existingClone = tracker.querySelector('.crlngn-clone');

    if (existingClone && existingClone.dataset.cloneSourceId === sourceId) {
      existingClone.style.transform = `translateX(${cloneScreenX}px)`;
      return;
    }

    if (existingClone) {
      existingClone.remove();
    }

    const sourceEl = tracker.querySelector(`li.combatant[data-combatant-id="${sourceId}"]:not(.crlngn-clone)`);
    if (sourceEl) {
      const clone = sourceEl.cloneNode(true);
      clone.classList.add('crlngn-clone');
      clone.removeAttribute('data-combatant-id');
      clone.dataset.cloneSourceId = sourceId;
      clone.style.pointerEvents = 'none';
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.transform = `translateX(${cloneScreenX}px)`;
      clone.classList.add('crlngn-positioned');
      tracker.appendChild(clone);
    }
  },

  /**
   * Update the turn start indicator position
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   * @param {number} wrapThreshold - The wrap threshold for positioning
   */
  updateTurnIndicator(tracker, containerCenter, cardWidth, state, config, wrapThreshold) {
    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const gap = 0.5 * baseFontSize * scale;

    let indicator = tracker.querySelector('.crlngn-turn-indicator');
    if (!indicator) {
      indicator = CarouselTransforms.createTurnIndicator();
      tracker.appendChild(indicator);
    }

    const indicatorPos = CarouselTransforms.getWrappedPosition(0, state, config.STEP, config.TRACK, wrapThreshold);
    const firstCardLeftEdge = containerCenter + indicatorPos - (cardWidth / 2);
    const indicatorX = Math.round(firstCardLeftEdge - (gap / 2));

    indicator.style.transform = `translateX(${indicatorX}px)`;
  },

  /**
   * Create the turn start indicator element
   * @returns {HTMLElement} The indicator element
   */
  createTurnIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'crlngn-turn-indicator';
    return indicator;
  }
};
