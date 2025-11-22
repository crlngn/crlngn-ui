import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";

/**
 * BottomDockUtil - Provides flexible docking functionality for application windows
 * Allows windows to snap and dock to the bottom of the screen above the hotbar
 * WITHOUT modifying any system files - all via hooks and DOM manipulation
 */
export class BottomDockUtil {
  static SNAP_DISTANCE = 50;
  static DRAG_HANDLE_SELECTOR = '.window-header';
  static MODULE_NAME = 'crlngn-ui';

  static dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    wasDockedOnStart: false
  };

  static app = null;
  static element = null;
  static dragStartHandler = null;
  static dragMoveHandler = null;
  static dragEndHandler = null;

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
   * Setup docking functionality - called from Main's READY hook
   * @static
   */
  static setup() {
    if (game.system.id === 'daggerheart') {
      LogUtil.log("BottomDockUtil | Daggerheart detected - setting up resources docking");

      // Apply body class based on setting
      const SETTINGS = getSettings();
      const enabled = SettingsUtil.get(SETTINGS.dockDHResources?.tag);
      BottomDockUtil.applyDockingClass(enabled);

      // Watch for setting changes
      Hooks.on('updateSetting', (setting) => {
        if (setting.key === SETTINGS.dockDHResources?.tag) {
          BottomDockUtil.applyDockingClass(setting.value);
        }
      });

      Hooks.on('renderFearTracker', this._onRenderFearTracker.bind(this));
    }

    // Future: Add more window types here
    // if (game.system.id === 'othersystem') { ... }
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
   * @param {jQuery} html - The rendered HTML
   * @param {object} data - Render data
   */
  static _onRenderFearTracker(app, html, data) {
    const SETTINGS = getSettings();
    const enabled = SettingsUtil.get(SETTINGS.dockDHResources?.tag);

    if (!enabled) {
      LogUtil.log("BottomDockUtil | Daggerheart resources docking disabled in settings");
      return;
    }

    const element = html[0] || html;
    LogUtil.log("BottomDockUtil | Enhancing Fear Tracker with docking", [app, element]);

    this.initialize(app, element, 'dh-resources');
  }

  /**
   * Initialize docking behavior for an application window
   * @param {Application} app - The application instance
   * @param {HTMLElement} element - The window DOM element
   * @param {string} windowId - Unique identifier for this window type
   */
  static initialize(app, element, windowId) {
    this.app = app;
    this.element = element;
    this.windowId = windowId;

    const header = element.querySelector(this.DRAG_HANDLE_SELECTOR);
    if (!header) {
      console.warn(`BottomDockUtil | Window header not found for ${windowId}`);
      return;
    }

    // Load saved state and apply if docked
    const savedState = this.loadState(windowId);
    if (savedState?.docked) {
      LogUtil.log(`BottomDockUtil | Restoring docked state for ${windowId}`);
      // Delay docking to ensure DOM is ready
      setTimeout(() => this.dockToBottom(true), 100);
    }

    // Remove old listeners if they exist
    if (this.dragStartHandler) {
      header.removeEventListener('mousedown', this.dragStartHandler);
    }

    // Create bound handler we can remove later
    this.dragStartHandler = this.handleDragStart.bind(this);
    header.addEventListener('mousedown', this.dragStartHandler);

    LogUtil.log(`BottomDockUtil | Docking initialized for ${windowId}`, [savedState]);
  }

  /**
   * Handle drag start event
   */
  static handleDragStart(event) {
    if (event.button !== 0) return; // Only left mouse button

    this.dragState.isDragging = true;
    this.dragState.startX = event.clientX;
    this.dragState.startY = event.clientY;

    const rect = this.element.getBoundingClientRect();
    this.dragState.startLeft = rect.left;
    this.dragState.startTop = rect.top;
    this.dragState.wasDockedOnStart = this.element.classList.contains('docked');

    LogUtil.log("BottomDockUtil | Drag start", [this.dragState]);

    // If starting docked, undock immediately
    if (this.dragState.wasDockedOnStart) {
      this.undockFromBottom();
      // Position at current visual location
      this.element.style.left = `${this.dragState.startLeft}px`;
      this.element.style.top = `${this.dragState.startTop}px`;
    }

    // Create bound handlers we can remove later
    this.dragMoveHandler = this.handleDragMove.bind(this);
    this.dragEndHandler = this.handleDragEnd.bind(this);

    document.addEventListener('mousemove', this.dragMoveHandler);
    document.addEventListener('mouseup', this.dragEndHandler);

    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle drag move event
   */
  static handleDragMove(event) {
    if (!this.dragState.isDragging) return;

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const newLeft = this.dragState.startLeft + deltaX;
    const newTop = this.dragState.startTop + deltaY;

    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;

    const snapDistance = this.calculateSnapDistance();

    // Visual feedback when near snap zone
    if (snapDistance <= this.SNAP_DISTANCE) {
      this.element.classList.add('near-snap');
    } else {
      this.element.classList.remove('near-snap');
    }
  }

  /**
   * Handle drag end event
   */
  static handleDragEnd(event) {
    if (!this.dragState.isDragging) return;

    LogUtil.log("BottomDockUtil | Drag end");

    document.removeEventListener('mousemove', this.dragMoveHandler);
    document.removeEventListener('mouseup', this.dragEndHandler);

    const snapDistance = this.calculateSnapDistance();
    this.element.classList.remove('near-snap');

    // Snap to dock if within threshold
    if (snapDistance <= this.SNAP_DISTANCE) {
      LogUtil.log("BottomDockUtil | Snapping to dock");
      this.dockToBottom();
    } else {
      // Save undocked position
      const rect = this.element.getBoundingClientRect();
      this.saveState(false, { x: rect.left, y: rect.top });
      LogUtil.log("BottomDockUtil | Saving undocked position", [rect.left, rect.top]);
    }

    this.dragState.isDragging = false;
  }

  /**
   * Calculate distance from current position to dock zone
   * @returns {number} Distance in pixels
   */
  static calculateSnapDistance() {
    const hotbar = document.querySelector('#hotbar');
    if (!hotbar) return 9999;

    const elementRect = this.element.getBoundingClientRect();
    const hotbarRect = hotbar.getBoundingClientRect();

    const elementBottom = elementRect.bottom;
    const hotbarTop = hotbarRect.top;

    return Math.abs(hotbarTop - elementBottom);
  }

  /**
   * Dock the window to the bottom above hotbar
   * @param {boolean} skipAnimation - Skip transition animation
   */
  static dockToBottom(skipAnimation = false) {
    const uiBottom = document.querySelector('#ui-bottom');
    if (!uiBottom) {
      console.warn("BottomDockUtil | #ui-bottom not found");
      return;
    }

    LogUtil.log("BottomDockUtil | Docking to bottom", [skipAnimation]);

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
    this.element.style.height = '100px';
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
    LogUtil.log("BottomDockUtil | Docked successfully");
  }

  /**
   * Undock the window from bottom
   */
  static undockFromBottom() {
    LogUtil.log("BottomDockUtil | Undocking from bottom");

    this.element.classList.remove('docked');

    // Clear inline styles to restore normal behavior
    this.element.style.position = '';
    this.element.style.zIndex = '';
    this.element.style.width = '';
    this.element.style.height = '';
    this.element.style.bottom = '';
    this.element.style.pointerEvents = '';

    // Re-enable resize
    if (this.app?.options?.window) {
      this.app.options.window.resizable = true;
    }

    // Move back to body as direct child (ApplicationV2 default)
    document.body.appendChild(this.element);

    this.saveState(false);
    LogUtil.log("BottomDockUtil | Undocked successfully");
  }

  /**
   * Save docking state to user flag
   * @param {boolean} docked - Is window docked
   * @param {object} position - Custom position {x, y}
   */
  static saveState(docked, position = null) {
    const state = {
      docked,
      position: position || { x: null, y: null }
    };

    const flagName = `${this.windowId}DockState`;
    game.user.setFlag(this.MODULE_NAME, flagName, state);
    LogUtil.log(`BottomDockUtil | State saved for ${this.windowId}`, [state]);
  }

  /**
   * Load docking state from user flag
   * @param {string} windowId - Unique identifier for the window
   * @returns {object} Saved state
   */
  static loadState(windowId) {
    const flagName = `${windowId}DockState`;
    const state = game.user.getFlag(this.MODULE_NAME, flagName);
    LogUtil.log(`BottomDockUtil | State loaded for ${windowId}`, [state]);
    return state;
  }
}
