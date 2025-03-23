import { getSettings } from "../../constants/Settings.mjs";
import { GeneralUtil } from "../GeneralUtil.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Custom Fonts Settings application for managing font configurations.
 * Provides a form interface with dropdown font selection and keyboard navigation.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CustomFontsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {HTMLElement} Private static reference to the form element */
  static #element;
  /**
   * Default application options
   * @static
   * @returns {object} Configuration object containing default settings for the application
   */
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();

    return {
      id: SETTINGS.customFontsMenu.tag,
      actions: {
        redefine: CustomFontsSettings.#onReset,
      },
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
        // Add datalists to your content classes
        contentClasses: ["standard-form", "datalists"],
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
      template: "modules/crlngn-ui/templates/custom-fonts-settings.hbs",
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
    return game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title");
  }

  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  /**
   * Handles form submission and updates font settings
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
    const fieldNames = SETTINGS.customFontsMenu.fields;

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);

    fieldNames.forEach((fieldName) => {
      if(settings[fieldName] !== undefined) {
        LogUtil.log("Saving setting:", [settings[fieldName]]);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });

    // For compatibility - to be removed in future version
    SettingsUtil.set(SETTINGS.customFontsMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns {Promise<Object>}
   */
  async _prepareContext(options) {
    const SETTINGS = getSettings();
    const menuValues = SettingsUtil.get(SETTINGS.customFontsMenu.tag);
    const fieldNames = SETTINGS.customFontsMenu.fields;

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
      fontList: await GeneralUtil.getAllFonts(),
      fields: { 
        ...fields
      },
      buttons: [
        { type: "button", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.save" }
      ]
    };

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
    // LogUtil.log("_preparePartContext",[partId, context]);
    return context;
  }

  /**
   * Handles post-render operations including dropdown setup and event listeners
   * @protected
   * @param {object} context - The render context
   * @param {object} options - The render options
   */
  _onRender(context, options) {
    CustomFontsSettings.#element = this.element;
    
    // Handle input focus and blur
    const inputs = CustomFontsSettings.#element.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
      const wrapper = input.closest('.dropdown-wrapper');
      const dropdown = wrapper?.querySelector('.dropdown-options');
      
      if (!wrapper || !dropdown) return;
  
      // Show dropdown on input focus
      const onFocus = () => {
        CustomFontsSettings.#closeAllDropdowns();
        dropdown.classList.add('active');
      };
      input.addEventListener('focus', onFocus);
      input.addEventListener('click', onFocus);

      // Add keyboard navigation
      input.addEventListener('keydown', (e) => {
        const isActive = dropdown.classList.contains('active');
        const options = Array.from(dropdown.querySelectorAll('.dropdown-option'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));
        
        // Handle arrow down/up
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); // Prevent cursor movement in input
          
          if (!isActive) {
            dropdown.classList.add('active');
          }
          
          // Remove current highlight
          options.forEach(opt => opt.classList.remove('highlighted'));
          
          // Calculate new index
          if (currentIndex === -1) {
            currentIndex = e.key === 'ArrowDown' ? 0 : options.length - 1;
          } else {
            currentIndex = e.key === 'ArrowDown' 
              ? (currentIndex + 1) % options.length 
              : (currentIndex - 1 + options.length) % options.length;
          }
          
          // Add highlight to new option and scroll into view
          if (options[currentIndex]) {
            options[currentIndex].classList.add('highlighted');
            options[currentIndex].scrollIntoView({ block: 'nearest' });
          }
        }
        
        // Handle Enter key
        else if (e.key === 'Enter') {
          e.preventDefault();
          
          if (isActive && currentIndex !== -1 && options[currentIndex]) {
            // Simulate click on the highlighted option
            options[currentIndex].click();
          }
        }
        
        // Handle Escape key
        else if (e.key === 'Escape') {
          dropdown.classList.remove('active');
        }
      });

      // Handle clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  
    // Handle option selection
    const dropOptions = CustomFontsSettings.#element.querySelectorAll('.dropdown-option');
    dropOptions.forEach(option => {
      // Add mouse hover effect that syncs with keyboard highlighting
      option.addEventListener('mouseenter', () => {
        // Remove highlight from all options
        const allOptions = option.closest('.dropdown-options').querySelectorAll('.dropdown-option');
        allOptions.forEach(opt => opt.classList.remove('highlighted'));
        
        // Add highlight to current option
        option.classList.add('highlighted');
      });
      
      option.addEventListener('click', (e) => {
        const input = option.closest('.dropdown-wrapper').querySelector('input');
        // Get the value and handle potential quote escaping
        let value = option.dataset.value;
        
        // If the value contains spaces but doesn't have quotes, add them
        if (value.includes(' ') && !value.startsWith('"')) {
          value = `"${value}"`;
        }
        // If the value is already properly quoted, use it as is
        else if (value.startsWith('&quot;')) {
          value = value.replace(/&quot;/g, '"');
        }
        
        input.value = value;
        const dropdown = option.closest('.dropdown-options');
        dropdown.classList.remove('active');
        
        // Return focus to input after selection
        // input.focus();
      });
    });
  }
  
  /**
   * Closes all open font dropdown menus
   * @private
   * @static
   */
  static #closeAllDropdowns() {
    CustomFontsSettings.#element.querySelectorAll('.dropdown-options').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
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
    const inputs = html.querySelectorAll("input[type=text]");
    // const menuValues = SettingsUtil.get(SETTINGS.customFontsMenu.tag);
    const fieldNames = SETTINGS.customFontsMenu.fields;

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
  }

  

}