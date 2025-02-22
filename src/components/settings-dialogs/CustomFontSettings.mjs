import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { Main } from "../Main.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CustomFontsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();

    return {
      id: SETTINGS.customFontsMenu.tag,
      actions: {
        redefine: CustomFontsSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: CustomFontsSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-text",
        title: game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title"),
        contentClasses: ["standard-form"],
        resizable: false
      }
    }
  }

  // Define template parts
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/custom-fonts-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title");
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
    LogUtil.log("Saving settings:", [settings]); // Debugging

    SettingsUtil.set(SETTINGS.customFontsMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const current = SettingsUtil.get(SETTINGS.customFontsMenu.tag);
    const setting = {
      uiFont: current.uiFont || SETTINGS.customFontsMenu.default.uiFont,
      uiTitles: current.uiTitles || SETTINGS.customFontsMenu.default.uiTitles,
      journalBody: current.journalBody || current.journalBodyFont || SETTINGS.customFontsMenu.default.journalBody,
      journalTitles: current.journalTitles || current.journalTitleFont || SETTINGS.customFontsMenu.default.journalTitles,
      default: {
        ...SETTINGS.customFontsMenu.default
      },
      fields: { 
        ...SETTINGS.customFontsMenu.fields
      },
      buttons: [
        { type: "button", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.save" }
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
    LogUtil.log("_onRender", [context, options]);
  }

  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input[type=text]");
    const defaults = SETTINGS.customFontsMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
    })
    
    LogUtil.log("#onReset", [a, b, SETTINGS.customFontsMenu.default]);
  }

}