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
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);
      LogUtil.log("Initiating module", [], true); 

      // Main.setupKeyListeners(); 
      SettingsUtil.registerSettings();
      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      const SETTINGS = getSettings();
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

      const chatMsgSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);
      if(chatMsgSettings.enableChatStyles){ 
        Main.addCSSLocalization();
      }
      SettingsUtil.resetFoundryThemeSettings();
    })
  }

  static addCSSLocalization(){
    const body = document.querySelector('body');
    const locBtnPath = 'CRLNGN_UI.dnd5e.chatCard.buttons';
    body.style.setProperty('--crlngn-i18n-attack', game.i18n.localize(`${locBtnPath}.attack`));
    body.style.setProperty('--crlngn-i18n-damage', game.i18n.localize(`${locBtnPath}.damage`));
    body.style.setProperty('--crlngn-i18n-summons', game.i18n.localize(`${locBtnPath}.summons`));
    body.style.setProperty('--crlngn-i18n-healing', game.i18n.localize(`${locBtnPath}.healing`));
    body.style.setProperty('--crlngn-i18n-template', game.i18n.localize(`${locBtnPath}.template`));
    body.style.setProperty('--crlngn-i18n-consume', game.i18n.localize(`${locBtnPath}.consume`));
    body.style.setProperty('--crlngn-i18n-refund', game.i18n.localize(`${locBtnPath}.refund`));
    body.style.setProperty('--crlngn-i18n-macro', game.i18n.localize(`${locBtnPath}.macro`));
    body.style.setProperty('--crlngn-i18n-save-dc', game.i18n.localize(`${locBtnPath}.savedc`));
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
