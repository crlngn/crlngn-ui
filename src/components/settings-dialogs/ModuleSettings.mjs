import { getSettings, THEMES } from "../../constants/Settings.mjs";
import { getSettingMenus } from "../../constants/SettingMenus.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
import { GeneralUtil } from "../GeneralUtil.mjs";
import { LeftControls } from "../LeftControlsUtil.mjs";

const { FormDataExtended } = foundry.utils;

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Tabbed Settings Menu application for managing all module settings in a unified interface.
 * Provides a tabbed form interface for accessing all settings categories in one place.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */ 
export class ModuleSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static #element;
  static #activeTab;
  static #requireReload;
  static selectedTheme;

  /**
   * Default application options
   * @static
   */
  static DEFAULT_OPTIONS = {
    id: "crlngn-ui-settings",
    tag: "form",
    window: {
      icon: "fas fa-cog",
      title: "CRLNGN_UI.settings.moduleSettingsMenu.title",
      contentClasses: ["standard-form", "crlngn", "tabbed-settings"],
      resizable: true
    },
    position: {
      width: 700,
      height: "auto"
    },
    actions: {
      redefine: ModuleSettings.#onReset
    },
    form: {
      handler: ModuleSettings.#onSubmit,
      closeOnSubmit: true
    }
  }

  /**
   * Template parts used for rendering the application
   * @static
   */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    interface: {
      menuKey: "interfaceOptionsMenu",
      template: "modules/crlngn-ui/templates/interface-elements-settings.hbs"
    },
    themes: {
      menuKey: "themeAndStylesMenu",
      template: "modules/crlngn-ui/templates/theme-and-styles-settings.hbs"
    },
    fonts: {
      menuKey: "customFontsMenu",
      template: "modules/crlngn-ui/templates/custom-fonts-settings.hbs"
    },
    chat: {
      menuKey: "chatMessagesMenu",
      template: "modules/crlngn-ui/templates/chat-messages-settings.hbs"
    },
    scenes: {
      menuKey: "sceneNavMenu",
      template: "modules/crlngn-ui/templates/scene-nav-settings.hbs"
    },
    players: {
      menuKey: "playersListMenu",
      template: "modules/crlngn-ui/templates/players-list-settings.hbs"
    },
    controls: {
      menuKey: "leftControlsMenu",
      template: "modules/crlngn-ui/templates/left-controls-settings.hbs"
    },
    camera: {
      menuKey: "cameraDockMenu",
      template: "modules/crlngn-ui/templates/camera-dock-settings.hbs"
    },
    sheets5e: {
      menuKey: "sheets5eMenu",
      template: "modules/crlngn-ui/templates/actor-sheets-5e-settings.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /**
   * Tab configuration for the application
   * @static
   */
  static TABS = {
    primary: {
      initial: "interface",
      tabs: ModuleSettings.#getTabs(),
      labelPrefix: ""
    }
  };

  /** @inheritDoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    const restrictedTabs = ModuleSettings.getRestrictedTabs();

    if(!game.user.isGM){
      restrictedTabs.forEach(tab => {
        delete parts[tab];
      })
    }

    return parts;
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.activeTab = options.activeTab || Object.keys(context.tabs)[0];
    const SETTINGS = getSettings();

    /* add specific data for theme and style fields */
    // const themeFieldNames = SETTINGS.themeAndStylesMenu.fields;
    // const themeFieldValues = {};

    // themeFieldNames.forEach((fieldName) => {
    // //   if(SETTINGS[fieldName]) {
    // //     const value = SettingsUtil.get(SETTINGS[fieldName].tag);
    // //     themeFieldValues[fieldName] = value!== undefined ? value : SETTINGS[fieldName].default;
    // //   }

    // //   if(fieldName==='colorTheme'){
    // //     ModuleSettings.selectedTheme = THEMES.find(theme => {
    // //       return theme.className === themeFieldValues.colorTheme;
    // //     });
    // //     themeFieldValues.colorTheme = ModuleSettings.selectedTheme?.label;
    // //   }
    // });
    
    // context.selectedTheme = ModuleSettings.selectedTheme || {};
    context.themes = THEMES;

    /* add specific data for font fields */
    const fonts = await GeneralUtil.getAllFonts();
    context.fontList = fonts;
    
    return context;
  }

   /** @inheritDoc */
   async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if ( partId in context.tabs ) partContext.tab = partContext.tabs[partId];
    const SETTINGS = getSettings();
    const SETTINGS_MENUS = getSettingMenus();
    const restrictedTabs = ModuleSettings.getRestrictedTabs();

    if(!game.user.isGM){
      restrictedTabs.forEach(tab => {
        delete partContext.tabs[tab];
      })
    }
    // LogUtil.log("_preparePartContext", [partContext, partId, options]);

    switch ( partId ) {
      case "tabs": {
        break;
      }
      case "footer": {
        partContext.buttons = [
          { type: "button", icon: "", label: "CRLNGN_UI.settings.moduleSettingsMenu.reset", action: 'redefine' },
          { type: "submit", icon: "", label: "CRLNGN_UI.settings.moduleSettingsMenu.save" }
        ];
        break;
      }
      default: {
        partContext.tab = partContext.tabs[partId];
        const partKey = ModuleSettings.PARTS[partId]?.menuKey || null;
        if(partKey){
          const menuContext = ModuleSettings.getMenuContext(partKey);
          
          if (menuContext.fields) {
            partContext.fields = {
              ...partContext.fields,
              ...menuContext.fields
            }
          }

          if (menuContext.fieldDefaults) {
            partContext.fieldDefaults = {
              ...partContext.fieldDefaults,
              ...menuContext.fieldDefaults
            }
          }

          if (menuContext.fieldValues) {
            if(partId==='themes'){
              const selectedTheme = THEMES.find(theme => {
                return theme.className===menuContext.fieldValues.colorTheme
              });
              menuContext.fieldValues.colorTheme = selectedTheme?.label || THEMES[0].label;
            }
            Object.assign(partContext, menuContext.fieldValues);
          }
        }
        break;
      }
    }
    LogUtil.log("_preparePartContext", [partContext, partId]);
    return partContext;
  }

  /**
   * Retrieves the context object containing fields, field values, and field defaults for a specific menu
   * @param {string} menuKey - The key of the setting menu
   * @returns {object} The context object containing fields, field values, and field defaults
   */
  static getMenuContext(menuKey){
    const SETTINGS = getSettings();
    const fieldNames = SETTINGS[menuKey]?.fields || null;
    if(!fieldNames) return {};
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

    return {fields: fields, fieldValues: fieldValues, fieldDefaults: fieldDefaults};
  }

  /**
   * Retrieves the keys of setting menus that are restricted to GMs
   * @returns {string[]} Array of setting menu keys
   */
  static getRestrictedTabs(){
    const SETTINGS_MENUS = getSettingMenus();
    const restrictedTabs = [];
    Object.entries(SETTINGS_MENUS).forEach((entry, index) => {
      if(entry[0]!=="moduleSettingsMenu" && entry[1].restricted){
        restrictedTabs.push(entry[0]);
      }
    });
    return restrictedTabs;
  }

  /**
   * Handles post-render operations
   * @protected
   * @param {object} context - The render context
   * @param {object} options - The render options
   */
  _onRender = (context, options) => {
    const SETTINGS = getSettings();
    ModuleSettings.#element = this.element;

    // add listener to .toggle-hint 
    const hintToggles = ModuleSettings.#element.querySelectorAll('.toggle-hint');
    LogUtil.log("_onRender", [context, options, this.element]);
    hintToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        ModuleSettings.#element.querySelectorAll('p.hint').forEach(p => p.classList.toggle('shown'));
      });
    });

    ModuleSettings.handleCustomFontFields();
    ModuleSettings.handleThemeAndStyleFields();

    // const controlSettings = SettingsUtil.get(SETTINGS.moduleSettingsMenu.tag);
    LogUtil.log("_onRender", [context, options]);
  }

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

    let confirmReload = ModuleSettings.updateSettings(formData);

    if(confirmReload){
      GeneralUtil.confirmReload();
    }
  }

  static updateSettings(formData){
    let confirmReload = false;
    const SETTINGS = getSettings();
    const html = ModuleSettings.#element;
    const activeContent = html.querySelector(".form-content.active");
    const activeTab = activeContent.dataset.tab;
    ModuleSettings.#activeTab = activeTab;

    if(!formData){
      return;
    }

    // Convert FormData into an object with proper keys
    let settings;
    if (formData.object) {
      settings = foundry.utils.expandObject(formData.object);
    } 

    // LogUtil.log("updateSettings #1", [settings, formData.object]);
    let fieldNames = [];

    const selectedTheme = THEMES.find(theme => theme.label===settings.colorTheme);
    settings.colorTheme = selectedTheme ? selectedTheme.className : THEMES[0].className;

    Object.entries(settings).forEach(([fieldName, value]) => {
      if(settings[fieldName] !== undefined) {
        const currSetting = SettingsUtil.get(SETTINGS[fieldName].tag);
        SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
        
        if(SETTINGS[fieldName]?.requiresReload && currSetting !== settings[fieldName]){
          confirmReload = true;
        }
      }
    });

    ui.notifications.info(game.i18n.localize('CRLNGN_UI.ui.notifications.settingsUpdated'));
    return confirmReload;
  }

  /** @inheritDoc */
  changeTab(tab, group, options) {
    super.changeTab(tab, group, options);
    ModuleSettings.#activeTab = tab;
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
    const html = ModuleSettings.#element;
    const activeContent = html.querySelector(".form-content.active");
    const activeTab = activeContent.dataset.tab;
    const menuKey = ModuleSettings.PARTS[activeTab].menuKey;
    const defaults = SETTINGS[menuKey].default;
    // SettingsUtil.get(SETTINGS[menuKey].tag)

    const inputs = activeContent.querySelectorAll("input, select");
    inputs.forEach(inputField => {
      inputField.value = defaults[inputField.name];
      if(inputField.type==='checkbox'){
        inputField.checked = defaults[inputField.name];
      }
    });

    LogUtil.log("#onReset", [ModuleSettings.#activeTab, activeTab, a, b]);
  }

  static #getTabs() {
    const tabList = [];
    const relevantTabs = ModuleSettings.PARTS;
    LogUtil.log("#getTabs", [game, relevantTabs]);
    if(game.system?.id!=='dnd5e'){
      delete relevantTabs.sheets5e;
    }
    Object.entries(relevantTabs).forEach(([key, value]) => {
      
      if(value.menuKey) {
        tabList.push({
          id: key,
          icon: '',
          group: 'primary-tabs',
          label: `CRLNGN_UI.settings.moduleSettingsMenu.tabs.${key}`
        })
      }
    })
    return tabList;
  }

  static handleCustomFontFields() {
    const fontsContent = ModuleSettings.#element.querySelector(`.form-content[data-tab=fonts]`);
    
    if(!fontsContent){ return; }

    const inputs = fontsContent.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
      const wrapper = input.closest('.dropdown-wrapper');
      const dropdown = wrapper?.querySelector('.dropdown-options');
      if (!wrapper || !dropdown) return;
  
      // Show dropdown on input focus
      const onFocus = () => {
        ModuleSettings.#closeAllDropdowns();
        dropdown.classList.add('active');
      };
      input.addEventListener('focus', onFocus);
      input.addEventListener('click', onFocus);

      // LogUtil.log("handleCustomFontFields", [input, wrapper, dropdown]);

      // Add keyboard navigation
      input.addEventListener('keydown', ModuleSettings.#onDropDownKeyDown);

      // Handle clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  
    // Handle option selection
    const dropOptions = fontsContent.querySelectorAll('.dropdown-option');
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
        LogUtil.log("handleCustomFontFields", [value, input, dropdown]);
        // Return focus to input after selection
        // input.focus();
      });
    });
  }

  static handleThemeAndStyleFields(){
    const themesContent = ModuleSettings.#element.querySelector(`.form-content[data-tab=themes]`);
    if(!themesContent){ return; }
    
    // Handle input focus and blur
    const inputs = themesContent.querySelectorAll('input[type="text"]:not([hidden])');
    inputs.forEach(input => {
      const wrapper = input.closest('.dropdown-wrapper');
      const dropdown = wrapper?.querySelector('.dropdown-options');
      
      if (!wrapper || !dropdown) return;
  
      // Show dropdown on input focus
      const onFocus = () => {
        ModuleSettings.#closeAllDropdowns();
        dropdown.classList.add('active');
      };
      input.addEventListener('focus', onFocus);
      input.addEventListener('click', onFocus);

      // Add keyboard navigation
      input.addEventListener('keydown', ModuleSettings.#onDropDownKeyDown);

      // Handle clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  
    // Handle option selection
    const dropOptions = themesContent.querySelectorAll('.dropdown-option');
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
        LogUtil.log('theme option', [option, option.querySelector('.theme-name')]);
        const input = option.closest('.dropdown-wrapper')?.querySelector('input');
        let value = option.querySelector('.theme-name')?.innerHTML.toString();
        
        // Update the input value
        input.value = value;
        
        // Update the selectedTheme if this is the theme input
        if (input.name === 'colorTheme') {
          const selectedTheme = THEMES.find(theme => {
            return theme.label === value;
          });
          
          // Update any UI elements that depend on selectedTheme
          ModuleSettings.#updateThemePreview(selectedTheme);
        }
        
        const dropdown = option.closest('.dropdown-options');
        dropdown.classList.remove('active');
      });
      
    });

    // add event listeners for each checkbox of 'other modules' list
    const otherModulesChecks = ModuleSettings.#element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');
    const hiddenInputOtherModules = ModuleSettings.#element.querySelector('input.otherModulesList[type="hidden"]');
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
    const toggleModulesCheckbox = ModuleSettings.#element.querySelector('input.adjustOtherModules');
    toggleModulesCheckbox.addEventListener("change", (evt) => {
      const checkboxes = ModuleSettings.#element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = evt.currentTarget.checked;
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);
      })
      const selectedValues = [];
      const hiddenInputOtherModules = ModuleSettings.#element.querySelector('input.otherModulesList[type="hidden"]');
      checkboxes.forEach(checkbox => {
        if(checkbox.checked){
          selectedValues.push(checkbox.value);
        }
      });
      hiddenInputOtherModules.value = selectedValues.join(",");
      if(selectedValues.length === 0){
        toggleModulesCheckbox.checked = false;
      }
    });
  }

  /**
   * Closes all open font dropdown menus
   * @private
   * @static
   */
  static #closeAllDropdowns() {
    ModuleSettings.#element.querySelectorAll('.dropdown-options').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  }


  static #onDropDownKeyDown(e){
    const wrapper = e.target.closest('.dropdown-wrapper');
    const dropdown = wrapper?.querySelector('.dropdown-options');
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
  }

  /**
   * Update any UI elements that depend on the theme selection
   * @param {Object} theme - The selected theme object
   * @private
   */
  static #updateThemePreview(theme) {
    // Implement any preview updates here
    LogUtil.log("Selected theme updated:", [theme]);
    
    if (!theme) return;
    
    const selectedThemeSpan = ModuleSettings.#element.querySelectorAll('span.selected-theme');

    selectedThemeSpan.forEach((span,i) => {
      span.style.setProperty('background-color', theme.colorPreview[i]);
    });
  }
}
