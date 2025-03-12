import { BORDER_COLOR_TYPES, getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ChatUtil {
  static chatMsgSettings;

  static init(){
    const SETTINGS = getSettings();
    ChatUtil.chatMsgSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);
  }

  static enrichCard(chatMessage, html){
    // const SETTINGS = getSettings();
    const chatSettings = ChatUtil.chatMsgSettings;

    if(chatSettings?.enableChatStyles){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      let elem = html.get ? html.get(0) : html;

      // elem.classList.add('crlngn');
      elem.classList.add(rollType);
      LogUtil.log("enrichCard", [chatSettings.borderColor, BORDER_COLOR_TYPES.playerColor.name, chatMessage.author?.id]); 

      if(chatSettings.borderColor===BORDER_COLOR_TYPES.playerColor.name && chatMessage.author?.id){ 
        elem.style.setProperty('border-color', `var(--user-color-${chatMessage.author.id})`);
      }
  
    }   

  }

}