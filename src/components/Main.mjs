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

export class Main {

  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);
      LogUtil.log("Initiating module...", [], true); 

      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
      Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, Main.checkPlayersList);
      SettingsUtil.registerSettings();
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      LogUtil.log("Core Ready", []);
      const SETTINGS = getSettings();
      var isDebugOn = SettingsUtil.get(SETTINGS.debugMode.tag);
      if(isDebugOn){CONFIG.debug.hooks = true};

      TopNavigation.init(); 
      CameraUtil.init(); 
      PlayersListUtil.init(); 
      LeftControls.init();
      ChatUtil.init();
      ModuleCompatUtil.init();

      const chatStylesEnabled = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
      if(chatStylesEnabled){ 
        Main.addCSSLocalization();
      }
      SettingsUtil.resetFoundryThemeSettings();
      
    })
  }

  // Custom labels for DnD5e buttons, added via CSS
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

  static #onRenderChatMessage = (chatMessage, html) => { 
    LogUtil.log(HOOKS_CORE.RENDER_CHAT_MESSAGE,[chatMessage, html]);
  
    ChatUtil.enrichCard(chatMessage, html);
  }

  static checkPlayersList = () => {
    const body = document.querySelector('body');
    const uiLeftPlayers = document.querySelector('#ui-left #players');
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    const isPlayersDocked = isTaskbarOn ? game.settings.get('foundry-taskbar','dockPlayersList') : false;
    // LogUtil.log('checkPlayersList',[isPlayersDocked, isTaskbarOn, game.settings]);
    
    if(body.querySelector('#players.auto-hide')){
      body.classList.add('with-players-hide');
      body.classList.remove('with-players');
      body.classList.remove('players-hidden');
    }else if(isPlayersDocked){
      body.classList.remove('with-players');
      body.classList.remove('with-players-hide');
      body.classList.add('players-hidden');
    }else if(uiLeftPlayers){
      body.classList.add('with-players');
      body.classList.remove('with-players-hide');
      body.classList.remove('players-hidden');
    }
  }

}
