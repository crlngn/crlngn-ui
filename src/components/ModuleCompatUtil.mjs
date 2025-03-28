import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

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
  /**
   * Initializes module compatibility features
   * Sets up hooks for players list and taskbar integration
   */
  static init(){

    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, ModuleCompatUtil.checkPlayersList);
    Hooks.on(HOOKS_CORE.RENDER_HOTBAR, ModuleCompatUtil.checkPlayersList);
    // taskbar
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    if(isTaskbarOn){
      Hooks.on(HOOKS_CORE.UPDATE_USER, ModuleCompatUtil.checkTaskbarLock);
    }
    ModuleCompatUtil.checkTaskbarLock();
  }

  /**
   * Checks and applies taskbar lock settings
   * Adjusts UI variables based on taskbar module state and settings
   */
  static checkTaskbarLock = () => {
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    // const body = document.querySelector('body.crlngn-ui');
    // const bodyStyle = document.querySelector('#crlngn-ui-vars');
    
    /** @type {{taskbarSettings?: {locked?: boolean, reduceSidebar?: boolean}} | undefined} */
    const taskbarFlag = game.user.flags?.['foundry-taskbar'];
    LogUtil.log("checkTaskbarLock",[taskbarFlag]);

    if(!isTaskbarOn || !taskbarFlag?.taskbarSettings){
      return;
    }

    const taskbarReduceSidebar = game.settings.get('foundry-taskbar','reduceSidebar');
    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-sidebar-bottom', taskbarReduceSidebar ? '50px' : '0px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-sidebar-bottom', '0px');
    }

    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '50px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '10px');
    }
    const ftMoveStyle = document.querySelector("#ft-move-players-macro");
    if(ftMoveStyle){ftMoveStyle.innerHTML = '';}
    ModuleCompatUtil.checkPlayersList();
  }


  /**
   * Manages players list visibility and positioning
   * Handles interaction between players list and taskbar module
   */
  static checkPlayersList = () => {
    const body = document.querySelector('body');
    const uiLeftPlayers = document.querySelector('#players');
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    const isPlayersDocked = isTaskbarOn ? game.settings.get('foundry-taskbar','dockPlayersList') : false;
    const isMacroDocked = isTaskbarOn ? game.settings.get('foundry-taskbar','dockMacroBar') : false;
    LogUtil.log('checkPlayersList',[isPlayersDocked, isTaskbarOn, isMacroDocked, game.settings]);
    let timeoutDelay = 0;
    
    if(isPlayersDocked){
      timeoutDelay = 250;
    }
    const hotbar = document.querySelector('#hotbar');
    // if(hotbar && hotbar instanceof HTMLElement) hotbar.style.setProperty('visibility', 'hidden');
    // clearTimeout(ModuleCompatUtil.#checkPlayersTimeout);
    // ModuleCompatUtil.#checkPlayersTimeout =  setTimeout(()=>{
      if(isPlayersDocked){

        LogUtil.log('checkPlayersList TEST',[isPlayersDocked]);
        body.classList.remove('with-players');
        body.classList.remove('with-players-hide');
        body.classList.add('players-hidden');
      }else{
        body.classList.remove('players-hidden');
        if(body.querySelector('#players.auto-hide')){
          body.classList.add('with-players-hide');
          body.classList.remove('with-players');
        }else if(uiLeftPlayers){
          body.classList.add('with-players');
          body.classList.remove('with-players-hide');
        }
      }
      // if(hotbar && hotbar instanceof HTMLElement) hotbar.style.removeProperty('visibility');
      // clearTimeout(ModuleCompatUtil.#checkPlayersTimeout);
    // }, timeoutDelay);
    
    
  }


}