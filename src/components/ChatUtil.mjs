import { getSettings } from "../constants/Settings.mjs";
import "../styles/chat.css"
import { SettingsUtil } from "./SettingsUtil.mjs";


export class ChatUtil {

  static enrichCard(chatMessage, html){
    const SETTINGS = getSettings();

    if(SettingsUtil.get(SETTINGS.enableChatStyles.tag)){ 
      const rollType = chatMessage.flags?.dnd5e?.activity?.type || chatMessage.flags?.dnd5e?.roll?.type || "custom";
      let elem = html.get ? html.get(0) : html;

      const locBtnPath = 'CRLNGN_UI.dnd5e.chatCard.buttons';
      elem.style.setProperty('--crlngn-i18n-attack', game.i18n.localize(`${locBtnPath}.attack`));
      elem.style.setProperty('--crlngn-i18n-damage', game.i18n.localize(`${locBtnPath}.damage`));
      elem.style.setProperty('--crlngn-i18n-summons', game.i18n.localize(`${locBtnPath}.summons`));
      elem.style.setProperty('--crlngn-i18n-healing', game.i18n.localize(`${locBtnPath}.healing`));
      elem.style.setProperty('--crlngn-i18n-template', game.i18n.localize(`${locBtnPath}.template`));
      elem.style.setProperty('--crlngn-i18n-consume', game.i18n.localize(`${locBtnPath}.consume`));
      elem.style.setProperty('--crlngn-i18n-refund', game.i18n.localize(`${locBtnPath}.refund`));
      elem.style.setProperty('--crlngn-i18n-macro', game.i18n.localize(`${locBtnPath}.macro`));
      elem.style.setProperty('--crlngn-i18n-save-dc', game.i18n.localize(`${locBtnPath}.savedc`));
      elem.classList.add('crlngn');
      elem.classList.add(rollType);      
    }    


  }

}