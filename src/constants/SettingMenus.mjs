// import * as lang from '../lang/en.json';
import { CameraDockSettings } from '../components/settings-dialogs/CameraDockSettings.mjs';
import { CustomFontsSettings } from '../components/settings-dialogs/CustomFontSettings.mjs';
import { LeftControlsSettings } from '../components/settings-dialogs/LeftControlsSettings.mjs';
import { SceneNavSettings } from '../components/settings-dialogs/SceneNavSettings.mjs';
// import * as lang from '../lang/en.json' assert { type: "json" };

export function getSettingMenus() {
  return {
    customFonts: {
      tag: game.i18n.localize("CRLNGN_UI.settings.customFontsDialog.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.customFontsDialog.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.customFontsDialog.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.hint"),
      icon: "fas fa-text",  
      propType: CustomFontsSettings,
      restricted: false 
    },
    leftControls: {
      tag: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.hint"),
      icon: "fas fa-cog",
      propType: LeftControlsSettings,
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
    },
    sceneNavMenu: {
      tag: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.hint"),
      icon: "fas fa-camera",  
      propType: SceneNavSettings,
      restricted: false 
    }
  };
}