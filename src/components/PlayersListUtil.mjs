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
    const SETTINGS = getSettings();
    PlayersListUtil.applyPlayersListSettings();
    PlayersListUtil.applyAvatars();
  }

  /**
   * Applies settings for the players list
   */ 
  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings",[SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("minimized");
    }else{
      document.querySelector("#players")?.classList.remove("minimized");
    }
    ModuleCompatUtil.checkPlayersList();
  }

  /**
   * Adds avatars for the players list
   */
  static applyAvatars(){
    const SETTINGS = getSettings();
    LogUtil.log("applyAvatars",[game.users]); 

    const htmlPlayers = document.querySelector("#players");
    const activePlayers = game.users.filter(u=>u.active===true);
    const inactivePlayers = game.users.filter(u=>u.active===false);
    const players = [...activePlayers, ...inactivePlayers];

    if(SettingsUtil.get(SETTINGS.playerListAvatars.tag)){
      htmlPlayers?.classList.add("crlngn-avatars");
  
      players.forEach(pl => {
        const element = htmlPlayers?.querySelector(`li[data-user-id='${pl.id}']`);
        const player = game.users.get(pl.id);
        const charAvatar = player.character?.img || "";

        LogUtil.log("player", [player]);
        const avatarImg = document.createElement("img");
        avatarImg.src = charAvatar || player.avatar || "";
        avatarImg.alt= "*";
        avatarImg.classList.add('avatar');
        if(element) element.prepend(avatarImg);
      });
    }else{
      const existingLi = htmlPlayers?.querySelectorAll("li.player");
      existingLi.forEach(li => {
        const img = li.querySelector("img.avatar");
        img?.remove();
      });
      htmlPlayers?.classList.remove("crlngn-avatars");
    }

    ModuleCompatUtil.checkPlayersList();
  }

}