import { MODULE_ID } from "../constants/General.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { getSettings, THEMES, SETTING_SCOPE } from "../constants/Settings.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Color Picker Dialog for selecting custom theme colors
 * Provides HSL color pickers for accent and secondary colors with live preview
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class ColorPickerDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "crlngn-color-picker",
    tag: "div",
    window: {
      icon: "fas fa-palette",
      title: "CRLNGN_UI.settings.colorPicker.title",
      contentClasses: ["crlngn", "color-picker-dialog"],
      resizable: false
    },
    position: {
      width: 500,
      height: "auto"
    }
  }

  static PARTS = {
    form: {
      template: "modules/crlngn-ui/templates/color-picker-dialog.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
      isGMOnly: false
    }
  };

  constructor(options = {}) {
    super(options);
    this.callback = options.callback;
    this.scope = options.scope || 'world';
    this.currentColors = options.currentColors || this.#getDefaultColors();
    
    // Perform migration if needed
    this.#performMigrationIfNeeded();
  }
  
  /**
   * Migrate from old theme system if needed
   * @private
   */
  async #performMigrationIfNeeded() {
    const SETTINGS = getSettings();
    const settingTag = game.user.isGM ? SETTINGS.customThemeColors.tag : SETTINGS.playerCustomThemeColors.tag;
    const customColors = SettingsUtil.get(settingTag);
    
    LogUtil.log("Custom colors #0", [customColors, settingTag]);
    if (!customColors) {
      const oldThemeTag = game.user.isGM ? SETTINGS.colorTheme.tag : SETTINGS.playerColorTheme.tag;
      const oldThemeName = SettingsUtil.get(oldThemeTag);
      
      LogUtil.log("Custom colors #1", [oldThemeName, oldThemeTag]);
      if (oldThemeName) {
        const migratedColors = ColorPickerUtil.migrateFromOldTheme(oldThemeName);
        
        try {
          LogUtil.log("Custom colors #2", [migratedColors]);
          await SettingsUtil.set(settingTag, migratedColors);
          this.currentColors = migratedColors;
          LogUtil.log("Migrated old theme to custom colors", { oldThemeName, migratedColors, scope: this.scope });
          
          // Re-render to show migrated colors
          this.render();
        } catch (error) {
          LogUtil.log("Could not save migrated colors", error);
        }
      }
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Convert RGB to HSL for the pickers
    context.accentHSL = ColorPickerUtil.rgbToHsl(this.currentColors.accent);
    context.secondaryHSL = ColorPickerUtil.rgbToHsl(this.currentColors.secondary);
    
    // Add preset themes
    context.themes = THEMES;
    
    // Calculate contrast ratings
    context.accentOnBg = ColorPickerUtil.getContrastRating(
      this.currentColors.accent, 
      'rgb(224, 217, 213)' // Light background
    );
    context.textOnAccent = ColorPickerUtil.getContrastRating(
      'rgb(255, 255, 255)', 
      this.currentColors.accent
    );
    
    context.currentColors = this.currentColors;
    
    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    
    switch (partId) {
      case "footer": {
        partContext.buttons = [
          { 
            type: "submit", 
            icon: "", 
            label: "CRLNGN_UI.settings.colorPicker.apply",
            action: "submit"
          },
          { 
            type: "button", 
            icon: "", 
            label: "Cancel",
            action: "close"
          }
        ];
        break;
      }
    }
    
    return partContext;
  }

  /**
   * Get default colors from current theme or fallback
   * @private
   */
  #getDefaultColors() {
    const settingTag = this.scope === 'player' ? 'v2-player-custom-theme-colors' : 'v2-custom-theme-colors';
    const customColors = SettingsUtil.get(settingTag);
    if (customColors?.accent && customColors?.secondary) {
      return customColors;
    }
    
    // If player scope and no player colors, fallback to world colors
    if (this.scope === 'player') {
      const worldColors = SettingsUtil.get('v2-custom-theme-colors');
      if (worldColors?.accent && worldColors?.secondary) {
        return worldColors;
      }
    }
    
    // Fallback to first theme
    return {
      accent: THEMES[0].colorPreview[1],
      secondary: THEMES[0].colorPreview[0]
    };
  }

  /**
   * Handle form submission
   * @private
   */
  async _onSubmit(event) {
    event.preventDefault();
    const SETTINGS = getSettings();
    const settingTag = game.user.isGM ? SETTINGS.customThemeColors.tag : SETTINGS.playerCustomThemeColors.tag;
    
    const form = this.element.querySelector('.color-picker-content');
    const formData = new FormData();
    
    // Collect form data manually
    const inputs = form.querySelectorAll('input[type="range"]');
    inputs.forEach(input => {
      formData.append(input.name, input.value);
    });
    
    const data = Object.fromEntries(formData.entries());
    
    // Convert HSL values back to RGB
    const accentRGB = ColorPickerUtil.hslToRgb(
      parseInt(data.accentHue), 
      parseInt(data.accentSaturation), 
      parseInt(data.accentLightness)
    );
    const secondaryRGB = ColorPickerUtil.hslToRgb(
      parseInt(data.secondaryHue), 
      parseInt(data.secondarySaturation), 
      parseInt(data.secondaryLightness)
    );
    
    const colors = {
      accent: accentRGB,
      secondary: secondaryRGB
    };
    
    // Save the custom colors to the appropriate setting
    await SettingsUtil.set(settingTag, colors);
    
    // Apply the new theme
    ColorPickerUtil.applyCustomTheme(colors);
    
    // Call callback if provided
    if (this.callback) {
      this.callback(colors);
    }
    
    // Close the dialog
    this.close();
  }

  /**
   * Handle preset theme selection
   */
  _onClickPreset(event) {
    const button = event.currentTarget;
    const themeName = button.dataset.theme;
    const theme = THEMES.find(t => t.className === themeName);
    
    if (theme) {
      this.currentColors = {
        accent: theme.colorPreview[1],
        secondary: theme.colorPreview[0]
      };
      this.render();
    }
  }

  /**
   * Handle live preview updates
   */
  _onColorChange(event) {
    const input = event.currentTarget;
    const content = this.element.querySelector('.color-picker-content');
    LogUtil.log("ColorPickerDialog._onColorChange", [input]);
    
    // Update the value display next to the slider
    const valueSpan = input.parentElement.querySelector('.value');
    if (valueSpan) {
      const unit = input.name.includes('Hue') ? '' : '%';
      valueSpan.textContent = input.value + unit;
    }
    
    // Collect all current slider values
    const accentHue = parseInt(content.querySelector('[name="accentHue"]').value);
    const accentSaturation = parseInt(content.querySelector('[name="accentSaturation"]').value);
    const accentLightness = parseInt(content.querySelector('[name="accentLightness"]').value);
    const secondaryHue = parseInt(content.querySelector('[name="secondaryHue"]').value);
    const secondarySaturation = parseInt(content.querySelector('[name="secondarySaturation"]').value);
    const secondaryLightness = parseInt(content.querySelector('[name="secondaryLightness"]').value);
    
    const accentRGB = ColorPickerUtil.hslToRgb(accentHue, accentSaturation, accentLightness);
    const secondaryRGB = ColorPickerUtil.hslToRgb(secondaryHue, secondarySaturation, secondaryLightness);
    
    this.currentColors = {
      accent: accentRGB,
      secondary: secondaryRGB
    };

    LogUtil.log("ColorPickerDialog._onColorChange", [this.currentColors]);
    
    // Update preview
    this.#updatePreview();
    
    // Update slider gradients
    this.#updateSliderGradients();
  }

  /**
   * Update the preview display
   * @private
   */
  #updatePreview() {
    const content = this.element.querySelector('.color-picker-content');
    if (!content) return;
    
    // Get the current interface theme from core settings
    const uiConfig = game.settings.get('core', 'uiConfig');
    const currentTheme = uiConfig?.colorScheme?.interface;
    const isDarkTheme = currentTheme === 'dark';
    
    // Define theme-specific colors
    const controlBgColor = isDarkTheme ? 'rgb(11, 10, 19)' : 'rgb(224, 217, 213)'; // --control-bg-color approximation
    const adaptiveTextColor = isDarkTheme ? 'rgb(240, 240, 240)' : 'rgb(30, 30, 30)'; // light-dark(--color-dark-1, --color-light-1)
    
    // Update accent previews
    const accentPreviews = content.querySelectorAll('.accent-preview .preview-item');
    accentPreviews.forEach((preview, index) => {
      if (index === 0) {
        // First block: Accent background with adaptive text
        preview.style.backgroundColor = this.currentColors.accent;
        preview.style.color = adaptiveTextColor;
        
        const rating = ColorPickerUtil.getContrastRating(adaptiveTextColor, this.currentColors.accent);
        const ratingElement = preview.querySelector('.contrast-rating');
        if (ratingElement) {
          ratingElement.textContent = rating.label;
          ratingElement.className = `contrast-rating ${rating.class}`;
          ratingElement.style.color = adaptiveTextColor; // Use the same adaptive text color
        }
      } else if (index === 1) {
        // Second block: Control background with accent text
        preview.style.backgroundColor = controlBgColor;
        preview.style.color = this.currentColors.accent;
        preview.classList.remove('inverted'); // Remove the inverted class since we're handling colors directly
        
        const rating = ColorPickerUtil.getContrastRating(this.currentColors.accent, controlBgColor);
        const ratingElement = preview.querySelector('.contrast-rating');
        if (ratingElement) {
          ratingElement.textContent = rating.label;
          ratingElement.className = `contrast-rating ${rating.class}`;
          ratingElement.style.color = this.currentColors.accent; // Use accent color for text
        }
      }
    });
    
    // Update secondary preview
    const secondaryPreview = content.querySelector('.secondary-preview .preview-item');
    if (secondaryPreview) {
      secondaryPreview.style.backgroundColor = this.currentColors.secondary;
    }
  }

  /**
   * Update slider background gradients based on current values
   * @private
   */
  #updateSliderGradients() {
    const content = this.element.querySelector('.color-picker-content');
    if (!content) return;

    // Get current values for both accent and secondary
    const accentHue = parseInt(content.querySelector('[name="accentHue"]').value);
    const accentSaturation = parseInt(content.querySelector('[name="accentSaturation"]').value);
    const accentLightness = parseInt(content.querySelector('[name="accentLightness"]').value);
    
    const secondaryHue = parseInt(content.querySelector('[name="secondaryHue"]').value);
    const secondarySaturation = parseInt(content.querySelector('[name="secondarySaturation"]').value);
    const secondaryLightness = parseInt(content.querySelector('[name="secondaryLightness"]').value);

    // Update accent sliders
    this.#updateSliderGradient('accentHue', 'hue', accentHue, accentSaturation, accentLightness);
    this.#updateSliderGradient('accentSaturation', 'saturation', accentHue, accentSaturation, accentLightness);
    this.#updateSliderGradient('accentLightness', 'lightness', accentHue, accentSaturation, accentLightness);

    // Update secondary sliders  
    this.#updateSliderGradient('secondaryHue', 'hue', secondaryHue, secondarySaturation, secondaryLightness);
    this.#updateSliderGradient('secondarySaturation', 'saturation', secondaryHue, secondarySaturation, secondaryLightness);
    this.#updateSliderGradient('secondaryLightness', 'lightness', secondaryHue, secondarySaturation, secondaryLightness);
  }

  /**
   * Update a single slider's background gradient
   * @private
   */
  #updateSliderGradient(sliderName, type, currentH, currentS, currentL) {
    const slider = this.element.querySelector(`[name="${sliderName}"]`);
    if (!slider) return;

    let gradient = '';

    switch (type) {
      case 'hue':
        // Full hue spectrum at current saturation and lightness
        gradient = `linear-gradient(to right, 
          hsl(0, ${currentS}%, ${currentL}%) -2%, 
          hsl(60, ${currentS}%, ${currentL}%) 16.66%, 
          hsl(120, ${currentS}%, ${currentL}%) 33.33%, 
          hsl(180, ${currentS}%, ${currentL}%) 50%, 
          hsl(240, ${currentS}%, ${currentL}%) 66.66%, 
          hsl(300, ${currentS}%, ${currentL}%) 83.33%, 
          hsl(360, ${currentS}%, ${currentL}%) 102%)`;
        break;

      case 'saturation':
        // From gray to full saturation at current hue and lightness
        gradient = `linear-gradient(to right, 
          hsl(${currentH}, 0%, ${currentL}%) -2%, 
          hsl(${currentH}, 100%, ${currentL}%) 102%)`;
        break;

      case 'lightness':
        // From black through current color to white
        gradient = `linear-gradient(to right, 
          hsl(${currentH}, ${currentS}%, 0%) -2%, 
          hsl(${currentH}, ${currentS}%, 50%) 50%, 
          hsl(${currentH}, ${currentS}%, 100%) 102%)`;
        break;
    }

    slider.style.background = gradient;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    LogUtil.log("ColorPickerDialog._onRender", [this.element]);
    
    // Preset buttons
    this.element.querySelectorAll('.preset-button').forEach(button => {
      button.addEventListener('click', this._onClickPreset.bind(this));
    });
    
    // Live preview on slider change
    this.element.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', this._onColorChange.bind(this));
    });
    
    // Form submission
    this.element.querySelectorAll('button[type="submit"]').forEach(button => {
      button.addEventListener('click', this._onSubmit.bind(this));
    });
    
    // Cancel button
    this.element.querySelectorAll('button.cancel').forEach(button => {
      button.addEventListener('click', () => {
        this.close();
      });
    });

    // Initialize slider gradients and preview
    this.#updateSliderGradients();
    this.#updatePreview();
  }
}

