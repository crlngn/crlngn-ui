import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { DOCK_RESIZE_OPTIONS, getSettings, MIN_AV_WIDTH } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Utility class for managing the camera dock functionality in FoundryVTT
 * Handles camera positioning, dragging, resizing, and UI controls
 */
export class CameraUtil {
  /** @type {number} Private offset X for dragging */
  static #offsetX = 0;
  /** @type {number} Private offset Y for dragging */
  static #offsetY = 0;
  /** @type {boolean} Flag indicating if camera is being dragged */
  static isDragging = false;
  /** @type {HTMLElement|null} Reference to the camera container element */
  static cameraContainer;
  /** @type {boolean} Flag indicating if camera is being resized */
  static isResizing = false;
  /** @type {number} Private starting X position for resizing */
  static #startX = 0;
  /** @type {number} Private starting Y position for resizing */
  static #startY = 0;
  /** @type {number} Private starting width for resizing */
  static #startWidth = 0;
  /** @type {number} Private starting height for resizing */
  static #startHeight = 0;
  /** @type {number} Private starting bottom position for resizing */
  static #startBottom = 0;
  static currSettings = {};
  /** @type {number|null} Position application interval ID */
  static positionIntervalId = null;
  /** @type {number} How many times to try applying position */
  static positionAttempts = 10;
  
  /**
   * @private
   * Handles the mouse drag movement of the camera container
   * @param {MouseEvent} e - Mouse event
   */
  static #onDragMove = (e) => { 
    const isMinimized = document.querySelector("#camera-views.minimized");

    if (!CameraUtil.isDragging || isMinimized) return; 
    LogUtil.log("mousemove", [ window.innerHeight, e.clientY, CameraUtil.#offsetY ]); 
    
    if(CameraUtil.cameraContainer){
      let left = e.clientX - CameraUtil.#offsetX;
      let bottom = (window.innerHeight - e.clientY) -  CameraUtil.#offsetY;
      CameraUtil.cameraContainer.style.removeProperty("top");
      
      // Constrain to window boundaries
      if(left + CameraUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraUtil.cameraContainer.offsetWidth;
      }
      if (left < 0) {
        left = 0;
      }
      
      // Use transform instead of left
      CameraUtil.cameraContainer.style.transform = `translateX(${left}px)`;

      if(bottom + CameraUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraUtil.cameraContainer.offsetHeight;
      } 
      CameraUtil.cameraContainer.style.bottom = `${bottom}px`;
    }
    e.preventDefault();
    e.stopPropagation(); 
  };
  
  /**
   * @private
   * Handles the release of drag operation
   * @param {MouseEvent} e - Mouse event
   */
  static #onDragRelease = (e) => {
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};
    const isMinimized = document.querySelector("#camera-views.minimized");

    if(CameraUtil.isDragging && !isMinimized){ 
      const body = document.querySelector("body.crlngn-ui"); 
      
      // Extract translateX value from transform
      const transformStyle = CameraUtil.cameraContainer?.style.transform;
      let dockPosX = 0;
      if (transformStyle) {
        const match = transformStyle.match(/translateX\(([\d.]+)px\)/);
        if (match && match[1]) {
          dockPosX = parseInt(match[1]);
        }
      }
      cameraSettings.dockPosX = dockPosX;
      cameraSettings.dockPosY = parseInt(CameraUtil.cameraContainer?.style.bottom) || 0; 

      if(cameraSettings.dockPosY <= 0){ cameraSettings.dockPosY = 0 }
      SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
      SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
      
      body?.removeEventListener("mousemove", CameraUtil.#onDragMove); 
      body?.removeEventListener("mouseup", CameraUtil.#onDragRelease); 
  
      CameraUtil.isDragging = false; 
      e.stopPropagation(); 
    }
  };
  
  /**
   * @private
   * Handles the touch drag movement of the camera container
   * @param {TouchEvent} e - Touch event
   */
  static #onTouchMove = (e) => { 
    if (!CameraUtil.isDragging || !e.touches[0]) return; 
    
    if(CameraUtil.cameraContainer){
      const touch = e.touches[0];
      let left = touch.clientX - CameraUtil.#offsetX;
      let bottom = (window.innerHeight - touch.clientY) -  CameraUtil.#offsetY;
      CameraUtil.cameraContainer.style.removeProperty("top");
      
      // Constrain to window boundaries
      if(left + CameraUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraUtil.cameraContainer.offsetWidth;
      }
      if (left < 0) {
        left = 0;
      }
      
      // Use transform instead of left
      CameraUtil.cameraContainer.style.transform = `translateX(${left}px)`;

      if(bottom + CameraUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraUtil.cameraContainer.offsetHeight;
      } 
      CameraUtil.cameraContainer.style.bottom = `${bottom}px`;
    }
    e.preventDefault();
    e.stopPropagation(); 
  };
  
