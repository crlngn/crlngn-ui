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

  constructor(app, element, windowId) {
    this.app = app;
    this.element = element;
    this.windowId = windowId;

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
    // Try to find window header, otherwise use the element itself as drag handle
    let dragHandle = this.element.querySelector(DockedWindow.DRAG_HANDLE_SELECTOR);
    if (!dragHandle) {
      LogUtil.log(`BottomDockUtil | No window header found for ${this.windowId}, using element as drag handle`);
      dragHandle = this.element;
    }

    // Load saved state and apply if docked
    const savedState = BottomDockUtil.loadState(this.windowId);
    if (savedState?.docked) {
      LogUtil.log(`BottomDockUtil | Restoring docked state for ${this.windowId}`);
      // Delay docking to ensure DOM is ready
      setTimeout(() => this.dockToBottom(true), 100);
    }

    // Create bound handler we can remove later
    this.boundHandlers.dragStart = this.handleDragStart.bind(this);
    dragHandle.addEventListener('mousedown', this.boundHandlers.dragStart);

    // Store drag handle reference for cleanup
    this.dragHandle = dragHandle;

    LogUtil.log(`BottomDockUtil | Docking initialized for ${this.windowId}`, [savedState]);
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

    return false;
  }

  /**
   * Handle drag start event
   */
  handleDragStart(event) {
    LogUtil.log("handleDragStart",[event.button, this.shouldSkipDrag(event.target), event.target]);
    if (event.button !== 0) return; // Only left mouse button

    // Skip drag if clicking on interactive elements
    if (this.shouldSkipDrag(event.target)) {
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
      this.dragHandle.removeEventListener('mousedown', this.boundHandlers.dragStart);
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
   * Creates a new DockedWindow instance and registers it
   * @param {Application} app - The application instance
   * @param {HTMLElement} element - The window DOM element
   * @param {string} windowId - Unique identifier for this window type
   */
  static initialize(app, element, windowId) {
    // Clean up old instance if exists
    if (this.instances.has(windowId)) {
      LogUtil.log(`BottomDockUtil | Cleaning up existing instance for ${windowId}`);
      this.cleanup(windowId);
    }

    // Create new DockedWindow instance
    const instance = new DockedWindow(app, element, windowId);
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
