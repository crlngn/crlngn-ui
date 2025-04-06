import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

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
    PlayersListUtil.applyPlayersListSettings();
    LogUtil.log("PlayersList init");
  }

  /**
   * Handles the rendering of the players list
   * Sets up click listeners for expanding/collapsing the list and updates CSS variables
   * @static
   * @private
   */
  static onRender(playersList, html, playerData){
    const htmlActive = playersList?.element?.querySelector("#players-active");
    LogUtil.log("PlayersList onRender A", [playersList.element]);
    const players = [...playerData.active, ...playerData.inactive];
    players.forEach(pl => {
      const element = html.querySelector(`li[data-user-id='${pl.id}']`);
      const player = game.users.get(pl.id);
      const charAvatar = player.character?.img || "";

      LogUtil.log("player", [player]);
      // const userAvatar = 
      const avatarImg = document.createElement("img");
      avatarImg.src = charAvatar || player.avatar || "";
      avatarImg.alt= "*";
      avatarImg.classList.add('avatar');
      if(element) element.prepend(avatarImg);
    })

    playersList?.element?.classList.add("crlngn-avatars");
    // const playersList = document.querySelector(`#players`);
    PlayersListUtil.applyPlayersListSettings();
    // const playersTitle = document.querySelector(`aside#players h3:first-child`);

    // if(!playersList || !(playersList instanceof HTMLElement) || !playersTitle){return;}

    // const playersHeight = playersList.offsetHeight;
    // GeneralUtil.addCSSVars('--players-list-height', playersHeight+'px');

  }

  /**
   * Applies settings for the players list
   */
  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings");
    LogUtil.log("applyPlayersListSettings",[document.querySelector("#players"), SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("minimized");
    }else{
      document.querySelector("#players")?.classList.remove("minimized");
    }
    ModuleCompatUtil.checkPlayersList();
  }

}