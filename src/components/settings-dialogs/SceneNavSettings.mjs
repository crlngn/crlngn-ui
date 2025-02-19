import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
// import * as lang from '../../lang/en.json' assert { type: 'json' };

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SceneNavSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();
    return {
      id: SETTINGS.sceneNavMenu.tag,
      actions: {
        redefine: SceneNavSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: SceneNavSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-cog",
        title: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"),
        contentClasses: ["standard-form", "crlngn"],
        resizable: false
      }
    }
  }

  // Define template parts
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/scene-nav-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title");
    // return `My Module: ${game.i18n.localize(this.options.window.title)}`;
  }


  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  static async #onSubmit(event, form, formData) {
    const SETTINGS = getSettings(); 
    let menuSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag); 
    let navEnabled = menuSettings.sceneNavEnabled; 
    event.preventDefault();
    event.stopPropagation();

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);

    await SettingsUtil.set(SETTINGS.sceneNavMenu.tag, settings);
    menuSettings = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);

    LogUtil.log("Saving settings...", [SETTINGS.sceneNavMenu.tag, form, formData.object, settings, menuSettings]); // Debugging

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    if(menuSettings.sceneNavEnabled != navEnabled){
      location.reload();
    }
  }

  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input, select");
    const defaults = SETTINGS.sceneNavMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
      if(inputField.type==='checkbox'){
        inputField.checked = defaults[inputField.name];
      }
    })

    LogUtil.log("#onReset", [a, b, SETTINGS.sceneNavMenu.default]);
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const setting = {
      ...SettingsUtil.get(SETTINGS.sceneNavMenu.tag),
      default: {
        ...SETTINGS.sceneNavMenu.default
      },
      fields: { ...SETTINGS.sceneNavMenu.fields },
      buttons: [ 
        { type: "button", icon: "", label: "CRLNGN_UI.settings.sceneNavMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.sceneNavMenu.save" }
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


}
