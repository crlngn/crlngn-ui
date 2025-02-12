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

  static init(){
    if(SettingsUtil.get(SETTINGS.enableCameraStyles.tag)){ 

      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRender);
      LogUtil.log("CameraUtil", [SettingsUtil.get(SETTINGS.enableCameraStyles.tag)]);
      // CameraUtil.onRender();
    }    
  }

  static onRender(){
    document.querySelector('#camera-views')?.classList.add('crlngn-ui');
    CameraUtil.cameraContainer = document.querySelector('#camera-views .camera-container');

    const controlsElem = document.querySelector('#camera-views .user-controls');
    const cameraGrid = document.querySelector('#camera-views .camera-grid');

    LogUtil.log("CameraUtil.onRender", [ SettingsUtil.get(SETTINGS.cameraDockPosX.tag), SettingsUtil.get(SETTINGS.cameraDockPosY.tag) ]);

    CameraUtil.resetPosition();
    CameraUtil.placeControlsToggle();

    if(CameraUtil.cameraContainer && cameraGrid && controlsElem){
      CameraUtil.cameraContainer.insertBefore(controlsElem, cameraGrid);
      document.querySelector('#camera-views .camera-container')?.classList.add('visible');
    }
    CameraUtil.makeDraggable();
  }

  static placeControlsToggle(){ 
    const camControls = document.querySelector('#camera-views .user-controls');
    const existingButtons = camControls?.querySelectorAll(".crlngn-video-toggle");
    LogUtil.log("placeControlsToggle", [camControls, existingButtons]);

    if(existingButtons.length > 0){
      return; 
    }

    const controlBar = document.querySelector('#camera-views .user-controls .control-bar');
    const btnToggle = document.createElement("button"); 
    btnToggle.classList.add("crlngn-video-toggle"); 
    btnToggle.innerHTML = '<i class="fa fa-play-circle" aria-hidden="true"></i>';

    camControls?.insertBefore(btnToggle, controlBar);
  }

  static makeDraggable(){
    // const dragHandle = CameraUtil.cameraContainer.querySelector("drag-handle");
    const body = document.querySelector("body.crlngn-ui");
    CameraUtil.cameraContainer.addEventListener("mousedown", (e) => {
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      CameraUtil.isDragging = true;
      CameraUtil.#offsetX = e.clientX - CameraUtil.cameraContainer.offsetLeft;
      CameraUtil.#offsetY = (window.innerHeight - e.clientY) - offsetBottom;
      CameraUtil.cameraContainer.style.zIndex = "1001";

      e.stopPropagation();
    });

    body.addEventListener("mousemove", (e) => {
      if (!CameraUtil.isDragging) return; 
      const offsetBottom = GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer);
      LogUtil.log("mousemove", [ offsetBottom, e.clientX - CameraUtil.#offsetX, (window.innerHeight - e.clientY) - CameraUtil.#offsetY ]);

      CameraUtil.cameraContainer.style.left = `${e.clientX - CameraUtil.#offsetX}px`;
      CameraUtil.cameraContainer.style.bottom = `${(window.innerHeight - e.clientY) -  CameraUtil.#offsetY}px`;
      // e.stopPropagation();
    });

    body.addEventListener("mouseup", (e) => {
      CameraUtil.isDragging = false; 
      SettingsUtil.set(SETTINGS.cameraDockPosX.tag, parseInt(CameraUtil.cameraContainer.style.left));
      SettingsUtil.set(SETTINGS.cameraDockPosY.tag, parseInt(CameraUtil.cameraContainer.style.bottom));
      LogUtil.log("mouseup", [ GeneralUtil.getOffsetBottom(CameraUtil.cameraContainer), CameraUtil.#offsetX, CameraUtil.#offsetY ]);

      e.stopPropagation();
    });
  }

  static resetPosition(){
    const savedPosX = SettingsUtil.get(SETTINGS.cameraDockPosX.tag);
    const savedPosY = SettingsUtil.get(SETTINGS.cameraDockPosY.tag);

    if(!savedPosX || !savedPosY){return;}
    CameraUtil.cameraContainer.style.left = `${savedPosX}px`;
    CameraUtil.cameraContainer.style.bottom = `${savedPosY}px`;
  }

}