import { LogUtil } from "../LogUtil.mjs";
import { CarouselTransforms } from "./CarouselTransforms.mjs";

/**
 * Handles animation physics and drag/pointer interactions for the combat carousel
 * All methods receive state and config objects from the main CombatCarousel class
 */
export const CarouselInteraction = {
  // Animation constants
  FRICTION: 0.92,
  DRAG_SENS: 1.0,
  SNAP_VELOCITY_THRESHOLD: 0.5,
  CLICK_THRESHOLD: 5,

  // Animation state (module-level)
  animationFrameId: null,
  boundPointerMove: null,
  boundPointerUp: null,
  currentTrackerElement: null,
  snapTimeoutId: null,
  lastClickTime: 0,
  lastClickCombatantId: null,
  DBLCLICK_THRESHOLD: 400,

  /**
   * Get the index of the combatant currently closest to center
   * @param {object} state - Carousel state object
   * @param {number} STEP - Step size
   * @param {number} TRACK - Total track length
   */
  getCenterIndex(state, STEP, TRACK) {
    if (TRACK === 0) return 0;
    const normalizedScroll = CarouselTransforms.mod(state.scrollX, TRACK);
    return Math.round(normalizedScroll / STEP) % state.allCombatantIds.length;
  },

  /**
   * Calculate the scroll path to a target index
   * @param {number} targetIndex - The target combatant index
   * @param {object} state - Carousel state object
   * @param {number} STEP - Step size
   * @param {number} TRACK - Total track length
   * @param {number} [forceDirection=0] - 0=shortest path, 1=force forward, -1=force backward
   * @returns {number} The scroll delta (positive = right/forward, negative = left/backward)
   */
  getShortestPath(targetIndex, state, STEP, TRACK, forceDirection = 0) {
    const totalCount = state.allCombatantIds.length;
    if (totalCount === 0) return 0;

    const targetScrollX = targetIndex * STEP;
    const currentNormalized = CarouselTransforms.mod(state.scrollX, TRACK);

    let forwardDelta = targetScrollX - currentNormalized;
    if (forwardDelta < 0) forwardDelta += TRACK;

    let backwardDelta = currentNormalized - targetScrollX;
    if (backwardDelta < 0) backwardDelta += TRACK;

    if (forceDirection > 0) return forwardDelta;
    if (forceDirection < 0) return -backwardDelta;

    return forwardDelta <= backwardDelta ? forwardDelta : -backwardDelta;
  },

  /**
   * Check if carousel centering should be enforced (carousel mode only)
   * @param {object} state - Carousel state object
   */
  shouldEnforceCentering(state) {
    const combat = game.combat;
    if (!combat?.started) return false;
    if (state.allCombatantIds.length < 2) return false;
    if (!CarouselTransforms.shouldUseInfiniteWrap(state)) return false;
    return true;
  },

  /**
   * Scroll to show the active combatant.
   * In carousel mode: centers the active combatant.
   * In simple list mode: scrolls only if the active combatant is outside the visible area.
   * @param {boolean} animate - Whether to animate the transition
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with STEP, TRACK, callbacks
   */
  centerOnActive(animate, state, config) {
    if (config.skipNextCenter) {
      config.setSkipNextCenter(false);
      return;
    }

    const combat = game.combat;
    if (!combat?.started) return;
    if (state.allCombatantIds.length < 2) return;

    const activeId = combat.combatant?.id;
    if (!activeId) return;

    const activeIndex = state.allCombatantIds.indexOf(activeId);
    if (activeIndex === -1) return;

    const STEP = config.STEP;
    const useInfiniteWrap = CarouselTransforms.shouldUseInfiniteWrap(state);

    if (useInfiniteWrap) {
      const targetScrollX = activeIndex * STEP;
      if (animate) {
        const delta = CarouselInteraction.getShortestPath(activeIndex, state, STEP, config.TRACK);
        state.targetScrollX = state.scrollX + delta;
        CarouselInteraction.startAnimationLoop(state, config);
      } else {
        state.scrollX = targetScrollX;
        config.updateTransforms();
      }
    } else {
      const activePosition = activeIndex * STEP;
      const visibleWidth = state.visibleCount * STEP;
      const maxScrollX = CarouselTransforms.getMaxScrollX(state, STEP);

      let targetScrollX = null;
      if (activePosition < state.scrollX) {
        targetScrollX = activePosition;
      } else if (activePosition >= state.scrollX + visibleWidth) {
        targetScrollX = Math.min(activePosition - visibleWidth + STEP, maxScrollX);
      }

      if (targetScrollX !== null) {
        if (animate) {
          state.targetScrollX = targetScrollX;
          CarouselInteraction.startAnimationLoop(state, config);
        } else {
          state.scrollX = targetScrollX;
          config.updateTransforms();
        }
      }
    }
  },

  /**
   * Wait for the current animation to complete
   * @param {object} state - Carousel state object
   * @returns {Promise<void>}
   */
  waitForAnimation(state) {
    return new Promise((resolve) => {
      const checkAnimation = () => {
        if (state.targetScrollX === null) {
          resolve();
        } else {
          requestAnimationFrame(checkAnimation);
        }
      };
      requestAnimationFrame(checkAnimation);
    });
  },

  /**
   * Animation loop with momentum physics
   * @param {number} currentTime - Current timestamp
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with STEP, TRACK, callbacks
   */
  tick(currentTime, state, config) {
    const TRACK = config.TRACK;
    const useInfiniteWrap = CarouselTransforms.shouldUseInfiniteWrap(state);
    const maxScrollX = CarouselTransforms.getMaxScrollX(state, config.STEP);

    if (!state.isAnimating) return;

    const dt = state.lastTime ? (currentTime - state.lastTime) / 16.67 : 1;
    state.lastTime = currentTime;

    if (state.targetScrollX !== null) {
      if (state.animStartTime === null) {
        state.animStartTime = currentTime;
      }
      const elapsed = currentTime - state.animStartTime;
      const progress = Math.min(elapsed / CarouselInteraction.ANIMATION_DURATION, 1);
      const t = 1 - Math.pow(1 - progress, 3);

      if (progress >= 1) {
        if (useInfiniteWrap) {
          state.scrollX = CarouselTransforms.mod(state.targetScrollX, TRACK);
        } else {
          state.scrollX = Math.max(0, Math.min(state.targetScrollX, maxScrollX));
        }
        state.targetScrollX = null;
        state.animStartTime = null;
        state.animStartScrollX = null;
        state.velocity = 0;
      } else {
        const start = state.animStartScrollX ?? state.scrollX;
        state.scrollX = start + (state.targetScrollX - start) * t;
      }
    } else {
      if (!state.isDragging && Math.abs(state.velocity) > 0.1) {
        state.scrollX += state.velocity * dt;
        state.velocity *= Math.pow(CarouselInteraction.FRICTION, dt);
      }

      if (TRACK > 0) {
        if (useInfiniteWrap) {
          state.scrollX = CarouselTransforms.mod(state.scrollX, TRACK);
        } else {
          if (state.scrollX < 0) {
            state.scrollX = 0;
            state.velocity = 0;
          } else if (state.scrollX > maxScrollX) {
            state.scrollX = maxScrollX;
            state.velocity = 0;
          }
        }
      }
    }

    config.updateTransforms();

    const shouldContinue = state.targetScrollX !== null ||
      (Math.abs(state.velocity) > 0.1 && !state.isDragging);

    if (shouldContinue) {
      CarouselInteraction.animationFrameId = requestAnimationFrame(
        (time) => CarouselInteraction.tick(time, state, config)
      );
    } else {
      state.isAnimating = false;
      if (!state.isDragging && useInfiniteWrap) {
        CarouselInteraction.scheduleSnap(state, config);
      }
    }
  },

  /**
   * Snap to the nearest card center
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with STEP, TRACK
   */
  snapToNearestCard(state, config) {
    const STEP = config.STEP;
    const TRACK = config.TRACK;

    if (TRACK === 0) return;

    const normalizedScroll = CarouselTransforms.mod(state.scrollX, TRACK);
    const nearestIndex = Math.round(normalizedScroll / STEP);
    const targetScrollX = nearestIndex * STEP;

    const diff = targetScrollX - normalizedScroll;
    if (Math.abs(diff) > 0.5) {
      state.targetScrollX = state.scrollX + diff;
      CarouselInteraction.startAnimationLoop(state, config);
    }
  },

  /**
   * Schedule a debounced snap to nearest card
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with STEP, TRACK
   * @param {number} delay - Delay in ms before snapping (default 150ms)
   */
  scheduleSnap(state, config, delay = 150) {
    if (CarouselInteraction.snapTimeoutId) {
      clearTimeout(CarouselInteraction.snapTimeoutId);
    }
    CarouselInteraction.snapTimeoutId = setTimeout(() => {
      CarouselInteraction.snapTimeoutId = null;
      if (!state.isDragging && !state.isAnimating && CarouselTransforms.shouldUseInfiniteWrap(state)) {
        CarouselInteraction.snapToNearestCard(state, config);
      }
    }, delay);
  },

  /**
   * Cancel any scheduled snap
   */
  cancelScheduledSnap() {
    if (CarouselInteraction.snapTimeoutId) {
      clearTimeout(CarouselInteraction.snapTimeoutId);
      CarouselInteraction.snapTimeoutId = null;
    }
  },

  /**
   * Start the animation loop
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with callbacks
   */
  ANIMATION_DURATION: 300,

  startAnimationLoop(state, config) {
    if (state.targetScrollX !== null) {
      state.animStartScrollX = state.scrollX;
      state.animStartTime = null;
    }
    if (!state.isAnimating) {
      state.isAnimating = true;
      state.lastTime = 0;
      CarouselInteraction.animationFrameId = requestAnimationFrame(
        (time) => CarouselInteraction.tick(time, state, config)
      );
    }
  },

  /**
   * Stop the animation loop
   * @param {object} state - Carousel state object
   */
  stopAnimationLoop(state) {
    state.isAnimating = false;
    if (CarouselInteraction.animationFrameId) {
      cancelAnimationFrame(CarouselInteraction.animationFrameId);
      CarouselInteraction.animationFrameId = null;
    }
  },

  /**
   * Initialize drag event listeners
   * @param {HTMLElement} tracker - The tracker element
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with callbacks
   */
  initDragListeners(tracker, state, config) {
    CarouselInteraction.boundPointerMove = (e) => CarouselInteraction.onPointerMove(e, state, config);
    CarouselInteraction.boundPointerUp = (e) => CarouselInteraction.onPointerUp(e, state, config);

    tracker.addEventListener('pointerdown', (e) => CarouselInteraction.onPointerDown(e, state, config));
    tracker.addEventListener('click', CarouselInteraction.onClickCapture, true);

    CarouselInteraction.currentTrackerElement = tracker;
  },

  /**
   * Ensure drag listeners are attached to the current tracker element
   * @param {HTMLElement} tracker - The tracker element
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with callbacks
   */
  ensureDragListeners(tracker, state, config) {
    if (tracker === CarouselInteraction.currentTrackerElement) return;

    if (CarouselInteraction.currentTrackerElement) {
      CarouselInteraction.removeDragListeners(CarouselInteraction.currentTrackerElement);
    }

    CarouselInteraction.boundPointerMove = (e) => CarouselInteraction.onPointerMove(e, state, config);
    CarouselInteraction.boundPointerUp = (e) => CarouselInteraction.onPointerUp(e, state, config);

    tracker.addEventListener('pointerdown', (e) => CarouselInteraction.onPointerDown(e, state, config));
    tracker.addEventListener('click', CarouselInteraction.onClickCapture, true);

    CarouselInteraction.currentTrackerElement = tracker;

    LogUtil.log("CarouselInteraction - Re-attached drag listeners to new tracker element");
  },

  /**
   * Remove drag event listeners
   * @param {HTMLElement} tracker - The tracker element
   */
  removeDragListeners(tracker) {
    tracker.removeEventListener('pointerdown', CarouselInteraction.onPointerDown);
    tracker.removeEventListener('click', CarouselInteraction.onClickCapture, true);

    document.removeEventListener('pointermove', CarouselInteraction.boundPointerMove);
    document.removeEventListener('pointerup', CarouselInteraction.boundPointerUp);
  },

  /**
   * Capture-phase click handler that prevents Foundry's activateCombatant
   * @param {MouseEvent} e
   */
  onClickCapture(e) {
    const isInteractive = e.target.closest('button, input, select, textarea, a, [data-action]');
    if (e.target.closest('li.combatant') && !isInteractive) {
      e.stopPropagation();
      e.preventDefault();
    }
  },


  /**
   * Handle pointer down for drag start
   * @param {PointerEvent} e
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with callbacks
   */
  onPointerDown(e, state, config) {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, textarea')) return;

    if (state.allCombatantIds.length < 2) return;

    const tracker = e.currentTarget;

    tracker.setPointerCapture(e.pointerId);
    state.isDragging = true;
    state.lastPointerX = e.clientX;
    state.dragStartX = e.clientX;
    state.totalDragDistance = 0;
    state.lastDelta = 0;
    state.velocity = 0;
    state.targetScrollX = null;
    state.animStartTime = null;
    state.animStartScrollX = null;

    CarouselInteraction.stopAnimationLoop(state);
    CarouselInteraction.cancelScheduledSnap();

    document.addEventListener('pointermove', CarouselInteraction.boundPointerMove);
    document.addEventListener('pointerup', CarouselInteraction.boundPointerUp);

    tracker.style.cursor = 'grabbing';
  },

  /**
   * Handle pointer move for dragging
   * @param {PointerEvent} e
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with STEP, TRACK, callbacks
   */
  onPointerMove(e, state, config) {
    if (!state.isDragging) return;

    const dx = e.clientX - state.lastPointerX;
    state.lastDelta = dx;
    state.lastPointerX = e.clientX;
    state.totalDragDistance += Math.abs(dx);

    const TRACK = config.TRACK;
    if (TRACK > 0) {
      const newScrollX = state.scrollX - dx * CarouselInteraction.DRAG_SENS;
      if (CarouselTransforms.shouldUseInfiniteWrap(state)) {
        state.scrollX = CarouselTransforms.mod(newScrollX, TRACK);
      } else {
        const maxScrollX = CarouselTransforms.getMaxScrollX(state, config.STEP);
        state.scrollX = Math.max(0, Math.min(newScrollX, maxScrollX));
      }
    }

    config.updateTransforms();
  },

  /**
   * Handle pointer up for drag end
   * @param {PointerEvent} e
   * @param {object} state - Carousel state object
   * @param {object} config - Configuration with callbacks
   */
  onPointerUp(e, state, config) {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    const wasClick = state.totalDragDistance < CarouselInteraction.CLICK_THRESHOLD;

    state.isDragging = false;

    document.removeEventListener('pointermove', CarouselInteraction.boundPointerMove);
    document.removeEventListener('pointerup', CarouselInteraction.boundPointerUp);

    if (tracker) {
      tracker.releasePointerCapture(e.pointerId);
      tracker.style.cursor = '';
    }

    if (wasClick) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const combatantEl = target?.closest('li.combatant[data-combatant-id]');
      if (combatantEl) {
        const combatantId = combatantEl.dataset.combatantId;
        const now = Date.now();
        const isDblClick = (now - CarouselInteraction.lastClickTime < CarouselInteraction.DBLCLICK_THRESHOLD)
          && (CarouselInteraction.lastClickCombatantId === combatantId);

        CarouselInteraction.lastClickTime = now;
        CarouselInteraction.lastClickCombatantId = combatantId;

        if (isDblClick) {
          const combatant = game.combat?.combatants.get(combatantId);
          combatant?.actor?.sheet?.render(true);
          CarouselInteraction.lastClickTime = 0;
        } else {
          const combatant = game.combat?.combatants.get(combatantId);
          const token = combatant?.token?.object;
          if (token?.visible) {
            if (!token.controlled) token.control({releaseOthers: true});
            canvas.animatePan(token.center);
          }
        }
      }
      return;
    }

    state.velocity = -state.lastDelta * CarouselInteraction.DRAG_SENS;

    if (Math.abs(state.velocity) > CarouselInteraction.SNAP_VELOCITY_THRESHOLD) {
      CarouselInteraction.startAnimationLoop(state, config);
    } else {
      CarouselInteraction.snapToNearestCard(state, config);
    }
  }
};
