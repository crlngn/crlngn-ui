import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { LibWrapperUtil } from "./LibWrapperUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Manages an infinite carousel for the combat tracker
 * Uses continuous scroll position with momentum physics for smooth navigation
 */
export class CombatCarousel {
  static #state = {
    allCombatantIds: [],
    containerWidth: 0,
    visibleCount: 0,
    scrollX: 0,
    velocity: 0,
    isDragging: false,
    lastPointerX: 0,
    lastDelta: 0,
    lastTime: 0,
    isAnimating: false,
    targetScrollX: null,
    dragStartX: 0,
    totalDragDistance: 0,
  };

  static #FRICTION = 0.92;
  static #DRAG_SENS = 1.0;
  static #SNAP_VELOCITY_THRESHOLD = 0.5;
  static #CLICK_THRESHOLD = 5;
  static #STEP = 0;
  static #TRACK = 0;
  static #animationFrameId = null;
  static #resizeObserver = null;
  static #scale = 1;
  static #boundPointerMove = null;
  static #boundPointerUp = null;
  static #initialized = false;
  static #trackerWidth = 0;
  static #skipNextCenter = false;
  static #wrappersRegistered = false;
  static #suppressPopoutRender = false;
  static #currentTrackerElement = null;
  static #boundWindowResize = null;
  static #sidebarHookId = null;
  static #previousCombatantIds = [];

  static get state() {
    return CombatCarousel.#state;
  }

  static set scale(value) {
    CombatCarousel.#scale = value ?? 1;
  }

  static get scale() {
    return CombatCarousel.#scale;
  }

  /**
   * Safe modulo that handles negative numbers
   */
  static #mod(n, m) {
    return ((n % m) + m) % m;
  }

  /**
   * Initialize the infinite carousel system
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static init = (combatPopout) => {
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    CombatCarousel.#disableSortable(combatPopout);

    if (CombatCarousel.#initialized) {
      CombatCarousel.#refreshCombatants(tracker);
      CombatCarousel.#ensureDragListeners(tracker);
      CombatCarousel.centerOnActive(true);
      return;
    }

    CombatCarousel.#recalculateState(tracker);
    CombatCarousel.#calculateTrackConstants();
    CombatCarousel.#buildDOM(tracker);
    CombatCarousel.#initDragListeners(tracker);
    CombatCarousel.#currentTrackerElement = tracker;
    CombatCarousel.#initResizeObserver(combatPopout);
    CombatCarousel.#initialized = true;
  }

  /**
   * Disable external Sortable.js drag behavior on the combat popout.
   * Systems like PF2e attach Sortable.js to ol.combat-tracker for reordering combatants.
   * Sortable.js uses pointerdown events and modifies element transforms during drag,
   * which conflicts with the carousel's translateX positioning.
   * This destroys the Sortable instance on every render (PF2e recreates it each time)
   * and prevents native dragstart events as an additional safeguard.
   * @param {HTMLElement} combatPopout - The #combat-popout element
   */
  static #disableSortable = (combatPopout) => {
    const tracker = combatPopout.querySelector('.combat-tracker');
    if (tracker) {
      for (const key of Object.keys(tracker)) {
        if (key.startsWith('Sortable')) {
          tracker[key]?.destroy?.();
          break;
        }
      }
    }

    if (!combatPopout.dataset.crlngnDragDisabled) {
      combatPopout.dataset.crlngnDragDisabled = 'true';
      combatPopout.addEventListener('dragstart', (e) => {
        if (e.target.closest('.combat-tracker')) {
          e.preventDefault();
        }
      }, true);
    }
  }

  /**
   * Register libWrapper wrappers for Combat prototype methods
   * This intercepts all calls to nextTurn, previousTurn, nextRound, previousRound
   */
  static registerCombatWrappers = () => {
    if (CombatCarousel.#wrappersRegistered) return;

    LogUtil.log("CombatCarousel - Registering combat wrappers...", [
      "libWrapper available:", LibWrapperUtil.isAvailable(),
      "globalThis.libWrapper:", typeof globalThis.libWrapper
    ]);

    const r1 = LibWrapperUtil.register(
      'Combat.prototype.nextTurn',
      CombatCarousel.#wrapNextTurn,
      'WRAPPER'
    );
    const r2 = LibWrapperUtil.register(
      'Combat.prototype.previousTurn',
      CombatCarousel.#wrapPreviousTurn,
      'WRAPPER'
    );
    const r3 = LibWrapperUtil.register(
      'Combat.prototype.nextRound',
      CombatCarousel.#wrapNextRound,
      'WRAPPER'
    );
    const r4 = LibWrapperUtil.register(
      'Combat.prototype.previousRound',
      CombatCarousel.#wrapPreviousRound,
      'WRAPPER'
    );

    const r5 = LibWrapperUtil.register(
      'foundry.applications.sidebar.tabs.CombatTracker.prototype.render',
      CombatCarousel.#wrapCombatTrackerRender,
      'MIXED'
    );

    CombatCarousel.#wrappersRegistered = true;
    LogUtil.log("CombatCarousel - Combat wrappers registered", [
      "nextTurn:", r1,
      "previousTurn:", r2,
      "nextRound:", r3,
      "previousRound:", r4,
      "CombatTracker.render:", r5
    ]);
  }

  /**
   * Wrapper for CombatTracker.prototype.render - skip render for popout during turn animation
   */
  static #wrapCombatTrackerRender = function(wrapped, ...args) {
    const app = this;
    const isPopout = app.isPopout === true;

    LogUtil.log("CombatCarousel - #wrapCombatTrackerRender", [
      "app.id:", app.id,
      "app.isPopout:", app.isPopout,
      "isPopout:", isPopout,
      "suppressFlag:", CombatCarousel.#suppressPopoutRender
    ]);

    if (isPopout && CombatCarousel.#suppressPopoutRender) {
      CombatCarousel.#suppressPopoutRender = false;
      LogUtil.log("CombatCarousel - Suppressing popout render");
      return app;
    }

    return wrapped.call(this, ...args);
  }

  /**
   * Check if the carousel popout is active (exists and initialized)
   * This distinguishes from the sidebar combat tracker
   */
  static #isCarouselActive = () => {
    return CombatCarousel.#initialized && document.querySelector('#combat-popout') !== null;
  }

  /**
   * Check if popout render should be suppressed (consumes the flag)
   * Called from CombatTrackerManager.onRenderCombatTracker
   * @returns {boolean} True if render should be suppressed for #combat-popout
   */
  static shouldSuppressPopoutRender = () => {
    if (CombatCarousel.#suppressPopoutRender) {
      CombatCarousel.#suppressPopoutRender = false;
      return true;
    }
    return false;
  }

  /**
   * Remove the .active class from the current active combatant (popout only)
   */
  static #removeActiveClass = () => {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const oldActive = tracker.querySelector('li.combatant.active');
    if (oldActive) {
      oldActive.classList.remove('active');
    }
  }

  /**
   * Update the .active class from old combatant to new combatant
   * @param {string} newCombatantId - The ID of the new active combatant
   */
  static #updateActiveClass = (newCombatantId) => {
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
  }

  /**
   * Update the round counter display in the header
   * @param {number} newRound - The new round number
   */
  static #updateRoundCounter = (newRound) => {
    const roundBadge = document.querySelector('#combat-popout .crlngn-round-counter');
    if (roundBadge) {
      roundBadge.textContent = newRound;
      roundBadge.style.display = newRound > 0 ? '' : 'none';
    }
  }

  /**
   * Wrapper for Combat.prototype.nextTurn - animate before update, preserve state after
   */
  static #wrapNextTurn = async function(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CombatCarousel.#isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CombatCarousel.#state;
    if (state.allCombatantIds.length === 0 || !CombatCarousel.#shouldUseInfiniteWrap()) {
      return wrapped.call(this, ...args);
    }

    const currentTurn = combat.turn ?? -1;
    let nextTurn = currentTurn + 1;

    if (combat.settings.skipDefeated) {
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
      CombatCarousel.#removeActiveClass();
      const delta = CombatCarousel.#getShortestPath(nextIndex);
      state.targetScrollX = state.scrollX + delta;
      CombatCarousel.#startAnimationLoop();
      await CombatCarousel.#waitForAnimation();
      CombatCarousel.#updateActiveClass(nextCombatant.id);
      CombatCarousel.#skipNextCenter = true;
      CombatCarousel.#suppressPopoutRender = true;
    }

    return wrapped.call(this, ...args);
  }

  /**
   * Wrapper for Combat.prototype.previousTurn - animate before update, preserve state after
   */
  static #wrapPreviousTurn = async function(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CombatCarousel.#isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CombatCarousel.#state;
    if (state.allCombatantIds.length === 0 || !CombatCarousel.#shouldUseInfiniteWrap()) {
      return wrapped.call(this, ...args);
    }

    if (combat.round === 0) {
      return wrapped.call(this, ...args);
    }

    if ((combat.turn === 0) || (combat.turns.length === 0)) {
      return wrapped.call(this, ...args);
    }

    const previousTurn = (combat.turn ?? combat.turns.length) - 1;
    const prevCombatant = combat.turns[previousTurn];
    const prevIndex = state.allCombatantIds.indexOf(prevCombatant.id);

    if (prevIndex !== -1) {
      CombatCarousel.#removeActiveClass();
      const delta = CombatCarousel.#getShortestPath(prevIndex);
      state.targetScrollX = state.scrollX + delta;
      CombatCarousel.#startAnimationLoop();
      await CombatCarousel.#waitForAnimation();
      CombatCarousel.#updateActiveClass(prevCombatant.id);
      CombatCarousel.#skipNextCenter = true;
      CombatCarousel.#suppressPopoutRender = true;
    }

    return wrapped.call(this, ...args);
  }

  /**
   * Wrapper for Combat.prototype.nextRound - animate before update, preserve state after
   */
  static #wrapNextRound = async function(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CombatCarousel.#isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CombatCarousel.#state;
    if (state.allCombatantIds.length === 0 || !CombatCarousel.#shouldUseInfiniteWrap()) {
      return wrapped.call(this, ...args);
    }

    let turn = (combat.turn === null) || (combat.turns.length === 0) ? null : 0;
    if (combat.settings.skipDefeated && (turn !== null)) {
      turn = combat.turns.findIndex(t => !t.isDefeated);
      if (turn === -1) turn = 0;
    }

    if (turn !== null && combat.turns[turn]) {
      const targetCombatant = combat.turns[turn];
      const targetIndex = state.allCombatantIds.indexOf(targetCombatant.id);

      if (targetIndex !== -1) {
        CombatCarousel.#removeActiveClass();
        const delta = CombatCarousel.#getShortestPath(targetIndex);
        state.targetScrollX = state.scrollX + delta;
        CombatCarousel.#startAnimationLoop();
        await CombatCarousel.#waitForAnimation();
        CombatCarousel.#updateActiveClass(targetCombatant.id);
        CombatCarousel.#skipNextCenter = true;
        CombatCarousel.#suppressPopoutRender = true;
      }
    }

    return wrapped.call(this, ...args);
  }

  /**
   * Wrapper for Combat.prototype.previousRound - animate before update, preserve state after
   */
  static #wrapPreviousRound = async function(wrapped, ...args) {
    const combat = this;

    if (game.system.id === 'daggerheart') {
      return wrapped.call(this, ...args);
    }

    if (!CombatCarousel.#isCarouselActive() || !combat?.started) {
      return wrapped.call(this, ...args);
    }

    const state = CombatCarousel.#state;
    if (state.allCombatantIds.length === 0 || !CombatCarousel.#shouldUseInfiniteWrap()) {
      return wrapped.call(this, ...args);
    }

    if (combat.round === 0) {
      return wrapped.call(this, ...args);
    }

    const turn = (combat.round === 1) || (combat.turn === null) || (combat.turns.length === 0)
      ? null
      : combat.turns.length - 1;

    if (turn !== null && combat.turns[turn]) {
      const targetCombatant = combat.turns[turn];
      const targetIndex = state.allCombatantIds.indexOf(targetCombatant.id);

      if (targetIndex !== -1) {
        CombatCarousel.#removeActiveClass();
        const delta = CombatCarousel.#getShortestPath(targetIndex);
        state.targetScrollX = state.scrollX + delta;
        CombatCarousel.#startAnimationLoop();
        await CombatCarousel.#waitForAnimation();
        CombatCarousel.#updateActiveClass(targetCombatant.id);
        CombatCarousel.#skipNextCenter = true;
        CombatCarousel.#suppressPopoutRender = true;
      }
    }

    return wrapped.call(this, ...args);
  }

  /**
   * Adjust the tracker width - public method for re-render size correction
   * @param {HTMLElement} tracker - The tracker element
   */
  static adjustTrackerWidth = (tracker) => {
    if (!tracker) return;

    const state = CombatCarousel.#state;
    if (state.visibleCount === 0) {
      CombatCarousel.#recalculateState(tracker);
    }

    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;
    const trackerWidth = (state.visibleCount * cardWidth) + ((state.visibleCount - 1) * gap);

    tracker.style.width = `${trackerWidth}px`;
    tracker.style.minWidth = `${trackerWidth}px`;
    CombatCarousel.#trackerWidth = trackerWidth;
  }

  /**
   * Refresh combatant list without full re-initialization
   * @param {HTMLElement} tracker - The tracker element
   */
  static #refreshCombatants = (tracker) => {
    const state = CombatCarousel.#state;
    const combatants = Array.from(tracker.querySelectorAll(':scope > li.combatant'));
    combatants.forEach(c => c.setAttribute('draggable', 'false'));
    const newIds = combatants.map(c => c.dataset.combatantId);
    const addedIds = newIds.filter(id => !CombatCarousel.#previousCombatantIds.includes(id));

    if (addedIds.length > 0) {
      const oldStep = CombatCarousel.#STEP;
      const oldIds = [...CombatCarousel.#previousCombatantIds];
      const oldTrackerWidth = CombatCarousel.#trackerWidth;
      state.allCombatantIds = newIds;

      CombatCarousel.#recalculateState(tracker);
      CombatCarousel.#calculateTrackConstants();

      if (CombatCarousel.#trackerWidth > 0) {
        tracker.style.width = `${CombatCarousel.#trackerWidth}px`;
        tracker.style.minWidth = `${CombatCarousel.#trackerWidth}px`;
      }

      tracker.classList.add('crlngn-infinite-carousel');
      CombatCarousel.#updateTransforms();
      CombatCarousel.#addResourceBars(tracker);
      CombatCarousel.#animateNewCombatants(tracker, addedIds, oldIds, oldStep, oldTrackerWidth);
    } else {
      state.allCombatantIds = newIds;

      CombatCarousel.#recalculateState(tracker);
      CombatCarousel.#calculateTrackConstants();

      if (CombatCarousel.#trackerWidth > 0) {
        tracker.style.width = `${CombatCarousel.#trackerWidth}px`;
        tracker.style.minWidth = `${CombatCarousel.#trackerWidth}px`;
      }

      tracker.classList.add('crlngn-infinite-carousel');
      CombatCarousel.#updateTransforms();
      CombatCarousel.#addResourceBars(tracker);
    }

    CombatCarousel.#previousCombatantIds = [...newIds];
  }


  /**
   * Animate newly added combatants with a two-phase effect:
   * Phase 1: existing items shift to make space (transform transition)
   * Phase 2: new item slides down into the opened space
   * @param {HTMLElement} tracker - The tracker element
   * @param {string[]} addedIds - IDs of newly added combatants
   * @param {string[]} oldIds - Previous combatant IDs before the new ones were added
   * @param {number} oldStep - The STEP value before recalculation
   */
  static #animateNewCombatants = (tracker, addedIds, oldIds, oldStep, oldTrackerWidth) => {
    const existingItems = tracker.querySelectorAll(':scope > li.combatant');
    const newTransforms = new Map();

    tracker.style.overflow = 'visible';

    addedIds.forEach(id => {
      const element = tracker.querySelector(`li.combatant[data-combatant-id="${id}"]`);
      if (!element) return;
      element.style.top = '-100%';
      element.style.opacity = '0';
      element.classList.add('crlngn-slide-down');
    });

    const state = CombatCarousel.#state;
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const oldContainerCenter = oldTrackerWidth / 2;
    const oldTrack = oldIds.length * oldStep;
    const isOldEvenCount = oldIds.length % 2 === 0;
    const oldEvenOffset = isOldEvenCount ? (oldStep / 2) : 0;

    const oldScreenXMap = new Map();
    existingItems.forEach(el => {
      const id = el.dataset.combatantId;
      if (addedIds.includes(id)) return;
      newTransforms.set(id, el.style.transform);
      const oldIndex = oldIds.indexOf(id);
      if (oldIndex !== -1) {
        const itemX = oldIndex * oldStep;
        let pos = itemX - state.scrollX;
        if (oldIds.length >= 2) {
          const halfTrack = oldTrack / 2;
          if (pos < -halfTrack - oldEvenOffset) pos += oldTrack;
          if (pos > halfTrack - oldEvenOffset) pos -= oldTrack;
        }
        const screenX = oldContainerCenter + pos - (cardWidth / 2) + oldEvenOffset;
        oldScreenXMap.set(id, screenX);
        el.style.transform = `translateX(${screenX}px)`;
      }
    });

    requestAnimationFrame(() => {
      existingItems.forEach(el => {
        const id = el.dataset.combatantId;
        if (addedIds.includes(id)) return;
        const newTransform = newTransforms.get(id);
        if (!newTransform) return;
        const newXMatch = newTransform.match(/translateX\(([^)]+)px\)/);
        const newX = newXMatch ? parseFloat(newXMatch[1]) : 0;
        const oldX = oldScreenXMap.get(id) ?? newX;

        if (newX < oldX) {
          el.style.opacity = '0';
          el.style.transform = newTransform;
          setTimeout(() => { el.style.transition = 'opacity 0.2s ease-out'; el.style.opacity = ''; }, 50);
        } else {
          el.style.transition = 'transform 0.25s ease-out';
          el.style.transform = newTransform;
        }
      });

      setTimeout(() => {
        existingItems.forEach(el => {
          if (!addedIds.includes(el.dataset.combatantId)) {
            el.style.transition = '';
            el.style.opacity = '';
          }
        });

        addedIds.forEach(id => {
          const element = tracker.querySelector(`li.combatant[data-combatant-id="${id}"]`);
          if (!element) return;
          element.offsetHeight;
          element.style.transition = 'top 0.3s ease-out, opacity 0.3s ease-out';
          element.style.opacity = '';
          element.style.top = '0';
          element.addEventListener('transitionend', (e) => {
            if (e.propertyName !== 'top') return;
            element.classList.remove('crlngn-slide-down');
            element.style.transition = '';
            tracker.style.overflow = '';
          });
        });
      }, 250);
    });
  }

  /**
   * Clean up the carousel (call when closing combat tracker)
   */
  static cleanup = () => {
    CombatCarousel.#cleanupResizeObserver();
    CombatCarousel.#stopAnimationLoop();
    const combatPopout = document.querySelector('#combat-popout');
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (tracker) {
      CombatCarousel.#removeDragListeners(tracker);
    }
    CombatCarousel.#initialized = false;
    CombatCarousel.#trackerWidth = 0;
    CombatCarousel.#currentTrackerElement = null;
    CombatCarousel.#previousCombatantIds = [];
  }

  /**
   * Flatten combatant groups for carousel display
   * Foundry groups NPCs with same initiative - we need to unpack them as flat items
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static flattenCombatantGroups = (combatPopout) => {
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    const groups = tracker.querySelectorAll('li.combatant-group, li[data-group-key]');
    if (groups.length > 0) {
      groups.forEach(group => {
        const childCombatants = group.querySelectorAll('.group-children > li.combatant');
        if (childCombatants.length === 0) return;

        const groupKey = group.dataset?.groupKey;
        childCombatants.forEach(combatant => {
          if (groupKey) {
            combatant.dataset.groupKey = groupKey;
          }
          tracker.insertBefore(combatant, group);
        });

        group.remove();
      });

      LogUtil.log("flattenCombatantGroups - flattened groups", [
        "groups flattened:", groups.length
      ]);
    }

    const nestedLists = tracker.querySelectorAll(':scope > div > ol.combat-tracker');
    if (nestedLists.length > 0) {
      nestedLists.forEach(ol => {
        const combatants = ol.querySelectorAll(':scope > li.combatant');
        combatants.forEach(combatant => {
          tracker.appendChild(combatant);
        });
      });
      tracker.querySelectorAll(':scope > div').forEach(wrapper => wrapper.remove());

      LogUtil.log("flattenCombatantGroups - flattened Daggerheart sections", [
        "nested lists:", nestedLists.length
      ]);
    }
  }

  static #noTrackedResourceWarned = false;

  /**
   * Ensure every combatant li has a .token-resource element
   * Creates the element if Foundry's template omitted it (due to lacking Observer permission)
   * @param {HTMLElement} tracker - The combat tracker element
   */
  static ensureResourceBars = (tracker) => {
    const resourcePath = game.settings.get("core", "combatTrackerConfig")?.resource;
    if (!resourcePath) {
      if (!CombatCarousel.#noTrackedResourceWarned) {
        CombatCarousel.#noTrackedResourceWarned = true;
        ui.notifications?.warn(game.i18n.localize('CRLNGN_UI.combat.noTrackedResource'));
      }
      return;
    }

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant');
    combatantElements.forEach(element => {
      if (!element.querySelector('.token-resource')) {
        const resourceEl = document.createElement('div');
        resourceEl.className = 'token-resource';
        const resourceInner = document.createElement('span');
        resourceInner.className = 'resource';
        resourceEl.appendChild(resourceInner);
        element.appendChild(resourceEl);
      }
    });
  }

  /**
   * Add combat toggle button to the window header
   * @param {HTMLElement} combatPopout - The combat tracker popout element
   * @param {HTMLElement} windowHeader - The window header element
   */
  static addCombatToggleButton = (combatPopout, windowHeader) => {
    if (!windowHeader) return;

    if (!game.user?.isGM) return;

    if (windowHeader.querySelector('.crlngn-combat-toggle-container')) return;

    const combat = game.combat;
    const isStarted = combat?.started;

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'crlngn-combat-toggle-container';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `crlngn-combat-toggle ${isStarted ? 'combat-active' : ''}`;
    toggleBtn.dataset.tooltip = isStarted
      ? game.i18n.localize('COMBAT.End')
      : game.i18n.localize('COMBAT.Begin');
    toggleBtn.innerHTML = `<i class="fas ${isStarted ? 'fa-circle-stop' : 'fa-play'}"></i>`;
    toggleContainer.appendChild(toggleBtn);

    toggleBtn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const combat = game.combat;
      if (!combat) return;

      if (combat.started) {
        await combat.endCombat();
      } else {
        await combat.startCombat();
      }

      CombatCarousel.updateCombatToggleButton(combatPopout);
    });

    windowHeader.appendChild(toggleContainer);

    CombatCarousel.#addRoundCounter(combatPopout);
  }

  /**
   * Add round counter badge to nav.combat-controls and fix tooltip directions
   * @param {HTMLElement} combatPopout - The combat tracker popout element
   */
  static #addRoundCounter = (combatPopout) => {
    if (!combatPopout) return;

    const navControls = combatPopout.querySelector('nav.combat-controls');
    if (!navControls) return;

    navControls.querySelectorAll('button').forEach(btn => {
      btn.setAttribute('data-tooltip-direction', 'UP');
    });

    if (navControls.querySelector('.crlngn-round-counter')) return;

    const combat = game.combat;
    const isStarted = combat?.started;
    const round = combat?.round || 0;

    const roundBadge = document.createElement('span');
    roundBadge.className = 'crlngn-round-counter';
    roundBadge.textContent = round;
    roundBadge.style.display = isStarted && round > 0 ? '' : 'none';

    navControls.appendChild(roundBadge);
  }

  /**
   * Update the combat toggle button state
   * @param {HTMLElement} combatPopout - The combat tracker popout element
   */
  static updateCombatToggleButton = (combatPopout) => {
    if (!combatPopout) {
      combatPopout = document.querySelector('#combat-popout');
    }
    if (!combatPopout) return;

    const toggleBtn = combatPopout.querySelector('.crlngn-combat-toggle');
    if (!toggleBtn) return;

    const combat = game.combat;
    const isStarted = combat?.started;
    const round = combat?.round || 0;

    toggleBtn.className = `crlngn-combat-toggle ${isStarted ? 'combat-active' : ''}`;
    toggleBtn.dataset.tooltip = isStarted
      ? game.i18n.localize('COMBAT.End')
      : game.i18n.localize('COMBAT.Begin');
    toggleBtn.innerHTML = `<i class="fas ${isStarted ? 'fa-circle-stop' : 'fa-play'}"></i>`;

    const roundBadge = combatPopout.querySelector('.crlngn-round-counter');
    if (roundBadge) {
      roundBadge.textContent = round;
      roundBadge.style.display = isStarted && round > 0 ? '' : 'none';
    }
  }

  /**
   * Apply the carousel scale CSS variable
   * @param {HTMLElement} combatPopout - The combat popout element
   * @param {number} scale - The scale value to apply
   */
  static applyScale = (combatPopout, scale) => {
    if (!combatPopout) return;

    let finalScale = scale ?? CombatCarousel.#scale ?? 1;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isPortraitTablet = window.matchMedia('(max-width: 1024px) and (orientation: portrait)').matches;
    if (isMobile || isPortraitTablet) {
      finalScale = Math.min(finalScale, 0.7);
    }

    combatPopout.style.setProperty('--carousel-scale', finalScale);
    CombatCarousel.#scale = finalScale;
  }

  /**
   * Get the current scale from CSS variable or fallback to stored value
   */
  static #getCurrentScale = () => {
    const combatPopout = document.querySelector('#combat-popout');
    if (combatPopout) {
      const cssScale = getComputedStyle(combatPopout).getPropertyValue('--carousel-scale');
      if (cssScale) {
        return parseFloat(cssScale) || CombatCarousel.#scale;
      }
    }
    return CombatCarousel.#scale;
  }

  /**
   * Calculate STEP and TRACK constants based on card dimensions
   */
  static #calculateTrackConstants = () => {
    const state = CombatCarousel.#state;
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;

    CombatCarousel.#STEP = cardWidth + gap;
    CombatCarousel.#TRACK = state.allCombatantIds.length * CombatCarousel.#STEP;
  }

  /**
   * Check if we should use infinite wrapping
   * Always returns true when there are at least 2 combatants
   */
  static #shouldUseInfiniteWrap = () => {
    const state = CombatCarousel.#state;
    return state.allCombatantIds.length >= 2;
  }

  /**
   * Get the wrapped position for an item at given index
   * @param {number} index - The item index
   * @returns {number} The wrapped position relative to viewport center
   */
  static #getWrappedPosition = (index) => {
    const state = CombatCarousel.#state;
    const STEP = CombatCarousel.#STEP;
    const TRACK = CombatCarousel.#TRACK;
    const HALF_TRACK = TRACK / 2;

    const isEvenCount = state.allCombatantIds.length % 2 === 0;
    const evenOffset = isEvenCount ? (STEP / 2) : 0;

    const itemX = index * STEP;
    let pos = itemX - state.scrollX;

    if (CombatCarousel.#shouldUseInfiniteWrap()) {
      if (pos < -HALF_TRACK - evenOffset) pos += TRACK;
      if (pos > HALF_TRACK - evenOffset) pos -= TRACK;
    }

    return pos;
  }

  /**
   * Update all card transforms based on current scrollX
   */
  static #updateTransforms = () => {
    const state = CombatCarousel.#state;
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;
    const STEP = CombatCarousel.#STEP;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const containerCenter = trackerWidth / 2;
    const useInfiniteWrap = CombatCarousel.#shouldUseInfiniteWrap();

    const isEvenCount = state.allCombatantIds.length % 2 === 0;
    const evenOffset = isEvenCount ? (STEP / 2) : 0;

    state.allCombatantIds.forEach((id, index) => {
      const element = Array.from(combatantElements).find(
        el => el.dataset.combatantId === id
      );
      if (!element) return;

      let screenX;
      if (useInfiniteWrap) {
        const pos = CombatCarousel.#getWrappedPosition(index);
        screenX = containerCenter + pos - (cardWidth / 2) + evenOffset;
      } else {
        screenX = index * STEP;
      }

      element.style.transform = `translateX(${screenX}px)`;
      element.style.left = '0';
      element.style.position = 'absolute';
    });

    CombatCarousel.#updateTurnIndicator(tracker, containerCenter, cardWidth, evenOffset);
  }

  /**
   * Update clone positions during animation (without recreating them)
   * Clones have a cloneIndex data attribute that determines their virtual position
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} STEP - Step size between cards
   */
  static #updateClonePositions = (tracker, containerCenter, cardWidth, STEP) => {
    const state = CombatCarousel.#state;
    const totalCount = state.allCombatantIds.length;
    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const clones = tracker.querySelectorAll('.crlngn-clone');

    clones.forEach(clone => {
      const cloneIdx = parseInt(clone.dataset.cloneIndex, 10);
      if (isNaN(cloneIdx)) return;

      const pos = CombatCarousel.#getWrappedPositionForIndex(cloneIdx, totalCount);
      const screenX = containerCenter + pos - (cardWidth / 2);

      if (screenX >= -STEP && screenX < trackerWidth + STEP) {
        clone.style.transform = `translateX(${screenX}px)`;
        clone.style.display = '';
      } else {
        clone.style.display = 'none';
      }
    });
  }

  /**
   * Get wrapped position for a virtual index (can be negative or > totalCount)
   * @param {number} virtualIndex - The virtual index (can be outside 0..totalCount-1)
   * @param {number} totalCount - Total number of real combatants
   * @returns {number} The position relative to viewport center
   */
  static #getWrappedPositionForIndex = (virtualIndex, totalCount) => {
    const state = CombatCarousel.#state;
    const STEP = CombatCarousel.#STEP;

    const itemX = virtualIndex * STEP;
    const pos = itemX - state.scrollX;

    return pos;
  }

  /**
   * Rebuild clones to fill the visible area - called only on init/resize, not during animation
   */
  static #rebuildClones = () => {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    tracker.querySelectorAll('.crlngn-clone').forEach(c => c.remove());

    if (!CombatCarousel.#shouldUseInfiniteWrap()) {
      return;
    }

    const state = CombatCarousel.#state;
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const STEP = CombatCarousel.#STEP;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const containerCenter = trackerWidth / 2;

    CombatCarousel.#updateEdgeClones(tracker, containerCenter, cardWidth, STEP);
  }

  /**
   * Update edge clones to fill gaps on both sides of the carousel
   * Creates a fixed number of clones that will be positioned during updateTransforms
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} STEP - Step size (cardWidth + gap)
   */
  static #updateEdgeClones = (tracker, containerCenter, cardWidth, STEP) => {
    const state = CombatCarousel.#state;
    const totalCount = state.allCombatantIds.length;

    if (totalCount < 2) return;

    const trackerWidth = tracker.offsetWidth || state.containerWidth;
    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');

    const clonesNeededPerSide = Math.ceil(trackerWidth / STEP) + 2;

    for (let i = 0; i < clonesNeededPerSide; i++) {
      const sourceIndex = CombatCarousel.#mod(-(i + 1), totalCount);
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
  }

  /**
   * Update the turn start indicator position
   * @param {HTMLElement} tracker - The tracker element
   * @param {number} containerCenter - Center X of the container
   * @param {number} cardWidth - Width of a card
   * @param {number} evenOffset - Offset for even combatant counts
   */
  static #updateTurnIndicator = (tracker, containerCenter, cardWidth, evenOffset = 0) => {
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const gap = 0.5 * baseFontSize * scale;

    let indicator = tracker.querySelector('.crlngn-turn-indicator');
    if (!indicator) {
      indicator = CombatCarousel.#createTurnIndicator();
      tracker.appendChild(indicator);
    }

    const indicatorPos = CombatCarousel.#getWrappedPosition(0);
    const firstCardLeftEdge = containerCenter + indicatorPos - (cardWidth / 2) + evenOffset;
    const indicatorX = firstCardLeftEdge - (gap / 2);

    indicator.style.transform = `translateX(${indicatorX}px)`;
  }

  /**
   * Create the turn start indicator element
   * @returns {HTMLElement} The indicator element
   */
  static #createTurnIndicator = () => {
    const indicator = document.createElement('div');
    indicator.className = 'crlngn-turn-indicator';

    return indicator;
  }

  /**
   * Get the resource data for a combatant based on combat tracker settings
   * The resource path is configured per-world in Combat Tracker settings
   * Handles multiple path formats used by different game systems:
   * - Direct object path (e.g., "attributes.hp" with .value and .max properties)
   * - Value path (e.g., "attributes.hp.value" - derives max from sibling .max)
   * @param {Combatant} combatant - The combatant document
   * @returns {{value: number, max: number, isReversed: boolean}|null} The resource data or null
   */
  static #getCombatantResource = (combatant) => {
    if (!combatant?.actor) return null;

    const resourcePath = game.settings.get("core", "combatTrackerConfig")?.resource;
    if (!resourcePath) return null;

    const actorSystem = combatant.actor.system;
    let value, max, isReversed = false;

    // First try: get the resource directly (might be an object or a value)
    const resource = foundry.utils.getProperty(actorSystem, resourcePath);

    if (resource && typeof resource === 'object') {
      value = resource.value;
      max = resource.max;
      if (resource.isReversed === true) isReversed = true;
    } else {
      value = resource;

      max = foundry.utils.getProperty(actorSystem, resourcePath + ".max");

      if (max === undefined && resourcePath.endsWith(".value")) {
        const maxPath = resourcePath.replace(/\.value$/, ".max");
        max = foundry.utils.getProperty(actorSystem, maxPath);
      }

      if (max === undefined) {
        const pathParts = resourcePath.split('.');
        if (pathParts.length > 1) {
          pathParts.pop();
          const parentPath = pathParts.join('.');
          const parentResource = foundry.utils.getProperty(actorSystem, parentPath);
          if (parentResource && typeof parentResource === 'object') {
            max = parentResource.max;
          }
        }
      }

      const pathParts = resourcePath.split('.');
      if (pathParts.length > 1) {
        pathParts.pop();
        const parentPath = pathParts.join('.');
        const parentResource = foundry.utils.getProperty(actorSystem, parentPath);
        if (parentResource?.isReversed === true) isReversed = true;
      }
    }

    if (typeof value !== 'number' || typeof max !== 'number') return null;

    return { value, max, isReversed };
  }

  /**
   * Update the resource bar display for a combatant
   * Sets CSS variable for bar width and color state classes
   * @param {HTMLElement} element - The combatant li element
   * @param {Combatant} combatant - The combatant document
   */
  static #updateResourceBarElement = (element, combatant) => {
    const resourceEl = element.querySelector('.token-resource');
    if (!resourceEl) return;

    const resource = CombatCarousel.#getCombatantResource(combatant);
    if (!resource) return;

    let percentage;
    if (resource.isReversed) {
      percentage = resource.max > 0 ? Math.max(0, Math.min(100, ((resource.max - resource.value) / resource.max) * 100)) : 100;
    } else {
      percentage = resource.max > 0 ? Math.max(0, Math.min(100, (resource.value / resource.max) * 100)) : 0;
    }

    resourceEl.style.setProperty('--resource-pct', `${percentage}%`);
    resourceEl.classList.remove('critical', 'wounded');
    if (percentage <= 25) {
      resourceEl.classList.add('critical');
    } else if (percentage <= 50) {
      resourceEl.classList.add('wounded');
    }
  }

  /**
   * Update resource bars for all combatants in the carousel
   * Called after render or when actor data changes
   */
  static updateResourceBars = () => {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const combat = game.combat;
    if (!combat) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');

    combatantElements.forEach(element => {
      const combatantId = element.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant) return;

      CombatCarousel.#updateResourceBarElement(element, combatant);
    });
  }

  /**
   * Add resource bars to all combatants after carousel init
   * @param {HTMLElement} tracker - The tracker element
   */
  static #addResourceBars = (tracker) => {
    const combat = game.combat;
    if (!combat) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');

    combatantElements.forEach(element => {
      const combatantId = element.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant) return;

      CombatCarousel.#updateResourceBarElement(element, combatant);
    });
  }

  /**
   * Get the index of the combatant currently closest to center
   */
  static #getCenterIndex = () => {
    const state = CombatCarousel.#state;
    const STEP = CombatCarousel.#STEP;
    const TRACK = CombatCarousel.#TRACK;

    if (TRACK === 0) return 0;

    const normalizedScroll = CombatCarousel.#mod(state.scrollX, TRACK);
    return Math.round(normalizedScroll / STEP) % state.allCombatantIds.length;
  }

  /**
   * Calculate the shortest scroll path to a target index
   * @param {number} targetIndex - The target combatant index
   * @returns {number} The scroll delta (positive = right, negative = left)
   */
  static #getShortestPath = (targetIndex) => {
    const state = CombatCarousel.#state;
    const STEP = CombatCarousel.#STEP;
    const TRACK = CombatCarousel.#TRACK;
    const totalCount = state.allCombatantIds.length;

    if (totalCount === 0) return 0;

    const targetScrollX = targetIndex * STEP;
    const currentNormalized = CombatCarousel.#mod(state.scrollX, TRACK);

    let forwardDelta = targetScrollX - currentNormalized;
    if (forwardDelta < 0) forwardDelta += TRACK;

    let backwardDelta = currentNormalized - targetScrollX;
    if (backwardDelta < 0) backwardDelta += TRACK;

    return forwardDelta <= backwardDelta ? forwardDelta : -backwardDelta;
  }

  /**
   * Center the carousel view on the active combatant
   * @param {boolean} animate - Whether to animate the transition
   */
  static #shouldEnforceCentering = () => {
    const state = CombatCarousel.#state;
    const combat = game.combat;
    if (!combat?.started) return false;
    if (state.allCombatantIds.length < 2) return false;
    if (!CombatCarousel.#shouldUseInfiniteWrap()) return false;
    return true;
  }

  static centerOnActive = (animate = true) => {
    if (CombatCarousel.#skipNextCenter) {
      CombatCarousel.#skipNextCenter = false;
      return;
    }

    if (!CombatCarousel.#shouldEnforceCentering()) {
      return;
    }

    const state = CombatCarousel.#state;
    const combat = game.combat;

    const activeId = combat.combatant?.id;
    if (!activeId) return;

    const activeIndex = state.allCombatantIds.indexOf(activeId);
    if (activeIndex === -1) return;

    const STEP = CombatCarousel.#STEP;
    const targetScrollX = activeIndex * STEP;

    if (animate) {
      const delta = CombatCarousel.#getShortestPath(activeIndex);
      state.targetScrollX = state.scrollX + delta;
      CombatCarousel.#startAnimationLoop();
    } else {
      state.scrollX = targetScrollX;
      CombatCarousel.#updateTransforms();
    }
  }

  /**
   * Wait for the current animation to complete
   * @returns {Promise<void>}
   */
  static #waitForAnimation = () => {
    return new Promise((resolve) => {
      const checkAnimation = () => {
        if (CombatCarousel.#state.targetScrollX === null) {
          resolve();
        } else {
          requestAnimationFrame(checkAnimation);
        }
      };
      requestAnimationFrame(checkAnimation);
    });
  }

  /**
   * Animation loop with momentum physics
   */
  static #tick = (currentTime) => {
    const state = CombatCarousel.#state;
    const TRACK = CombatCarousel.#TRACK;

    if (!state.isAnimating) return;

    const dt = state.lastTime ? (currentTime - state.lastTime) / 16.67 : 1;
    state.lastTime = currentTime;

    if (state.targetScrollX !== null) {
      const diff = state.targetScrollX - state.scrollX;
      if (Math.abs(diff) < 0.5) {
        state.scrollX = CombatCarousel.#mod(state.targetScrollX, TRACK);
        state.targetScrollX = null;
        state.velocity = 0;
      } else {
        state.scrollX += diff * 0.15;
      }
    } else {
      if (!state.isDragging && Math.abs(state.velocity) > CombatCarousel.#SNAP_VELOCITY_THRESHOLD) {
        state.scrollX += state.velocity * dt;
        state.velocity *= Math.pow(CombatCarousel.#FRICTION, dt);
      }

      if (TRACK > 0) {
        state.scrollX = CombatCarousel.#mod(state.scrollX, TRACK);
      }
    }

    CombatCarousel.#updateTransforms();

    const shouldContinue = state.targetScrollX !== null ||
      (Math.abs(state.velocity) > 0.1 && !state.isDragging);

    if (shouldContinue) {
      CombatCarousel.#animationFrameId = requestAnimationFrame(CombatCarousel.#tick);
    } else {
      if (!state.isDragging) {
        CombatCarousel.#snapToNearestCard();
      }
      state.isAnimating = false;
    }
  }

  /**
   * Snap to the nearest card center
   */
  static #snapToNearestCard = () => {
    const state = CombatCarousel.#state;
    const STEP = CombatCarousel.#STEP;
    const TRACK = CombatCarousel.#TRACK;

    if (TRACK === 0) return;

    const normalizedScroll = CombatCarousel.#mod(state.scrollX, TRACK);
    const nearestIndex = Math.round(normalizedScroll / STEP);
    const targetScrollX = nearestIndex * STEP;

    const diff = targetScrollX - normalizedScroll;
    if (Math.abs(diff) > 0.5) {
      state.targetScrollX = state.scrollX + diff;
      CombatCarousel.#startAnimationLoop();
    }
  }

  /**
   * Start the animation loop
   */
  static #startAnimationLoop = () => {
    const state = CombatCarousel.#state;
    if (!state.isAnimating) {
      state.isAnimating = true;
      state.lastTime = 0;
      CombatCarousel.#animationFrameId = requestAnimationFrame(CombatCarousel.#tick);
    }
  }

  /**
   * Stop the animation loop
   */
  static #stopAnimationLoop = () => {
    const state = CombatCarousel.#state;
    state.isAnimating = false;
    if (CombatCarousel.#animationFrameId) {
      cancelAnimationFrame(CombatCarousel.#animationFrameId);
      CombatCarousel.#animationFrameId = null;
    }
  }

  /**
   * Initialize drag event listeners
   * @param {HTMLElement} tracker - The tracker element
   */
  static #initDragListeners = (tracker) => {
    CombatCarousel.#boundPointerMove = CombatCarousel.#onPointerMove.bind(CombatCarousel);
    CombatCarousel.#boundPointerUp = CombatCarousel.#onPointerUp.bind(CombatCarousel);

    tracker.addEventListener('pointerdown', CombatCarousel.#onPointerDown);
    tracker.addEventListener('click', CombatCarousel.#onClickCapture, true);
    CombatCarousel.#currentTrackerElement = tracker;
  }

  /**
   * Ensure drag listeners are attached to the current tracker element
   * Re-attaches if the tracker element has been replaced (e.g., after re-render)
   * @param {HTMLElement} tracker - The tracker element
   */
  static #ensureDragListeners = (tracker) => {
    if (tracker === CombatCarousel.#currentTrackerElement) return;

    if (CombatCarousel.#currentTrackerElement) {
      CombatCarousel.#removeDragListeners(CombatCarousel.#currentTrackerElement);
    }

    tracker.addEventListener('pointerdown', CombatCarousel.#onPointerDown);
    tracker.addEventListener('click', CombatCarousel.#onClickCapture, true);
    CombatCarousel.#currentTrackerElement = tracker;

    LogUtil.log("CombatCarousel - Re-attached drag listeners to new tracker element");
  }

  /**
   * Remove drag event listeners
   * @param {HTMLElement} tracker - The tracker element
   */
  static #removeDragListeners = (tracker) => {
    tracker.removeEventListener('pointerdown', CombatCarousel.#onPointerDown);
    tracker.removeEventListener('click', CombatCarousel.#onClickCapture, true);
    document.removeEventListener('pointermove', CombatCarousel.#boundPointerMove);
    document.removeEventListener('pointerup', CombatCarousel.#boundPointerUp);
  }

  /**
   * Capture-phase click handler that prevents Foundry's activateCombatant
   * action from firing when a combatant is clicked in the carousel.
   * Our #onPointerUp handler provides the desired behavior (pan to token).
   * @param {MouseEvent} e
   */
  static #onClickCapture = (e) => {
    if (e.target.closest('li.combatant') && !e.target.closest('button')) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  /**
   * Handle pointer down for drag start
   * @param {PointerEvent} e
   */
  static #onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    if (!CombatCarousel.#shouldUseInfiniteWrap()) return;

    const state = CombatCarousel.#state;
    const tracker = e.currentTarget;

    tracker.setPointerCapture(e.pointerId);
    state.isDragging = true;
    state.lastPointerX = e.clientX;
    state.dragStartX = e.clientX;
    state.totalDragDistance = 0;
    state.lastDelta = 0;
    state.velocity = 0;
    state.targetScrollX = null;

    CombatCarousel.#stopAnimationLoop();

    document.addEventListener('pointermove', CombatCarousel.#boundPointerMove);
    document.addEventListener('pointerup', CombatCarousel.#boundPointerUp);

    tracker.style.cursor = 'grabbing';
  }

  /**
   * Handle pointer move for dragging
   * @param {PointerEvent} e
   */
  static #onPointerMove = (e) => {
    const state = CombatCarousel.#state;
    if (!state.isDragging) return;

    const dx = e.clientX - state.lastPointerX;
    state.lastDelta = dx;
    state.lastPointerX = e.clientX;
    state.totalDragDistance += Math.abs(dx);

    const TRACK = CombatCarousel.#TRACK;
    if (TRACK > 0) {
      state.scrollX = CombatCarousel.#mod(state.scrollX - dx * CombatCarousel.#DRAG_SENS, TRACK);
    }

    CombatCarousel.#updateTransforms();
  }

  /**
   * Handle pointer up for drag end
   * @param {PointerEvent} e
   */
  static #onPointerUp = (e) => {
    const state = CombatCarousel.#state;
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    const wasClick = state.totalDragDistance < CombatCarousel.#CLICK_THRESHOLD;

    state.isDragging = false;

    document.removeEventListener('pointermove', CombatCarousel.#boundPointerMove);
    document.removeEventListener('pointerup', CombatCarousel.#boundPointerUp);

    if (tracker) {
      tracker.releasePointerCapture(e.pointerId);
      tracker.style.cursor = '';
    }

    if (wasClick) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const combatantEl = target?.closest('li.combatant[data-combatant-id]');
      if (combatantEl) {
        const combatantId = combatantEl.dataset.combatantId;
        const combatant = game.combat?.combatants.get(combatantId);
        const token = combatant?.token?.object;
        if (token?.visible) {
          if (!token.controlled) token.control({releaseOthers: true});
          canvas.animatePan(token.center);
        }
      }
      return;
    }

    state.velocity = -state.lastDelta * CombatCarousel.#DRAG_SENS;

    if (Math.abs(state.velocity) > CombatCarousel.#SNAP_VELOCITY_THRESHOLD) {
      CombatCarousel.#startAnimationLoop();
    } else {
      CombatCarousel.#snapToNearestCard();
    }
  }

  /**
   * Calculate how many cards can be visible in the container
   */
  static #calculateVisibleCount = (containerWidth, totalCombatants) => {
    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;

    const allCardsWidth = (totalCombatants * cardWidth) + ((totalCombatants - 1) * gap);
    if (allCardsWidth <= containerWidth) {
      return totalCombatants;
    }

    let visibleCount = Math.floor((containerWidth + gap) / (cardWidth + gap));
    return Math.max(1, visibleCount);
  }

  /**
   * Recalculate state based on current combatants and container
   * @param {HTMLElement} tracker - The .combat-tracker element
   */
  static #recalculateState = (tracker) => {
    const state = CombatCarousel.#state;
    const combatants = Array.from(tracker.querySelectorAll(':scope > li.combatant'));

    state.allCombatantIds = combatants.map(c => c.dataset.combatantId);

    const combatPopout = tracker.closest('#combat-popout');
    const isDocked = combatPopout?.classList.contains('docked-top') || combatPopout?.classList.contains('docked-bottom');

    if (isDocked) {
      const screenWidth = window.innerWidth;
      const styles = getComputedStyle(document.documentElement);
      const sidebarWidth = parseFloat(styles.getPropertyValue('--sidebar-width')) || 300;
      const controlItemSize = parseFloat(styles.getPropertyValue('--control-item-size')) || 44;

      const takeFullWidth = SettingsUtil.get('v2-combat-tracker-full-width') ?? false;
      const isSidebarExpanded = document.body.classList.contains('crlngn-sidebar-expanded');

      if (screenWidth < 540) {
        state.containerWidth = screenWidth;
      } else if (screenWidth < 1024) {
        state.containerWidth = screenWidth - (controlItemSize * 2);
      } else {
        if (takeFullWidth) {
          if (isSidebarExpanded) {
            state.containerWidth = screenWidth - (2 * sidebarWidth) - (controlItemSize * 4);
          } else {
            state.containerWidth = screenWidth - (controlItemSize * 4);
          }
        } else {
          state.containerWidth = screenWidth - (2 * sidebarWidth) - (controlItemSize * 4);
        }
      }
    } else {
      const windowContent = tracker.closest('.window-content');
      state.containerWidth = windowContent?.clientWidth || tracker.parentElement?.clientWidth || 800;
    }

    const totalCount = state.allCombatantIds.length;
    state.visibleCount = CombatCarousel.#calculateVisibleCount(state.containerWidth, totalCount);
  }

  /**
   * Build the carousel DOM with absolute positioning
   * @param {HTMLElement} tracker - The .combat-tracker element
   */
  static #buildDOM = (tracker) => {
    const state = CombatCarousel.#state;

    const allCombatantElements = Array.from(tracker.querySelectorAll(':scope > li.combatant'));
    const allCombatants = state.allCombatantIds
      .map(id => allCombatantElements.find(el => el.dataset.combatantId === id))
      .filter(Boolean);

    allCombatants.forEach((c) => {
      c.style.display = '';
      c.style.opacity = '';
      c.style.transition = '';
      c.setAttribute('draggable', 'false');
    });

    tracker.classList.add('crlngn-infinite-carousel');

    const scale = CombatCarousel.#getCurrentScale();
    const baseFontSize = 16;
    const cardWidth = 5.5 * baseFontSize * scale;
    const gap = 0.5 * baseFontSize * scale;
    const trackerWidth = (state.visibleCount * cardWidth) + ((state.visibleCount - 1) * gap);
    tracker.style.width = `${trackerWidth}px`;
    tracker.style.minWidth = `${trackerWidth}px`;
    CombatCarousel.#trackerWidth = trackerWidth;

    LogUtil.log("CombatCarousel - setting tracker width", [
      "visibleCount:", state.visibleCount,
      "cardWidth:", cardWidth,
      "trackerWidth:", trackerWidth
    ]);

    if (CombatCarousel.#shouldEnforceCentering()) {
      const combat = game.combat;
      const activeId = combat?.combatant?.id;
      if (activeId) {
        const activeIndex = state.allCombatantIds.indexOf(activeId);
        if (activeIndex !== -1) {
          state.scrollX = activeIndex * CombatCarousel.#STEP;
        }
      }
    } else {
      state.scrollX = 0;
    }

    CombatCarousel.#updateTransforms();
    CombatCarousel.#addResourceBars(tracker);

    // Defer a second transform update to ensure turn indicator is positioned
    // correctly after browser has completed layout
    requestAnimationFrame(() => {
      CombatCarousel.#updateTransforms();
    });

    CombatCarousel.#previousCombatantIds = [...state.allCombatantIds];

    LogUtil.log("CombatCarousel.buildDOM (infinite)", [
      "visibleCount:", state.visibleCount,
      "scrollX:", state.scrollX,
      "TRACK:", CombatCarousel.#TRACK,
      "STEP:", CombatCarousel.#STEP,
      "trackerWidth:", trackerWidth
    ]);
  }

  /**
   * Initialize ResizeObserver for carousel responsiveness
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static #initResizeObserver = (combatPopout) => {
    if (CombatCarousel.#resizeObserver) {
      CombatCarousel.#resizeObserver.disconnect();
    }

    if (CombatCarousel.#boundWindowResize) {
      window.removeEventListener('resize', CombatCarousel.#boundWindowResize);
    }

    if (CombatCarousel.#sidebarHookId !== null) {
      Hooks.off('collapseSidebar', CombatCarousel.#sidebarHookId);
      CombatCarousel.#sidebarHookId = null;
    }

    const windowContent = combatPopout.querySelector('.window-content');
    if (!windowContent) return;

    const debouncedResize = GeneralUtil.debounce(() => {
      const tracker = document.querySelector('#combat-popout .combat-tracker');
      if (tracker) {
        CombatCarousel.#recalculateState(tracker);
        CombatCarousel.#calculateTrackConstants();
        CombatCarousel.adjustTrackerWidth(tracker);
        CombatCarousel.#updateTransforms();
      }
    }, 100);

    CombatCarousel.#resizeObserver = new ResizeObserver(debouncedResize);
    CombatCarousel.#resizeObserver.observe(windowContent);

    CombatCarousel.#boundWindowResize = debouncedResize;
    window.addEventListener('resize', CombatCarousel.#boundWindowResize);

    CombatCarousel.#sidebarHookId = Hooks.on('collapseSidebar', debouncedResize);
  }

  /**
   * Clean up the carousel ResizeObserver and window resize listener
   */
  static #cleanupResizeObserver = () => {
    if (CombatCarousel.#resizeObserver) {
      CombatCarousel.#resizeObserver.disconnect();
      CombatCarousel.#resizeObserver = null;
    }

    if (CombatCarousel.#boundWindowResize) {
      window.removeEventListener('resize', CombatCarousel.#boundWindowResize);
      CombatCarousel.#boundWindowResize = null;
    }

    if (CombatCarousel.#sidebarHookId !== null) {
      Hooks.off('collapseSidebar', CombatCarousel.#sidebarHookId);
      CombatCarousel.#sidebarHookId = null;
    }
  }
}
