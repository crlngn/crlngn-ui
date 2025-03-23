import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";

/**
 * Utility class for managing the players list functionality and appearance
 */
export class PlayersListUtil {

  /**
   * Initializes the players list functionality by setting up event hooks
   * @static
   */
  static init(){
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersListUtil.onRender); 
  }

  /**
   * Handles the rendering of the players list
   * Sets up click listeners for expanding/collapsing the list and updates CSS variables
   * @static
   * @private
   */
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