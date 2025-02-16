import { getDnD5eVars } from "../constants/DnD5e.mjs";
import { getSettings } from "../constants/Settings.mjs";
import "../styles/chat.css"
import { SettingsUtil } from "./SettingsUtil.mjs";
import { Main } from "./Main.mjs";


export class ChatUtil {

  static enrichCard(chatMessage, html){
    const SETTINGS = getSettings();

    if(SettingsUtil.get(Main.SETTINGS.enableChatStyles.tag)){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      const elem = html.get(0);
      elem.classList.add('crlngn');
      elem.classList.add(rollType);
    }    
  }

}