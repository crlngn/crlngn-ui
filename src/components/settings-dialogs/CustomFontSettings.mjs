import { LogUtil } from "../LogUtil.mjs";
import { Main } from "../Main.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CustomFontsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    return {
      id: Main.SETTINGS.customFontsMenu.tag,
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
        title: game.i18n.localize("CRLNGN_UI.settings.customFontsDialog.title"),
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
    return game.i18n.localize("CRLNGN_UI.settings.customFontsDialog.title");
    // return `My Module: ${game.i18n.localize(this.options.window.title)}`;
  }

  // static async #onSubmit(event, form, formData) {
  //   const settings = foundry.utils.expandObject(formData.object);
  //   await Promise(SettingsUtil.set(customFontSetting.tag, settings));
  //   /*
  //   await Promise.all(
  //       Object.entries(settings)
  //           .map(([key, value]) => game.settings.set("foo", key, value))
  //   )
  //   */
  // }


  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    event.stopPropagation();

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);
    LogUtil.log("Saving settings:", [settings]); // Debugging
    // const customFontsSettings = SettingsUtil.get(Main.SETTINGS.customFontsMenu.tag);

    SettingsUtil.set(Main.SETTINGS.customFontsMenu.tag, settings);
    // // Store each setting in FoundryVTT settings
    // await Promise.all(
    //   Object.entries(settings).map(([key, value]) =>
    //     SettingsUtil.set(Main.SETTINGS.customFontsMenu.tag, {
    //       // ...customFontsSettings,
    //       [key]: value
    //     })
    //   )
    // );

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const setting = {
      ...SettingsUtil.get(Main.SETTINGS.customFontsMenu.tag),
      default: {
        ...Main.SETTINGS.customFontsMenu.default
      },
      buttons: [
        { type: "button", icon: "", label: "CRLNGN_UI.settings.customFontsDialog.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.customFontsDialog.save" }
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
    // const html = this.element;
    // html.querySelector("button[type=reset]").addEventListener("click", CustomFontsSettings.#onReset);

    LogUtil.log("_onRender", [context, options]);
  }

  static async #onReset(a, b){
    const html = this.element;
    const inputs = html.querySelectorAll("input[type=text]");
    const defaults = Main.SETTINGS.customFontsMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
    })
    // html.querySelector("button[type=reset]").addEventListener("click", CustomFontsSettings.#onReset);
    // event.preventDefault();
    LogUtil.log("#onReset", [a, b, Main.SETTINGS.customFontsMenu.default]);

    // await SettingsUtil.set(Main.SETTINGS.customFontsMenu.tag, Main.SETTINGS.customFontsMenu.default);
  }

}
