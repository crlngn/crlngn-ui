import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";

/**
 * Utility class for handling compatibility with other Foundry VTT modules
 * Manages interactions and adjustments needed for module interoperability
 */
export class ModuleCompatUtil {
  /**
   * @private
   * Timeout handle for debouncing players list checks
   */
  static #checkPlayersTimeout;
  static #ytPlayerInterval;
  static #ytPlayerIntervalCount = 0;
  // static ytWigdetFadeOut = true;
  /**
   * Initializes module compatibility features
   * Sets up hooks for players list and taskbar integration
   */
  static init(){
    // taskbar
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    if(isTaskbarOn){
      Hooks.on(HOOKS_CORE.UPDATE_USER, ModuleCompatUtil.checkTaskbarLock);
    }
    ModuleCompatUtil.checkTaskbarLock();
    ModuleCompatUtil.addModuleClasses();
    const isMinimalUiOn = GeneralUtil.isModuleOn('minimal-ui');
    if(isMinimalUiOn){
      ui.notifications.warn(game.i18n.localize('CRLNGN_UI.ui.notifications.minimalUiNotSupported'),{ permanent: true });
    }

    Hooks.on(HOOKS_CORE.CLIENT_SETTING_CHANGED, (settings)=>{
      if(settings.includes('fvtt-youtube-player.windowPosition')) ModuleCompatUtil.handleYTPlayerFadeOut();
    });

    ModuleCompatUtil.#ytPlayerIntervalCount = 0;
    ModuleCompatUtil.#ytPlayerInterval = setInterval(() => {
      if(document.querySelector('#sidebar-video-player') || ModuleCompatUtil.#ytPlayerIntervalCount >= 10){
        clearInterval(ModuleCompatUtil.#ytPlayerInterval);
        ModuleCompatUtil.handleYTPlayerFadeOut();
      }
      ModuleCompatUtil.#ytPlayerIntervalCount++;
    }, 200);

    // check Chat Pins module
    const isChatPinsOn = GeneralUtil.isModuleOn('dfreds-chat-pins');
    if(isChatPinsOn){
      const chatPinsPopout = document.querySelector('#chat-pins');
      const uiConfig = game.settings.get('core', 'uiConfig');
      const currentTheme = uiConfig?.colorScheme?.interface;

      LogUtil.log("currentTheme", [currentTheme, chatPinsPopout]);
      chatPinsPopout?.classList.add(`theme-${currentTheme}`);
    }
  }

  static handleYTPlayerFadeOut(){
    const isYTPlayerOn = GeneralUtil.isModuleOn('fvtt-youtube-player');
    const ytPlayer = document.querySelector('#sidebar-video-player.tyw-docked');
    
    
    LogUtil.log("handleYTPlayerFadeOut", [isYTPlayerOn, PlayersList.useFadeOut, ytPlayer]);
    if(isYTPlayerOn && ytPlayer && PlayersList.useFadeOut){
      document.querySelector('#sidebar-video-player.tyw-docked')?.classList.add('faded-ui');
    }else if(isYTPlayerOn){
      document.querySelector('#sidebar-video-player')?.classList.remove('faded-ui');
    }
  }

  static addModuleClasses = () => {
    const SETTINGS = getSettings();
    const moduleCompatSettings = SettingsUtil.get(SETTINGS.otherModulesList.tag) || "";
    const splitList = moduleCompatSettings.split(",");
    LogUtil.log("addModuleClasses", [splitList, moduleCompatSettings]);

    Object.entries(SETTINGS.otherModulesList.options).forEach(opt => {
      const moduleId = opt[1].replace(/'/g, "");
      document.querySelector('body').classList.remove('crlngn-'+moduleId);
    })

    splitList.forEach(item => {
      const moduleId = item.replace(/'/g, "");
      document.querySelector('body').classList.add('crlngn-'+moduleId);
    });
  }

  /**
   * Checks and applies taskbar lock settings
   * Adjusts UI variables based on taskbar module state and settings
   */
  static checkTaskbarLock = () => {
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    
    /** @type {{taskbarSettings?: {locked?: boolean, reduceSidebar?: boolean}} | undefined} */
    const taskbarFlag = game.user.flags?.['foundry-taskbar'];

    if(!isTaskbarOn || !taskbarFlag?.taskbarSettings){
      return;
    }

    const taskbarReduceSidebar = game.settings.get('foundry-taskbar','reduceSidebar');
    LogUtil.log("checkTaskbarLock #2",[taskbarFlag, taskbarReduceSidebar]);

    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-margin-bottom', taskbarReduceSidebar ? '50px' : '0px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-margin-bottom', taskbarReduceSidebar ? '10px' : '0px');
    }

    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '50px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '10px');
    }

    GeneralUtil.addCustomCSS(`body.crlngn-ui #ui-right {height: calc((100% - var(--crlngn-margin-bottom)) / var(--ui-scale));}`);

    const ftMoveStyle = document.querySelector("#ft-move-players-macro");
    if(ftMoveStyle){ftMoveStyle.innerHTML = '';}
  }
}