import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Utility class for managing the players list functionality and appearance
 */
export class PlayersList {
  static useFadeOut = true;
  static customStylesEnabled = true;
  static playerListAvatars = true;

  /**
   * Initializes the players list functionality by setting up event hooks
   * @static
   */
  static init(){
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersList.onRender); 
    PlayersList.applyPlayersListSettings();
    PlayersList.handleFadeOut();
    LogUtil.log("PlayersList init");
  }

  static applyFadeOut(useFadeOut){
    PlayersList.useFadeOut = useFadeOut;
    PlayersList.handleFadeOut();
  }

  static handleFadeOut(component, html, data){
    const element = html ? html : document.querySelector("#players");

    if(PlayersList.useFadeOut){
      element?.classList.add("faded-ui");
    } else {
      element?.classList.remove("faded-ui");
    }
    LogUtil.log("PlayersList handle fade out", [PlayersList.useFadeOut]);
  }

  static applyCustomStyle(enabled){
    PlayersList.customStylesEnabled = enabled;
    if(ui.players) ui.players.render();
  }

  /**
   * Handles the rendering of the players list
   * Sets up click listeners for expanding/collapsing the list and updates CSS variables
   * @static
   * @private
   */
  static onRender(component, html, data){
    const SETTINGS = getSettings();
    if(PlayersList.customStylesEnabled){ 
      html.classList.add("crlngn-ui");
    }else{
      html.classList.remove("crlngn-ui");
      return;
    }
    PlayersList.applyPlayersListSettings();
    PlayersList.applyAvatars();
    PlayersList.handleFadeOut(component, html, data);
  }

  /**
   * Applies settings for the players list
   */ 
  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings",[SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]); 
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players.crlngn-ui")?.classList.add("minimized");
    }else{
      document.querySelector("#players.crlngn-ui")?.classList.remove("minimized");
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

    if(SettingsUtil.get(SETTINGS.playerListAvatars.tag) && PlayersList.customStylesEnabled){
      htmlPlayers?.classList.add("crlngn-avatars");
  
      players.forEach(pl => {
        const element = htmlPlayers?.querySelector(`li[data-user-id='${pl.id}']`);
        const player = game.users.get(pl.id);
        const charAvatar = player.character?.img || "";

        LogUtil.log("player", [player]);
        const avatarImg = document.createElement("img");
        avatarImg.src = charAvatar || player.avatar || "";
        avatarImg.alt= "*";
        avatarImg.classList.add('crlngn-avatar');
        if(element) element.prepend(avatarImg);
      });
    }else{
      const existingLi = htmlPlayers?.querySelectorAll("li.player");
      existingLi.forEach(li => {
        const img = li.querySelector("img.crlngn-avatar");
        img?.remove();
      });
      htmlPlayers?.classList.remove("crlngn-avatars");
    }

    ModuleCompatUtil.checkPlayersList();
  }

}