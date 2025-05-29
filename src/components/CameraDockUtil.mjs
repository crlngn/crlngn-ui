import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { DOCK_RESIZE_OPTIONS, getSettings, MIN_AV_WIDTH } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Utility class for managing the camera dock functionality in FoundryVTT
 * Handles camera positioning, dragging, resizing, and UI controls
 */
export class CameraDockUtil {
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
  static positionAttempts = 5;
  static useFadeOut = true;
  static hidden = false;
  static enableFloatingDock = true;
  
  static applyFadeOut(useFadeOut){
    CameraDockUtil.useFadeOut = useFadeOut;
    if(CameraDockUtil.cameraContainer){
      CameraDockUtil.cameraContainer.classList.toggle("faded-ui", useFadeOut);
    }
  }
  
  static applyHide(hidden){
    CameraDockUtil.hidden = hidden;
    if(CameraDockUtil.cameraContainer){
      CameraDockUtil.cameraContainer.classList.toggle("hidden", hidden);
    }
  }

  static applyCustomStyle(enabled){
    CameraDockUtil.enableFloatingDock = enabled;
    LogUtil.log("applyCustomStyle", ["enableFloatingDock", enabled, CameraDockUtil.enableFloatingDock, ui.webrtc]);
    ui.webrtc?.render();
  }

  /**
   * @private
   * Handles the mouse drag movement of the camera container
   * @param {MouseEvent} e - Mouse event
   */
  static #onDragMove = (e) => { 
    const isMinimized = document.querySelector("#av-holder.minimized #camera-views");
    // if(isMinimized){
    //   CameraDockUtil.cameraContainer.style.position = "static";
    // }

