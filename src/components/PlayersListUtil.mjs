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
  static #timeout;
  static useFadeOut = true;
  static customStylesEnabled = true;
  static playerListAvatars = true;
  static hidden = false;

  /**
   * Initializes the players list functionality by setting up event hooks
   * @static
   */
  static init(){
    LogUtil.log("PlayersList init", []);
    Hooks.on(HOOKS_CORE.RENDER_PLAYERS_LIST, PlayersList.onRender); 
    // Hooks.on(HOOKS_CORE.READY, PlayersList.onRender); 
    // PlayersList.applyPlayersListSettings();
  }

  static applyFadeOut(useFadeOut){
    PlayersList.useFadeOut = useFadeOut;
    PlayersList.handleFadeOut();
  }

  static applyHide(hidden){
    PlayersList.hidden = hidden;
    PlayersList.handleHide();
  }

  static handleHide(component, html, data){
    const element = html || document.querySelector("#players");

    if(PlayersList.hidden){
      element?.classList.add("hidden-ui");
    }else{
      element?.classList.remove("hidden-ui");
    }

    LogUtil.log("handle Hide", [PlayersList.hidden]);
  }

  static handleFadeOut(component, html, data){
    const element = html || document.querySelector("#players");

    PlayersList.#timeout = setTimeout(() => {
      LogUtil.log("handleFadeOut - PlayersList", [element, PlayersList.useFadeOut]);
      if(PlayersList.useFadeOut){ 
        element?.classList.add("faded-ui"); 
      } else { 
        element?.classList.remove("faded-ui"); 
      }
      ModuleCompatUtil.handleYTPlayerFadeOut();
    }, 500);
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
    LogUtil.log("PlayersList onRender", [component, html, data]);
    const SETTINGS = getSettings();
    const htmlPlayers = html || document.querySelector("#players");
    if(PlayersList.customStylesEnabled){
      htmlPlayers?.classList.add("crlngn-ui");
    }else{
      htmlPlayers?.classList.remove("crlngn-ui");
    }
    PlayersList.applyPlayersListSettings();
    PlayersList.applyAvatars();
    PlayersList.handleFadeOut(component, htmlPlayers, data);
    PlayersList.handleHide(component, htmlPlayers, data);
    PlayersList.setupHoverListeners(htmlPlayers);
  }

  /**
   * Sets up hover listeners to toggle class on #ui-left when minimized players list is hovered
   * @param {HTMLElement} htmlPlayers - The players list element
   */
  static setupHoverListeners(htmlPlayers){
    if(!htmlPlayers) return;

    const uiLeft = document.querySelector("#ui-left");
    if(!uiLeft) return;

    // Remove existing listeners to avoid duplicates
    htmlPlayers.removeEventListener("mouseenter", PlayersList.#onPlayersHoverEnter);
    htmlPlayers.removeEventListener("mouseleave", PlayersList.#onPlayersHoverLeave);

    // Add new listeners
    htmlPlayers.addEventListener("mouseenter", PlayersList.#onPlayersHoverEnter);
    htmlPlayers.addEventListener("mouseleave", PlayersList.#onPlayersHoverLeave);
  }

  static #onPlayersHoverEnter = () => {
    const isMinimized = document.querySelector("body.crlngn-players-minimized");
    const uiLeft = document.querySelector("#ui-left");
    if(isMinimized && uiLeft){
      uiLeft.classList.add("players-open");
    }
  }

  static #onPlayersHoverLeave = () => {
    const uiLeft = document.querySelector("#ui-left");
    uiLeft?.classList.remove("players-open");
  }

  /**
   * Applies settings for the players list
   */
  static applyPlayersListSettings(){
    const SETTINGS = getSettings();
    LogUtil.log("applyPlayersListSettings",[SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)]);
    if(SettingsUtil.get(SETTINGS.autoHidePlayerList.tag)){
      document.querySelector("#players")?.classList.add("minimized");
      document.querySelector("body")?.classList.add("crlngn-players-minimized");
    }else{
      document.querySelector("#players")?.classList.remove("minimized");
      document.querySelector("body")?.classList.remove("crlngn-players-minimized");
    }

    // Apply avatar size
    PlayersList.applyAvatarSize();
  }

  /**
   * Applies avatar size from settings
   */
  static applyAvatarSize(value){
    const SETTINGS = getSettings();
    let sizeKey = value || SettingsUtil.get(SETTINGS.playerListAvatarSize.tag) || SETTINGS.playerListAvatarSize.default;

    // Map the option key to the CSS calc value
    let avatarSize;
    if (SETTINGS.playerListAvatarSize.options && SETTINGS.playerListAvatarSize.options[sizeKey]) {
      avatarSize = SETTINGS.playerListAvatarSize.options[sizeKey].value;
    } else {
      // Fallback for legacy values that are already CSS calc formulas
      avatarSize = sizeKey;
    }

    // const playersEl = document.querySelector("#players");
    // if(playersEl){
    //   playersEl.style.setProperty('--crlngn-avatar-size', avatarSize);
    // }

    const body = document.querySelector("body");
    if(body){
      body.style.setProperty('--crlngn-avatar-size', avatarSize);
    }
    LogUtil.log("applyAvatarSize", [sizeKey, avatarSize]);
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
  }

}