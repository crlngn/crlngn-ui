import { getSettings, THEMES } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ThemeAndStyleSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static #element;

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
        // Add datalists to your content classes
        contentClasses: ["standard-form", "datalists"],
        resizable: false
      }
    }
  }

  // Define template parts
  static PARTS = {
    content: {
      template: "modules/crlngn-ui/templates/theme-and-styles-settings.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
      // "templates/generic/custom-fonts-settings-footer.hbs",
    },
  };
  
  get title() {
    return game.i18n.localize("CRLNGN_UI.settings.themeAndStylesMenu.title");
  }

  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
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
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const menuValues = SettingsUtil.get(SETTINGS.themeAndStylesMenu.tag);
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

  _onRender(context, options) {
    ThemeAndStyleSettings.#element = this.element;
    
    // Store reference to themes for later use
    this._themes = THEMES;
    
    // Handle input focus and blur
    const inputs = ThemeAndStyleSettings.#element.querySelectorAll('input[type="text"]');
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
    const dropOptions = ThemeAndStyleSettings.#element.querySelectorAll('.dropdown-option');
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
  
  static #closeAllDropdowns() {
    ThemeAndStyleSettings.#element.querySelectorAll('.dropdown-options').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }

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