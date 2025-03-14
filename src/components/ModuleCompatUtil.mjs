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

    /*
    const bodyObserver = new MutationObserver((mutations) => {
      console.log('Body element has been modified:', mutations);
      // Your code to handle the re-render
    });
    
    // Start observing the body with configuration options
    bodyObserver.observe(document.body, {
      childList: false,    // Watch for changes to direct children
      subtree: false,      // Watch the entire subtree
      attributes: true    // Watch for attribute changes
    });
    */

    Hooks.on('renderApplication', (app, html, data) => {
      if (html.closest('body').length) {
        console.log('An application was rendered that affected the body');
        // Your code here
      }
    });
  }

  static checkTaskbarLock = () => {
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    const body = document.querySelector('body.crlngn-ui');
    const taskbarFlag = game.user.flags?.['foundry-taskbar'];
    LogUtil.log("checkTaskbarLock",[taskbarFlag]);

    if(!isTaskbarOn || !taskbarFlag){
      // body.style.setProperty('--crlngn-taskbar-height', '0px');
      return;
    }

    const taskbarReduceSidebar = game.settings.get('foundry-taskbar','reduceSidebar');
    if(taskbarFlag.taskbarSettings?.locked){
      body.style.setProperty('--crlngn-sidebar-bottom', taskbarReduceSidebar ? '50px' : '0px');
    }else{
      body.style.setProperty('--crlngn-sidebar-bottom', '0px');
    }

    if(taskbarFlag.taskbarSettings?.locked){
      body.style.setProperty('--crlngn-taskbar-height', '50px');
    }else{
      body.style.setProperty('--crlngn-taskbar-height', '10px');
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
          // body.classList.remove('players-hidden');
        }else if(uiLeftPlayers){
          body.classList.add('with-players');
          body.classList.remove('with-players-hide');
          // body.classList.remove('players-hidden');
        }
      }
      if(hotbar) hotbar.style.removeProperty('visibility');
      clearTimeout(ModuleCompatUtil.#checkPlayersTimeout);
    }, timeoutDelay);
    
    
  }


}