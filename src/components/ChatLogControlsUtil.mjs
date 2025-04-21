import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";

export class ChatLogControls {
  static useFadeOut = true;
  static customStylesEnabled = true;

  static init(){
    Hooks.on(HOOKS_CORE.RENDER_SIDE_BAR, ChatLogControls.onRender);
    // Hooks.on(HOOKS_CORE.ACTIVATE_CHAT_LOG, ChatLogControls.onRender);
    // Hooks.on(HOOKS_CORE.ACTIVATE_CHAT_LOG_5e, ChatLogControls.onRender);
    Hooks.on(HOOKS_CORE.COLLAPSE_SIDE_BAR, ChatLogControls.onRender);
    Hooks.on(HOOKS_CORE.READY, ChatLogControls.onRender);
    // Hooks.on("renderAbstractSidebarTab", ChatLogControls.onRender);
    
  }

  static applyFadeOut(useFadeOut){
    ChatLogControls.useFadeOut = useFadeOut;
    ChatLogControls.handleFadeOut();
  }

  static applyCustomStyle(enabled){
    ChatLogControls.customStylesEnabled = enabled;
    LogUtil.log("applyCustomStyle", [ChatLogControls.customStylesEnabled]);
    ui.sidebar?.render();
  }

  static onRender(component, html, data){
    const root = html && (typeof html === HTMLElement) ? html : document;
    const existingToggle = root.querySelector("#roll-privacy button[data-action='toggleChat']");
    if(!existingToggle){ ChatLogControls.addChatToggle(root); }
    ChatLogControls.handleFadeOut(component, root, data);
  }

  static handleFadeOut(component, html, data){
    LogUtil.log("handle FadeOut, ChatLogControls", [ChatLogControls.useFadeOut]);
    const chatNotif = html ? html.querySelector("#chat-notifications") : document.querySelector("#ui-right #chat-notifications");
    const element = html ? html.querySelector("#roll-privacy") : document.querySelector("#ui-right #roll-privacy");

    if(ChatLogControls.useFadeOut){
      chatNotif?.classList.add("faded-ui");
      // element?.classList.add("faded-ui");
    } else {
      chatNotif?.classList.remove("faded-ui");
      // element?.classList.remove("faded-ui");
    }
  }

  static addChatToggle = async(html) => {
    const buttonTemplate = await renderTemplate(
      `modules/${MODULE_ID}/templates/chat-toggle-button.hbs`, 
      {}
    );
    const rollModeBox = document.querySelector("#ui-right #roll-privacy");
    rollModeBox.insertAdjacentHTML('afterbegin', buttonTemplate);
    rollModeBox.querySelector("button[data-action=toggleChat]").addEventListener("click", ChatLogControls.onToggleChatBox);
  }

  static onToggleChatBox = (evt) => {
    const toggleButton = document.querySelector("#ui-right button[data-action=toggleChat]");
    const chatBox = document.querySelector("#chat-notifications");

    if(toggleButton.classList.contains("fa-comment-slash")){
      toggleButton.classList.remove("fa-comment-slash");
      toggleButton.classList.add("fa-comment");
      chatBox.classList.add("input-hidden");
      GeneralUtil.addCSSVars("--chat-input-height", "0px");
    }else{
      toggleButton.classList.add("fa-comment-slash");
      toggleButton.classList.remove("fa-comment");
      chatBox.classList.remove("input-hidden");
      GeneralUtil.addCSSVars("--chat-input-height", "100px");
    }
  }
}