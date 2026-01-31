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
   * @returns {number} The wrapped position relative to viewport center
   */
  getWrappedPosition(index, state, STEP, TRACK) {
    const HALF_TRACK = TRACK / 2;
    const isEvenCount = state.allCombatantIds.length % 2 === 0;
    const evenOffset = isEvenCount ? (STEP / 2) : 0;

    const itemX = index * STEP;
    let pos = itemX - state.scrollX;

    if (CarouselTransforms.shouldUseInfiniteWrap(state)) {
      if (pos < -HALF_TRACK - evenOffset) pos += TRACK;
      if (pos > HALF_TRACK - evenOffset) pos -= TRACK;
    }

    return pos;
  },

  /**
   * Get wrapped position for a virtual index (can be negative or > totalCount)
   * @param {number} virtualIndex - The virtual index (can be outside 0..totalCount-1)
   * @param {object} state - Carousel state object
   * @param {number} STEP - Step size between cards
   * @returns {number} The position relative to viewport center
   */
  getWrappedPositionForIndex(virtualIndex, state, STEP) {
    const itemX = virtualIndex * STEP;
    return itemX - state.scrollX;
  },

  /**
   * Update all card transforms based on current scrollX
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   */
  updateTransforms(state, config) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');
    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const STEP = config.STEP;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const containerCenter = trackerWidth / 2;
    const useInfiniteWrap = CarouselTransforms.shouldUseInfiniteWrap(state);

    const isEvenCount = state.allCombatantIds.length % 2 === 0;
    const evenOffset = isEvenCount ? (STEP / 2) : 0;

    state.allCombatantIds.forEach((id, index) => {
      const element = Array.from(combatantElements).find(
        el => el.dataset.combatantId === id
      );
      if (!element) return;

      let screenX;
      if (useInfiniteWrap) {
        const pos = CarouselTransforms.getWrappedPosition(index, state, STEP, config.TRACK);
        screenX = containerCenter + pos - (cardWidth / 2) + evenOffset;
      } else {
        screenX = (index * STEP) - state.scrollX;
      }

      element.style.transform = `translateX(${screenX}px)`;
      element.style.left = '0';
      element.style.position = 'absolute';
      element.classList.add('crlngn-positioned');
    });

    if (useInfiniteWrap) {
      CarouselTransforms.updateTurnIndicator(tracker, containerCenter, cardWidth, evenOffset, state, config);
    } else {
      tracker.querySelector('.crlngn-turn-indicator')?.remove();
    }
  },

  /**
   * Update clone positions during animation (without recreating them)
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} STEP - Step size between cards
   * @param {object} state - Carousel state object
   */
  updateClonePositions(tracker, containerCenter, cardWidth, STEP, state) {
    const totalCount = state.allCombatantIds.length;
    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const clones = tracker.querySelectorAll('.crlngn-clone');

    clones.forEach(clone => {
      const cloneIdx = parseInt(clone.dataset.cloneIndex, 10);
      if (isNaN(cloneIdx)) return;

      const pos = CarouselTransforms.getWrappedPositionForIndex(cloneIdx, state, STEP);
      const screenX = containerCenter + pos - (cardWidth / 2);

      if (screenX >= -STEP && screenX < trackerWidth + STEP) {
        clone.style.transform = `translateX(${screenX}px)`;
        clone.style.display = '';
      } else {
        clone.style.display = 'none';
      }
    });
  },

  /**
   * Rebuild clones to fill the visible area - called only on init/resize
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   */
  rebuildClones(state, config) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    tracker.querySelectorAll('.crlngn-clone').forEach(c => c.remove());

    if (!CarouselTransforms.shouldUseInfiniteWrap(state)) {
      return;
    }

    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const STEP = config.STEP;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const containerCenter = trackerWidth / 2;

    CarouselTransforms.updateEdgeClones(tracker, containerCenter, cardWidth, STEP, state);
  },

  /**
   * Update edge clones to fill gaps on both sides of the carousel
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} STEP - Step size (cardWidth + gap)
   * @param {object} state - Carousel state object
   */
  updateEdgeClones(tracker, containerCenter, cardWidth, STEP, state) {
    const totalCount = state.allCombatantIds.length;
    if (totalCount < 2) return;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');
    const clonesNeededPerSide = Math.ceil(trackerWidth / STEP) + 2;

    for (let i = 0; i < clonesNeededPerSide; i++) {
      const sourceIndex = CarouselTransforms.mod(-(i + 1), totalCount);
      const sourceId = state.allCombatantIds[sourceIndex];
      const sourceEl = Array.from(combatantElements).find(
        el => el.dataset.combatantId === sourceId
      );
      if (sourceEl) {
        const clone = sourceEl.cloneNode(true);
        clone.classList.add('crlngn-clone');
        clone.removeAttribute('data-combatant-id');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'absolute';
        clone.style.left = '0';
        clone.dataset.cloneIndex = String(-(i + 1));
        tracker.appendChild(clone);
      }
    }

    for (let i = 0; i < clonesNeededPerSide; i++) {
      const sourceIndex = (totalCount + i) % totalCount;
      const sourceId = state.allCombatantIds[sourceIndex];
      const sourceEl = Array.from(combatantElements).find(
        el => el.dataset.combatantId === sourceId
      );
      if (sourceEl) {
        const clone = sourceEl.cloneNode(true);
        clone.classList.add('crlngn-clone');
        clone.removeAttribute('data-combatant-id');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'absolute';
        clone.style.left = '0';
        clone.dataset.cloneIndex = String(totalCount + i);
        tracker.appendChild(clone);
      }
    }
  },

  /**
   * Update the turn start indicator position
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} evenOffset - Offset for even combatant counts
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with scale getter and constants
   */
  updateTurnIndicator(tracker, containerCenter, cardWidth, evenOffset, state, config) {
    const scale = config.getCurrentScale();
    const baseFontSize = 16;
    const gap = 0.5 * baseFontSize * scale;

    let indicator = tracker.querySelector('.crlngn-turn-indicator');
    if (!indicator) {
      indicator = CarouselTransforms.createTurnIndicator();
      tracker.appendChild(indicator);
    }

    const indicatorPos = CarouselTransforms.getWrappedPosition(0, state, config.STEP, config.TRACK);
    const firstCardLeftEdge = containerCenter + indicatorPos - (cardWidth / 2) + evenOffset;
    const indicatorX = firstCardLeftEdge - (gap / 2);

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
