import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ChatLogControls {
  static useFadeOut = true;
  static hidden = false;
  static customStylesEnabled = true;

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_SIDE_BAR, ChatLogControls.onRender);
    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, ChatLogControls.onRender);
    Hooks.on(HOOKS_CORE.READY, ChatLogControls.onRender);
  }

  static applyFadeOut(useFadeOut){
    ChatLogControls.useFadeOut = useFadeOut;
    ChatLogControls.handleFadeOut();
  }


  static applyHide(hidden){
    ChatLogControls.hidden = hidden;
    ChatLogControls.handleHide();
  }

  static applyCustomStyle(enabled){
    ChatLogControls.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [ChatLogControls.customStylesEnabled]);
    ui.sidebar?.render();
  }

  static onRender(component, html, data){
    const root = html instanceof HTMLElement ? html : document;
    ChatLogControls.addChatToggle(root);
    ChatLogControls.handleFadeOut(component, root, data);
    ChatLogControls.handleHide(component, root, data);
  }

  static handleFadeOut(component, html, data){
    LogUtil.log("handle FadeOut, ChatLogControls", [ChatLogControls.useFadeOut]);
    const chatNotif = html ? html.querySelector("#chat-notifications") : document.querySelector("#ui-right #chat-notifications");
    
    if(ChatLogControls.useFadeOut){
      chatNotif?.classList.add("faded-ui");
    } else {
      chatNotif?.classList.remove("faded-ui");
    }
  }

  static handleHide(component, html, data){
    LogUtil.log("handle Hide, ChatLogControls", [ChatLogControls.hidden]);
    const chatNotif = html ? html.querySelector("#chat-notifications") : document.querySelector("#ui-right #chat-notifications");
    
    if(ChatLogControls.hidden){
      chatNotif?.classList.add("hidden-ui");
    } else {
      chatNotif?.classList.remove("hidden-ui");
    }
  }

  /**
   * Finds the roll-mode / message-mode button strip the chat toggle lives in.
   * The chat controls move between the chat tab and the notifications area in core,
   * so the lookup is done fresh on every call instead of being cached
   * @returns {HTMLElement|null}
   */
  static getRollModeBox = () => {
    return document.querySelector("#ui-right #roll-privacy")
      || document.querySelector("#ui-right #message-modes")
      || document.querySelector("#roll-privacy")
      || document.querySelector("#message-modes");
  }

  /**
   * Builds the chat toggle button synchronously, so there is never an async gap
   * between checking for an existing button and inserting a new one
   * @returns {HTMLButtonElement}
   */
  static createChatToggleButton = () => {
    const button = document.createElement("button");
    const label = game.i18n.localize("CRLNGN_UI.ui.toggleChatBox");
    button.type = "button";
    button.className = "ui-control icon fa-solid fa-comment-slash";
    button.dataset.action = "toggleChat";
    button.dataset.tooltip = label;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", label);
    button.addEventListener("click", ChatLogControls.onToggleChatBox);
    return button;
  }

  /**
   * Guarantees exactly one chat toggle button exists in the current roll-mode box.
   * Any extra copies, wherever they ended up (re-rendered controls, double hook calls,
   * a stale container another module kept around), are removed. Returns the surviving button
   * @param {HTMLElement} rollModeBox
   * @returns {HTMLButtonElement|null}
   */
  static dedupeChatToggle = (rollModeBox) => {
    const allToggles = Array.from(document.querySelectorAll("button[data-action=toggleChat]"));
    let keep = allToggles.find(btn => rollModeBox?.contains(btn)) || null;
    allToggles.forEach(btn => {
      if(btn !== keep){ btn.remove(); }
    });
    if(keep && rollModeBox && keep !== rollModeBox.firstElementChild){
      rollModeBox.prepend(keep);
    }
    return keep;
  }

  static addChatToggle = (html) => {
    const rollModeBox = ChatLogControls.getRollModeBox();
    if(!ChatLogControls.customStylesEnabled){
      ChatLogControls.dedupeChatToggle(null);
      return;
    }
    if(!rollModeBox){ return; }

    let toggleButton = ChatLogControls.dedupeChatToggle(rollModeBox);
    if(!toggleButton){
      toggleButton = ChatLogControls.createChatToggleButton();
      rollModeBox.prepend(toggleButton);
    }

    ChatLogControls.applyChatBoxState(toggleButton);
  }

  /**
   * Applies the saved chat box visibility (user flag, hidden by default) to the toggle button and chat box
   * @param {HTMLButtonElement} toggleButton
   */
  static applyChatBoxState = (toggleButton) => {
    const chatBoxHidden = game.user?.getFlag(MODULE_ID, "chatBoxHidden") ?? true;
    const chatBox = document.querySelector("#chat-notifications");
    const SETTINGS = getSettings();
    const preventMacroBarReposition = SettingsUtil.get(SETTINGS.preventMacroBarReposition.tag);
    LogUtil.log("Applying saved chat box state", [chatBoxHidden]);

    if (chatBoxHidden) {
      toggleButton.classList.remove("fa-comment-slash");
      toggleButton.classList.add("fa-comment");
      chatBox?.classList.add("input-hidden");
      if(preventMacroBarReposition) {
        document.body.classList.add("chat-input-hidden");
      }
    } else {
      toggleButton.classList.add("fa-comment-slash");
      toggleButton.classList.remove("fa-comment");
      chatBox?.classList.remove("input-hidden");
      if(preventMacroBarReposition) {
        document.body.classList.remove("chat-input-hidden");
      }
    }
  }

  static onToggleChatBox = (evt) => {
    const toggleButton = evt?.currentTarget instanceof HTMLElement
      ? evt.currentTarget
      : document.querySelector("button[data-action=toggleChat]");
    const chatBox = document.querySelector("#chat-notifications");
    const SETTINGS = getSettings();
    const preventMacroBarReposition = SettingsUtil.get(SETTINGS.preventMacroBarReposition.tag);
    if(!toggleButton || !chatBox){ return; }
    let hidden = false;

    if(toggleButton.classList.contains("fa-comment-slash")){
      toggleButton.classList.remove("fa-comment-slash");
      toggleButton.classList.add("fa-comment");
      chatBox.classList.add("input-hidden");
      if(preventMacroBarReposition) {
        document.body.classList.add("chat-input-hidden");
      }
      hidden = true;
    }else{
      toggleButton.classList.add("fa-comment-slash");
      toggleButton.classList.remove("fa-comment");
      chatBox.classList.remove("input-hidden");
      if(preventMacroBarReposition) {
        document.body.classList.remove("chat-input-hidden");
      }
      hidden = false;
    }

    // Save chat box state to user flag
    game.user.setFlag(MODULE_ID, "chatBoxHidden", hidden);
    LogUtil.log("Chat box state saved to flag", [hidden]);
  }
}