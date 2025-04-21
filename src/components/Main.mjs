import { HOOKS_CORE } from "../constants/Hooks.mjs"; 
import { LogUtil } from "./LogUtil.mjs"; 
import { SettingsUtil } from "./SettingsUtil.mjs"; 
import { TopNavigation } from "./TopNavUtil.mjs"; 
import { ChatUtil } from "./ChatUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LeftControls } from "./LeftControlsUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { UpdateNewsUtil } from "./UpdateNewsUtil.mjs";
import { CustomHandlebarsHelpers } from "./CustomHandlebarsHelpers.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";
import { SidebarTabs } from "./SidebarUtil.mjs";
import { MacroHotbar } from "./MacroHotbarUtil.mjs";
import { ChatLogControls } from "./ChatLogControlsUtil.mjs";

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
      document.querySelector("body").classList.add(MODULE_ID); 
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);

      // Hooks.on(HOOKS_CORE.RENDER_SCENE_NAV, TopNavigation.onRender);

      LogUtil.log("Initiating module...", [], true); 
      // Create namespace
      window.crlngnUI = window.crlngnUI || {};

      SettingsUtil.registerSettings();
      const SETTINGS = getSettings();
      const uiDisabled = SettingsUtil.get(SETTINGS.disableUI.tag);
      LogUtil.log(HOOKS_CORE.INIT,[uiDisabled]);

      if(uiDisabled){
        document.querySelector("body").classList.remove(MODULE_ID); 
        document.querySelector("#ui-middle")?.classList.remove(MODULE_ID);

        return;
      }

      // if(TopNavigation.navFoldersEnabled){
      //   // Add SceneNavFolders to window namespace
      //   window.crlngnUI.SceneNavFolders = SceneNavFolders;
      //   SceneNavFolders.init();
      // }

      TopNavigation.init();
      CameraDockUtil.init(); 
      LeftControls.init();
      ChatLogControls.init();
      ChatUtil.init();
      SidebarTabs.init();
      PlayersList.init(); 
      MacroHotbar.init(); 

      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      LogUtil.log("Core Ready", []);
      const SETTINGS = getSettings();
      // LogUtil.log('Available libraries:', [Object.keys(window).filter(key => 
      //   typeof window[key] === 'function' && 
      //   /^[A-Z]/.test(key) && 
      //   key.length > 3
      // )]);

      var isDebugOn = SettingsUtil.get(SETTINGS.debugMode.tag);
      if(isDebugOn){CONFIG.debug.hooks = true};

      CustomHandlebarsHelpers.init();
      PlayersList.applyPlayersListSettings(); 
      ModuleCompatUtil.init();
      // TopNavigation.checkSceneNavCompat();
      UpdateNewsUtil.init();

      // if(TopNavigation.navFoldersEnabled){
      //   SceneNavFolders.init();
      //   SceneNavFolders.registerHooks();
      // }
      
      const chatStylesEnabled = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
      if(chatStylesEnabled){ 
        Main.addCSSLocalization();
      }
      
      SettingsUtil.resetFoundryThemeSettings();
      // SettingsUtil.applyOtherModulesList();
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
