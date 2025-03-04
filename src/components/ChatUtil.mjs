import { BORDER_COLOR_TYPES, getSettings } from "../constants/Settings.mjs";
import "../styles/chat.css"
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ChatUtil {

  static enrichCard(chatMessage, html){
    const SETTINGS = getSettings();

    // if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
    const chatMsgSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);
    if(chatMsgSettings.enableChatStyles){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      let elem = html.get ? html.get(0) : html;

      elem.classList.add('crlngn');
      elem.classList.add(rollType);
      LogUtil.log("enrichCard", [chatMsgSettings.borderColor, BORDER_COLOR_TYPES.playerColor.name, chatMessage.author?.id]); 

      if(chatMsgSettings.borderColor===BORDER_COLOR_TYPES.playerColor.name && chatMessage.author?.id){ 
        elem.style.setProperty('border-color', `var(--user-color-${chatMessage.author.id})`);
      }else if(chatMsgSettings.borderColor===BORDER_COLOR_TYPES.none.name){
        // elem.style.setProperty('border-color', `transparent`);
      }
  
    }   

  }

}