    if (!CameraDockUtil.isDragging || isMinimized) return; 
    LogUtil.log("mousemove", [ window.innerHeight, e.clientY, CameraDockUtil.#offsetY ]); 
    
    if(CameraDockUtil.cameraContainer){
      let left = e.clientX - CameraDockUtil.#offsetX;
      let bottom = (window.innerHeight - e.clientY) -  CameraDockUtil.#offsetY;
      
      // Constrain to window boundaries
      if(left + CameraDockUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraDockUtil.cameraContainer.offsetWidth;
      }
      if (left < 0) {
        left = 0;
      }
      
      CameraDockUtil.cameraContainer.style.left = `${left}px`;
      if(bottom + CameraDockUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraDockUtil.cameraContainer.offsetHeight;
      } 
      CameraDockUtil.cameraContainer.style.bottom = `${bottom}px`;
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
    const cameraSettings = {...CameraDockUtil.currSettings};
    const isMinimized = document.querySelector("#av-holder.minimized #camera-views");

    if(CameraDockUtil.isDragging && !isMinimized){ 
      const body = document.querySelector("body.crlngn-ui"); 
      
      cameraSettings.dockPosX = parseInt(CameraDockUtil.cameraContainer?.style.left) || 0; 
      cameraSettings.dockPosY = parseInt(CameraDockUtil.cameraContainer?.style.bottom) || 0; 

      if(cameraSettings.dockPosY <= 0){ cameraSettings.dockPosY = 0 }
      SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
      SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
      
      body?.removeEventListener("mousemove", CameraDockUtil.#onDragMove); 
      body?.removeEventListener("mouseup", CameraDockUtil.#onDragRelease); 
  
      CameraDockUtil.isDragging = false; 
      e.stopPropagation(); 
    }
  };
  
  /**
   * @private
   * Handles the touch drag movement of the camera container
   * @param {TouchEvent} e - Touch event
   */
  static #onTouchMove = (e) => { 
    if (!CameraDockUtil.isDragging || !e.touches[0]) return; 
    
    if(CameraDockUtil.cameraContainer){
      const touch = e.touches[0];
      let left = touch.clientX - CameraDockUtil.#offsetX;
      let bottom = (window.innerHeight - touch.clientY) -  CameraDockUtil.#offsetY;
      
      // Constrain to window boundaries
      if(left + CameraDockUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraDockUtil.cameraContainer.offsetWidth;
      }
      if (left < 0) {
        left = 0;
      }
      
      // Use transform instead of left
      CameraDockUtil.cameraContainer.style.left = `${left}px`;

      if(bottom + CameraDockUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraDockUtil.cameraContainer.offsetHeight;
      } 
      CameraDockUtil.cameraContainer.style.bottom = `${bottom}px`;
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
    const cameraSettings = {...CameraDockUtil.currSettings};

    if(CameraDockUtil.isDragging){ 
      const body = document.querySelector("body.crlngn-ui"); 
      cameraSettings.dockPosX = parseInt(CameraDockUtil.cameraContainer?.style.left) || 0; 
      cameraSettings.dockPosY = parseInt(CameraDockUtil.cameraContainer?.style.bottom) || 0; 

      if(cameraSettings.dockPosY <= 0){ cameraSettings.dockPosY = 0 }
      SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
      SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
      
      body?.removeEventListener("touchmove", CameraDockUtil.#onTouchMove); 
      body?.removeEventListener("touchend", CameraDockUtil.#onTouchRelease);
      body?.removeEventListener("touchcancel", CameraDockUtil.#onTouchRelease);
  
      CameraDockUtil.isDragging = false; 
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
    if (!CameraDockUtil.isResizing) return;
    const newWidth = CameraDockUtil.#startWidth + (e.clientX - CameraDockUtil.#startX);
    const deltaY = e.clientY - CameraDockUtil.#startY; // How much the mouse moved
    const newHeight = CameraDockUtil.#startHeight + deltaY;
    const newBottom = CameraDockUtil.#startBottom - deltaY;

    CameraDockUtil.cameraContainer.style.width = `${newWidth}px`;
    CameraDockUtil.cameraContainer.style.height = `${newHeight}px`;
    CameraDockUtil.cameraContainer.style.bottom = `${newBottom}px`;
  };
  
  /**
   * @private
   * Handles when user releases the resize handle
   */
  static #onStopResize = () => {
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraDockUtil.currSettings};

    const body = document.querySelector("body.crlngn-ui");
    CameraDockUtil.isResizing = false;
    body?.removeEventListener("mousemove", CameraDockUtil.#onResize);
    body?.removeEventListener("mouseup", CameraDockUtil.#onStopResize);

    LogUtil.log("onStopResize", [CameraDockUtil.cameraContainer?.style.width, CameraDockUtil.cameraContainer?.style.height, CameraDockUtil.cameraContainer?.style.bottom]);

    cameraSettings.dockWidth = parseInt(CameraDockUtil.cameraContainer?.style.width || 0);
    cameraSettings.dockHeight = parseInt(CameraDockUtil.cameraContainer?.style.height || 0);
    cameraSettings.dockPosY = parseInt(CameraDockUtil.cameraContainer?.style.bottom || 0);
    cameraSettings.dockPosX = parseInt(CameraDockUtil.cameraContainer?.style.left || 0);

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
    CameraDockUtil.enableFloatingDock = SettingsUtil.get(SETTINGS.enableFloatingDock.tag);
    CameraDockUtil.currSettings = {
      enableFloatingDock: CameraDockUtil.enableFloatingDock,
      defaultVideoWidth: SettingsUtil.get(SETTINGS.defaultVideoWidth.tag),
      dockHeight: SettingsUtil.get(SETTINGS.dockHeight.tag),
      dockWidth: SettingsUtil.get(SETTINGS.dockWidth.tag),
      dockPosX: SettingsUtil.get(SETTINGS.dockPosX.tag),
      dockPosY: SettingsUtil.get(SETTINGS.dockPosY.tag),
      dockResizeOnUserJoin: SettingsUtil.get(SETTINGS.dockResizeOnUserJoin.tag),
    }
    
    if(CameraDockUtil.enableFloatingDock){ 
      // Clear any existing interval
      if (CameraDockUtil.positionIntervalId) {
        clearInterval(CameraDockUtil.positionIntervalId);
        CameraDockUtil.positionIntervalId = null;
      }
      
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraDockUtil.onRenderFloating);    
      Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, CameraDockUtil.onRenderPlayersList);

      // Register hook for rtcClientSettings changes to detect minimized state
      Hooks.on(HOOKS_CORE.CLIENT_SETTING_CHANGED, (setting) => {
        LogUtil.log("Setting updated", [setting]);
        if (setting.includes("rtcClientSettings")) {
          CameraDockUtil.checkMinimizedState();
        }
      });
      
    }else{ 
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraDockUtil.onRenderPlain);
      CameraDockUtil.onRenderPlain();
    } 
  }

  /**
   * Renders the camera in plain mode (non-floating)
   * Adds visibility class to camera views
   */
  static onRenderPlain(a,dockHtml){
    if(!CameraDockUtil.cameraContainer){
      CameraDockUtil.cameraContainer = document.querySelector('#av-holder');
    }
    CameraDockUtil.cameraContainer?.classList.add('visible');
  }

  /**
   * Renders the camera in floating mode
   * Sets up draggable and resizable functionality
   * Positions camera based on saved settings
   */
  static onRenderFloating(a,dockHtml,c){
    const SETTINGS = getSettings();
    const cameraSettings = CameraDockUtil.currSettings; // SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    const cam = document.querySelector('#camera-views');
    CameraDockUtil.cameraContainer = document.querySelector("#av-holder");

    if (CameraDockUtil.cameraContainer) {
      CameraDockUtil.cameraContainer.appendChild(cam);
    }else{
      const avHolder = document.createElement("div");
      CameraDockUtil.cameraContainer = avHolder;
      avHolder.id = "av-holder";
      avHolder.appendChild(cam);
      document.querySelector("body.crlngn-ui").appendChild(avHolder);  
    };

    // const camViews = CameraDockUtil.cameraContainer.querySelector("#camera-views");
    // camViews.classList.remove('horizontal');
    // camViews.classList.remove('vertical');
    
    const btnToggleIcon = CameraDockUtil.cameraContainer.querySelector("button[data-action=toggleDock]");
    btnToggleIcon.addEventListener("click", () => {
      ui.webrtc?.render();
    });
    const playerCameras = dockHtml?.querySelectorAll(".camera-view") || [];
    playerCameras.forEach(view => {
      const player = game.users.get(view.dataset.user);
      const playerColor = player?.color || '';
      LogUtil.log("player color",[player, playerColor]);
      view.style.setProperty("--player-color", playerColor);
    });
    
    LogUtil.log("CameraDockUtil.onRender", [ a,dockHtml,c, cameraSettings.dockPosX, cameraSettings.dockPosY ]);
    
    // Only set up draggable and other features if not minimized
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    if (rtcSettings?.hideDock !== true) {
      // Check minimized state first
      CameraDockUtil.checkMinimizedState();
      CameraDockUtil.applyDockResize(cameraSettings.dockResizeOnUserJoin);
      CameraDockUtil.makeDraggable();
      CameraDockUtil.makeResizeable();
      CameraDockUtil.applyVideoWidth();
      CameraDockUtil.resetPositionAndSize();
      
      // Apply position with delay to ensure it sticks
      // CameraDockUtil.applyPositionWithDelay();
    }else{
      CameraDockUtil.checkMinimizedState();
    }
    CameraDockUtil.applyFadeOut(CameraDockUtil.useFadeOut);

  }

  static onRenderPlayersList(){
    LogUtil.log("onRenderPlayersList");
  }
  
  /**
   * Applies position with a delay to ensure it sticks after Foundry's rendering
   * Makes multiple attempts to reset position to overcome Foundry's automatic positioning
   */
  static applyPositionWithDelay() {
    // Clear any existing interval
    if (CameraDockUtil.positionIntervalId) {
      clearInterval(CameraDockUtil.positionIntervalId);
      CameraDockUtil.positionIntervalId = null;
    }
    CameraDockUtil.resetPositionAndSize();
    
    // Counter for attempts
    let attempts = 0;
    
    // Set up interval to repeatedly apply position
    CameraDockUtil.positionIntervalId = setInterval(() => {
      CameraDockUtil.resetPositionAndSize();
      attempts++;
      
      // Stop after specified number of attempts
      if (attempts >= CameraDockUtil.positionAttempts) {
        clearInterval(CameraDockUtil.positionIntervalId);
        CameraDockUtil.positionIntervalId = null;
      }
    }, 20); // Reduced interval for more responsive positioning
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
      CameraDockUtil.currSettings.defaultVideoWidth = width;
      // GeneralUtil.addCSSVars('--av-width', width+'px');
      const minimized = document.querySelector('#av-holder.minimized #camera-views');
      const nonMinimized = document.querySelector('#camera-views');
      if(!minimized && nonMinimized){
        nonMinimized.parentNode.style.setProperty('--av-width', width+'px');
        nonMinimized.style.setProperty('--av-width', width+'px');
      }
      /*
      else if(nonMinimized){
        nonMinimized.parentNode.style.removeProperty('--av-width');
        nonMinimized.style.removeProperty('--av-width');
      }*/
      
      CameraDockUtil.updateDockSize();
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
    const cameraSettings = CameraDockUtil.currSettings; //SettingsUtil.get(SETTINGS.cameraDockMenu.tag);
    
    if(!CameraDockUtil.enableFloatingDock || !CameraDockUtil.cameraContainer){ return }

    // Check minimized state first - if minimized, don't reset position
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    if (rtcSettings?.hideDock === true) {
      CameraDockUtil.checkMinimizedState();
      return;
    }
    
    LogUtil.log("CameraDock", [cameraSettings]);

    if(!x && !y && !w && !h){
      const savedPosX = cameraSettings.dockPosX || 0;
      const savedPosY = cameraSettings.dockPosY || 0;
      
      CameraDockUtil.cameraContainer.style.left = `${savedPosX}px`;
      CameraDockUtil.cameraContainer.style.bottom = `${savedPosY}px`;
      
      if(CameraDockUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.off.name){
        const savedWidth = cameraSettings.dockWidth || 0;
        const savedHeight = cameraSettings.dockHeight || 0;
        CameraDockUtil.cameraContainer.style.width = `${savedWidth}px`;
        CameraDockUtil.cameraContainer.style.height = `${savedHeight}px`;
      }
    }else{
      if(x !== null){
        CameraDockUtil.cameraContainer.style.left = `${x}px`;
      }
      if(y !== null){
        CameraDockUtil.cameraContainer.style.bottom = `${y}px`;
      }
      if(CameraDockUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.horizontal.name){
        if(w !== null){
          CameraDockUtil.cameraContainer.style.width = `${w}px`;
        }
      }else if(CameraDockUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.vertical.name){
        if(h !== null){
          CameraDockUtil.cameraContainer.style.height = `${h}px`;
        }
      }
    }
  }

  /**
   * Makes the camera container draggable
   * Sets up mouse and touch event listeners for drag functionality
   */
  static makeDraggable(){
    // Handle mouse events
    CameraDockUtil.cameraContainer?.addEventListener("mousedown", (e) => {
      const isMinimized = document.querySelector("#av-holder.minimized #camera-views");
    
      // Only trigger drag on left mouse button (button 0)
      if (e.button !== 0) return;
      
      const body = document.querySelector("body.crlngn-ui");
      LogUtil.log("mousedown", [e.target.tagName, e.target.parentNode.tagName]);
      if(e.target.tagName=='input' ||
         e.target.parentNode?.classList.contains('webrtc-volume-slider')){
        return;
      }
      body?.addEventListener("mousemove", CameraDockUtil.#onDragMove);
      body?.addEventListener("mouseup", CameraDockUtil.#onDragRelease); 
      
      if (isMinimized) return;
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraDockUtil.cameraContainer);
      
      // Get the current position from transform if it exists
      let currentLeft = CameraDockUtil.cameraContainer?.offsetLeft || 0;
      
      CameraDockUtil.isDragging = true;
      CameraDockUtil.#offsetX = e.clientX - currentLeft;
      CameraDockUtil.#offsetY = (window.innerHeight - e.clientY) - offsetBottom;

      e.preventDefault();
      e.stopPropagation();
    });
    
    // Handle touch events
    CameraDockUtil.cameraContainer?.addEventListener("touchstart", (e) => {
      const isMinimized = document.querySelector("#av-holder.minimized #camera-views");
      if (!e.touches[0]) return;
      
      const body = document.querySelector("body.crlngn-ui");
      
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body.addEventListener("touchmove", CameraDockUtil.#onTouchMove);
      body.addEventListener("touchend", CameraDockUtil.#onTouchRelease);
      body.addEventListener("touchcancel", CameraDockUtil.#onTouchRelease);

      if (isMinimized) return;
      const touch = e.touches[0];
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraDockUtil.cameraContainer);
      
      // Get the current position from transform if it exists
      let currentLeft = CameraDockUtil.cameraContainer?.offsetLeft || 0;
      
      CameraDockUtil.isDragging = true;
      CameraDockUtil.#offsetX = touch.clientX - currentLeft;
      CameraDockUtil.#offsetY = (window.innerHeight - touch.clientY) - offsetBottom;

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
    if (!CameraDockUtil.cameraContainer) return;
    
    const SETTINGS = getSettings();
    const resizeOption = CameraDockUtil.currSettings.dockResizeOnUserJoin;
    const videoWidth = CameraDockUtil.currSettings.defaultVideoWidth || MIN_AV_WIDTH;
    
    // Get all active users with camera/video
    const activeUsers = game.webrtc?.users?.filter(u => u.active && u.canBroadcastVideo) || [];
    const userCount = activeUsers.length;
    
    if (userCount === 0) return;
    
    // Calculate new dimensions based on resize option
    if (resizeOption === DOCK_RESIZE_OPTIONS.horizontal.name) {
      // For horizontal layout, adjust width based on user count
      const newWidth = (videoWidth * userCount) + 16; // Add padding
      CameraDockUtil.cameraContainer.style.width = `${newWidth}px`;
    } else if (resizeOption === DOCK_RESIZE_OPTIONS.vertical.name) {
      // For vertical layout, adjust height based on user count
      const newHeight = (videoWidth * userCount) + 16; // Add padding
      CameraDockUtil.cameraContainer.style.height = `${newHeight}px`;
    }
    
    // Save the new dimensions
    const width = parseInt(CameraDockUtil.cameraContainer.style.width || 0);
    const height = parseInt(CameraDockUtil.cameraContainer.style.height || 0);
    
    if (width > 0) SettingsUtil.set(SETTINGS.dockWidth.tag, width);
    if (height > 0) SettingsUtil.set(SETTINGS.dockHeight.tag, height);
  }
  
  /**
   * Applies dock resize based on the specified resize option
   * @param {string} resizeValue - The resize option to apply (horizontal, vertical, or none)
   */
  static applyDockResize(resizeValue=null) {
    if (!CameraDockUtil.cameraContainer) return;
    if(!resizeValue){
      resizeValue = CameraDockUtil.currSettings.dockResizeOnUserJoin;
    }else{
      CameraDockUtil.currSettings.dockResizeOnUserJoin = resizeValue;
    }
    
    // Apply the appropriate class based on the resize option
    CameraDockUtil.cameraContainer.classList.remove('horizontal');
    CameraDockUtil.cameraContainer.classList.remove('vertical');
    const camViews = CameraDockUtil.cameraContainer.querySelector("#camera-views");
    camViews.classList.remove('horizontal');
    camViews.classList.remove('vertical');
    
    if (resizeValue === DOCK_RESIZE_OPTIONS.horizontal.name) {
      CameraDockUtil.cameraContainer.classList.add('horizontal');
    } else if (resizeValue === DOCK_RESIZE_OPTIONS.vertical.name) {
      CameraDockUtil.cameraContainer.classList.add('vertical');
    }
    
    // Update the dock size based on the new resize option
    CameraDockUtil.updateDockSize();
  }
  
  static makeResizeable(){
    if(CameraDockUtil.cameraContainer){
      const body = document.querySelector("body.crlngn-ui");
      const resizeHandle = document.createElement("div");
      const existingHandle = CameraDockUtil.cameraContainer.querySelector(".resize-handle");
      if(existingHandle){ existingHandle.remove(); }
      resizeHandle.classList.add("resize-handle");
      CameraDockUtil.cameraContainer.append(resizeHandle);

      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        CameraDockUtil.isResizing = true;
    
        CameraDockUtil.#startX = e.clientX;
        CameraDockUtil.#startY = e.clientY;
        CameraDockUtil.#startBottom = parseInt(getComputedStyle(CameraDockUtil.cameraContainer).bottom) || 0;
        CameraDockUtil.#startWidth = CameraDockUtil.cameraContainer.offsetWidth;
        CameraDockUtil.#startHeight = CameraDockUtil.cameraContainer.offsetHeight;
    
        body?.addEventListener("mousemove", CameraDockUtil.#onResize);
        body?.addEventListener("mouseup", CameraDockUtil.#onStopResize);
      });
    }
  }
  
  /**
   * Checks if the camera views are minimized based on the rtcClientSettings
   * When minimized, moves the camera views into the #interface #players element
   */
  static checkMinimizedState() {
    if (!CameraDockUtil.cameraContainer) return;
    
    // Get the current rtcClientSettings
    const rtcSettings = game.settings.get("core", "rtcClientSettings");
    const isMinimized = rtcSettings?.hideDock === true;
    if(isMinimized){
      document.querySelector("#av-holder").classList.add("minimized");
    }else{
      document.querySelector("#av-holder").classList.remove("minimized");
    }
    
    LogUtil.log("Checking minimized state", [rtcSettings, isMinimized]);
    CameraDockUtil.handleMinimizedState(isMinimized);
    // CameraDockUtil.resetPositionAndSize();
  }
  
  /**
   * Handles the minimized state of the camera views
   * @param {boolean} isMinimized - Whether the camera views are minimized
   */
  static handleMinimizedState(isMinimized) {
    const playersContainer = document.querySelector('#interface #players #players-active');
    const btnToggleIcon = CameraDockUtil.cameraContainer.querySelector("button[data-action=toggleDock]");
    if (!playersContainer || !btnToggleIcon || !CameraDockUtil.cameraContainer) return;

    LogUtil.log("handleMinimizedState", [isMinimized]);

    if (isMinimized) {
      if (CameraDockUtil.cameraContainer.parentNode !== playersContainer) {
        // Store the original parent to restore later
        CameraDockUtil.originalParent = CameraDockUtil.cameraContainer.parentNode;
        // Move to players container
        playersContainer.prepend(CameraDockUtil.cameraContainer);
        
        btnToggleIcon.classList.remove('fa-caret-down');
        btnToggleIcon.classList.remove('fa-caret-left');
        btnToggleIcon.classList.remove('fa-caret-right');
        btnToggleIcon.classList.remove('fa-compress');
        btnToggleIcon.classList.add('fa-camera');
      }
    } else {
      if (!CameraDockUtil.originalParent) return;
      // Restore to original position when not minimized
      CameraDockUtil.originalParent.prepend(CameraDockUtil.cameraContainer);

      CameraDockUtil.makeDraggable();
      CameraDockUtil.makeResizeable();
      
      btnToggleIcon.classList.remove('fa-caret-up');
      btnToggleIcon.classList.remove('fa-caret-left');
      btnToggleIcon.classList.remove('fa-caret-right');
      btnToggleIcon.classList.remove('fa-expand');
      btnToggleIcon.classList.add('fa-caret-down');
    
      LogUtil.log("Restored camera position from settings", [CameraDockUtil.currSettings]);
    
    }

    const cameraViews = CameraDockUtil.cameraContainer?.querySelector("#camera-views");
    cameraViews?.classList.remove('horizontal');
    cameraViews?.classList.remove('vertical');
  }
  
}