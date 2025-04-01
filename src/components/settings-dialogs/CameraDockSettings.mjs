import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Camera Dock Settings application for managing camera-related configurations.
 * Provides a form interface for users to customize camera dock behavior and appearance.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CameraDockSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static element;
  /**
   * Default application options
   * @static
   * @returns {object} Configuration object containing default settings for the application
   */
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();
    
    return {
      id: SETTINGS.cameraDockMenu.tag,
      actions: {
        redefine: CameraDockSettings.#onReset,
      },
      // classes: ["standard-form"],
      form: {
        handler: CameraDockSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-camera",
        title: game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.title"),
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
      template: "modules/crlngn-ui/templates/camera-dock-settings.hbs",
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
    return game.i18n.localize("CRLNGN_UI.settings.cameraDockMenu.title");
    // return `My Module: ${game.i18n.localize(this.options.window.title)}`;
  }


  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  /**
   * Handles form submission and updates FoundryVTT settings
   * @private
   * @static
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data object
   * @returns {Promise<void>}
   */
  static async #onSubmit(event, form, formData) {
    const SETTINGS = getSettings();
    event.preventDefault();
    event.stopPropagation();
    const fieldNames = SETTINGS.cameraDockMenu.fields;

    // Convert FormData into an object with proper keys and handle checkboxes
    const rawData = formData.object;
    // Ensure checkbox fields are properly represented as booleans
    fieldNames.forEach((fieldName) => {
      if (SETTINGS[fieldName].inputType === 'checkbox' && !rawData.hasOwnProperty(fieldName)) {
        rawData[fieldName] = false;
      }
    });
    const settings = foundry.utils.expandObject(rawData);
    const currDockSettings = SettingsUtil.get(SETTINGS.enableFloatingDock.tag);
    LogUtil.log("Compared settings:", [ settings.enableFloatingDock, currDockSettings ]);
    
    fieldNames.forEach((fieldName) => {
      LogUtil.log("Saving setting >>", [SETTINGS[fieldName].tag, settings[fieldName]]);
      if(settings[fieldName] !== undefined) {
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));

    const dockSettings = settings.enableFloatingDock;
    if(dockSettings !== currDockSettings){
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
    const fieldNames = SETTINGS.cameraDockMenu.fields;

    const fields = {};
    const fieldDefaults = {};

    fieldNames.forEach((fieldName) => {
      if(SETTINGS[fieldName]) {
        fields[fieldName] = SETTINGS[fieldName];
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });

    inputs.forEach(inputField => {
      inputField.value = fieldDefaults[inputField.name];
    })

    LogUtil.log("#onReset", [a, b, SETTINGS.cameraDockMenu.default]);
  }

  /**
   * Prepares the context data for the template
   * @protected
   * @param {object} options - Application options
   * @returns {object} The prepared context object
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const fieldNames = SETTINGS.cameraDockMenu.fields;
    const fields = {};
    const fieldValues = {};
    const fieldDefaults = {};

    fieldNames.forEach((fieldName) => {
      LogUtil.log("_prepareContext", [SETTINGS[fieldName].oldName]);
      if(SETTINGS[fieldName]) {
        const value = SettingsUtil.get(SETTINGS[fieldName].tag);
        fields[fieldName] = SETTINGS[fieldName];
        fieldValues[fieldName] = value!== undefined ? value : SETTINGS[fieldName].default;
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });

    const setting = {
      ...fieldValues,
      default: { ...fieldDefaults },
      isGM: game.user?.isGM,
      fields: { ...fields },
      buttons: [ 
        { type: "button", icon: "", label: "CRLNGN_UI.settings.cameraDockMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.cameraDockMenu.save" }
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

  _onRender(context, options) {
    LogUtil.log("_onRender", [context, options]);
    CameraDockSettings.element = this.element;

    // add listener to .toggle-hint 
    const hintToggle = CameraDockSettings.element.querySelector('.toggle-hint');
    hintToggle.addEventListener('click', () => {
      CameraDockSettings.element.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
    });

    // Add event listener for enableFloatingDock checkbox
    const enableFloatingDockCheckbox = this.element?.querySelector('input[name="enableFloatingDock"]');
    LogUtil.log('_onRender', [this.element, enableFloatingDockCheckbox])
    if (enableFloatingDockCheckbox) {
      enableFloatingDockCheckbox.addEventListener('change', this.#onDockEnabledChange.bind(this));
      // Initial state
      this.#onDockEnabledChange({ target: enableFloatingDockCheckbox });
    }
  }

  /**
   * Handles changes to the dockEnabled checkbox
   * @private
   * @param {Event} event - The change event
   */
  #onDockEnabledChange(event) {
    const otherInputs = this.element?.querySelectorAll('input:not([name="enableFloatingDock"])');
    otherInputs.forEach(input => input.disabled = !event.target.checked);
    const otherSelects = this.element?.querySelectorAll('select');
    otherSelects.forEach(select => select.disabled = !event.target.checked);
    LogUtil.log('onDockEnabledChange', [this.element, otherInputs, otherSelects])
  }


}