/**
 * Utility class for color manipulation and theme generation
 */
export class ColorPickerUtil {
  
  /**
   * Convert RGB string to HSL values
   * @param {string} rgb - RGB color string (e.g., "rgb(255, 0, 0)")
   * @returns {Object} HSL values {h: 0-360, s: 0-100, l: 0-100}
   */
  static rgbToHsl(rgb) {
    const match = rgb.match(/\d+/g);
    if (!match) return { h: 0, s: 0, l: 0 };
    
    let [r, g, b] = match.map(n => parseInt(n) / 255);
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }
  
  /**
   * Convert HSL values to RGB string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} RGB color string
   */
  static hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }
  
  /**
   * Calculate contrast ratio between two colors
   * @param {string} color1 - First RGB color
   * @param {string} color2 - Second RGB color
   * @returns {number} Contrast ratio
   */
  static getContrastRatio(color1, color2) {
    const getLuminance = (rgb) => {
      const match = rgb.match(/\d+/g);
      if (!match) return 0;
      
      const [r, g, b] = match.map(n => {
        const val = parseInt(n) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  /**
   * Get contrast rating label and class
   * @param {string} color1 - First RGB color
   * @param {string} color2 - Second RGB color
   * @returns {Object} Rating object with label and class
   */
  static getContrastRating(color1, color2) {
    const ratio = this.getContrastRatio(color1, color2);
    
    if (ratio >= 4.5) {
      return { label: game.i18n.localize("CRLNGN_UI.settings.colorPicker.contrastGood"), class: 'good' };
    } else if (ratio >= 2.5) {
      return { label: game.i18n.localize("CRLNGN_UI.settings.colorPicker.contrastMedium"), class: 'medium' };
    } else {
      return { label: game.i18n.localize("CRLNGN_UI.settings.colorPicker.contrastPoor"), class: 'poor' };
    }
  }
  
  /**
   * Generate color variations for theme variables
   * @param {string} baseColor - Base RGB color
   * @param {string} type - 'accent' or 'secondary'
   * @returns {Object} CSS variable mappings
   */
  static generateColorVariations(baseColor, type) {
    const vars = {};
    const match = baseColor.match(/\d+/g);
    if (!match) return vars;
    
    const [r, g, b] = match.map(n => parseInt(n));
    
    if (type === 'accent') {
      // Direct mappings
      vars['--color-warm-2'] = baseColor;
      vars['--color-highlights'] = baseColor;
      
      // Lighter variant for warm-1
      vars['--color-warm-1'] = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
      
      // Darker variant for warm-3
      vars['--color-warm-3'] = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
      
      // Opacity variations
      vars['--color-highlights-15'] = `rgba(${r}, ${g}, ${b}, 0.15)`;
      vars['--color-highlights-25'] = `rgba(${r}, ${g}, ${b}, 0.25)`;
      vars['--color-highlights-50'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-highlights-75'] = `rgba(${r}, ${g}, ${b}, 0.75)`;
      vars['--color-highlights-90'] = `rgba(${r}, ${g}, ${b}, 0.9)`;
      
      // Border and shadow colors
      vars['--color-border-highlight'] = baseColor;
      vars['--color-border-highlight-alt'] = `rgba(${r}, ${g}, ${b}, 0.9)`;
      vars['--color-shadow-highlight'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-shadow-primary'] = `rgba(${r}, ${g}, ${b}, 0.8)`;
      vars['--color-border-light-primary'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-border-light-highlight'] = baseColor;
      vars['--color-underline-header'] = baseColor;
      vars['--color-underline-active'] = baseColor;
      vars['--color-text-hyperlink'] = baseColor;
      vars['--color-scrollbar'] = `rgba(${r}, ${g}, ${b}, 0.7)`;
      vars['--color-scrollbar-border'] = `rgba(${r}, ${g}, ${b}, 0.75)`;
      vars['--control-active-border-color'] = baseColor;
      vars['--color-text-accent'] = baseColor;
    } else if (type === 'secondary') {
      // Direct mapping
      vars['--color-secondary'] = baseColor;
      
      // Brighter variant
      vars['--color-secondary-bright'] = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
      vars['--color-secondary-bright-50'] = `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 0.5)`;
      
      // Opacity variations
      vars['--color-secondary-15'] = `rgba(${r}, ${g}, ${b}, 0.15)`;
      vars['--color-secondary-25'] = `rgba(${r}, ${g}, ${b}, 0.25)`;
      vars['--color-secondary-50'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-secondary-65'] = `rgba(${r}, ${g}, ${b}, 0.65)`;
      vars['--color-secondary-75'] = `rgba(${r}, ${g}, ${b}, 0.75)`;
      vars['--color-secondary-90'] = `rgba(${r}, ${g}, ${b}, 0.9)`;
      
      // B variant (darker)
      vars['--color-secondary-b'] = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
      vars['--color-secondary-b-25'] = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.25)`;
      vars['--color-secondary-b-50'] = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.5)`;
      vars['--color-secondary-b-75'] = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.75)`;
      vars['--color-secondary-b-90'] = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.9)`;
      
      // Text color (lighter for dark themes)
      vars['--color-text-secondary'] = `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`;
      vars['--color-ownership-none'] = baseColor;
      vars['--toggle-active-bg-color'] = baseColor;
      vars['--toggle-active-border-color'] = baseColor;
      vars['--color-fieldset-border'] = `rgba(${r}, ${g}, ${b}, 0.25)`;
      vars['--input-border-color'] = baseColor;
    }
    
    return vars;
  }
  
  /**
   * Apply custom theme colors to the UI
   * @param {Object} colors - Object with accent and secondary color values
   */
  static applyCustomTheme(colors) {
    // Remove any existing custom theme style
    const existingStyle = document.getElementById('crlngn-custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Get the current interface theme
    const uiConfig = game.settings.get('core', 'uiConfig');
    const interfaceTheme = uiConfig?.colorScheme?.interface || 'dark';
    
    // Generate accent variables (same for both themes)
    const accentVars = this.generateColorVariations(colors.accent, 'accent');
    
    // For secondary color, adjust lightness based on theme
    let secondaryForDark = colors.secondary;
    let secondaryForLight = colors.secondary;
    
    // Convert secondary to HSL to adjust lightness
    const secondaryHSL = this.rgbToHsl(colors.secondary);
    if (interfaceTheme === 'light') {
      // Invert lightness for light theme (dark becomes light)
      const invertedLightness = Math.max(70, 100 - secondaryHSL.l);
      secondaryForLight = this.hslToRgb(secondaryHSL.h, secondaryHSL.s, invertedLightness);
    } else {
      // For dark theme, ensure secondary is dark enough
      const darkenedLightness = Math.min(30, secondaryHSL.l);
      secondaryForDark = this.hslToRgb(secondaryHSL.h, secondaryHSL.s, darkenedLightness);
    }
    
    // Generate secondary variables for both themes
    const secondaryVarsDark = this.generateColorVariations(secondaryForDark, 'secondary');
    const secondaryVarsLight = this.generateColorVariations(secondaryForLight, 'secondary');
    
    // Create CSS text with all accent variables applied globally
    let cssText = 'body.crlngn-ui, body.crlngn-ui.game .app {\n';
    for (const [varName, value] of Object.entries(accentVars)) {
      cssText += `  ${varName}: ${value};\n`;
    }
    cssText += '}\n';
    
    // Add theme-specific selectors for secondary colors
    cssText += `
      body.crlngn-ui.theme-dark,
      body.crlngn-ui.theme-dark .app,
      #interface.theme-dark {
        ${Object.entries(secondaryVarsDark).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
      }
      
      body.crlngn-ui.theme-light,
      body.crlngn-ui.theme-light .app,
      #interface.theme-light {
        ${Object.entries(secondaryVarsLight).map(([k, v]) => `${k}: ${v};`).join('\n  ')}
      }
    `;
    
    // Create and append style element
    const style = document.createElement('style');
    style.id = 'crlngn-custom-theme-style';
    style.textContent = cssText;
    document.head.appendChild(style);
    
    LogUtil.log("Applied custom theme", [ colors, cssText ]);
  }
  
  /**
   * Migrate from old colorTheme setting to new custom colors
   * @param {string} oldThemeName - The old theme class name
   * @returns {Object} The migrated color values
   */
  static migrateFromOldTheme(oldThemeName) {
    const theme = THEMES.find(t => t.className === oldThemeName);
    
    if (theme) {
      return {
        accent: theme.colorPreview[1],
        secondary: theme.colorPreview[0]
      };
    }
    
    // Default fallback
    return {
      accent: THEMES[0].colorPreview[1],
      secondary: THEMES[0].colorPreview[0]
    };
  }
}