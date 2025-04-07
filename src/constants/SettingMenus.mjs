// import * as lang from '../lang/en.json';
import { PlayersListSettings } from '../components/settings-dialogs/PlayersListSettings.mjs';
import { CameraDockSettings } from '../components/settings-dialogs/CameraDockSettings.mjs';
import { ChatMessagesSettings } from '../components/settings-dialogs/ChatMessagesSettings.mjs';
import { CustomFontsSettings } from '../components/settings-dialogs/CustomFontSettings.mjs';
import { LeftControlsSettings } from '../components/settings-dialogs/LeftControlsSettings.mjs';
import { SceneNavSettings } from '../components/settings-dialogs/SceneNavSettings.mjs';
import { ThemeAndStyleSettings } from '../components/settings-dialogs/ThemeAndStylesSettings.mjs';
// import * as lang from '../lang/en.json' assert { type: "json" };

export function getSettingMenus() {
  return {
    customFonts: {
      tag: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.hint"),
      icon: "fas fa-text",  
      propType: CustomFontsSettings,
      restricted: true 
    },
    themeAndStylesMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.hint"),
      icon: "fas fa-brush",
      propType: ThemeAndStyleSettings,
      restricted: true 
    },
    chatMessagesMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.hint"),
      icon: "fas fa-comment",
      propType: ChatMessagesSettings,
      restricted: false 
    },
    leftControls: {
      tag: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      icon: "fas fa-gear",
      propType: LeftControlsSettings,
      restricted: false 
    },
    sceneNavMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      icon: "fas fa-map",  
      propType: SceneNavSettings,
      restricted: false 
    },
    playersListMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.hint"),
      icon: "fas fa-camera",  
      propType: PlayersListSettings,
      restricted: false 
    },
    cameraDockMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.hint"),
      icon: "fas fa-camera",  
      propType: CameraDockSettings,
      restricted: false 
    }
  };
}