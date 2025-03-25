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
import { GeneralUtil } from "./GeneralUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { UpdateNewsUtil } from "./UpdateNewsUtil.mjs";

/**
 * Main class handling core module initialization and setup
 * Manages module lifecycle, hooks, and core functionality
 */
export class Main {

  /**
   * Initialize the module and set up core hooks
   * @static
   */
  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);

      LogUtil.log("Initiating module...", [], true); 

      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
      SettingsUtil.registerSettings();

      TopNavigation.init();
      CameraUtil.init(); 
      PlayersListUtil.init(); 
      LeftControls.init();
      ChatUtil.init();
      if(TopNavigation.navFoldersEnabled){
        SceneNavFolders.registerHooks();
      }
      
      UpdateNewsUtil.init();
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      LogUtil.log("Core Ready", []);
      const SETTINGS = getSettings();
      var isDebugOn = SettingsUtil.get(SETTINGS.debugMode.tag);
      if(isDebugOn){CONFIG.debug.hooks = true};

      ModuleCompatUtil.init();
      TopNavigation.checkSceneNavCompat();

      const chatStylesEnabled = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
      if(chatStylesEnabled){ 
        Main.addCSSLocalization();
      }
      SettingsUtil.resetFoundryThemeSettings();
      // SettingsUtil.applyThemeSettings();
      
    })
  }

  // Custom labels for DnD5e buttons, added via CSS
  /**
   * Add CSS variables for DnD5e button localization
   * @static
   */
  static addCSSLocalization(){
    const locBtnPath = 'CRLNGN_UI.dnd5e.chatCard.buttons';
    
    GeneralUtil.addCSSVars('--crlngn-i18n-attack', game.i18n.localize(`${locBtnPath}.attack`));
    GeneralUtil.addCSSVars('--crlngn-i18n-damage', game.i18n.localize(`${locBtnPath}.damage`));
    GeneralUtil.addCSSVars('--crlngn-i18n-summons', game.i18n.localize(`${locBtnPath}.summons`));
    GeneralUtil.addCSSVars('--crlngn-i18n-healing', game.i18n.localize(`${locBtnPath}.healing`));
    GeneralUtil.addCSSVars('--crlngn-i18n-template', game.i18n.localize(`${locBtnPath}.template`));
    GeneralUtil.addCSSVars('--crlngn-i18n-consume', game.i18n.localize(`${locBtnPath}.consume`));
    GeneralUtil.addCSSVars('--crlngn-i18n-refund', game.i18n.localize(`${locBtnPath}.refund`));
    GeneralUtil.addCSSVars('--crlngn-i18n-macro', game.i18n.localize(`${locBtnPath}.macro`));
    GeneralUtil.addCSSVars('--crlngn-i18n-save-dc', game.i18n.localize(`${locBtnPath}.savedc`));
    GeneralUtil.addCSSVars('--crlngn-i18n-save', game.i18n.localize(`${locBtnPath}.save`));
  }

  /**
   * Handle chat message rendering
   * @private
   * @static
   * @param {ChatMessage} chatMessage - The chat message being rendered
   * @param {jQuery} html - The HTML element of the chat message
   */
  static #onRenderChatMessage = (chatMessage, html) => { 
    LogUtil.log(HOOKS_CORE.RENDER_CHAT_MESSAGE,[chatMessage, html]);
  
    ChatUtil.enrichCard(chatMessage, html);
  }

}
