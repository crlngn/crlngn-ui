import { getSettings } from "../constants/Settings.mjs";
import "../styles/chat.css"
import { SettingsUtil } from "./SettingsUtil.mjs";


export class ChatUtil {

  static enrichCard(chatMessage, html){
    const SETTINGS = getSettings();

    if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      let elem = html.get ? html.get(0) : html;

      elem.classList.add('crlngn');
      elem.classList.add(rollType);      
    }    


  }

}