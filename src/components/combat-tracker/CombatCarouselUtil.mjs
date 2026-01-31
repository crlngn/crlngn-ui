import { GeneralUtil } from "../GeneralUtil.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
import { getSettings } from "../../constants/Settings.mjs";
import { MODULE_ID } from "../../constants/General.mjs";
import { CarouselTransforms } from "./CarouselTransforms.mjs";
import { CarouselInteraction } from "./CarouselInteraction.mjs";
import { CarouselCombatWrappers } from "./CarouselCombatWrappers.mjs";

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

  static #STEP = 0;
  static #TRACK = 0;
  static #resizeObserver = null;
  static #scale = 1;
  static #initialized = false;
  static #trackerWidth = 0;
  static #skipNextCenter = false;
  static #boundWindowResize = null;
  static #sidebarHookId = null;
  static #previousCombatantIds = [];
  static #imageCache = new Map();
  static #noTrackedResourceWarned = false;

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
   * Get config object for sub-modules
   */
  static #getConfig = () => ({
    STEP: CombatCarousel.#STEP,
    TRACK: CombatCarousel.#TRACK,
    getCurrentScale: CombatCarousel.#getCurrentScale,
    updateTransforms: () => CarouselTransforms.updateTransforms(CombatCarousel.#state, CombatCarousel.#getConfig()),
    skipNextCenter: CombatCarousel.#skipNextCenter,
    setSkipNextCenter: (val) => { CombatCarousel.#skipNextCenter = val; }
  });

  /**
   * Initialize the infinite carousel system
   * @param {HTMLElement} combatPopout - The combat popout element
   */
  static init = (combatPopout) => {
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (!tracker) return;

    CombatCarousel.#disableSortable(combatPopout);
    CombatCarousel.#restoreImages(tracker);

    if (CombatCarousel.#initialized) {
      CombatCarousel.#refreshCombatants(tracker);
      CarouselInteraction.ensureDragListeners(tracker, CombatCarousel.#state, CombatCarousel.#getConfig());
      CombatCarousel.centerOnActive(true);
      return;
    }

    CombatCarousel.#recalculateState(tracker);
    CombatCarousel.#calculateTrackConstants();
    CombatCarousel.#buildDOM(tracker);
    CarouselInteraction.initDragListeners(tracker, CombatCarousel.#state, CombatCarousel.#getConfig());
    CombatCarousel.#initResizeObserver(combatPopout);
    CombatCarousel.#initialized = true;

    CombatCarousel.centerOnActive(false);
  }

  /**
   * Cache current combatant images before re-render to prevent blinking.
   */
  static cacheImages = () => {
    const tracker = document.querySelector('#combat-popout .combat-tracker');
    if (!tracker) return;

    const combatants = tracker.querySelectorAll(':scope > li.combatant');
    combatants.forEach(combatant => {
      const id = combatant.dataset.combatantId;
      const img = combatant.querySelector('.token-image');
      if (id && img && img.complete) {
        CombatCarousel.#imageCache.set(id, img.cloneNode(true));
      }
    });
  }

  /**
   * Restore cached images to prevent loading blink after re-render.
   */
  static #restoreImages = (tracker) => {
    if (CombatCarousel.#imageCache.size === 0) return;

    const combatants = tracker.querySelectorAll(':scope > li.combatant');
    combatants.forEach(combatant => {
      const id = combatant.dataset.combatantId;
      const cachedImg = CombatCarousel.#imageCache.get(id);
      if (cachedImg) {
        const newImg = combatant.querySelector('.token-image');
        if (newImg && cachedImg.src === newImg.src) {
          newImg.replaceWith(cachedImg.cloneNode(true));
        }
      }
    });
  }

  /**
   * Disable external Sortable.js drag behavior on the combat popout.
   */
  static #disableSortable = (combatPopout) => {
    const tracker = combatPopout.querySelector('.combat-tracker');
    if (tracker) {
      for (const key of Object.keys(tracker)) {
        if (key.startsWith('Sortable')) {
          try {
            tracker[key]?.destroy?.();
          } catch (e) {
            // Sortable may fail if element references are stale
          }
          delete tracker[key];
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
   */
  static registerCombatWrappers = () => {
    CarouselCombatWrappers.init({
      getState: () => CombatCarousel.#state,
      getConfig: CombatCarousel.#getConfig,
      isInitialized: () => CombatCarousel.#initialized,
      setSkipNextCenter: (val) => { CombatCarousel.#skipNextCenter = val; }
    });
    CarouselCombatWrappers.registerCombatWrappers();
  }

  /**
   * Check if popout render should be suppressed
   */
  static shouldSuppressPopoutRender = () => {
    return CarouselCombatWrappers.shouldSuppressPopoutRender();
  }

  /**
   * Adjust the tracker width - public method for re-render size correction
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
      CarouselTransforms.updateTransforms(state, CombatCarousel.#getConfig());
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
      CarouselTransforms.updateTransforms(state, CombatCarousel.#getConfig());
      CombatCarousel.#addResourceBars(tracker);
    }

    CombatCarousel.#previousCombatantIds = [...newIds];
  }

  /**
   * Animate newly added combatants with a two-phase effect
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
   * Clean up the carousel
   */
  static cleanup = () => {
    CombatCarousel.#cleanupResizeObserver();
    CarouselInteraction.stopAnimationLoop(CombatCarousel.#state);
    const combatPopout = document.querySelector('#combat-popout');
    const tracker = combatPopout?.querySelector('.combat-tracker');
    if (tracker) {
      CarouselInteraction.removeDragListeners(tracker);
    }
    CombatCarousel.#initialized = false;
    CombatCarousel.#trackerWidth = 0;
    CombatCarousel.#previousCombatantIds = [];
    CombatCarousel.#imageCache.clear();
  }

  /**
   * Reset initialization state to force full re-initialization on next render
   */
  static resetInitialization = () => {
    CombatCarousel.#initialized = false;
    CombatCarousel.#trackerWidth = 0;
    CombatCarousel.#previousCombatantIds = [];
  }

  /**
   * Flatten combatant groups for carousel display
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

  /**
   * Ensure every combatant li has a .token-resource element
   */
  static ensureResourceBars = (tracker) => {
    const SETTINGS = getSettings();
    const resourcePath = SettingsUtil.get(SETTINGS.carouselTrackedResource.tag);
    if (!resourcePath) {
      if (!CombatCarousel.#noTrackedResourceWarned) {
        CombatCarousel.#noTrackedResourceWarned = true;
        CombatCarousel.#promptConfigureResource();
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
   * Show a dialog to configure the tracked resource with a select dropdown
   */
  static #promptConfigureResource = async () => {
    const SETTINGS = getSettings();
    if (!game.user?.isGM) return;

    const carouselWelcomeShown = SettingsUtil.get(SETTINGS.carouselWelcomeShown.tag);
    if (!carouselWelcomeShown) return;

    const TokenDocument = foundry.utils.getDocumentClass("Token");
    const attributes = TokenDocument.getTrackedAttributes();
    attributes.bar.forEach(a => a.push("value"));
    const choices = TokenDocument.getTrackedAttributeChoices(attributes);

    const hpKeywords = ['hp', 'hitpoints', 'health', 'hit_points', 'vida', 'punti_ferita'];
    let defaultValue = '';
    for (const choice of choices) {
      const lowerValue = choice.value.toLowerCase();
      if (hpKeywords.some(kw => lowerValue.includes(kw))) {
        defaultValue = choice.value;
        break;
      }
    }

    let optionsHtml = '<option value="">— None —</option>';
    let currentGroup = '';
    for (const choice of choices) {
      if (choice.group !== currentGroup) {
        if (currentGroup) optionsHtml += '</optgroup>';
        optionsHtml += `<optgroup label="${choice.group}">`;
        currentGroup = choice.group;
      }
      const selected = choice.value === defaultValue ? ' selected' : '';
      optionsHtml += `<option value="${choice.value}"${selected}>${choice.label}</option>`;
    }
    if (currentGroup) optionsHtml += '</optgroup>';

    const content = `
      <p>${game.i18n.localize('CRLNGN_UI.combat.configureResourceMessage')}</p>
      <div class="form-group">
        <label>${game.i18n.localize('CRLNGN_UI.combat.trackedResource')}</label>
        <select name="resource" style="width: 100%;">${optionsHtml}</select>
      </div>
    `;

    const result = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.localize('CRLNGN_UI.combat.configureResourceTitle'),
        icon: 'fas fa-heart'
      },
      position: {
        width: 400
      },
      content,
      buttons: [
        {
          action: 'save',
          label: game.i18n.localize('Save'),
          icon: 'fas fa-save',
          default: true,
          callback: (event, button, dialog) => {
            return button.form.elements.resource.value;
          }
        },
        {
          action: 'cancel',
          label: game.i18n.localize('Cancel'),
          icon: 'fas fa-times'
        }
      ],
      rejectClose: false
    });

    if (result && result !== 'cancel' && result !== '') {
      await SettingsUtil.set(SETTINGS.carouselTrackedResource.tag, result);
      ui.combat?.render();
    } else {
      await SettingsUtil.set(SETTINGS.carouselShowAllHP.tag, 'disabled');
    }
  }

  /**
   * Add combat toggle button to the window header
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
   * Add round counter badge to nav.combat-controls
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
    const result = CarouselTransforms.calculateTrackConstants(CombatCarousel.#state, {
      getCurrentScale: CombatCarousel.#getCurrentScale
    });
    CombatCarousel.#STEP = result.STEP;
    CombatCarousel.#TRACK = result.TRACK;
  }

  /**
   * Scroll to show the active combatant
   */
  static centerOnActive = (animate = true) => {
    CarouselInteraction.centerOnActive(animate, CombatCarousel.#state, CombatCarousel.#getConfig());
  }

  /**
   * Update resource bars for all combatants in the carousel
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
   * Get the resource data for a combatant based on combat tracker settings
   */
  static #getCombatantResource = (combatant) => {
    const SETTINGS = getSettings();
    if (!combatant?.actor) return null;

    const resourcePath = SettingsUtil.get(SETTINGS.carouselTrackedResource.tag);
    if (!resourcePath) return null;

    const actorSystem = combatant.actor.system;
    let value, max, isReversed = false;

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
   * Check if the current user can see a combatant's resource bar
   */
  static #canSeeResourceBar = (combatant) => {
    const SETTINGS = getSettings();
    const showAllHP = SettingsUtil.get(SETTINGS.carouselShowAllHP.tag);
    if (showAllHP === 'disabled') return false;
    if (showAllHP === 'all') return true;
    if (game.user?.isGM) return true;
    return combatant?.actor?.testUserPermission(game.user, 'OBSERVER') ?? false;
  }

  /**
   * Update the resource bar display for a combatant
   */
  static #updateResourceBarElement = (element, combatant, skipTransition = false) => {
    const resourceEl = element.querySelector('.token-resource');
    if (!resourceEl) return;

    if (!CombatCarousel.#canSeeResourceBar(combatant)) {
      resourceEl.style.display = 'none';
      return;
    }
    resourceEl.style.display = '';

    const resource = CombatCarousel.#getCombatantResource(combatant);
    if (!resource) return;

    let percentage;
    if (resource.isReversed) {
      percentage = resource.max > 0 ? Math.max(0, Math.min(100, ((resource.max - resource.value) / resource.max) * 100)) : 100;
    } else {
      percentage = resource.max > 0 ? Math.max(0, Math.min(100, (resource.value / resource.max) * 100)) : 0;
    }

    if (skipTransition) {
      resourceEl.classList.add('no-transition');
    }

    resourceEl.style.setProperty('--resource-pct', `${percentage}%`);
    resourceEl.classList.remove('critical', 'wounded');
    if (percentage <= 25) {
      resourceEl.classList.add('critical');
    } else if (percentage <= 50) {
      resourceEl.classList.add('wounded');
    }

    if (skipTransition) {
      resourceEl.offsetHeight;
      resourceEl.classList.remove('no-transition');
    }
  }

  /**
   * Add resource bars to all combatants after carousel init
   */
  static #addResourceBars = (tracker) => {
    const combat = game.combat;
    if (!combat) return;

    const combatantElements = tracker.querySelectorAll(':scope > li.combatant:not(.crlngn-clone)');

    combatantElements.forEach(element => {
      const combatantId = element.dataset.combatantId;
      const combatant = combat.combatants.get(combatantId);
      if (!combatant) return;

      CombatCarousel.#updateResourceBarElement(element, combatant, true);
    });
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

      const SETTINGS = getSettings();
      const takeFullWidth = SettingsUtil.get(SETTINGS.combatTrackerTakeFullWidth.tag) ?? false;
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

    if (CarouselInteraction.shouldEnforceCentering(state)) {
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

    CarouselTransforms.updateTransforms(state, CombatCarousel.#getConfig());
    CombatCarousel.#addResourceBars(tracker);

    requestAnimationFrame(() => {
      CarouselTransforms.updateTransforms(state, CombatCarousel.#getConfig());
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

        if (!CarouselTransforms.shouldUseInfiniteWrap(CombatCarousel.#state)) {
          const maxScrollX = CarouselTransforms.getMaxScrollX(CombatCarousel.#state, CombatCarousel.#STEP);
          if (CombatCarousel.#state.scrollX > maxScrollX) {
            CombatCarousel.#state.scrollX = maxScrollX;
          }
        }

        CarouselTransforms.updateTransforms(CombatCarousel.#state, CombatCarousel.#getConfig());
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
