import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";

export class PlayersListUtil {

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersListUtil.onRender); 
  }

  static onRender(){
    const playersList = document.querySelector(`aside#players`);
    const playersTitle = document.querySelector(`aside#players h3:first-child`);

    if(!playersList || !(playersList instanceof HTMLElement) || !playersTitle){return;}

    const playersHeight = playersList.offsetHeight;
    GeneralUtil.addCSSVars('--players-list-height', playersHeight+'px');

    playersTitle.addEventListener('click', ()=>{
      if(playersList.classList.contains('expanded')){
        playersList.classList.remove('expanded');
      }else{
        playersList.classList.add('expanded');
      }
    });
  }

}