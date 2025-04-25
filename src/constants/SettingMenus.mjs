// import * as lang from '../lang/en.json';
import { PlayersListSettings } from '../components/settings-dialogs/PlayersListSettings.mjs';
import { CameraDockSettings } from '../components/settings-dialogs/CameraDockSettings.mjs';
import { ChatMessagesSettings } from '../components/settings-dialogs/ChatMessagesSettings.mjs';
import { CustomFontsSettings } from '../components/settings-dialogs/CustomFontSettings.mjs';
import { LeftControlsSettings } from '../components/settings-dialogs/LeftControlsSettings.mjs';
import { SceneNavSettings } from '../components/settings-dialogs/SceneNavSettings.mjs';
import { ThemeAndStyleSettings } from '../components/settings-dialogs/ThemeAndStylesSettings.mjs';
import { InterfaceElementsSettings } from '../components/settings-dialogs/InterfaceElementsSettings.mjs';
import { ModuleSettings } from '../components/settings-dialogs/ModuleSettings.mjs';
// import * as lang from '../lang/en.json' assert { type: "json" };

export function getSettingMenus() {
  return {
    moduleSettingsMenu: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.hint"),
      icon: "fas fa-sliders-h",  
      propType: ModuleSettings,
      restricted: false
    },
    interfaceOptionsMenu: {
      tab: 'interface',
      tag: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.hint"),
      icon: "fas fa-table-layout",  
      propType: InterfaceElementsSettings,
      restricted: false
    },
    customFontsMenu: {
      tab: 'fonts',
      tag: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.hint"),
      icon: "fas fa-font",  
      propType: CustomFontsSettings,
      restricted: true
    },
    themeAndStylesMenu: {
      tab: 'themes',
      tag: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.hint"),
      icon: "fas fa-brush",
      propType: ThemeAndStyleSettings,
      restricted: false
    },
    chatMessagesMenu: {
      tab: 'chat',
      tag: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.hint"),
      icon: "fas fa-comment",
      propType: ChatMessagesSettings,
      restricted: false
    },
    leftControlsMenu: {
      tab: 'controls',
      tag: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      icon: "fas fa-gear",
      propType: LeftControlsSettings,
      restricted: false
    },
    sceneNavMenu: {
      tab: 'scenes',
      tag: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      icon: "fas fa-map",  
      propType: SceneNavSettings,
      restricted: false
    },
    playersListMenu: {
      tab: 'players',
      tag: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.playersListMenu.hint"),
      icon: "fas fa-users",  
      propType: PlayersListSettings,
      restricted: false
    },
    cameraDockMenu: {
      tab: 'camera',
      tag: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.label"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.hint"),
      icon: "fas fa-camera",  
      propType: CameraDockSettings,
      restricted: false
    }
  };
}