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
    event.preventDefault();
    event.stopPropagation();
    const SETTINGS = getSettings(); 
    const fieldNames = SETTINGS.sceneNavMenu.fields;
    let navEnabledBefore = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    let foldersEnabledBefore = SettingsUtil.get(SETTINGS.navFoldersEnabled.tag);
    
    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);

    fieldNames.forEach((fieldName) => {
      if(settings[fieldName] !== undefined) {
        LogUtil.log("Saving setting:", [settings[fieldName]]);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });
    let navEnabledAfter = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag); 
    let foldersEnabledAfter = SettingsUtil.get(SETTINGS.navFoldersEnabled.tag);

    LogUtil.log("Saving settings...", [form, formData.object, settings]); // Debugging
    await SettingsUtil.set(SETTINGS.sceneNavMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    if( navEnabledBefore !== navEnabledAfter ||
      foldersEnabledBefore !== foldersEnabledAfter ){
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
    const menuValues = SettingsUtil.get(SETTINGS.sceneNavMenu.tag);
    const fieldNames = SETTINGS.sceneNavMenu.fields;
    const fields = {};
    const fieldValues = {};
    const fieldDefaults = {};

    fieldNames.forEach((fieldName) => {
      if(SETTINGS[fieldName]) {
        const value = SettingsUtil.get(SETTINGS[fieldName].tag);
        fields[fieldName] = SETTINGS[fieldName];
        fieldValues[fieldName] = value!== undefined ? value : menuValues[SETTINGS[fieldName].oldName] || SETTINGS[fieldName].default;
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });

    const setting = {
      ...fieldValues,
      default: {...fieldDefaults},
      fields: { 
        ...fields
      },
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
