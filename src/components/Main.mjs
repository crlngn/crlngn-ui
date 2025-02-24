import { HOOKS_CORE } from "../constants/Hooks.mjs"; 
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs"; 
import { TopNavigation } from "./TopNavUtil.mjs"; 
import { ChatUtil } from "./ChatUtil.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
import { PlayersListUtil } from "./PlayersListUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LeftControls } from "./LeftControlsUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class Main {
  static SETTINGS;

  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      Main.SETTINGS = getSettings();
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);
      LogUtil.log("Initiating module", [], true); 

      // Main.setupKeyListeners(); 
      SettingsUtil.registerSettings();
      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      var isDebugOn = SettingsUtil.get('debug-mode');
      if(isDebugOn){CONFIG.debug.hooks = true};

      // Get the array of available font families
      const availableFonts = CONFIG.fontFamilies || [];


      // If you need the complete font settings including URLs
      const fontSettings = SettingsUtil.get("fonts", "core");

      LogUtil.log("Core Ready", [CONFIG, availableFonts, fontSettings]);

      TopNavigation.init(); 
      CameraUtil.init(); 
      PlayersListUtil.init(); 
      LeftControls.init();

      LogUtil.log("GAME", [game.collections.find(c=>c.key=="Scene"),game.collections.get("Scene"), ui]); 
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

  static #onRenderChatMessage = (chatMessage, html) => { 
    LogUtil.log(HOOKS_CORE.RENDER_CHAT_MESSAGE,[chatMessage, html]);
  
    ChatUtil.enrichCard(chatMessage, html);
  }

}
