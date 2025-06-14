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
import { CustomHandlebarsHelpers } from "./CustomHandlebarsHelpers.mjs";
import { SheetsUtil } from "./SheetsUtil.mjs";

/**
 * Main class handling core module initialization and setup
 * Manages module lifecycle, hooks, and core functionality
 */
export class Main {
  static isIncompatible = false;

  /**
   * Initialize the module and set up core hooks
   * @static
   */
  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      // Add notification if Foundry version is incompatible
      const foundryVersion = game.data.version;
      const maxVersion = Number("12.999");
      if(foundryVersion > maxVersion){
        Main.isIncompatible = true;
        return;
      }

      document.querySelector("body").classList.add(MODULE_ID); 
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);
      document.querySelector("body").classList.add('crlngn-sheets'); 

      LogUtil.log("Initiating module...", [], true);

      SettingsUtil.registerSettings();
      const SETTINGS = getSettings();
      const uiEnabled = SettingsUtil.get(SETTINGS.disableUI.tag);
      LogUtil.log(HOOKS_CORE.INIT,[uiEnabled]);
      if(uiEnabled){
        document.querySelector("body").classList.remove(MODULE_ID); 
        document.querySelector("#ui-middle")?.classList.remove(MODULE_ID);

        return;
      }

      // if(TopNavigation.useSceneFolders){
      //   SceneNavFolders.init();
      // }

      TopNavigation.init();
      CameraUtil.init(); 
      PlayersListUtil.init(); 
      LeftControls.init();
      ChatUtil.init();

      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      LogUtil.log("Core Ready", []);
      // Add notification if Foundry version is incompatible
      if(Main.isIncompatible){
        ui.notifications.error(game.i18n.localize("CRLNGN_UI.notifications.incompatibleVersion"));
        return;
      }

      const SETTINGS = getSettings();
      SettingsUtil.applySettings();

      var isDebugOn = SettingsUtil.get(SETTINGS.debugMode.tag);
      if(isDebugOn){CONFIG.debug.hooks = true};

      CustomHandlebarsHelpers.init();
      ModuleCompatUtil.init();
      TopNavigation.checkSceneNavCompat();
      UpdateNewsUtil.init();
      SheetsUtil.init();

      // if(TopNavigation.useSceneFolders){
      //   SceneNavFolders.init();
      //   // SceneNavFolders.registerHooks();
      // }

      const chatStylesEnabled = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
      if(chatStylesEnabled){ 
        Main.addCSSLocalization();
      }
      
      // SettingsUtil.set(SETTINGS.otherModulesList.tag, "'monks-scene-nav','combat-carousel','dice-tray','hurry-up'");
      // LogUtil.log("SETTING!!!", [SettingsUtil.get(SETTINGS.otherModulesList.tag)]);
      SettingsUtil.resetFoundryThemeSettings();
      SettingsUtil.applyOtherModulesList();
      // SettingsUtil.applyThemeSettings();
      
      const isMinimalUiOn = GeneralUtil.isModuleOn('minimal-ui');
      if(isMinimalUiOn){
        ui.notifications.warn(game.i18n.localize('CRLNGN_UI.ui.notifications.minimalUiNotSupported'),{ permanent: true });
      }

      SettingsUtil.firstLoad = false;
    });
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
