import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class CameraUtil {
  static #offsetX = 0;
  static #offsetY = 0;
  static isDragging = false;
  static cameraContainer;
  //resizing
  static isResizing = false;
  static #startX = 0;
  static #startY = 0;
  static #startWidth = 0;
  static #startHeight = 0;
  static #startBottom = 0;

  static init(){ 
    if(SettingsUtil.get(SETTINGS.enableCameraStyles.tag)){ 
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRenderFloating);
      LogUtil.log("CameraUtil", [SettingsUtil.get(SETTINGS.enableCameraStyles.tag)]);
      CameraUtil.onRenderFloating();
    }else{ 
      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRenderPlain);
      CameraUtil.onRenderPlain();
    } 
  }

  static onRenderPlain(){
    document.querySelector('#camera-views')?.classList.add('visible');
  }

  static onRenderFloating(){
    document.querySelector('#camera-views')?.classList.add('crlngn-ui');
    CameraUtil.cameraContainer = document.querySelector('#camera-views .camera-container');

    const controlsElem = document.querySelector('#camera-views .user-controls');
    const cameraGrid = document.querySelector('#camera-views .camera-grid');

    LogUtil.log("CameraUtil.onRender", [ SettingsUtil.get(SETTINGS.cameraDockPosX.tag), SettingsUtil.get(SETTINGS.cameraDockPosY.tag) ]);

    if(CameraUtil.cameraContainer && cameraGrid && controlsElem){
      CameraUtil.cameraContainer?.insertBefore(controlsElem, cameraGrid);
      document.querySelector('#camera-views .camera-container')?.classList.add('visible');
    }
    CameraUtil.makeDraggable();
    CameraUtil.makeResizeable();
    CameraUtil.resetPositionAndSize();
    CameraUtil.placeControlsToggle();
  }

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

  static makeDraggable(){
    CameraUtil.cameraContainer?.addEventListener("mousedown", (e) => {
      const body = document.querySelector("body.crlngn-ui");
      LogUtil.log("mousedown", [ e.target ]);
      if(e.target.parentNode?.classList.contains('volume-bar')){
        return;
      }
      body?.addEventListener("mousemove", CameraUtil.#onDragMove);
      body?.addEventListener("mouseup", CameraUtil.#onDragRelease); 

      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = e.clientX - CameraUtil.cameraContainer?.offsetLeft;
      CameraUtil.#offsetY = (window.innerHeight - e.clientY) - offsetBottom;
      // CameraUtil.cameraContainer.style.zIndex = "101"; 

      e.stopPropagation();
    }); 

  }

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

  static resetPositionAndSize({x, y, w, h} = { x: null, y: null, w: null, h: null }){
    if(!CameraUtil.cameraContainer){ return }
    if(!x && !y && !w && !h){
      const savedPosX = SettingsUtil.get(SETTINGS.cameraDockPosX.tag) || 0;
      const savedPosY = SettingsUtil.get(SETTINGS.cameraDockPosY.tag) || 0;
      const savedWidth = SettingsUtil.get(SETTINGS.cameraDockWidth.tag) || 0;
      const savedHeight = SettingsUtil.get(SETTINGS.cameraDockHeight.tag) || 0;
      CameraUtil.cameraContainer.style.left = `${savedPosX}px`;
      CameraUtil.cameraContainer.style.bottom = `${savedPosY}px`;
      CameraUtil.cameraContainer.style.width = `${savedWidth}px`;
      CameraUtil.cameraContainer.style.height = `${savedHeight}px`;
    }
    if(x){
      CameraUtil.cameraContainer.style.left = `${x}px`;
    }
    if(y){
      CameraUtil.cameraContainer.style.bottom = `${y}px`;
    }
    if(w){
      CameraUtil.cameraContainer.style.width = `${w}px`;
    }
    if(h){
      CameraUtil.cameraContainer.style.height = `${h}px`;
    }
  }

  // when user releases element
  static #onDragRelease(e){
    if(CameraUtil.isDragging){
      const body = document.querySelector("body.crlngn-ui");
      SettingsUtil.set(SETTINGS.cameraDockPosX.tag, parseInt(CameraUtil.cameraContainer?.style.left) || 0);
      SettingsUtil.set(SETTINGS.cameraDockPosY.tag, parseInt(CameraUtil.cameraContainer?.style.bottom) || 0);
      
      body?.removeEventListener("mousemove", CameraUtil.#onDragMove); 
      body?.removeEventListener("mouseup", CameraUtil.#onDragRelease); 
  
      CameraUtil.isDragging = false; 
      e.stopPropagation(); 
    }
    
  } 

  // when user drags element
  static #onDragMove(e){ 
    if (!CameraUtil.isDragging) return; 
    LogUtil.log("mousemove", [ e.target.parentNode ]); 
    
    if(CameraUtil.cameraContainer){
      let left = e.clientX - CameraUtil.#offsetX;
      let bottom = (window.innerHeight - e.clientY) -  CameraUtil.#offsetY;

      if(left + CameraUtil.cameraContainer.offsetWidth > window.innerWidth){  
        left = window.innerWidth - CameraUtil.cameraContainer.offsetWidt;
      }
      CameraUtil.cameraContainer.style.left = `${left}px`;

      if(bottom + CameraUtil.cameraContainer.offsetHeight > window.innerHeight){  
        bottom = window.innerHeight - CameraUtil.cameraContainer.offsetHeight;
      } 
      CameraUtil.cameraContainer.style.bottom = `${bottom}px`;
    }
    // e.stopPropagation(); 
  } 

  // when user drags the resize handle
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
    const body = document.querySelector("body.crlngn-ui");
    CameraUtil.isResizing = false;
    body?.removeEventListener("mousemove", CameraUtil.#onResize);
    body?.removeEventListener("mouseup", CameraUtil.#onStopResize);

    LogUtil.log("onStopResize", [CameraUtil.cameraContainer?.style.width, CameraUtil.cameraContainer?.style.height, CameraUtil.cameraContainer?.style.bottom])
    SettingsUtil.set(SETTINGS.cameraDockWidth.tag, parseInt(CameraUtil.cameraContainer?.style.width || 0));
    SettingsUtil.set(SETTINGS.cameraDockHeight.tag, parseInt(CameraUtil.cameraContainer?.style.height || 0));
    SettingsUtil.set(SETTINGS.cameraDockPosY.tag, parseInt(CameraUtil.cameraContainer?.style.bottom) || 0);

  }

}