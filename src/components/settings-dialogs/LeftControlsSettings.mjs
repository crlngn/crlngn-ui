import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
// import * as lang from '../../lang/en.json' assert { type: 'json' };

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LeftControlsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();
    return {
      id: SETTINGS.leftControlsMenu.tag,
      actions: {
        redefine: LeftControlsSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: LeftControlsSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-cog",
        title: game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title"),
        contentClasses: ["standard-form", "crlngn"],
        resizable: false
      }
    }
  }

  // Define template parts
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/left-controls-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.leftControlsMenu.title");
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

    if(settings.bottomBuffer===undefined || settings.bottomBuffer===''){
      settings.bottomBuffer = SETTINGS.leftControlsMenu.default.bottomBuffer;
    }
    await SettingsUtil.set(SETTINGS.leftControlsMenu.tag, settings);
    const controlSettings = SettingsUtil.get(SETTINGS.leftControlsMenu.tag);

    LogUtil.log("Saving settings:", [SETTINGS.leftControlsMenu.tag, form, formData.object, settings, controlSettings]); // Debugging
    // // Store each setting in FoundryVTT settings
    // await Promise.all(
    //   Object.entries(settings).map(([key, value]) =>
    //     SettingsUtil.set(SETTINGS.leftControlsMenu.tag, {
    //       // ...customFontsSettings,
    //       [key]: value
    //     })
    //   )
    // );

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input, select");
    const defaults = SETTINGS.leftControlsMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
      if(inputField.type==='checkbox'){
        inputField.checked = defaults[inputField.name];
      }
    })

    LogUtil.log("#onReset", [a, b, SETTINGS.leftControlsMenu.default]);
    // await SettingsUtil.set(SETTINGS.leftControlsMenu.tag, SETTINGS.leftControlsMenu.default);
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const setting = {
      ...SettingsUtil.get(SETTINGS.leftControlsMenu.tag),
      default: {
        ...SETTINGS.leftControlsMenu.default
      },
      fields: { ...SETTINGS.leftControlsMenu.fields },
      buttons: [ 
        { type: "button", icon: "", label: "CRLNGN_UI.settings.leftControlsMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.leftControlsMenu.save" }
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
    // html.querySelector("button[type=reset]").addEventListener("click", LeftControlsSettings.#onReset);

    const controlSettings = SettingsUtil.get(SETTINGS.leftControlsMenu.tag);

    LogUtil.log("_onRender", [context, options, controlSettings]);
  }


}
