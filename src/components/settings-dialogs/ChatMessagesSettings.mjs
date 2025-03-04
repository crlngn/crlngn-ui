import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
// import * as lang from '../../lang/en.json' assert { type: 'json' };

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ChatMessagesSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();

    return {
      id: SETTINGS.chatMessagesMenu.tag,
      actions: {
        redefine: ChatMessagesSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: ChatMessagesSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-cog",
        title: game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.title"),
        contentClasses: ["standard-form", "crlngn"],
        resizable: true
      }
    }
  }

  // Define template parts
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/chat-messages-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.chatMessagesMenu.title");
    // return `My Module: ${game.i18n.localize(this.options.window.title)}`;
  }

  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  static async #onSubmit(event, form, formData) {
    const SETTINGS = getSettings();
    event.preventDefault();
    event.stopPropagation();

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);
    LogUtil.log("Saving settings:", [ settings ]);

    if(settings.bottomBuffer===undefined || settings.bottomBuffer===''){
      settings.bottomBuffer = SETTINGS.chatMessagesMenu.default.bottomBuffer;
    }
    const currSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);
    const currBorderColor = currSettings.borderColor;
    if(settings.enforceDarkMode === undefined){
      delete settings.enforceDarkMode;
    }

    const menuSettings = [];
    Object.entries(settings).forEach(s => {
      LogUtil.log("menuSettings",[s]);
      if(SETTINGS.chatMessagesMenu.default[s[0]]){
        menuSettings.push(s[1]);
      }
    })
    LogUtil.log("menuSettings",[menuSettings]);

    await SettingsUtil.set(SETTINGS.chatMessagesMenu.tag, settings);
    await SettingsUtil.set(SETTINGS.enforceDarkMode.tag, settings.enforceDarkMode);
    const controlSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);

    LogUtil.log("Saving settings:", [currSettings, settings, controlSettings]); // Debugging
    if(controlSettings.borderColor !== currBorderColor){
      location.reload();
    }

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input, select");
    const defaults = {
      ...SETTINGS.chatMessagesMenu.default,
      enforceDarkMode: SETTINGS.enforceDarkMode.default
    };

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
      if(inputField.type==='checkbox'){
        inputField.checked = defaults[inputField.name];
      }
    })

    LogUtil.log("#onReset", [defaults]);
    // await SettingsUtil.set(SETTINGS.chatMessagesMenu.tag, SETTINGS.chatMessagesMenu.default);
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const setting = {
      ...SettingsUtil.get(SETTINGS.chatMessagesMenu.tag),
      enforceDarkMode: SettingsUtil.get(SETTINGS.enforceDarkMode.tag),
      default: {
        ...SETTINGS.chatMessagesMenu.default,
        enforceDarkMode: SETTINGS.enforceDarkMode.default || null
      },
      isGM: game.user.isGM,
      fields: { ...SETTINGS.chatMessagesMenu.fields },
      buttons: [ 
        { type: "button", icon: "", label: "CRLNGN_UI.settings.chatMessagesMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.chatMessagesMenu.save" }
      ]
    }
    // game.settings.get("foo", "config");
    

    LogUtil.log("_prepareContext", [setting, options]);
    return setting;
  }

  /**
   * Prepare context that is specific to only a single rendered part.
   *
   * It is recommended to augment or mutate the shared context so that downstream methods like _onRender have
   * visibility into the data that was used for rendering. It is acceptable to return a different context object
   * rather than mutating the shared context at the expense of this transparency.
   *
   * @param {string} partId                         The part being rendered
   * @param {ApplicationRenderContext} context      Shared context provided by _prepareContext
   * @returns {Promise<ApplicationRenderContext>}   Context data for a specific part
   * @protected
   */
  async _preparePartContext(partId, context) {
    context.partId = `${partId}-${this.id}`;
    LogUtil.log("_preparePartContext",[partId, context]);
    return context;
  }

  _onRender(context, options) {
    const SETTINGS = getSettings();
    // const html = this.element;
    // html.querySelector("button[type=reset]").addEventListener("click", ChatMessagesSettings.#onReset);

    const controlSettings = SettingsUtil.get(SETTINGS.chatMessagesMenu.tag);

    LogUtil.log("_onRender", [context, options, controlSettings]);
  }


}
