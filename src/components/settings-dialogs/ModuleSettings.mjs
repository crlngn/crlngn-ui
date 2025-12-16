import { getSettings, THEMES, SETTING_SCOPE } from "../../constants/Settings.mjs";
import { getSettingMenus } from "../../constants/SettingMenus.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
import { GeneralUtil } from "../GeneralUtil.mjs";
import { LeftControls } from "../LeftControlsUtil.mjs";
import { ColorPickerDialog, ColorPickerUtil } from "../ColorPickerUtil.mjs";
import { HintTooltipUtil } from "../HintTooltipUtil.mjs";

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
      width: 740,
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
      template: "templates/generic/tab-navigation.hbs",
      isGMOnly: false
    },
    interface: {
      menuKey: "interfaceOptionsMenu",
      template: "modules/crlngn-ui/templates/interface-elements-settings.hbs",
      isGMOnly: false
    },
    themes: {
      menuKey: "themeAndStylesMenu",
      template: "modules/crlngn-ui/templates/theme-and-styles-settings.hbs",
      isGMOnly: false
    },
    system: {
      menuKey: "systemsMenu",
      template: "modules/crlngn-ui/templates/systems-modules-settings.hbs",
      isGMOnly: false
    },
    fonts: {
      menuKey: "customFontsMenu",
      template: "modules/crlngn-ui/templates/custom-fonts-settings.hbs",
      isGMOnly: true
    },
    chat: {
      menuKey: "chatMessagesMenu",
      template: "modules/crlngn-ui/templates/chat-messages-settings.hbs",
      isGMOnly: false
    },
    scenes: {
      menuKey: "sceneNavMenu",
      template: "modules/crlngn-ui/templates/scene-nav-settings.hbs",
      isGMOnly: false
    },
    players: {
      menuKey: "playersListMenu",
      template: "modules/crlngn-ui/templates/players-list-settings.hbs",
      isGMOnly: false
    },
    camera: {
      menuKey: "cameraDockMenu",
      template: "modules/crlngn-ui/templates/camera-dock-settings.hbs",
      isGMOnly: false
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
      isGMOnly: false
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
    context.isGM = game.user.isGM;
    const SETTINGS = getSettings();
    
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
            if (partKey === "systemsMenu") {
              partContext.fields = menuContext.fields;
            } else {
              partContext.fields = {
                ...partContext.fields,
                ...menuContext.fields
              }
            }
          }

          if (menuContext.fieldDefaults) {
            if (partKey === "systemsMenu") {
              partContext.fieldDefaults = menuContext.fieldDefaults;
            } else {
              partContext.fieldDefaults = {
                ...partContext.fieldDefaults,
                ...menuContext.fieldDefaults
              }
            }
          }

          if (menuContext.fieldValues) {
            if(partId==='themes'){
              const selectedTheme = THEMES.find(theme => {
                return theme.className===menuContext.fieldValues.colorTheme
              });
              menuContext.fieldValues.colorTheme = selectedTheme?.label || THEMES[0].label;

              const selectedPlayerTheme = THEMES.find(theme => {
                return theme.className===menuContext.fieldValues.playerColorTheme
              });
              menuContext.fieldValues.playerColorTheme = selectedPlayerTheme?.label || "";
            }
            Object.assign(partContext, menuContext.fieldValues);
            
            if (partKey === "systemsMenu") {
              partContext.fieldValues = menuContext.fieldValues;
            }
          }

          if (partId === 'system') {
            partContext.currentSystem = menuContext.currentSystem;

            if (partContext.otherModulesList && Array.isArray(partContext.otherModulesList)) {
              partContext.otherModulesListJson = JSON.stringify(partContext.otherModulesList);
              partContext.adjustOtherModules = partContext.otherModulesList.some(m => m.enabled);
            }

            if (partContext.fields?.otherModulesList) {
              partContext.modulesField = partContext.fields.otherModulesList;
            }

            const hasWorldSettings = game.user.isGM && Object.values(partContext.fields || {}).some(field => {
              return field?.scope === SETTING_SCOPE.world &&
                     !['otherModulesList', 'adjustOtherModules'].includes(Object.keys(partContext.fields || {}).find(key => partContext.fields[key] === field));
            });
            const hasClientSettings = Object.values(partContext.fields || {}).some(field => field?.scope === SETTING_SCOPE.client);

            partContext.showNoSettings = !hasWorldSettings && !hasClientSettings;
          }


          if (partId === 'themes') {
            const worldCustomColors = SettingsUtil.get('v2-custom-theme-colors');
            const playerCustomColors = SettingsUtil.get('v2-player-custom-theme-colors');

            const createColorVariants = (colors) => {
              if (!colors.secondary) return colors;

              const secondaryRGB = colors.secondary.match(/\d+/g);
              if (secondaryRGB) {
                const [r, g, b] = secondaryRGB.map(n => parseInt(n));
                return {
                  ...colors,
                  secondaryLight: `rgb(${Math.min(255, r + 150)}, ${Math.min(255, g + 150)}, ${Math.min(255, b + 150)})`,
                  secondaryDark: colors.secondary
                };
              }
              return colors;
            };

            const baseWorldColors = worldCustomColors || {
              accent: THEMES[0].colorPreview[1],
              secondary: THEMES[0].colorPreview[0]
            };
            partContext.customColors = createColorVariants(baseWorldColors);

            const basePlayerColors = playerCustomColors || worldCustomColors || {
              accent: THEMES[0].colorPreview[1],
              secondary: THEMES[0].colorPreview[0]
            };
            partContext.playerCustomColors = createColorVariants(basePlayerColors);
          }

          partContext.sidebarTabs = Object.values(foundry.applications?.sidebar?.tabs || {}).map(tab => ({
            tabName: tab.tabName,
            name: tab.name,
            hideForGM: false,
            hideForPlayer: false,
            localizedName: `CRLNGN_UI.settings.sidebarTabs.${tab.name}`
          }));
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
    const fieldNames = SETTINGS[menuKey]?.fields || [];
    const playerFieldNames = SETTINGS["player_"+menuKey]?.fields || [];
    const currentSystem = game.system?.id;

    if(!fieldNames || fieldNames.length===0) return {};
    const fields = {};
    const fieldValues = {};
    const fieldDefaults = {};

    const shouldIncludeSetting = (setting, fieldName) => {
      if (menuKey === "systemsMenu") {
        if (fieldName === "otherModulesList" || fieldName === "adjustOtherModules") return true;
        if (!setting.system) return false;
        if (Array.isArray(setting.system)) {
          return setting.system.includes(currentSystem);
        }
        return setting.system === currentSystem;
      }
      // For other menus, include all settings
      return true;
    };

    fieldNames?.forEach((fieldName) => {
      if(SETTINGS[fieldName] && shouldIncludeSetting(SETTINGS[fieldName], fieldName)) {
        const value = SettingsUtil.get(SETTINGS[fieldName].tag);
        const fieldData = { ...SETTINGS[fieldName] };

        // Add enforcement state for client-scoped settings with config: false
        if (fieldData.scope === 'client' && fieldData.config === false) {
          const state = SettingsUtil.getEnforcementState(fieldData.tag);
          fieldData.enforcementState = state;
          // For players, mark if setting is locked (locked or gate mode)
          if (!game.user.isGM) {
            fieldData.isLocked = (state === 'locked' || state === 'gate');
          }
        }

        fields[fieldName] = fieldData;
        fieldValues[fieldName] = value!== undefined ? value : SETTINGS[fieldName].default;
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });

    playerFieldNames?.forEach((fieldName) => {
      if(SETTINGS[fieldName] && shouldIncludeSetting(SETTINGS[fieldName], fieldName)) {
        const value = SettingsUtil.get(SETTINGS[fieldName].tag);
        const fieldData = { ...SETTINGS[fieldName] };

        // Add enforcement state for client-scoped settings with config: false
        if (fieldData.scope === 'client' && fieldData.config === false) {
          const state = SettingsUtil.getEnforcementState(fieldData.tag);
          fieldData.enforcementState = state;
          // For players, mark if setting is locked (locked or gate mode)
          if (!game.user.isGM) {
            fieldData.isLocked = (state === 'locked' || state === 'gate');
          }
        }

        fields[fieldName] = fieldData;
        fieldValues[fieldName] = value!== undefined ? value : SETTINGS[fieldName].default;
        fieldDefaults[fieldName] = SETTINGS[fieldName].default;
      }
    });
    return {fields: fields, fieldValues: fieldValues, fieldDefaults: fieldDefaults, currentSystem: currentSystem};
  }

  /**
   * Retrieves the keys of setting menus that are restricted to GMs
   * @returns {string[]} Array of setting menu keys
   */
  static getRestrictedTabs(){
    const restrictedTabs = [];
    Object.entries(ModuleSettings.PARTS).forEach((entry, index) => {
      if(entry[0]!=="tabs" && entry[0]!=="footer" && entry[1].isGMOnly){
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
    LogUtil.log('_onRender called', [context, options]);
    const SETTINGS = getSettings();
    ModuleSettings.#element = this.element;
    LogUtil.log('Element set', [ModuleSettings.#element]);
    LogUtil.log('Options parts', [options.parts]);

    // Handle all range inputs with their corresponding value inputs
    const rangeInputs = ModuleSettings.#element.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(rangeInput => {
      const fieldName = rangeInput.name;
      const valueInput = ModuleSettings.#element.querySelector(`input[type="number"].range-value-input[name="${fieldName}_value"]`);
      if (valueInput) {
        ModuleSettings.handleRangeInputs(rangeInput, valueInput);
      }
    });

    // add listener to .toggle-hint
    const hintToggles = ModuleSettings.#element.querySelectorAll('.toggle-hint');
    LogUtil.log("_onRender", [context, options, this.element]);
    hintToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        // Clear any show-hint classes from hover interactions before toggling
        ModuleSettings.#element.querySelectorAll('.form-group.show-hint').forEach(fg => fg.classList.remove('show-hint'));

        // Add no-transition class to prevent glitch when hiding hints
        const hints = ModuleSettings.#element.querySelectorAll('p.hint');
        hints.forEach(p => p.classList.add('no-transition'));
        hints.forEach(p => p.classList.toggle('shown'));

        // Remove no-transition class after a frame
        requestAnimationFrame(() => {
          hints.forEach(p => p.classList.remove('no-transition'));
        });
      });
    });

    ModuleSettings.handleCustomFontFields();
    ModuleSettings.handleThemeAndStyleFields();
    ModuleSettings.handleSheetFields();

    // Inject enforcement icons dynamically BEFORE HintTooltipUtil processes labels
    ModuleSettings.injectEnforcementIcons();

    // Apply hint tooltip handlers if the feature is enabled
    const hoverableHints = SettingsUtil.get(SETTINGS.hoverableSettingsHints.tag);
    if (hoverableHints) {
      HintTooltipUtil.applyHintHandlers(this.element);
    }

    // Add lock icon click handlers for enforcement
    if (game.user.isGM) {
      const lockIcons = ModuleSettings.#element.querySelectorAll('.crlngn-enforce-icon');
      lockIcons.forEach(icon => {
        // Set the correct icon class based on current state
        const state = icon.dataset.state || 'unlocked';
        ModuleSettings.updateEnforcementIcon(icon, state);

        // Add click handler
        icon.addEventListener('click', (event) => {
          ModuleSettings.handleEnforcementIconClick(event, icon);
        });
      });
    }

    // const controlSettings = SettingsUtil.get(SETTINGS.moduleSettingsMenu.tag);
    LogUtil.log("_onRender", [context, options]);
  }

  static handleRangeInputs(rangeInput, valueInput){
    if (rangeInput && valueInput) {
      const min = parseFloat(rangeInput.min);
      const max = parseFloat(rangeInput.max);
      const step = parseFloat(rangeInput.step) || 1;

      // Listener for the range slider's input event
      rangeInput.addEventListener('input', () => {
        valueInput.value = rangeInput.value;
      });

      // Listener for the number input's input event (while typing)
      valueInput.addEventListener('input', () => {
        const currentValueString = valueInput.value;
        if (currentValueString === "" || currentValueString === "-" || currentValueString === ".") {
          return;
        }
        const currentValue = parseFloat(currentValueString);
        if (!isNaN(currentValue) && currentValue >= min && currentValue <= max) {
          rangeInput.value = currentValue;
        }
      });

      // Listener for the number input's change event (after typing/blur/enter)
      valueInput.addEventListener('change', () => {
        let value = parseFloat(valueInput.value);

        if (isNaN(value) || value < min) {
          value = min;
        } else if (value > max) {
          value = max;
        }

        valueInput.value = value; // Update the input field to the clamped/validated value
        rangeInput.value = value; // Sync the slider
      });

      valueInput.value = rangeInput.value;
    }
  }

  /**
   * Injects enforcement icons into setting labels based on field data
   * @static
   * @param {HTMLElement} targetElement - Optional element to search within (defaults to whole dialog)
   */
  static injectEnforcementIcons(targetElement = null) {
    const SETTINGS = getSettings();
    const searchRoot = targetElement || ModuleSettings.#element;

    // Get all labels in the target element
    const labels = searchRoot.querySelectorAll('label');

    labels.forEach(label => {
      let fieldName = label.getAttribute('for');

      // If no 'for' attribute, try to find the first input in the same parent
      if (!fieldName) {
        const parent = label.closest('li, .form-group');
        if (parent) {
          const firstInput = parent.querySelector('input[name], select[name]');
          if (firstInput) {
            fieldName = firstInput.getAttribute('name');
          }
        }
      }

      if (!fieldName || !SETTINGS[fieldName]) return;

      const setting = SETTINGS[fieldName];

      // Only process client-scoped settings with config: false
      if (setting.scope !== 'client' || setting.config !== false) return;

      const enforcementState = SettingsUtil.getEnforcementState(setting.tag) || 'unlocked';

      // For GMs, always show icon (even if unlocked) so they can change it
      // For players, only show icon if locked
      if (!game.user.isGM && enforcementState === 'unlocked') return;

      // Check if icon already exists (avoid duplicates)
      const existingIcon = label.querySelector('.crlngn-enforce-icon, .crlngn-locked-icon');
      if (existingIcon) return;

      // Determine if setting is locked for this user
      const isLocked = (enforcementState === 'locked' || enforcementState === 'gate');

      let icon;

      if (game.user.isGM) {
        // Create clickable enforcement icon for GM
        icon = document.createElement('i');
        icon.className = 'fas crlngn-enforce-icon';
        icon.dataset.setting = setting.tag;
        icon.dataset.state = enforcementState;
        icon.title = game.i18n.localize('CRLNGN_UI.ui.enforcementTooltip');

        // Set initial icon class based on state
        const iconClasses = {
          'unlocked': 'fa-lock-keyhole-open',
          'soft': 'fa-unlock-keyhole',
          'locked': 'fa-lock',
          'gate': 'fa-dungeon'
        };
        icon.classList.add(iconClasses[enforcementState]);
      } else if (isLocked) {
        // Create static lock icon for players when setting is locked
        icon = document.createElement('i');
        icon.className = 'fas fa-lock crlngn-locked-icon';
        icon.title = 'Locked by GM';
      }

      // Prepend icon to label if it was created
      if (icon) {
        label.prepend(icon);
      }

      // Disable the corresponding input if locked for players
      if (!game.user.isGM && isLocked) {
        const input = ModuleSettings.#element.querySelector(`[name="${fieldName}"]`);
        if (input) {
          input.disabled = true;
        }
      }
    });
  }

  /**
   * Handles enforcement icon clicks to cycle through lock states
   * @static
   * @param {Event} event - The click event
   * @param {HTMLElement} icon - The icon element
   */
  static handleEnforcementIconClick(event, icon) {
    event.preventDefault();
    event.stopPropagation();

    const settingTag = icon.dataset.setting;
    if (!settingTag) return;

    const isAltClick = event.altKey;
    const newState = SettingsUtil.cycleEnforcementState(settingTag, isAltClick);

    // Update icon class based on new state
    ModuleSettings.updateEnforcementIcon(icon, newState);

    // Save defaults if the setting is now enforced
    if (newState !== 'unlocked') {
      SettingsUtil.saveDefaultSettings();
    }
  }

  /**
   * Updates the enforcement icon class based on state
   * @static
   * @param {HTMLElement} icon - The icon element
   * @param {string} state - The enforcement state
   */
  static updateEnforcementIcon(icon, state) {
    // Remove all state classes
    icon.classList.remove('fa-lock-keyhole-open', 'fa-unlock-keyhole', 'fa-lock', 'fa-dungeon');

    // Add appropriate class based on state
    const iconClasses = {
      'unlocked': 'fa-lock-keyhole-open',
      'soft': 'fa-unlock-keyhole',
      'locked': 'fa-lock',
      'gate': 'fa-dungeon'
    };

    icon.classList.add(iconClasses[state]);
    icon.dataset.state = state;
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

    let fieldNames = [];

    const selectedTheme = THEMES.find(theme => theme.label===settings.colorTheme);
    settings.colorTheme = selectedTheme ? selectedTheme.className : THEMES[0].className;

    const selectedPlayerTheme = THEMES.find(theme => theme.label===settings.playerColorTheme);
    settings.playerColorTheme = selectedPlayerTheme ? selectedPlayerTheme.className : "";

    // Handle otherModulesList
    if (activeTab === 'system' && settings.otherModulesList !== undefined) {
      if (Array.isArray(settings.otherModulesList)) {
        LogUtil.log('otherModulesList already an array from form', [settings.otherModulesList]);
      } else if (typeof settings.otherModulesList === 'string' && settings.otherModulesList.trim() !== '') {
        const trimmed = settings.otherModulesList.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            settings.otherModulesList = parsed;
            LogUtil.log('Parsed otherModulesList from JSON string', [settings.otherModulesList]);
          } catch (e) {
            LogUtil.warn('Failed to parse otherModulesList from form - preserving current setting', [e, trimmed]);
            settings.otherModulesList = SettingsUtil.get(SETTINGS.otherModulesList?.tag);
          }
        } else {
          LogUtil.warn('otherModulesList is malformed string - preserving current setting. Value:', [trimmed]);
          settings.otherModulesList = SettingsUtil.get(SETTINGS.otherModulesList?.tag);
        }
      } else {
        const preserved = SettingsUtil.get(SETTINGS.otherModulesList?.tag);
        settings.otherModulesList = preserved;
        LogUtil.log('otherModulesList invalid or empty, preserving current', [preserved]);
      }
    } else {
      const preserved = SettingsUtil.get(SETTINGS.otherModulesList?.tag);
      settings.otherModulesList = preserved;
      LogUtil.log('otherModulesList not in form, preserving current', [preserved]);
    }

    Object.entries(settings).forEach(([fieldName, value]) => {
      if(fieldName.endsWith('_value')) return;

      if(fieldName === 'adjustOtherModules') return;

      LogUtil.log("updateSettings #1", [SETTINGS, SETTINGS[fieldName]]);
      if(settings[fieldName] !== undefined && SETTINGS[fieldName]) {
        const currSetting = SettingsUtil.get(SETTINGS[fieldName].tag);

        const isClientSetting = SETTINGS[fieldName].scope === SETTING_SCOPE.client;
        const isWorldSetting = SETTINGS[fieldName].scope === SETTING_SCOPE.world;

        if (isClientSetting || (isWorldSetting && game.user.isGM)) {
          if (fieldName === 'otherModulesList') {
            LogUtil.log('Saving otherModulesList', [settings[fieldName], 'Current:', currSetting]);
          }
          SettingsUtil.set(SETTINGS[fieldName].tag, settings[fieldName]);
        } else {
          LogUtil.log(`Skipping world-scoped setting ${fieldName} for non-GM user`);
        }
        
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

    // Inject enforcement icons for the newly rendered tab
    // Use requestAnimationFrame to wait for tab content to render
    requestAnimationFrame(() => {
      ModuleSettings.injectEnforcementIcons();

      // Also set up click handlers for any new icons
      if (game.user.isGM) {
        const lockIcons = ModuleSettings.#element.querySelectorAll('.crlngn-enforce-icon');
        lockIcons.forEach(icon => {
          if (icon.dataset.handlerAttached) return;
          icon.dataset.handlerAttached = 'true';

          const state = icon.dataset.state || 'unlocked';
          ModuleSettings.updateEnforcementIcon(icon, state);

          icon.addEventListener('click', (event) => {
            ModuleSettings.handleEnforcementIconClick(event, icon);
          });
        });
      }
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
    LogUtil.log("#getTabs", [relevantTabs, ModuleSettings.PARTS]);
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

    // Handle useGlassEffect checkbox to show/hide glassTranslucence slider
    const useGlassEffectCheckbox = themesContent.querySelector('input[name="useGlassEffect"]');
    if (useGlassEffectCheckbox) {
      const toggleGlassEffectFields = () => {
        const isChecked = useGlassEffectCheckbox.checked;
        const glassTranslucenceField = themesContent.querySelector('.form-group.range:has(input[name="glassTranslucence"])');

        if (glassTranslucenceField) glassTranslucenceField.style.display = isChecked ? 'flex' : 'none';
      };

      // Set initial state
      toggleGlassEffectFields();

      // Add listener for changes
      useGlassEffectCheckbox.addEventListener('change', toggleGlassEffectFields);
    }

    // Handle color picker buttons (both player and world scopes)
    const colorPickerBtns = themesContent.querySelectorAll('.open-color-picker');
    colorPickerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const scope = btn.dataset.scope || 'world';
        const settingTag = scope === 'player' ? 'v2-player-custom-theme-colors' : 'v2-custom-theme-colors';
        
        const picker = new ColorPickerDialog({
          scope: scope,
          currentColors: SettingsUtil.get(settingTag),
          callback: (colors) => {
            // Update the preview in the settings dialog
            ModuleSettings.updateColorPreview(colors, scope);
          }
        });
        picker.render(true);
      });
    });
    
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
        if (input.name === 'colorTheme' || input.name === 'playerColorTheme') {
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
        const moduleId = tgt.value.replace(/['''"]/g, "").trim();
        const isChecked = tgt.checked;

        // Get current array from hidden input
        let currentList = [];
        try {
          currentList = JSON.parse(hiddenInputOtherModules.value) || [];
        } catch (e) {
          LogUtil.warn('Failed to parse otherModulesList', [e]);
          currentList = [];
        }

        // Update or add module in array
        const existingIndex = currentList.findIndex(item => item.id === moduleId);
        if (existingIndex >= 0) {
          currentList[existingIndex].enabled = isChecked;
        } else {
          currentList.push({ id: moduleId, enabled: isChecked });
        }

        // Save back to hidden input as JSON
        hiddenInputOtherModules.value = JSON.stringify(currentList);
        LogUtil.log("checkbox changed", [currentList, hiddenInputOtherModules.value]);

        // Update master toggle if needed
        const allCheckboxes = ModuleSettings.#element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');
        const anyChecked = Array.from(allCheckboxes).some(cb => cb.checked);
        const toggleCheckbox = ModuleSettings.#element.querySelector('input.adjustOtherModules');
        if (toggleCheckbox) {
          toggleCheckbox.checked = anyChecked;
        }
      })
    });

    // listen for toggle all / untoggle all checkbox
    const toggleModulesCheckbox = ModuleSettings.#element.querySelector('input.adjustOtherModules');
    toggleModulesCheckbox?.addEventListener("change", (evt) => {
      const isChecked = evt.currentTarget.checked;
      const checkboxes = ModuleSettings.#element.querySelectorAll('.multiple-select.other-modules input[type="checkbox"]');

      // Update all checkboxes
      checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
      });

      // Build new array with all modules set to same state
      const SETTINGS = getSettings();
      const newList = Object.values(SETTINGS.otherModulesList.options)
        .map(moduleId => ({
          id: moduleId.replace(/['''"]/g, "").trim(),
          enabled: isChecked
        }));

      // Save to hidden input as JSON
      const hiddenInputOtherModules = ModuleSettings.#element.querySelector('input.otherModulesList[type="hidden"]');
      hiddenInputOtherModules.value = JSON.stringify(newList);
      LogUtil.log("toggle all modules", [isChecked, newList]);
    });
  }

  static handleSheetFields(){
    const sheetsContent = ModuleSettings.#element.querySelector(`.form-content:has(input[name="applyThemeToSheets"])`);
    if(!sheetsContent){ return; }

    // Handle applyThemeToSheets checkbox to enable/disable useHorizontalSheetTabs
    const applyThemeCheckbox = sheetsContent.querySelector('input[name="applyThemeToSheets"]');
    const horizontalTabsField = sheetsContent.querySelector('.form-group:has(input[name="useHorizontalSheetTabs"])');
    const horizontalTabsCheckbox = horizontalTabsField?.querySelector('input[name="useHorizontalSheetTabs"]');

    if (applyThemeCheckbox && horizontalTabsField && horizontalTabsCheckbox) {
      const toggleHorizontalTabsField = () => {
        const isChecked = applyThemeCheckbox.checked;
        horizontalTabsCheckbox.disabled = !isChecked;
        horizontalTabsField.style.opacity = isChecked ? '1' : '0.5';
      };

      // Set initial state
      toggleHorizontalTabsField();

      // Add listener for changes
      applyThemeCheckbox.addEventListener('change', toggleHorizontalTabsField);
    }
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

  /**
   * Updates the color preview in the settings dialog
   * @static
   * @param {Object} colors - Object with accent and secondary colors
   * @param {string} scope - 'player' or 'world' scope
   */
  static updateColorPreview(colors, scope = 'world') {
    const themesContent = ModuleSettings.#element?.querySelector(`.form-content[data-tab=themes]`);
    if (!themesContent) return;
    
    // Find the correct preview based on scope
    const button = themesContent.querySelector(`.open-color-picker[data-scope="${scope}"]`);
    if (!button) return;
    
    const colorPreview = button.closest('.form-group').querySelector('.custom-color-preview');
    if (colorPreview) {
      const accentSwatch = colorPreview.querySelector('.accent-swatch');
      const secondarySwatch = colorPreview.querySelector('.secondary-swatch');
      
      if (accentSwatch) accentSwatch.style.backgroundColor = colors.accent;
      if (secondarySwatch) secondarySwatch.style.backgroundColor = colors.secondary;
    }
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
