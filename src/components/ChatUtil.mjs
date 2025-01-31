import "../styles/chat.css"
import { SettingsUtil } from "./SettingsUtil.mjs";

export class ChatUtil {

  static enrichCard(chatMessage, html){
    if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      const elem = html.get(0);
      elem.classList.add('crlngn');
      elem.classList.add(rollType);
    }    
  }

}