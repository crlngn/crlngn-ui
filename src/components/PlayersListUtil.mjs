import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { SETTINGS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class PlayersListUtil {

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersListUtil.onRender); 
  }

  static onRender(){
    const playersList = document.querySelector(`aside#players`);
    const playersTitle = document.querySelector(`aside#players h3[aria-label="Players"]`);

    const playersHeight = playersList.offsetHeight;
    const root = document.querySelector("body.crlngn-ui");
    root.style.setProperty('--players-list-height', playersHeight+'px');

    playersTitle.addEventListener('click', ()=>{
      if(playersList.classList.contains('expanded')){
        playersList.classList.remove('expanded');
      }else{
        playersList.classList.add('expanded');
      }
    })

  }

}