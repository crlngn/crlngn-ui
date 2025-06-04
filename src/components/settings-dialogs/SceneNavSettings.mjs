import { getSettings, SETTING_SCOPE } from "../../constants/Settings.mjs";
import { GeneralUtil } from "../GeneralUtil.mjs";
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
    let foldersEnabledBefore = SettingsUtil.get(SETTINGS.useSceneFolders.tag);
    
    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);

    fieldNames.forEach((fieldName) => {
      if(settings[fieldName] !== undefined) {
        LogUtil.log("Saving setting:", [fieldName, settings[fieldName]]);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });
    let navEnabledAfter = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag); 
    let foldersEnabledAfter = SettingsUtil.get(SETTINGS.useSceneFolders.tag);

    LogUtil.log("Saving settings...", [navEnabledBefore, navEnabledAfter]); // Debugging
    await SettingsUtil.set(SETTINGS.sceneNavMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    if( navEnabledBefore !== navEnabledAfter ||
      foldersEnabledBefore !== foldersEnabledAfter ){
        GeneralUtil.showReloadDialog();
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
    const isGM = game.user.isGM;

    fieldNames.forEach((fieldName) => {
      let hasPermission = isGM || SETTINGS[fieldName].scope === SETTING_SCOPE.client;
      if(SETTINGS[fieldName] && hasPermission) {
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
      isGM: game.user?.isGM,
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
   * Handles post-render operations, including attaching event listeners.
   * @protected
   * @param {ApplicationRenderContext} context The data change which caused the render.
   * @param {ApplicationRenderOptions} options Rendering options.
   */
  _onRender(context, options) {
    super._onRender(context, options);
    LogUtil.log("_onRender", [context, options]);
    SceneNavSettings.element = this.element;
    const htmlElement = this.element; // Or SceneNavSettings.element

    // Range input value display and synchronization
    const rangeInput = htmlElement.querySelector('input[type="range"][name="sceneItemWidth"]');
    const valueInput = htmlElement.querySelector('input[type="number"].range-value-input[name="sceneItemWidth_value"]');

    if (rangeInput && valueInput) {
      const min = parseInt(rangeInput.min, 10);
      const max = parseInt(rangeInput.max, 10);

      // Listener for the range slider's input event
      rangeInput.addEventListener('input', () => {
        valueInput.value = rangeInput.value;
      });

      // Listener for the number input's input event (while typing)
      valueInput.addEventListener('input', () => {
        const currentValueString = valueInput.value;
        // Allow empty string or just a minus sign during typing
        if (currentValueString === "" || currentValueString === "-") {
          // Potentially clear slider or set to a neutral state if desired, or do nothing
          // For now, do nothing and let 'change' event handle it if left empty.
          return;
        }
        const currentValue = parseInt(currentValueString, 10);
        if (!isNaN(currentValue) && currentValue >= min && currentValue <= max) {
          rangeInput.value = currentValue;
        }
        // If it's NaN (e.g. "12a") or outside min/max during typing,
        // do nothing to rangeInput yet. Let the user continue typing.
        // The 'change' event will handle final validation.
      });

      // Listener for the number input's change event (after typing/blur/enter)
      valueInput.addEventListener('change', () => {
        let value = parseInt(valueInput.value, 10);

        if (isNaN(value) || value < min) {
          value = min;
        } else if (value > max) {
          value = max;
        }
        
        valueInput.value = value; // Update the input field to the clamped/validated value
        rangeInput.value = value; // Sync the slider
      });

      // Set initial value for the number input from the range slider
      valueInput.value = rangeInput.value;
    }

    // Toggle hint listener
    const hintToggle = htmlElement.querySelector('.toggle-hint');
    if (hintToggle) { // Added null check for robustness
      hintToggle.addEventListener('click', () => {
        htmlElement.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
      });
    }
    
    // SceneNavEnabled checkbox listener
    const sceneNavCheckbox = htmlElement.querySelector('input[name="sceneNavEnabled"]');
    LogUtil.log('_onRender sceneNavCheckbox', [htmlElement, sceneNavCheckbox]);
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
