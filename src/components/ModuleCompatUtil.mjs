import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class ModuleCompatUtil {
  static #checkPlayersTimeout;
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

  static checkTaskbarLock = () => {
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    // const body = document.querySelector('body.crlngn-ui');
    // const bodyStyle = document.querySelector('#crlngn-ui-vars');
    const taskbarFlag = game.user.flags?.['foundry-taskbar'];
    LogUtil.log("checkTaskbarLock",[taskbarFlag]);

    if(!isTaskbarOn || !taskbarFlag){
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


  static checkPlayersList = () => {
    const body = document.querySelector('body');
    const uiLeftPlayers = document.querySelector('#players');
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    const isPlayersDocked = isTaskbarOn ? game.settings.get('foundry-taskbar','dockPlayersList') : false;
    const isMacroDocked = isTaskbarOn ? game.settings.get('foundry-taskbar','dockMacroBar') : false;
    LogUtil.log('checkPlayersList',[isPlayersDocked, isTaskbarOn, isMacroDocked, game.settings]);
    let timeoutDelay = 10;
    
    if(isPlayersDocked){
      timeoutDelay = 250;
    }
    const hotbar = document.querySelector('#hotbar');
    if(hotbar) hotbar.style.setProperty('visibility', 'hidden');
    clearTimeout(ModuleCompatUtil.#checkPlayersTimeout);
    ModuleCompatUtil.#checkPlayersTimeout =  setTimeout(()=>{
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
      if(hotbar) hotbar.style.removeProperty('visibility');
      clearTimeout(ModuleCompatUtil.#checkPlayersTimeout);
    }, timeoutDelay);
    
    
  }


}