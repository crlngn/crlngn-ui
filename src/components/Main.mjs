import { HOOKS_CORE } from "../constants/Hooks.mjs"; 
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs"; 
import { TopNavigation } from "./TopNavUtil.mjs"; 
import { ChatUtil } from "./ChatUtil.mjs";
import { CameraUtil } from "./CameraUtil.mjs";
import { PlayersListUtil } from "./PlayersListUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";

export class Main {
  static SETTINGS;

  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      Main.SETTINGS = getSettings();
      document.querySelector("#ui-middle")?.classList.add("crlngn-ui");
      LogUtil.log("Initiating module", [], true); 

      // Main.setupKeyListeners(); 
      SettingsUtil.registerSettings();
      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      var isDebugOn = SettingsUtil.get('debug-mode');
      if(isDebugOn){CONFIG.debug.hooks = true};

      const testTemplate = loadTemplates(["modules/crlngn-ui/templates/custom-fonts-settings.hbs"]).then((a)=>{
        LogUtil.log("Loaded template", [a]);
      });
      LogUtil.log("Core Ready", [testTemplate]);

      TopNavigation.init(); 
      CameraUtil.init(); 
      PlayersListUtil.init(); 


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
