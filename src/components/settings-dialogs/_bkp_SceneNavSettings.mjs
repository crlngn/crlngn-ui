import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Scene Navigation Settings application for managing scene navigation configurations.
 * Provides a form interface for customizing the behavior and appearance of the scene navigation bar.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class SceneNavSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static #element;
  /**
   * Default application options
   * @static
   * @returns {object} Configuration object containing default settings for the application
   */
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();
    return {
      id: SETTINGS.sceneNavMenu.tag,
      actions: {
        redefine: SceneNavSettings.#onReset,
      },
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
        icon: "fas fa-map",
        title: game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title"),
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
      template: "modules/crlngn-ui/templates/scene-nav-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  /**
   * Get the localized title for the settings dialog
   * @returns {string} Localized title string
   */
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.sceneNavMenu.title");
    // return `My Module: ${game.i18n.localize(this.options.window.title)}`;
  }


  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  /**
   * Handles form submission and updates scene navigation settings
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
    const fieldNames = SETTINGS.sceneNavMenu.fields;
    let navEnabledBefore = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    
    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);

    fieldNames.forEach((fieldName) => {
      if(settings[fieldName] !== undefined) {
        LogUtil.log("Saving setting:", [settings[fieldName]]);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });
    let navEnabledAfter = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);

    LogUtil.log("Saving settings...", [navEnabledBefore, navEnabledAfter]); // Debugging
    await SettingsUtil.set(SETTINGS.sceneNavMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    if( navEnabledBefore !== navEnabledAfter ){
      location.reload();
    }
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
  /**
   * Prepares the context data for the template
   * @protected
   * @param {object} options - Application options
   * @returns {object} The prepared context object containing field values, defaults, and UI configuration
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const fieldNames = SETTINGS.sceneNavMenu.fields;
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

  /**
   * Handles post-render operations
   * @protected
   * @param {object} context - The render context
   * @param {object} options - The render options
   */
  _onRender(context, options) {
    LogUtil.log("_onRender", [context, options]);
    SceneNavSettings.element = this.element;

    // add listener to .toggle-hint 
    const hintToggle = SceneNavSettings.element.querySelector('.toggle-hint');
    hintToggle.addEventListener('click', () => {
      SceneNavSettings.element.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
    });
    
    // Add event listener for sceneNavEnabled checkbox
    const sceneNavCheckbox = this.element?.querySelector('input[name="sceneNavEnabled"]');
    LogUtil.log('_onRender', [this.element, sceneNavCheckbox])
    if (sceneNavCheckbox) {
      sceneNavCheckbox.addEventListener('change', this.#onSceneNavEnabledChange.bind(this));
      // Initial state
      this.#onSceneNavEnabledChange({ target: sceneNavCheckbox });
    }
  }

  /**
   * Handles changes to the sceneNavEnabled checkbox
   * @private
   * @param {Event} event - The change event
   */
  #onSceneNavEnabledChange(event) {
    const otherInputs = this.element?.querySelectorAll('input:not([name="sceneNavEnabled"])');
    otherInputs.forEach(input => input.disabled = !event.target.checked);
    LogUtil.log('onSceneNavEnabledChange', [this.element, otherInputs])
  }

}
