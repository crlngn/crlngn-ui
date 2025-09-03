import { ModuleSettings } from '../components/settings-dialogs/ModuleSettings.mjs';
// import * as lang from '../lang/en.json' assert { type: "json" };

// Simple class that opens Patreon URL when instantiated
class PatreonSupport extends FormApplication {
  constructor(...args) {
    super(...args);
    window.open('https://www.patreon.com/c/carolingiandev/membership', '_blank');
    this.close();
  }
  
  render() {
    // Don't actually render anything, just open the URL
    this.close();
    return this;
  }
}

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
    supportPatreon: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.label"),
      label: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.buttonLabel"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.hint"),
      icon: "fas fa-heart",  
      propType: PatreonSupport,
      restricted: false
    }
  };
}