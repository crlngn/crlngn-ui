import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class CameraUtil {

  static init(){
    if(SettingsUtil.get(SETTINGS.enableCameraStyles.tag)){ 

      Hooks.on(HOOKS_CORE.RENDER_CAMERA_VIEWS, CameraUtil.onRender);
      CameraUtil.onRender();
      LogUtil.log("CameraUtil", [SettingsUtil.get(SETTINGS.enableCameraStyles.tag)]);
    }    
  }

  static onRender(){
    document.querySelector('#camera-views')?.classList.add('crlngn-ui');

    const controlsElem = document.querySelector('#camera-views .user-controls');
    const cameraContainer = document.querySelector('#camera-views .camera-container');
    const cameraGrid = document.querySelector('#camera-views .camera-grid');

    if(cameraGrid && cameraContainer && controlsElem){
      cameraContainer.insertBefore(controlsElem, cameraGrid);
      document.querySelector('#camera-views .camera-container')?.classList.add('visible');
    }
  }

}