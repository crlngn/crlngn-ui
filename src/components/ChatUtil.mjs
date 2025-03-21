import { BORDER_COLOR_TYPES, getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ChatUtil {
  static chatBorderColor;
  static enableChatStyles;

  static init(){
    const SETTINGS = getSettings();
    ChatUtil.enableChatStyles = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
    ChatUtil.chatBorderColor = SettingsUtil.get(SETTINGS.chatBorderColor.tag);
  }

  static enrichCard = async(chatMessage, html) => {
    LogUtil.log("renderChatMessage", [ChatUtil.chatBorderColor, ChatUtil.enableChatStyles, BORDER_COLOR_TYPES.playerColor.name, chatMessage.author?.id]); 
    const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
    let chatItem = html.get ? html.get(0) : html;
    if(!chatItem){ return; }
    
    chatItem.classList.add(rollType);
    chatItem.classList.add('crlngn');

    const saveButtons = chatItem.querySelectorAll('.card-buttons button[data-action=rollSave]');
    if (saveButtons.length > 0) {      
      saveButtons.forEach(button => {
        const visibleDCSpan = button.querySelector('.visible-dc');
        const hiddenDCSpan = button.querySelector('.hidden-dc');
        LogUtil.log("enrichCard",[visibleDCSpan, hiddenDCSpan]);

        visibleDCSpan.setAttribute('data-ability', button.getAttribute('data-ability') || "");
        visibleDCSpan.setAttribute('data-dc', button.getAttribute('data-dc') || "");
        hiddenDCSpan.setAttribute('data-ability', button.getAttribute('data-ability') || "");
      });
    }

    // add border color
    if(ChatUtil.chatBorderColor===BORDER_COLOR_TYPES.playerColor.name && chatMessage.author?.id){ 
      chatItem.style.setProperty('border-color', `var(--user-color-${chatMessage.author.id})`);
    }

  }

}