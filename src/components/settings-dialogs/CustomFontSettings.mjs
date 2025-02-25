import { getSettings } from "../../constants/Settings.mjs";
import { GeneralUtil } from "../GeneralUtil.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { Main } from "../Main.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";

/**
 * Classes for Settings Submenus 
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CustomFontsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static #element;
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
    return game.i18n.localize("CRLNGN_UI.settings.customFontsMenu.title");
  }

  /** 
   * Handles form submission and updates FoundryVTT settings.
   * Uses `foundry.utils.expandObject()` to parse form data.
   */
  static async #onSubmit(event, form, formData) {
    const SETTINGS = getSettings();
    event.preventDefault();
    event.stopPropagation();

    // Convert FormData into an object with proper keys
    const settings = foundry.utils.expandObject(formData.object);
    LogUtil.log("Saving settings:", [settings]); // Debugging

    SettingsUtil.set(SETTINGS.customFontsMenu.tag, settings);

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
  }

  /**
   * Prepare context to be sent to handlebars template
   * @param {*} options 
   * @returns 
   */
  _prepareContext(options) {
    const SETTINGS = getSettings();
    const current = SettingsUtil.get(SETTINGS.customFontsMenu.tag);
    const setting = {
      uiFont: current.uiFont || SETTINGS.customFontsMenu.default.uiFont,
      uiTitles: current.uiTitles || SETTINGS.customFontsMenu.default.uiTitles,
      journalBody: current.journalBody || current.journalBodyFont || SETTINGS.customFontsMenu.default.journalBody,
      journalTitles: current.journalTitles || current.journalTitleFont || SETTINGS.customFontsMenu.default.journalTitles,
      default: {
        ...SETTINGS.customFontsMenu.default
      },
      fontList: GeneralUtil.getAllFonts(),
      fields: { 
        ...SETTINGS.customFontsMenu.fields
      },
      buttons: [
        { type: "button", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.reset", action: 'redefine' },
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.customFontsMenu.save" }
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
    // LogUtil.log("_preparePartContext",[partId, context]);
    return context;
  }

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
        LogUtil.log("Option clicked:", [value, option.dataset]); // Debug log
        
        // If the value contains spaces but doesn't have quotes, add them
        if (value.includes(' ') && !value.startsWith('"')) {
          value = `"${value}"`;
        }
        // If the value is already properly quoted, use it as is
        else if (value.startsWith('&quot;')) {
          value = value.replace(/&quot;/g, '"');
        }
        
        input.value = value;
        option.closest('.dropdown-options').classList.remove('active');
        
        // Return focus to input after selection
        input.focus();
      });
    });
  }
  
  static #closeAllDropdowns() {
    CustomFontsSettings.#element.querySelectorAll('.dropdown-options').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }
  

  static async #onReset(a, b){
    const SETTINGS = getSettings();
    const html = this.element;
    const inputs = html.querySelectorAll("input[type=text]");
    const defaults = SETTINGS.customFontsMenu.default;

    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
    })
    
    LogUtil.log("#onReset", [a, b, SETTINGS.customFontsMenu.default]);
  }

  

}