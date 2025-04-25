import { getSettings, THEMES } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Theme and Styles Settings application for managing UI theme and style configurations.
 * Provides a form interface with dropdown theme selection and live preview capabilities.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class ThemeAndStyleSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @type {HTMLElement} Private static reference to the form element */
  static #element;
  static #hintsOn = false;

  /**
   * Default application options
   * @static
   * @returns {object} Configuration object containing default settings for the application
   */
  static get DEFAULT_OPTIONS() {
    const SETTINGS = getSettings();

    return {
      id: SETTINGS.themeAndStylesMenu.tag,
      actions: {
        redefine: ThemeAndStyleSettings.#onReset,
      },
      form: {
        handler: ThemeAndStyleSettings.#onSubmit,
        closeOnSubmit: true,
      },
      position: {
        width: 480,
        height: "auto",
      },
      tag: "form",
      window: {
        icon: "fas fa-brush",
        title: game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title"),
        contentClasses: ["standard-form", "datalists", "crlngn"],
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
      template: "modules/crlngn-ui/templates/theme-and-styles-settings.hbs",
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
    return game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title");
  }

  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  /**
   * Handles form submission and updates theme settings
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
    const fieldNames = SETTINGS.themeAndStylesMenu.fields;

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);
    const selectedTheme = THEMES.find(theme => theme.label===settings.colorTheme);
    settings.colorTheme = selectedTheme ? selectedTheme.className : '';

    fieldNames.forEach((fieldName) => {
      if(settings[fieldName] !== undefined) {
        LogUtil.log("Saving setting:", [settings[fieldName]]);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
      }
    });

    // For compatibility - to be removed in future version
    SettingsUtil.set(SETTINGS.themeAndStylesMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }


  /**
   * Prepares the context data for the template
   * @protected
   * @param {object} options - Application options
   * @returns {object} The prepared context object containing field values, defaults, theme list, and UI configuration
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const fieldNames = SETTINGS.themeAndStylesMenu.fields;
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

    const selectedTheme = THEMES.find(theme => {
      return theme.className===fieldValues.colorTheme
    });
    fieldValues.colorTheme = selectedTheme?.label || THEMES[0].label;

    const setting = {
      ...fieldValues,
      default: {...fieldDefaults},
      fields: { 
        ...fields
      },
      selectedTheme: selectedTheme,
      themes: THEMES,
      buttons: [
        { type: "button", icon: "", label: "CRLNGN_UI.settings.themeAndStylesMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.themeAndStylesMenu.save" }
      ]
    }

    // Store the initial context for later updates
    this._initialContext = { ...fieldValues };

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
   * Handles post-render operations including dropdown setup, keyboard navigation, and theme preview
   * @protected
   * @param {object} context - The render context
   * @param {object} options - The render options
   */
  _onRender(context, options) { 
    ThemeAndStyleSettings.element = this.element;

    // Add listener to .toggle-hint 
    const hintToggle = ThemeAndStyleSettings.element.querySelector('.toggle-hint');
    hintToggle.addEventListener('click', () => {
      ThemeAndStyleSettings.element.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
    });
    
    // Store reference to themes for later use
    this._themes = THEMES;
    
    // Handle input focus and blur
    const inputs = ThemeAndStyleSettings.element.querySelectorAll('input[type="text"]:not([hidden])');
    inputs.forEach(input => {
      const wrapper = input.closest('.dropdown-wrapper');
      const dropdown = wrapper?.querySelector('.dropdown-options');
      
      if (!wrapper || !dropdown) return;
  
      // Show dropdown on input focus
      const onFocus = () => {
        ThemeAndStyleSettings.#closeAllDropdowns();
        dropdown.classList.add('active');
      };
      input.addEventListener('focus', onFocus);
      input.addEventListener('click', onFocus);

      // Add keyboard navigation
      input.addEventListener('keydown', (e) => {
        const isActive = dropdown.classList.contains('active');
        const options = Array.from(dropdown.querySelectorAll('.dropdown-option'));
        let currentIndex = options.findIndex(opt => opt.classList.contains('highlighted'));
        
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          
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
    const dropOptions = ThemeAndStyleSettings.element.querySelectorAll('.dropdown-option');
    const that = this; // Store reference to this for use in event handlers
    
    dropOptions.forEach(option => {
      // Add mouse hover effect that syncs with keyboard highlighting
      option.addEventListener('mouseenter', () => {
        // Remove highlight from all options
        const allOptions = option.closest('.dropdown-options').querySelectorAll('.dropdown-option');
        allOptions.forEach(opt => opt.classList.remove('highlighted'));
        
        // Add highlight to current option
        option.classList.add('highlighted');
      });
      
      option.addEventListener('click', function(e) {
        LogUtil.log('option', [option, option.querySelector('.theme-name')]);
        const input = option.closest('.dropdown-wrapper').querySelector('input');
        let value = option.querySelector('.theme-name').innerHTML.toString();
        
        // Update the input value
        input.value = value;
        
        // Update the selectedTheme if this is the theme input
        if (input.name === 'colorTheme') {
          const selectedTheme = that._themes.find(theme => {
            return theme.label === value;
          });
          
          // Store the selected theme for form submission
          that._selectedTheme = selectedTheme;
          
          // Update any UI elements that depend on selectedTheme
          that._updateThemePreview(selectedTheme);
        }
        
        const dropdown = option.closest('.dropdown-options');
        dropdown.classList.remove('active');
      });
    });

    // add event listeners for each checkbox of 'other modules' list
    const otherModulesChecks = ThemeAndStyleSettings.element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');
    const hiddenInputOtherModules = ThemeAndStyleSettings.element.querySelector('input.otherModulesList');
    otherModulesChecks.forEach(checkbox => {
      checkbox.addEventListener("change", (evt) => {
        const tgt = evt.currentTarget;
        let hiddenValue = `${hiddenInputOtherModules.value}`;
        let selectedValues = hiddenValue.split(",") || [];
        let index = selectedValues.indexOf(tgt.value);

        if(!evt.currentTarget.checked && index > -1){
          selectedValues.splice(index, 1);
        }else if(evt.currentTarget.checked && index === -1){
          selectedValues.push(tgt.value);
        }
        hiddenInputOtherModules.value = selectedValues.join(",");
        LogUtil.log("checkbox changed", [selectedValues, hiddenInputOtherModules.value]);
      })
    });

    // listen for toggle all / untoggle all checkbox
    const toggleModulesCheckbox = ThemeAndStyleSettings.element.querySelector('input.adjustOtherModules');
    toggleModulesCheckbox.addEventListener("change", (evt) => {
      const checkboxes = ThemeAndStyleSettings.element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = evt.currentTarget.checked;
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);
      })
    })
  }

  /**
   * Update any UI elements that depend on the theme selection
   * @param {Object} theme - The selected theme object
   * @private
   */
  _updateThemePreview(theme) {
    // Implement any preview updates here
    LogUtil.log("Selected theme updated:", [theme]);
    
    if (!theme) return;
    
    const selectedThemeSpan = this.element.querySelectorAll('span.selected-theme');

    selectedThemeSpan.forEach((span,i) => {
      span.style.setProperty('background-color', theme.colorPreview[i]);
    });
  }
  
  /**
   * Closes all open theme dropdown menus
   * @private
   * @static
   */
  static #closeAllDropdowns() {
    ThemeAndStyleSettings.element.querySelectorAll('.dropdown-options').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }

  /**
   * Resets form fields to their default values and updates theme preview
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
    const fieldNames = SETTINGS.themeAndStylesMenu.fields;

    const fields = {};
    const fieldDefaults = {};

    fieldNames.forEach((fieldName) => {
      if(SETTINGS[fieldName]) {
        fields[fieldName] = SETTINGS[fieldName];
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });

    const selectedTheme = THEMES.find(theme => theme.label===SETTINGS.colorTheme.default);
    fieldDefaults.colorTheme = selectedTheme?.label || THEMES[0].label;

    inputs.forEach(inputField => {
      inputField.value = fieldDefaults[inputField.name];
    })
  }

}