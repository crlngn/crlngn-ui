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
  static enrichCard = async(chatMessage, html) => {
    LogUtil.log("renderChatMessage", [ChatUtil.chatBorderColor, ChatUtil.enableChatStyles, BORDER_COLOR_TYPES.playerColor.name, chatMessage.author?.id]); 
    const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
    let chatItem = html.get ? html.get(0) : html;
    chatItem.classList.add(rollType);

    // Create a temporary div to parse the HTML content of message
    const content = duplicate(chatMessage.content);
    const tempElement = document.createElement('div');
    tempElement.innerHTML = content;

    if(ChatUtil.enableChatStyles && !tempElement.firstChild.classList.contains('crlngn')){ 
      let elem;
      elem = tempElement.firstChild;
      elem.classList.add('crlngn');

      const saveButtons = tempElement.querySelectorAll('.card-buttons button[data-action=rollSave]');
      LogUtil.log("enrichCard",[saveButtons.length]);
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
        elem.style.setProperty('border-color', `var(--user-color-${chatMessage.author.id})`);
      }
      // Update the message document with the modified content
      await chatMessage.update({
        content: tempElement.innerHTML
      });
  
    }   

    LogUtil.log("enrichCard", [tempElement.firstChild]);

  }

}