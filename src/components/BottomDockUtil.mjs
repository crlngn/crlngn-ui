import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";

/**
 * DockedWindow - Instance representing a single docked window
 * Each window manages its own state, drag handlers, and lifecycle
 */
class DockedWindow {
  static SNAP_DISTANCE = 50;
  static DRAG_HANDLE_SELECTOR = '.window-header';

  constructor(app, element, windowId, options = {}) {
    this.app = app;
    this.element = element;
    this.windowId = windowId;

    this.options = {
      dragTriggerSelector: options.dragTriggerSelector || null,
      captureDrag: options.captureDrag || false,
      dockedHeight: options.dockedHeight || '100px'
    };

    this.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      wasDockedOnStart: false,
      hasMoved: false, // Track if mouse has actually moved
      needsCentering: false // Track if element needs to be centered on cursor
    };

    this.boundHandlers = {
      dragStart: null,
      dragMove: null,
      dragEnd: null
    };

    this.initialize();
  }

  /**
   * Initialize docking behavior for this window instance
   */
  initialize() {
    // Frameless windows delegate from the root element, so the handle survives content re-renders
    let dragHandle = this.element;
    if (!this.options.dragTriggerSelector) {
      dragHandle = this.element.querySelector(DockedWindow.DRAG_HANDLE_SELECTOR);
      if (!dragHandle) {
        LogUtil.log(`BottomDockUtil | No window header found for ${this.windowId}, using element as drag handle`);
        dragHandle = this.element;
      }
    }

    // Load saved state and apply if docked
    const savedState = BottomDockUtil.loadState(this.windowId);
    if (savedState?.docked && !this.isDockedInPlace()) {
      LogUtil.log(`BottomDockUtil | Restoring docked state for ${this.windowId}`);
      // Wait for next paint to ensure DOM layout is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.dockToBottom(true));
      });
    }

    // Create bound handler we can remove later
    this.boundHandlers.dragStart = this.handleDragStart.bind(this);
    dragHandle.addEventListener('mousedown', this.boundHandlers.dragStart, this.options.captureDrag);

    // Store drag handle reference for cleanup
    this.dragHandle = dragHandle;

    LogUtil.log(`BottomDockUtil | Docking initialized for ${this.windowId}`, [savedState]);
  }

  /**
   * Check whether the element is currently docked AND still parented to #ui-bottom
   * The window's application may re-parent it on a forced render, which leaves the class behind
   * @returns {boolean} True if the element is docked and in place
   */
  isDockedInPlace() {
    return this.element.classList.contains('docked')
      && this.element.parentElement === document.querySelector('#ui-bottom');
  }

  /**
   * Check if drag should be skipped for interactive elements
   * @param {HTMLElement} target - The element that was clicked
   * @returns {boolean} True if drag should be skipped
   */
  shouldSkipDrag(target) {
    const interactiveTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];

    if (interactiveTags.includes(target.tagName)) {
      return true;
    }

    // Check for common interactive classes
    const interactiveClasses = [
      'resize-handle',
      'window-resize-handle',
      'range-slider',
      'slider',
      'webrtc-volume-slider',
      'volume-slider',
      'color-picker',
      'file-picker',
      'prosemirror-editor'
    ];

    for (const className of interactiveClasses) {
      if (target.classList.contains(className) ||
          target.closest(`.${className}`)) {
        return true;
      }
    }

    // Check if target is contenteditable
    if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
      return true;
    }

    // Frameless windows use anchors with data-action instead of buttons
    if (target.closest('[data-action]')) {
      return true;
    }

    return false;
  }

  /**
   * Handle drag start event
   */
  handleDragStart(event) {
    LogUtil.log("handleDragStart",[event.button, this.shouldSkipDrag(event.target), event.target]);
    if (event.button !== 0) return; // Only left mouse button

    // Delegated handles only start a drag from within their own trigger area
    if (this.options.dragTriggerSelector && !event.target.closest(this.options.dragTriggerSelector)) {
      return;
    }

    // Skip drag if clicking on interactive elements
    if (this.shouldSkipDrag(event.target)) {
      return;
    }

    // Check if camera dock position is locked
    if (this.windowId === 'camera-dock' && CameraDockUtil.isPositionLocked) {
      return;
    }

    this.dragState.isDragging = true;
    this.dragState.startX = event.clientX;
    this.dragState.startY = event.clientY;

    const rect = this.element.getBoundingClientRect();
    this.dragState.startLeft = rect.left;
    this.dragState.startTop = rect.top;
    this.dragState.wasDockedOnStart = this.element.classList.contains('docked');

    LogUtil.log("BottomDockUtil | Drag start", [this.dragState, this.windowId]);

    // If starting docked, undock immediately but don't reposition yet
    // We'll center on the first mouse move to avoid jumps on resize
    if (this.dragState.wasDockedOnStart) {
      this.undockFromBottom();
      this.dragState.needsCentering = true;

      // Force layout recalculation to get accurate dimensions after undocking
      this.element.offsetHeight; // Force reflow
    }

    // Create bound handlers we can remove later
    this.boundHandlers.dragMove = this.handleDragMove.bind(this);
    this.boundHandlers.dragEnd = this.handleDragEnd.bind(this);

    document.addEventListener('mousemove', this.boundHandlers.dragMove);
    document.addEventListener('mouseup', this.boundHandlers.dragEnd);

    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle drag move event
   */
  handleDragMove(event) {
    if (!this.dragState.isDragging) return;

    // On first move, if element needs centering (was docked), center it on cursor
    if (this.dragState.needsCentering && !this.dragState.hasMoved) {
      const rect = this.element.getBoundingClientRect();
      const centerLeft = event.clientX - (rect.width / 2);
      const centerTop = event.clientY - (rect.height / 2);

      // Update start positions to the centered position
      this.dragState.startLeft = centerLeft;
      this.dragState.startTop = centerTop;
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;
      this.dragState.needsCentering = false;
      this.dragState.hasMoved = true;

      this.element.style.left = `${centerLeft}px`;
      this.element.style.top = `${centerTop}px`;
      return; // Don't apply delta on first move
    }

    this.dragState.hasMoved = true;

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const newLeft = this.dragState.startLeft + deltaX;
    const newTop = this.dragState.startTop + deltaY;

    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;

    const snapDistance = this.calculateSnapDistance();

    // Visual feedback when near snap zone
    if (snapDistance <= DockedWindow.SNAP_DISTANCE) {
      this.element.classList.add('near-snap');
    } else {
      this.element.classList.remove('near-snap');
    }
  }

  /**
   * Handle drag end event
   */
  handleDragEnd(event) {
    if (!this.dragState.isDragging) return;

    LogUtil.log("BottomDockUtil | Drag end", [this.windowId]);

    document.removeEventListener('mousemove', this.boundHandlers.dragMove);
    document.removeEventListener('mouseup', this.boundHandlers.dragEnd);

    const snapDistance = this.calculateSnapDistance();
    this.element.classList.remove('near-snap');

    // Snap to dock if within threshold
    if (snapDistance <= DockedWindow.SNAP_DISTANCE) {
      LogUtil.log("BottomDockUtil | Snapping to dock", [this.windowId]);
      this.dockToBottom();
    } else {
      // Save undocked position
      const rect = this.element.getBoundingClientRect();
      this.saveState(false, { x: rect.left, y: rect.top });
      LogUtil.log("BottomDockUtil | Saving undocked position", [this.windowId, rect.left, rect.top]);

      // For camera dock, also save to CameraDockUtil settings
      if (this.windowId === 'camera-dock') {
        CameraDockUtil.saveCameraPosition(rect.left, rect.top);
      } else if (this.options.dragTriggerSelector) {
        this.app?.setPosition?.({ left: rect.left, top: rect.top });
      }
    }

    this.dragState.isDragging = false;
  }

  /**
   * Calculate distance from element's bottom center to nearest point on hotbar
   * @returns {number} Distance in pixels
   */
  calculateSnapDistance() {
    const hotbar = document.querySelector('#hotbar');
    if (!hotbar) return 9999;

    const elementRect = this.element.getBoundingClientRect();
    const hotbarRect = hotbar.getBoundingClientRect();

    // Calculate bottom center point of the element
    const elementCenterX = elementRect.left + (elementRect.width / 2);
    const elementBottomY = elementRect.bottom;

    // Find closest point on hotbar to the element's bottom center
    // Hotbar is a rectangle, so we need to clamp the center X to hotbar bounds
    const closestX = Math.max(hotbarRect.left, Math.min(elementCenterX, hotbarRect.right));
    const closestY = hotbarRect.top; // Hotbar's top edge is the closest Y point

    // Calculate distance from element's bottom center to closest point on hotbar
    const deltaX = elementCenterX - closestX;
    const deltaY = elementBottomY - closestY;

    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  /**
   * Dock the window to the bottom above hotbar
   * @param {boolean} skipAnimation - Skip transition animation
   */
  dockToBottom(skipAnimation = false) {
    const uiBottom = document.querySelector('#ui-bottom');
    if (!uiBottom) {
      console.warn("BottomDockUtil | #ui-bottom not found");
      return;
    }

    LogUtil.log("BottomDockUtil | Docking to bottom", [this.windowId, skipAnimation]);

    // Add snapping animation unless skipping
    if (!skipAnimation) {
      this.element.classList.add('snapping');
      setTimeout(() => this.element.classList.remove('snapping'), 300);
    }

    // Add docked class for styling
    this.element.classList.add('docked');

    // Override ApplicationV2 positioning with inline styles
    this.element.style.position = 'relative';
    this.element.style.zIndex = '1000';
    this.element.style.width = 'auto';
    this.element.style.height = this.options.dockedHeight;
    this.element.style.left = 'auto';
    this.element.style.top = 'auto';
    this.element.style.bottom = '10px';
    this.element.style.pointerEvents = 'all';

    // Disable resize when docked
    if (this.app?.options?.window) {
      this.app.options.window.resizable = false;
    }

    // Move to #ui-bottom container
    uiBottom.prepend(this.element);

    this.saveState(true);

    // Trigger layout update for all docked windows
    BottomDockUtil.layoutDockedWindows();

    LogUtil.log("BottomDockUtil | Docked successfully", [this.windowId]);
  }

  /**
   * Undock the window from bottom
   */
  undockFromBottom() {
    LogUtil.log("BottomDockUtil | Undocking from bottom", [this.windowId]);

    // Get current position BEFORE removing docked class and clearing styles
    const rect = this.element.getBoundingClientRect();
    const currentLeft = rect.left;
    const currentTop = rect.top;

    this.element.classList.remove('docked');

    // Set absolute position based on current visual position to avoid jump
    this.element.style.left = `${currentLeft}px`;
    this.element.style.top = `${currentTop}px`;

    // Clear only docking-specific styles, preserve ApplicationV2's position/size management
    // DO NOT clear left, top, width, height - ApplicationV2 needs these for resize
    this.element.style.position = ''; // Let ApplicationV2 set position
    this.element.style.zIndex = '';
    this.element.style.minWidth = '';
    this.element.style.minHeight = '';
    this.element.style.maxWidth = '';
    this.element.style.maxHeight = '';
    this.element.style.bottom = '';
    this.element.style.right = '';
    this.element.style.pointerEvents = '';
    this.element.style.overflowX = '';
    this.element.style.overflowY = '';

    // Re-enable resize
    if (this.app?.options?.window) {
      this.app.options.window.resizable = true;
    }

    // Move back to body as direct child (ApplicationV2 default)
    document.body.appendChild(this.element);

    this.saveState(false);

    // Clean up drag event handlers to prevent conflicts
    // Remove mousemove and mouseup listeners that may be active
    if (this.boundHandlers.dragMove) {
      document.removeEventListener('mousemove', this.boundHandlers.dragMove);
    }
    if (this.boundHandlers.dragEnd) {
      document.removeEventListener('mouseup', this.boundHandlers.dragEnd);
    }

    // Call restoration callback if registered for this window type
    // This allows custom behavior when undocking (e.g., camera dock restoration)
    const restorationCallback = BottomDockUtil.restorationCallbacks.get(this.windowId);
    if (restorationCallback) {
      setTimeout(() => {
        restorationCallback(this.element);
      }, 0);
    }

    // Keep the instance and mousedown listener active
    // This allows the window to be re-docked by dragging near the bottom again

    // Trigger layout update for remaining docked windows
    BottomDockUtil.layoutDockedWindows();

    LogUtil.log("BottomDockUtil | Undocked successfully", [this.windowId]);
  }

  /**
   * Strip every style this instance applied while docked, without saving state or re-parenting
   * Used when handing control of the window back to its owning application
   */
  clearDockStyles() {
    this.element.classList.remove('docked', 'snapping', 'near-snap');

    const dockedProps = ['position', 'zIndex', 'width', 'height', 'left', 'top', 'right', 'bottom', 'pointerEvents'];
    dockedProps.forEach(prop => { this.element.style[prop] = ''; });

    if (this.app?.options?.window) {
      this.app.options.window.resizable = true;
    }

    LogUtil.log(`BottomDockUtil | Cleared dock styles for ${this.windowId}`);
  }

  /**
   * Save docking state to user flag
   * @param {boolean} docked - Is window docked
   * @param {object} position - Custom position {x, y}
   */
  saveState(docked, position = null) {
    const state = {
      docked,
      position: position || { x: null, y: null }
    };

    const flagName = `${this.windowId}DockState`;
    game.user.setFlag(MODULE_ID, flagName, state);
    LogUtil.log(`BottomDockUtil | State saved for ${this.windowId}`, [state]);
  }

  /**
   * Destroy this docked window instance and cleanup
   */
  destroy() {
    if (this.dragHandle && this.boundHandlers.dragStart) {
      this.dragHandle.removeEventListener('mousedown', this.boundHandlers.dragStart, this.options.captureDrag);
    }

    if (this.boundHandlers.dragMove) {
      document.removeEventListener('mousemove', this.boundHandlers.dragMove);
    }

    if (this.boundHandlers.dragEnd) {
      document.removeEventListener('mouseup', this.boundHandlers.dragEnd);
    }

    LogUtil.log(`BottomDockUtil | Destroyed instance for ${this.windowId}`);
  }
}

/**
 * BottomDockUtil - Manager for multiple docked windows
 * Provides flexible docking functionality for application windows
 * Allows windows to snap and dock to the bottom of the screen above the hotbar
 * WITHOUT modifying any system files - all via hooks and DOM manipulation
 */
export class BottomDockUtil {
  // Map of window ID -> DockedWindow instance
  static instances = new Map();

  // Map of window ID -> restoration callback function
  static restorationCallbacks = new Map();

  // Window ID used for Daggerheart's fear tracker (#resources)
  static DH_WINDOW_ID = 'dh-resources';

  // Daggerheart fear tracker position that leaves placement up to us (DH 2.x+)
  static DH_FEAR_POSITION_FREE = 'free';

  // Docking options for Daggerheart's frameless fear tracker (DH 2.x+)
  static DH_DOCK_OPTIONS = {
    dragTriggerSelector: '.fear-header',
    captureDrag: true,
    dockedHeight: 'auto'
  };

  // Width of the fear position prompt, in pixels
  static DH_DIALOG_WIDTH = 500;

  // Guards the position prompt so it can't stack up across re-renders
  static _fearPositionPrompt = null;

  /**
   * Initialize the BottomDockUtil
   * Sets up hooks for various application windows that can be docked
   * @static
   */
  static init() {
    LogUtil.log("BottomDockUtil | Initializing");
    // Note: Actual setup happens in setup() called from Main's READY hook
  }

  /**
   * Register a restoration callback for a specific window type
   * @static
   * @param {string} windowId - Unique identifier for the window
   * @param {Function} callback - Function to call when window is undocked
   */
  static registerRestorationCallback(windowId, callback) {
    this.restorationCallbacks.set(windowId, callback);
    LogUtil.log(`BottomDockUtil | Registered restoration callback for ${windowId}`);
  }

  /**
   * Setup docking functionality - called from Main's READY hook
   * @static
   */
  static setup() {
    if (game.system.id === 'daggerheart') {
      LogUtil.log("BottomDockUtil | Daggerheart detected - setting up resources docking");

      const SETTINGS = getSettings();
      const enabled = SettingsUtil.get(SETTINGS.dockDHResources?.tag);
      BottomDockUtil.applyDockingClass(enabled);

      Hooks.on(HOOKS_CORE.CLIENT_SETTING_CHANGED, BottomDockUtil._onClientSettingChanged.bind(this));
      Hooks.on('renderFearTracker', this._onRenderFearTracker.bind(this));

      if (enabled) BottomDockUtil.ensureFreeFearPosition();
    }

    // Future: Add more window types here
    // if (game.system.id === 'othersystem') { ... }
  }

  /**
   * Whether the installed Daggerheart version exposes its own fear tracker position setting
   * DH 2.x replaced the framed #resources window with a frameless element it re-parents itself
   * @static
   * @returns {boolean} True when running Daggerheart 2.x or later
   */
  static get dhSupportsFearPosition() {
    return !!CONFIG.DH?.GENERAL?.fearPosition;
  }

  /**
   * Key of Daggerheart's client-scoped appearance setting
   * @static
   * @returns {string} The setting key
   */
  static get dhAppearanceKey() {
    return CONFIG.DH?.SETTINGS?.gameSettings?.appearance ?? 'Appearance';
  }

  /**
   * Read Daggerheart's configured fear tracker position
   * @static
   * @returns {string|null} The position value, or null on older Daggerheart versions
   */
  static getFearPosition() {
    if (!BottomDockUtil.dhSupportsFearPosition) return null;

    try {
      return game.settings.get(game.system.id, BottomDockUtil.dhAppearanceKey)?.fearPosition ?? null;
    } catch (err) {
      LogUtil.warn("BottomDockUtil | Could not read Daggerheart appearance settings", [err]);
      return null;
    }
  }

  /**
   * Switch Daggerheart's fear tracker position to "free" so docking can control placement
   * Merges into the existing appearance data so no other appearance preference is lost
   * @static
   * @returns {Promise<boolean>} True when the setting was updated
   */
  static async setFearPositionFree() {
    try {
      const appearance = game.settings.get(game.system.id, BottomDockUtil.dhAppearanceKey);
      const data = appearance?.toObject ? appearance.toObject() : foundry.utils.deepClone(appearance ?? {});
      data.fearPosition = BottomDockUtil.DH_FEAR_POSITION_FREE;

      await game.settings.set(game.system.id, BottomDockUtil.dhAppearanceKey, data);
      LogUtil.log("BottomDockUtil | Daggerheart fear position set to free");
      return true;
    } catch (err) {
      LogUtil.warn("BottomDockUtil | Could not update Daggerheart fear position", [err]);
      return false;
    }
  }

  /**
   * Make sure Daggerheart's fear tracker is in "free" position before docking takes over
   * Warns the user first, and turns docking back off if they would rather keep the system position
   * @static
   * @returns {Promise<boolean>} True when docking may proceed
   */
  static async ensureFreeFearPosition() {
    if (!BottomDockUtil.dhSupportsFearPosition) return true;
    if (BottomDockUtil.getFearPosition() === BottomDockUtil.DH_FEAR_POSITION_FREE) return true;
    if (BottomDockUtil._fearPositionPrompt) return BottomDockUtil._fearPositionPrompt;

    BottomDockUtil._fearPositionPrompt = BottomDockUtil._promptForFreeFearPosition()
      .finally(() => { BottomDockUtil._fearPositionPrompt = null; });

    return BottomDockUtil._fearPositionPrompt;
  }

  /**
   * Ask the user whether Carolingian UI may take over the fear tracker placement
   * @private
   * @static
   * @returns {Promise<boolean>} True when the user accepted and the position was changed
   */
  static async _promptForFreeFearPosition() {
    const i18nPath = 'CRLNGN_UI.ui.dhFearDock';
    const SETTINGS = getSettings();

    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${i18nPath}.title`) },
      position: { width: BottomDockUtil.DH_DIALOG_WIDTH },
      content: `<p>${game.i18n.localize(`${i18nPath}.message`)}</p>`,
      yes: {
        label: game.i18n.localize(`${i18nPath}.yes`),
        icon: "",
        default: true,
        callback: () => true
      },
      no: {
        label: game.i18n.localize(`${i18nPath}.no`),
        icon: "",
        callback: () => false
      },
      rejectClose: false
    });

    if (result === true) {
      const updated = await BottomDockUtil.setFearPositionFree();
      if (updated) ui.notifications.info(game.i18n.localize(`${i18nPath}.enabledNotification`));
      return updated;
    }

    await SettingsUtil.set(SETTINGS.dockDHResources.tag, false);
    ui.notifications.info(game.i18n.localize(`${i18nPath}.disabledNotification`));
    return false;
  }

  /**
   * React to client setting changes for both our docking toggle and Daggerheart's appearance
   * Client-scoped settings fire clientSettingChanged rather than updateSetting
   * @private
   * @static
   * @param {string} key - Namespaced setting key
   * @param {*} value - The new setting value
   */
  static _onClientSettingChanged(key, value) {
    const SETTINGS = getSettings();

    if (key === `${MODULE_ID}.${SETTINGS.dockDHResources?.tag}`) {
      BottomDockUtil.onDockSettingChanged(value);
      return;
    }

    if (key === `${game.system.id}.${BottomDockUtil.dhAppearanceKey}`) {
      BottomDockUtil._onFearPositionChanged(value?.fearPosition);
    }
  }

  /**
   * Handle the Carolingian UI docking setting being toggled
   * @static
   * @param {boolean} enabled - The new setting value
   */
  static async onDockSettingChanged(enabled) {
    BottomDockUtil.applyDockingClass(enabled);

    if (!enabled) {
      BottomDockUtil.releaseDHResources();
      return;
    }

    await BottomDockUtil.ensureFreeFearPosition();
  }

  /**
   * Handle Daggerheart's own fear position being changed away from "free"
   * Docking steps aside rather than fighting the system for placement
   * @private
   * @static
   * @param {string} position - The new fear position
   */
  static _onFearPositionChanged(position) {
    if (!BottomDockUtil.dhSupportsFearPosition) return;
    if (position === BottomDockUtil.DH_FEAR_POSITION_FREE) return;
    if (!BottomDockUtil.instances.has(BottomDockUtil.DH_WINDOW_ID)) return;

    LogUtil.log("BottomDockUtil | Daggerheart took over fear tracker placement", [position]);
    BottomDockUtil.releaseDHResources();
    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.dhFearDock.releasedNotification'));
  }

  /**
   * Hand the fear tracker back to Daggerheart, keeping the saved dock preference intact
   * @static
   */
  static releaseDHResources() {
    const instance = BottomDockUtil.instances.get(BottomDockUtil.DH_WINDOW_ID);
    if (!instance) return;

    instance.clearDockStyles();
    BottomDockUtil.cleanup(BottomDockUtil.DH_WINDOW_ID);
    ui.resources?.render({ force: true });
  }

  /**
   * Apply or remove body class for docking styles
   * @static
   * @param {boolean} enabled - Whether docking is enabled
   */
  static applyDockingClass(enabled) {
    if (enabled) {
      document.body.classList.add('crlngn-dh-dock');
    } else {
      document.body.classList.remove('crlngn-dh-dock');
    }
  }

  /**
   * Handle FearTracker render hook (Daggerheart resources window)
   * @private
   * @static
   * @param {Application} app - The FearTracker application instance
   * @param {HTMLElement|jQuery} html - The rendered element, or jQuery wrapper on older versions
   * @param {object} data - Render context
   */
  static _onRenderFearTracker(app, html, data) {
    const SETTINGS = getSettings();
    const enabled = SettingsUtil.get(SETTINGS.dockDHResources?.tag);
    const element = html?.[0] ?? html;

    if (!enabled || !element) {
      LogUtil.log("BottomDockUtil | Daggerheart resources docking disabled in settings");
      return;
    }

    const fearPosition = BottomDockUtil.getFearPosition();
    if (BottomDockUtil.dhSupportsFearPosition && fearPosition !== BottomDockUtil.DH_FEAR_POSITION_FREE) {
      LogUtil.log("BottomDockUtil | Daggerheart controls the fear tracker position", [fearPosition]);
      BottomDockUtil.cleanup(BottomDockUtil.DH_WINDOW_ID);
      return;
    }

    const isFrameless = !element.querySelector('.window-content');
    const options = isFrameless ? BottomDockUtil.DH_DOCK_OPTIONS : {};
    LogUtil.log("BottomDockUtil | Enhancing Fear Tracker with docking", [app, element, isFrameless]);

    this.initialize(app, element, BottomDockUtil.DH_WINDOW_ID, options);
  }

  /**
   * Initialize docking behavior for an application window
   * Creates a new DockedWindow instance and registers it
   * @param {Application} app - The application instance
   * @param {HTMLElement} element - The window DOM element
   * @param {string} windowId - Unique identifier for this window type
   * @param {object} [options] - Per-window docking options passed to DockedWindow
   */
  static initialize(app, element, windowId, options = {}) {
    // Clean up old instance if exists
    if (this.instances.has(windowId)) {
      LogUtil.log(`BottomDockUtil | Cleaning up existing instance for ${windowId}`);
      this.cleanup(windowId);
    }

    // Create new DockedWindow instance
    const instance = new DockedWindow(app, element, windowId, options);
    this.instances.set(windowId, instance);

    LogUtil.log(`BottomDockUtil | Created instance for ${windowId}`, [instance]);
    return instance;
  }

  /**
   * Cleanup and remove a docked window instance
   * @param {string} windowId - Unique identifier for the window
   */
  static cleanup(windowId) {
    const instance = this.instances.get(windowId);
    if (instance) {
      instance.destroy();
      this.instances.delete(windowId);

      // Trigger layout update for remaining docked windows
      this.layoutDockedWindows();

      LogUtil.log(`BottomDockUtil | Cleaned up instance for ${windowId}`);
    }
  }

  /**
   * Layout all currently docked windows
   * Positions them vertically stacked with proper spacing
   * @static
   */
  static layoutDockedWindows() {
    const uiBottom = document.querySelector('#ui-bottom');
    if (!uiBottom) return;

    // Get all docked elements (those with parent = #ui-bottom)
    const dockedInstances = Array.from(this.instances.values())
      .filter(inst => inst.element.parentElement === uiBottom);

    if (dockedInstances.length === 0) return;

    LogUtil.log(`BottomDockUtil | Laying out ${dockedInstances.length} docked windows (vertical stack)`);

    // Vertical stacking - windows stack naturally in document flow
    // We only need to ensure they don't have conflicting left/right positioning
    dockedInstances.forEach((inst, index) => {
      const el = inst.element;

      // Clear any left positioning to allow natural stacking
      el.style.left = 'auto';
      el.style.right = 'auto';

      LogUtil.log(`BottomDockUtil | Positioned ${inst.windowId} in vertical stack (index: ${index})`);
    });
  }

  /**
   * Load docking state from user flag
   * @param {string} windowId - Unique identifier for the window
   * @returns {object} Saved state
   */
  static loadState(windowId) {
    const flagName = `${windowId}DockState`;
    const state = game.user.getFlag(MODULE_ID, flagName);
    LogUtil.log(`BottomDockUtil | State loaded for ${windowId}`, [state]);
    return state;
  }

  /**
   * Save docking state to user flag (static version)
   * @param {string} windowId - Unique identifier for the window
   * @param {boolean} docked - Whether the window is docked
   * @param {object} position - Position object with x and y coordinates
   * @static
   */
  static saveState(windowId, docked, position = null) {
    const state = {
      docked,
      position: position || { x: null, y: null }
    };

    const flagName = `${windowId}DockState`;
    game.user.setFlag(MODULE_ID, flagName, state);
    LogUtil.log(`BottomDockUtil | State saved for ${windowId} (static)`, [state]);
  }
}
