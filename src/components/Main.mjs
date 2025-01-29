import { HOOKS_CORE } from "../constants/Hooks.mjs"; 
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs"; 
import { TopNavigation } from "./TopNavUtil.mjs"; 

export class Main {

  static init(){

    Hooks.once(HOOKS_CORE.INIT, () => { 

      LogUtil.log("Initiating module", [], true); 
      // Main.setupKeyListeners(); 
      SettingsUtil.registerSettings();

    });

    Hooks.once(HOOKS_CORE.READY, () => {
      
      TopNavigation.init(); 

      var isDebugOn = SettingsUtil.get('debug-mode');
      if(isDebugOn){CONFIG.debug.hooks = true};
      LogUtil.log("Core Ready", []);
    })
  }

  static setupKeyListeners(){
    // Listen to keydown event and store keys
    window.addEventListener('keydown', (event) => {
      const keyPressed = event.key;
      const index = Main.keysPressed.indexOf(keyPressed);

      if(index < 0){
        Main.keysPressed.push(keyPressed);
      }
      LogUtil.log("Keydown", [Main.keysPressed]);
    });

    // Listen to keyup event and remove keys
    window.addEventListener('keyup', (event) => {
      const keyReleased = event.key;
      const index = Main.keysPressed.indexOf(keyReleased);

      if(index >= 0){
        Main.keysPressed.splice(index,1);
      }
      LogUtil.log("Keyup", [Main.keysPressed]); 
    });
  }

}
