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
    }
  };
}