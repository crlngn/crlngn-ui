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

  static enrichCard(chatMessage, html){
    if(ChatUtil.enableChatStyles){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      let elem = html.get ? html.get(0) : html;

      // elem.classList.add('crlngn');
      elem.classList.add(rollType);
      LogUtil.log("enrichCard", [ChatUtil.chatBorderColor, BORDER_COLOR_TYPES.playerColor.name, chatMessage.author?.id]); 

      if(ChatUtil.chatBorderColor===BORDER_COLOR_TYPES.playerColor.name && chatMessage.author?.id){ 
        elem.style.setProperty('border-color', `var(--user-color-${chatMessage.author.id})`);
      }
  
    }   

  }

}