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
      dockWasResized: SettingsUtil.get(SETTINGS.dockWasResized.tag),
      dockResizeOnUserJoin: SettingsUtil.get(SETTINGS.dockResizeOnUserJoin.tag),
    }

    if(CameraUtil.currSettings.enableFloatingDock){ 
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRenderFloating);
      LogUtil.log("CameraUtil settings", [CameraUtil.currSettings]);
      CameraUtil.onRenderFloating();
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
    document.querySelector('#camera-views')?.classList.add('visible');
  }

  /**
   * Renders the camera in floating mode
   * Sets up draggable and resizable functionality
   * Positions camera based on saved settings
   */
  static onRenderFloating(){
    const SETTINGS = getSettings();
    const cameraSettings = CameraUtil.currSettings; // SettingsUtil.get(SETTINGS.cameraDockMenu.tag);

    document.querySelector('#camera-views')?.classList.add('crlngn-ui');
    CameraUtil.cameraContainer = document.querySelector('#camera-views .camera-container');

    const controlsElem = document.querySelector('#camera-views .user-controls');
    const cameraGrid = document.querySelector('#camera-views .camera-grid');

    LogUtil.log("CameraUtil.onRender", [ cameraSettings.dockPosX, cameraSettings.dockPosY ]);

    if(CameraUtil.cameraContainer && cameraGrid && controlsElem){
      CameraUtil.cameraContainer?.insertBefore(controlsElem, cameraGrid);
      document.querySelector('#camera-views .camera-container')?.classList.add('visible');
    }
    CameraUtil.makeDraggable();
    CameraUtil.makeResizeable();
    CameraUtil.resetPositionAndSize();
    CameraUtil.placeControlsToggle();
    CameraUtil.applyDockResize();
    CameraUtil.applyVideoWidth();
  }

  static applyDockResize(resizeValue) {
    const value = resizeValue || CameraUtil.currSettings.dockResizeOnUserJoin;
    if(value===DOCK_RESIZE_OPTIONS.horizontal.name){
      document.querySelector('#camera-views')?.classList.add('crlngn-horizontal');
      document.querySelector('#camera-views')?.classList.remove('crlngn-vertical');
    }else if(value===DOCK_RESIZE_OPTIONS.vertical.name){
      document.querySelector('#camera-views')?.classList.add('crlngn-vertical');
      document.querySelector('#camera-views')?.classList.remove('crlngn-horizontal');
    }else{
      document.querySelector('#camera-views')?.classList.remove('crlngn-vertical');
      document.querySelector('#camera-views')?.classList.remove('crlngn-horizontal');
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
      
      CameraUtil.resizeDock();
    }
  }

  /**
   * Places the camera controls toggle button
   * Creates and positions play/pause button if it doesn't exist
   */
  static placeControlsToggle(){ 
    const camControls = document.querySelector('#camera-views .user-controls');
    const existingButtons = camControls?.querySelectorAll(".crlngn-video-toggle");
    LogUtil.log("placeControlsToggle", [camControls, existingButtons]);

    if(existingButtons?.length > 0){
      return; 
    }

    const controlBar = document.querySelector('#camera-views .user-controls .control-bar');
    const btnToggle = document.createElement("button"); 
    btnToggle.classList.add("crlngn-video-toggle"); 
    btnToggle.innerHTML = '<i class="fa fa-play-circle" aria-hidden="true"></i>';

    camControls?.insertBefore(btnToggle, controlBar);
  }

  /**
   * Makes the camera container draggable
   * Sets up mouse and touch event listeners for drag functionality
   */
  static makeDraggable(){
    // Handle mouse events
    CameraUtil.cameraContainer?.addEventListener("mousedown", (e) => {
      // Only trigger drag on left mouse button (button 0)
      if (e.button !== 0) return;
      
      const body = document.querySelector("body.crlngn-ui");
      
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body?.addEventListener("mousemove", CameraUtil.#onDragMove);
      body?.addEventListener("mouseup", CameraUtil.#onDragRelease); 

      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = e.clientX - CameraUtil.cameraContainer?.offsetLeft;
      CameraUtil.#offsetY = (window.innerHeight - e.clientY) - offsetBottom;

      e.preventDefault();
      e.stopPropagation();
    });
    
    // Handle touch events
    CameraUtil.cameraContainer?.addEventListener("touchstart", (e) => {
      // Skip if this is a multi-touch gesture (right-click equivalent)
      if (e.touches.length > 1) return;
      
      const body = document.querySelector("body.crlngn-ui");
      
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body?.addEventListener("touchmove", CameraUtil.#onTouchMove);
      body?.addEventListener("touchend", CameraUtil.#onTouchRelease);
      body?.addEventListener("touchcancel", CameraUtil.#onTouchRelease);

      const touch = e.touches[0];
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = touch.clientX - CameraUtil.cameraContainer?.offsetLeft;
      CameraUtil.#offsetY = (window.innerHeight - touch.clientY) - offsetBottom;

      // Prevent scrolling while dragging
      e.preventDefault();
      e.stopPropagation();
    });
  }

  /**
   * Makes the camera container resizable
   * Adds resize handle and sets up mouse event listeners
   */
  static makeResizeable(){
    if(CameraUtil.cameraContainer){
      const body = document.querySelector("body.crlngn-ui");
      const resizeHandle = document.createElement("div");
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
    if(!x && !y && !w && !h){
      const savedPosX = cameraSettings.dockPosX || 0;
      const savedPosY = cameraSettings.dockPosY || 0;
      CameraUtil.cameraContainer.style.left = `${savedPosX}px`;
      CameraUtil.cameraContainer.style.bottom = `${savedPosY}px`;
      if(CameraUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.off.name){
        const savedWidth = cameraSettings.dockWidth || 0;
        const savedHeight = cameraSettings.dockHeight || 0;
        CameraUtil.cameraContainer.style.width = `${savedWidth}px`;
        CameraUtil.cameraContainer.style.height = `${savedHeight}px`;
      }
    }else{
      if(x){
        CameraUtil.cameraContainer.style.left = `${x}px`;
      }
      if(y){
        CameraUtil.cameraContainer.style.bottom = `${y}px`;
      }
      if(CameraUtil.currSettings.dockResizeOnUserJoin===DOCK_RESIZE_OPTIONS.horizontal.name){
        if(w){
          CameraUtil.cameraContainer.style.width = `${w}px`;
        }
        if(h){
          CameraUtil.cameraContainer.style.height = `${h}px`;
        }
      }
    }
  }

  static resizeDock = () => {
    const SETTINGS = getSettings();
    const cameraSettings = CameraUtil.currSettings; //SettingsUtil.get(SETTINGS.cameraDockMenu.tag);

    if(!cameraSettings.enableFloatingDock || !CameraUtil.cameraContainer){ return };

  }

  // when user releases element
  /**
   * Handles the release of drag operation
   * Saves the final position to settings
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  static #onDragRelease(e){
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};//SettingsUtil.get(SETTINGS.cameraDockMenu.tag)};

    if(CameraUtil.isDragging){ 
      const body = document.querySelector("body.crlngn-ui"); 
      cameraSettings.dockPosX = parseInt(CameraUtil.cameraContainer?.style.left) || 0; 
      cameraSettings.dockPosY = parseInt(CameraUtil.cameraContainer?.style.bottom) || 0; 

      if(cameraSettings.dockPosY <= 0){ cameraSettings.dockPosY = 0 }
      SettingsUtil.set(SETTINGS.dockPosX.tag, cameraSettings.dockPosX);
      SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
      
      body?.removeEventListener("mousemove", CameraUtil.#onDragMove); 
      body?.removeEventListener("mouseup", CameraUtil.#onDragRelease); 
  
      CameraUtil.isDragging = false; 
      e.stopPropagation(); 
    }
    
  }
  
  /**
   * Handles the release of touch drag operation
   * Saves the final position to settings
   * @param {TouchEvent} e - Touch event
   * @private
   */
  static #onTouchRelease(e){
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};//{...SettingsUtil.get(SETTINGS.cameraDockMenu.tag)};

    if(CameraUtil.isDragging){ 
      const body = document.querySelector("body.crlngn-ui"); 
      cameraSettings.dockPosX = parseInt(CameraUtil.cameraContainer?.style.left) || 0; 
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
  } 

  // when user drags element
  /**
   * Handles the drag movement of the camera container
   * Updates position based on mouse movement
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  static #onDragMove(e){ 
    if (!CameraUtil.isDragging) return; 
    LogUtil.log("mousemove", [ e.target.parentNode ]); 
    
    if(CameraUtil.cameraContainer){
      let left = e.clientX - CameraUtil.#offsetX;
      let bottom = (window.innerHeight - e.clientY) -  CameraUtil.#offsetY;

      if(left + CameraUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraUtil.cameraContainer.offsetWidth;
      }
      CameraUtil.cameraContainer.style.left = `${left}px`;

      if(bottom + CameraUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraUtil.cameraContainer.offsetHeight;
      } 
      CameraUtil.cameraContainer.style.bottom = `${bottom}px`;
    }
    e.preventDefault();
    e.stopPropagation(); 
  }
  
  /**
   * Handles the touch drag movement of the camera container
   * Updates position based on touch movement
   * @param {TouchEvent} e - Touch event
   * @private
   */
  static #onTouchMove(e){ 
    if (!CameraUtil.isDragging || !e.touches[0]) return; 
    
    if(CameraUtil.cameraContainer){
      const touch = e.touches[0];
      let left = touch.clientX - CameraUtil.#offsetX;
      let bottom = (window.innerHeight - touch.clientY) -  CameraUtil.#offsetY;

      if(left + CameraUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraUtil.cameraContainer.offsetWidth;
      }
      CameraUtil.cameraContainer.style.left = `${left}px`;

      if(bottom + CameraUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraUtil.cameraContainer.offsetHeight;
      } 
      CameraUtil.cameraContainer.style.bottom = `${bottom}px`;
    }
    e.preventDefault();
    e.stopPropagation(); 
  } 

  // when user drags the resize handle
  /**
   * Handles the resize operation of the camera container
   * Updates size based on mouse movement
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  static #onResize(e) {
    if (!CameraUtil.isResizing) return;
    const newWidth = CameraUtil.#startWidth + (e.clientX - CameraUtil.#startX);
    const deltaY = e.clientY - CameraUtil.#startY; // How much the mouse moved
    const newHeight = CameraUtil.#startHeight + deltaY;
    const newBottom = CameraUtil.#startBottom - deltaY;

    CameraUtil.cameraContainer.style.width = `${newWidth}px`;
    CameraUtil.cameraContainer.style.height = `${newHeight}px`;
    CameraUtil.cameraContainer.style.bottom = `${newBottom}px`;
  }

  // when user releases the resize handle
  static #onStopResize() {
    const SETTINGS = getSettings();
    const cameraSettings = {...CameraUtil.currSettings};//{...SettingsUtil.get(SETTINGS.cameraDockMenu.tag)};

    const body = document.querySelector("body.crlngn-ui");
    CameraUtil.isResizing = false;
    body?.removeEventListener("mousemove", CameraUtil.#onResize);
    body?.removeEventListener("mouseup", CameraUtil.#onStopResize);

    LogUtil.log("onStopResize", [CameraUtil.cameraContainer?.style.width, CameraUtil.cameraContainer?.style.height, CameraUtil.cameraContainer?.style.bottom]);

    cameraSettings.dockWidth = parseInt(CameraUtil.cameraContainer?.style.width || 0);
    cameraSettings.dockHeight = parseInt(CameraUtil.cameraContainer?.style.height || 0);
    cameraSettings.dockPosY = parseInt(CameraUtil.cameraContainer?.style.bottom || 0);

    SettingsUtil.set(SETTINGS.dockWidth.tag, cameraSettings.dockWidth);
    SettingsUtil.set(SETTINGS.dockHeight.tag, cameraSettings.dockHeight);
    SettingsUtil.set(SETTINGS.dockPosY.tag, cameraSettings.dockPosY);
    SettingsUtil.set(SETTINGS.dockWasResized.tag, true);
  }

}