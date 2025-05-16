import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Left Controls Settings application for managing left sidebar control configurations.
 * Provides a form interface for customizing the behavior and appearance of left-side controls.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class InterfaceElementsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static #element;
  /**
   * Default application options
   * @static
   * @returns {object} Configuration object containing default settings for the application
   */
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();
    return {
      id: SETTINGS.interfaceOptionsMenu.tag,
      actions: {
        redefine: InterfaceElementsSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: InterfaceElementsSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 540,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-table",
        title: game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.title"),
        contentClasses: ["standard-form", "crlngn"],
        resizable: false
      }
    }
  }

  // Define template parts
  /**
   * Template parts used for rendering the application
   * @static
   */
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/interface-elements-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    },
  };
  
  /**
   * Get the localized title for the settings dialog
   * @returns {string} Localized title string
   */
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.interfaceOptionsMenu.title");
  }

  // location.reload();
  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  /**
   * Handles form submission and updates left controls settings
   * @private
   * @static
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data object
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    event.stopPropagation();
    const SETTINGS = getSettings(); 
    const fieldNames = SETTINGS.interfaceOptionsMenu.fields;
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

    LogUtil.log("Saving settings...", [navEnabledBefore, navEnabledAfter]); // Debugging
    await SettingsUtil.set(SETTINGS.sceneNavMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    if( navEnabledBefore !== navEnabledAfter ){
      location.reload();
    }
    
    // const SETTINGS = getSettings();
    // event.preventDefault();
    // event.stopPropagation();
    // const fieldNames = SETTINGS.interfaceOptionsMenu.fields;
    
    // // Convert FormData into an object with proper keys
    // const settings = foundry.utils.expandObject(formData.object);

    // fieldNames.forEach((fieldName) => {
    //   if(settings[fieldName] !== undefined) {
    //     LogUtil.log("Saving setting:", [settings[fieldName]]);
    //     SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
    //   }
    // });

    // // For compatibility - to be removed in future version
    // // await SettingsUtil.set(SETTINGS.interfaceOptionsMenu.tag, settings);

    // ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  /**
   * Resets form fields to their default values
   * @private
   * @static
   * @param {Event} a - The reset event
   * @param {HTMLElement} b - The form element
   * @returns {Promise<void>}
   */
  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input, select");
    const defaults = SETTINGS.interfaceOptionsMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
      if(inputField.type==='checkbox'){
        inputField.checked = defaults[inputField.name];
      }
    })

    LogUtil.log("#onReset", [a, b, SETTINGS.interfaceOptionsMenu.default]);
    // await SettingsUtil.set(SETTINGS.interfaceOptionsMenu.tag, SETTINGS.interfaceOptionsMenu.default);
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  /**
   * Prepares the context data for the template
   * @protected
   * @param {object} options - Application options
   * @returns {object} The prepared context object containing field values, defaults, and UI configuration
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const fieldNames = SETTINGS.interfaceOptionsMenu.fields;
    const fields = {};
    const fieldValues = {};
    const fieldDefaults = {};

    fieldNames.forEach((fieldName) => {
      if(SETTINGS[fieldName]) {
        const value = SettingsUtil.get(SETTINGS[fieldName].tag);
        fields[fieldName] = SETTINGS[fieldName];
        fieldValues[fieldName] = value!== undefined ? value : SETTINGS[fieldName].default;
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
        { type: "button", icon: "", label: "CRLNGN_UI.settings.interfaceOptionsMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.interfaceOptionsMenu.save" }
      ]
    }

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

  /**
   * Handles post-render operations
   * @protected
   * @param {object} context - The render context
   * @param {object} options - The render options
   */
  _onRender(context, options) {
    const SETTINGS = getSettings();
    InterfaceElementsSettings.element = this.element;

    // add listener to .toggle-hint 
    const hintToggle = InterfaceElementsSettings.element.querySelector('.toggle-hint');
    hintToggle.addEventListener('click', () => {
      InterfaceElementsSettings.element.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
    });

    const controlSettings = SettingsUtil.get(SETTINGS.interfaceOptionsMenu.tag);
    LogUtil.log("_onRender", [context, options, controlSettings]);
  }


}