  /**
   * @private
   * Handles the release of touch drag operation
   * @param {TouchEvent} e - Touch event
   */
  static #onTouchRelease = (e) => {
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};

    if(CameraUtil.isDragging){ 
      const body = document.querySelector("body.crlngn-ui"); 
      
      // Extract translateX value from transform
      const transformStyle = CameraUtil.cameraContainer?.style.transform;
      let dockPosX = 0;
      if (transformStyle) {
        const match = transformStyle.match(/translateX\(([\d.]+)px\)/);
        if (match && match[1]) {
          dockPosX = parseInt(match[1]);
        }
      }
      cameraSettings.dockPosX = dockPosX;
      cameraSettings.dockPosY = parseInt(CameraUtil.cameraContainer?.style.bottom) || 0; 

      if(cameraSettings.dockPosY <= 0){ cameraSettings.dockPosY = 0 }
      SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
      SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
      
      body?.removeEventListener("touchmove", CameraUtil.#onTouchMove); 
      body?.removeEventListener("touchend", CameraUtil.#onTouchRelease);
      body?.removeEventListener("touchcancel", CameraUtil.#onTouchRelease);
  
      CameraUtil.isDragging = false; 
      e.preventDefault();
      e.stopPropagation(); 
    }
  };
  
  /**
   * @private
   * Handles the resize operation of the camera container
   * @param {MouseEvent} e - Mouse event
   */
  static #onResize = (e) => {
    if (!CameraUtil.isResizing) return;
    const newWidth = CameraUtil.#startWidth + (e.clientX - CameraUtil.#startX);
    const deltaY = e.clientY - CameraUtil.#startY; // How much the mouse moved
    const newHeight = CameraUtil.#startHeight + deltaY;
    const newBottom = CameraUtil.#startBottom - deltaY;

    CameraUtil.cameraContainer.style.width = `${newWidth}px`;
    CameraUtil.cameraContainer.style.height = `${newHeight}px`;
    CameraUtil.cameraContainer.style.bottom = `${newBottom}px`;
  };
  
  /**
   * @private
   * Handles when user releases the resize handle
   */
  static #onStopResize = () => {
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};

    const body = document.querySelector("body.crlngn-ui");
    CameraUtil.isResizing = false;
    body?.removeEventListener("mousemove", CameraUtil.#onResize);
    body?.removeEventListener("mouseup", CameraUtil.#onStopResize);

    LogUtil.log("onStopResize", [CameraUtil.cameraContainer?.style.width, CameraUtil.cameraContainer?.style.height, CameraUtil.cameraContainer?.style.bottom]);

    cameraSettings.dockWidth = parseInt(CameraUtil.cameraContainer?.style.width || 0);
    cameraSettings.dockHeight = parseInt(CameraUtil.cameraContainer?.style.height || 0);
    cameraSettings.dockPosY = parseInt(CameraUtil.cameraContainer?.style.bottom || 0);
    
    // Extract translateX value from transform
    const transformStyle = CameraUtil.cameraContainer?.style.transform;
    let dockPosX = 0;
    if (transformStyle) {
      const match = transformStyle.match(/translateX\(([\d.]+)px\)/);
      if (match && match[1]) {
        dockPosX = parseInt(match[1]);
      }
    }
    cameraSettings.dockPosX = dockPosX;

    SettingsUtil.set(SETTINGS.dockWidth.tag, cameraSettings.dockWidth);
    SettingsUtil.set(SETTINGS.dockHeight.tag, cameraSettings.dockHeight);
    SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
    SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
  };

  /**
   * Initializes the camera utility
   * Sets up event hooks based on camera dock settings
   */
  static init(){
    const SETTINGS = getSettings();
    CameraUtil.currSettings = {
      enableFloatingDock: SettingsUtil.get(SETTINGS.enableFloatingDock.tag),
      defaultVideoWidth: SettingsUtil.get(SETTINGS.defaultVideoWidth.tag),
      dockHeight: SettingsUtil.get(SETTINGS.dockHeight.tag),
      dockWidth: SettingsUtil.get(SETTINGS.dockWidth.tag),
      dockPosX: SettingsUtil.get(SETTINGS.dockPosX.tag),
      dockPosY: SettingsUtil.get(SETTINGS.dockPosY.tag),
      dockResizeOnUserJoin: SettingsUtil.get(SETTINGS.dockResizeOnUserJoin.tag),
    }
    
    // Register hook for rtcClientSettings changes to detect minimized state
    Hooks.on("updateSetting", (setting) => {
      LogUtil.log("checkMinimizedState", [setting]);
      if (setting.key === "rtcClientSettings" && setting.namespace === "core") {
        CameraUtil.checkMinimizedState();
      }
    });
    
    // Also check minimized state on camera views render
    Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, (app, html, data) => {
      // Check initial minimized state after a short delay to ensure DOM is ready
      setTimeout(() => CameraUtil.checkMinimizedState(), 100);
    });
    
    if(CameraUtil.currSettings.enableFloatingDock){ 
      // Clear any existing interval
      if (CameraUtil.positionIntervalId) {
        clearInterval(CameraUtil.positionIntervalId);
        CameraUtil.positionIntervalId = null;
      }
      
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRenderFloating);    
      Hooks.on(HOOKS_CORE.WEBRTC_SETTINGS_CHANGED, CameraUtil.resetPositionAndSize);
      Hooks.on(HOOKS_CORE.WEBRTC_USER_STATE_CHANGED, CameraUtil.resetPositionAndSize);
      Hooks.on(HOOKS_CORE.UPDATE_USER, CameraUtil.resetPositionAndSize);
      Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, CameraUtil.resetPositionAndSize);
  
      // Add a hook for when the UI is ready
      Hooks.once(HOOKS_CORE.READY, () => {
        CameraUtil.onRenderFloating();
      });
      
      LogUtil.log("CameraUtil settings", [CameraUtil.currSettings]);
      
    }else{ 
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRenderPlain);
      CameraUtil.onRenderPlain();
    } 
  }

  /**
   * Renders the camera in plain mode (non-floating)
   * Adds visibility class to camera views
   */
  static onRenderPlain(){
    CameraUtil.cameraContainer.classList.add('visible');
  }

  /**
   * Renders the camera in floating mode
   * Sets up draggable and resizable functionality
   * Positions camera based on saved settings
   */
  static onRenderFloating(){
    const SETTINGS = getSettings();
    const cameraSettings = CameraUtil.currSettings; // SettingsUtil.get(SETTINGS.cameraDockMenu.tag);

    CameraUtil.cameraContainer = document.querySelector('#camera-views');
    if (!CameraUtil.cameraContainer) return;
    
    CameraUtil.cameraContainer.classList.add('crlngn-ui');
    LogUtil.log("CameraUtil.onRender", [ cameraSettings.dockPosX, cameraSettings.dockPosY ]);

    // Check minimized state first
    CameraUtil.checkMinimizedState();
    
    // Only set up draggable and other features if not minimized
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    if (rtcSettings?.hideDock !== true) {
      CameraUtil.makeDraggable();
      CameraUtil.makeResizeable();
      CameraUtil.applyDockResize(cameraSettings.dockResizeOnUserJoin);
      CameraUtil.applyVideoWidth();
      CameraUtil.resetPositionAndSize();
      
      // Apply position with delay to ensure it sticks
      CameraUtil.applyPositionWithDelay();
    }
  }
  
  /**
   * Applies position with a delay to ensure it sticks after Foundry's rendering
   * Makes multiple attempts to reset position to overcome Foundry's automatic positioning
   */
  static applyPositionWithDelay() {
    // Clear any existing interval
    if (CameraUtil.positionIntervalId) {
      clearInterval(CameraUtil.positionIntervalId);
      CameraUtil.positionIntervalId = null;
    }
    
    // Counter for attempts
    let attempts = 0;
    
    // Set up interval to repeatedly apply position
    CameraUtil.positionIntervalId = setInterval(() => {
      CameraUtil.resetPositionAndSize();
      attempts++;
      
      // Stop after specified number of attempts
      if (attempts >= CameraUtil.positionAttempts) {
        clearInterval(CameraUtil.positionIntervalId);
        CameraUtil.positionIntervalId = null;
      }
    }, 50); // Reduced interval for more responsive positioning
  }
  
  /**
   * Resets the position and size of the camera container
   * @param {Object} options - Position and size options
    }
  });
  }
  
  static applyDockResize(resizeValue) {
    if(!CameraUtil.cameraContainer){return;}
    const value = resizeValue || CameraUtil.currSettings.dockResizeOnUserJoin;
    
    if(value===DOCK_RESIZE_OPTIONS.horizontal.name){
      CameraUtil.cameraContainer.classList.add('horizontal');
      CameraUtil.cameraContainer.classList.remove('vertical');
    }else if(value===DOCK_RESIZE_OPTIONS.vertical.name){
      CameraUtil.cameraContainer.classList.add('vertical');
      CameraUtil.cameraContainer.classList.remove('horizontal');
    }else{
      CameraUtil.cameraContainer.classList.remove('vertical');
      CameraUtil.cameraContainer.classList.remove('horizontal');
    }
  }

  /**
     * Applies width of individual videos
     * @param {number} [value] - Width value to apply
     */
  static applyVideoWidth(value){
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.defaultVideoWidth.tag);
    let width = value || cameraSettings;
    
    if(width < MIN_AV_WIDTH){
      width = MIN_AV_WIDTH;
      SettingsUtil.set(SETTINGS.defaultVideoWidth.tag, width);
    }else if(!Number.isNaN(width)){
      CameraUtil.currSettings.defaultVideoWidth = width;
      // GeneralUtil.addCSSVars('--av-width', width+'px');
      const minimized = document.querySelector('#camera-views.crlngn-ui.webrtc-dock-minimized');
      const nonMinimized = document.querySelector('#camera-views.crlngn-ui');
      if(!minimized && nonMinimized){
        nonMinimized.style.setProperty('--av-width', width+'px');
      }else if(nonMinimized){
        nonMinimized.style.removeProperty('--av-width');
      }
      
      CameraUtil.updateDockSize();
    }
  }
  
  /**
   * Resets the position and size of the camera container
   * @param {Object} options - Position and size options
   * @param {number|null} [options.x] - X position in pixels
   * @param {number|null} [options.y] - Y position in pixels
   * @param {number|null} [options.w] - Width in pixels
   * @param {number|null} [options.h] - Height in pixels
   */
  static resetPositionAndSize({x, y, w, h} = { x: null, y: null, w: null, h: null }){
    const SETTINGS = getSettings();
    const cameraSettings = CameraUtil.currSettings; //SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    
    if(!cameraSettings.enableFloatingDock || !CameraUtil.cameraContainer){ return }
    
    // Check minimized state first - if minimized, don't reset position
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    if (rtcSettings?.hideDock === true) {
      CameraUtil.checkMinimizedState();
      return;
    }
    
    CameraUtil.cameraContainer.style.removeProperty("top");
    LogUtil.log("CameraUtil", [cameraSettings]);

    if(!x && !y && !w && !h){
      const savedPosX = cameraSettings.dockPosX || 0;
      const savedPosY = cameraSettings.dockPosY || 0;
      
      // Use transform for X positioning instead of left
      CameraUtil.cameraContainer.style.transform = `translateX(${savedPosX}px)`;
      CameraUtil.cameraContainer.style.bottom = `${savedPosY}px`;
      CameraUtil.cameraContainer.style.removeProperty("left");
      CameraUtil.cameraContainer.style.removeProperty("top");
      
      if(CameraUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.off.name){
        const savedWidth = cameraSettings.dockWidth || 0;
        const savedHeight = cameraSettings.dockHeight || 0;
        CameraUtil.cameraContainer.style.width = `${savedWidth}px`;
        CameraUtil.cameraContainer.style.height = `${savedHeight}px`;
      }
    }else{
      if(x !== null){
        // Use transform for X positioning instead of left
        CameraUtil.cameraContainer.style.transform = `translateX(${x}px)`;
      }
      if(y !== null){
        CameraUtil.cameraContainer.style.bottom = `${y}px`;
      }
      if(CameraUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.horizontal.name){
        if(w !== null){
          CameraUtil.cameraContainer.style.width = `${w}px`;
        }
      }else if(CameraUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.vertical.name){
        if(h !== null){
          CameraUtil.cameraContainer.style.height = `${h}px`;
        }
      }
      CameraUtil.cameraContainer.style.removeProperty("left");
      CameraUtil.cameraContainer.style.removeProperty("top");
    }
    // Ensure top is cleared to avoid positioning conflicts
    CameraUtil.cameraContainer.style.top = '';
    CameraUtil.cameraContainer.style.left = '';
  }
  
  /**
   * Applies dock resize based on the specified resize option
   * @param {string} resizeValue - The resize option to apply (horizontal, vertical, or none)
   */
  static applyDockResize(resizeValue) {
    const SETTINGS = getSettings();
    
    if (!CameraUtil.cameraContainer) return;
    
    // Update the current settings
    CameraUtil.currSettings.dockResizeOnUserJoin = resizeValue;
    SettingsUtil.set(SETTINGS.dockResizeOnUserJoin.tag, resizeValue);
    
    // Apply the appropriate class based on the resize option
    CameraUtil.cameraContainer.classList.remove('horizontal', 'vertical');
    
    if (resizeValue === DOCK_RESIZE_OPTIONS.horizontal.name) {
      CameraUtil.cameraContainer.classList.add('horizontal');
    } else if (resizeValue === DOCK_RESIZE_OPTIONS.vertical.name) {
      CameraUtil.cameraContainer.classList.add('vertical');
    }
    
    // Update the dock size based on the new resize option
    CameraUtil.updateDockSize();
  }

  /**
   * Makes the camera container draggable
   * Sets up mouse and touch event listeners for drag functionality
   */
  static makeDraggable(){
    // Handle mouse events
    CameraUtil.cameraContainer?.addEventListener("mousedown", (e) => {
      const isMinimized = document.querySelector("#camera-views.minimized");
    
      // Only trigger drag on left mouse button (button 0)
      if (e.button !== 0) return;
      
      const body = document.querySelector("body.crlngn-ui");
      
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body?.addEventListener("mousemove", CameraUtil.#onDragMove);
      body?.addEventListener("mouseup", CameraUtil.#onDragRelease); 
      
      if (isMinimized) return;
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      
      // Get the current position from transform if it exists
      const transformStyle = CameraUtil.cameraContainer?.style.transform;
      let currentLeft = 0;
      if (transformStyle) {
        const match = transformStyle.match(/translateX\(([-\d.]+)px\)/);
        if (match && match[1]) {
          currentLeft = parseInt(match[1]);
        }
      } else {
        // If no transform is set yet, use offsetLeft
        currentLeft = CameraUtil.cameraContainer?.offsetLeft || 0;
      }
      
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = e.clientX - currentLeft;
      CameraUtil.#offsetY = (window.innerHeight - e.clientY) - offsetBottom;

      e.preventDefault();
      e.stopPropagation();
    });
    
    // Handle touch events
    CameraUtil.cameraContainer?.addEventListener("touchstart", (e) => {
      const isMinimized = document.querySelector("#camera-views.minimized");
      if (!e.touches[0]) return;
      
      const body = document.querySelector("body.crlngn-ui");
      
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body.addEventListener("touchmove", CameraUtil.#onTouchMove);
      body.addEventListener("touchend", CameraUtil.#onTouchRelease);
      body.addEventListener("touchcancel", CameraUtil.#onTouchRelease);

      if (isMinimized) return;
      const touch = e.touches[0];
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      
      // Get the current position from transform if it exists
      const transformStyle = CameraUtil.cameraContainer?.style.transform;
      let currentLeft = 0;
      if (transformStyle) {
        const match = transformStyle.match(/translateX\(([-\d.]+)px\)/);
        if (match && match[1]) {
          currentLeft = parseInt(match[1]);
        }
      } else {
        // If no transform is set yet, use offsetLeft
        currentLeft = CameraUtil.cameraContainer?.offsetLeft || 0;
      }
      
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = touch.clientX - currentLeft;
      CameraUtil.#offsetY = (window.innerHeight - touch.clientY) - offsetBottom;

      // Prevent scrolling while dragging
      e.preventDefault();
      e.stopPropagation();
    });
  }
  /**
   * Updates the dock size based on current settings and user count
   * Recalculates the dock dimensions based on video width and user count
   */
  static updateDockSize() {
    if (!CameraUtil.cameraContainer) return;
    
    const SETTINGS = getSettings();
    const resizeOption = CameraUtil.currSettings.dockResizeOnUserJoin;
    const videoWidth = CameraUtil.currSettings.defaultVideoWidth || MIN_AV_WIDTH;
    
    // Get all active users with camera/video
    const activeUsers = game.webrtc?.users?.filter(u => u.active && u.canBroadcastVideo) || [];
    const userCount = activeUsers.length;
    
    if (userCount === 0) return;
    
    // Calculate new dimensions based on resize option
    if (resizeOption === DOCK_RESIZE_OPTIONS.horizontal.name) {
      // For horizontal layout, adjust width based on user count
      const newWidth = (videoWidth * userCount) + 16; // Add padding
      CameraUtil.cameraContainer.style.width = `${newWidth}px`;
    } else if (resizeOption === DOCK_RESIZE_OPTIONS.vertical.name) {
      // For vertical layout, adjust height based on user count
      const newHeight = (videoWidth * userCount) + 16; // Add padding
      CameraUtil.cameraContainer.style.height = `${newHeight}px`;
    }
    
    // Save the new dimensions
    const width = parseInt(CameraUtil.cameraContainer.style.width || 0);
    const height = parseInt(CameraUtil.cameraContainer.style.height || 0);
    
    if (width > 0) SettingsUtil.set(SETTINGS.dockWidth.tag, width);
    if (height > 0) SettingsUtil.set(SETTINGS.dockHeight.tag, height);
  }
  
  /**
   * Applies dock resize based on the specified resize option
   * @param {string} resizeValue - The resize option to apply (horizontal, vertical, or none)
   */
  static applyDockResize(resizeValue) {
    if (!CameraUtil.cameraContainer) return;
    
    // Update the current settings
    CameraUtil.currSettings.dockResizeOnUserJoin = resizeValue;
    
    // Apply the appropriate class based on the resize option
    CameraUtil.cameraContainer.classList.remove('horizontal', 'vertical');
    
    if (resizeValue === DOCK_RESIZE_OPTIONS.horizontal.name) {
      CameraUtil.cameraContainer.classList.add('horizontal');
    } else if (resizeValue === DOCK_RESIZE_OPTIONS.vertical.name) {
      CameraUtil.cameraContainer.classList.add('vertical');
    }
    
    // Update the dock size based on the new resize option
    CameraUtil.updateDockSize();
  }
  
  static makeResizeable(){
    if(CameraUtil.cameraContainer){
      const body = document.querySelector("body.crlngn-ui");
      const resizeHandle = document.createElement("div");
      const existingHandle = CameraUtil.cameraContainer.querySelector(".resize-handle");
      if(existingHandle){ existingHandle.remove(); }
      resizeHandle.classList.add("resize-handle");
      CameraUtil.cameraContainer.append(resizeHandle);

      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        CameraUtil.isResizing = true;
    
        CameraUtil.#startX = e.clientX;
        CameraUtil.#startY = e.clientY;
        CameraUtil.#startBottom = parseInt(getComputedStyle(CameraUtil.cameraContainer).bottom) || 0;
        CameraUtil.#startWidth = CameraUtil.cameraContainer.offsetWidth;
        CameraUtil.#startHeight = CameraUtil.cameraContainer.offsetHeight;
    
        body?.addEventListener("mousemove", CameraUtil.#onResize);
        body?.addEventListener("mouseup", CameraUtil.#onStopResize);
      });
    }
  }
  
  /**
   * Checks if the camera views are minimized based on the rtcClientSettings
   * When minimized, moves the camera views into the #interface #players element
   */
  static checkMinimizedState() {
    if (!CameraUtil.cameraContainer) return;
    
    // Get the current rtcClientSettings
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    const isMinimized = rtcSettings?.hideDock === true;
    
    LogUtil.log("Checking minimized state", [rtcSettings, isMinimized]);
    
    // Update the UI based on the minimized state
    CameraUtil.handleMinimizedState(isMinimized);
    CameraUtil.cameraContainer.style.removeProperty("top");
  }
  
  /**
   * Handles the minimized state of the camera views
   * @param {boolean} isMinimized - Whether the camera views are minimized
   */
  static handleMinimizedState(isMinimized) {
    const playersContainer = document.querySelector('#interface #players #players-active');
    const btnToggleIcon = CameraUtil.cameraContainer.querySelector("button[data-action=toggleDock]");
    if (!playersContainer || !btnToggleIcon || !CameraUtil.cameraContainer) return;

    if (isMinimized) {
      if (CameraUtil.cameraContainer.parentNode !== playersContainer) {
        // Store the original parent to restore later
        CameraUtil.originalParent = CameraUtil.cameraContainer.parentNode;
        CameraUtil.originalNextSibling = CameraUtil.cameraContainer.nextSibling;
        
        btnToggleIcon.classList.remove('fa-caret-down');
        btnToggleIcon.classList.remove('fa-caret-left');
        btnToggleIcon.classList.remove('fa-caret-right');
        btnToggleIcon.classList.remove('fa-compress');
        btnToggleIcon.classList.add('fa-camera');
        // Move to players container
        playersContainer.insertBefore(CameraUtil.cameraContainer, playersContainer.firstChild);
      
        // Reset position styles when in players container
        CameraUtil.cameraContainer.style.transform = '';
        CameraUtil.cameraContainer.style.bottom = '';
        CameraUtil.cameraContainer.style.top = '';
        CameraUtil.cameraContainer.style.left = '';
        CameraUtil.cameraContainer.style.position = 'relative';
      }
    } else if (CameraUtil.originalParent) {
      // Restore to original position when not minimized
      if (CameraUtil.cameraContainer.parentNode === playersContainer) {
        if (CameraUtil.originalNextSibling) {
          CameraUtil.originalParent.insertBefore(CameraUtil.cameraContainer, CameraUtil.originalNextSibling);
        } else {
          CameraUtil.originalParent.appendChild(CameraUtil.cameraContainer);
        }
        btnToggleIcon.classList.remove('fa-caret-up');
        btnToggleIcon.classList.remove('fa-caret-left');
        btnToggleIcon.classList.remove('fa-caret-right');
        btnToggleIcon.classList.remove('fa-expand');
        btnToggleIcon.classList.add('fa-caret-down');
        CameraUtil.cameraContainer.style.position = 'absolute';
        CameraUtil.resetPositionAndSize();
        CameraUtil.makeDraggable();
        CameraUtil.makeResizeable();
      
        LogUtil.log("Restored camera position from settings", [CameraUtil.currSettings]);
      
      }
    }
  }
  
}