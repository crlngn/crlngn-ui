import { MODULE_ID } from "../constants/General.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { getSettings, THEMES, SETTING_SCOPE } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
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
      contentClasses: ["crlngn", "color-picker-dialog", "standard-form"],
      resizable: true
    },
    position: {
      width: 600,
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
    this.activeSecondaryTheme = 'dark'; // Default to dark theme tab
    this.collapsedSections = { accent: true, secondary: true };

    // Initialize checkbox state from saved setting based on scope
    const SETTINGS = getSettings();
    if (this.scope === 'player') {
      // For player scope, show only the player setting value
      this.applySecondaryColorToBg = SettingsUtil.get(SETTINGS.playerApplySecondaryColorToBg.tag) === true;
    } else {
      // For world scope, use world setting
      this.applySecondaryColorToBg = SettingsUtil.get(SETTINGS.applySecondaryColorToBg.tag) === true;
    }

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
    
    if (!customColors) {
      const oldThemeTag = game.user.isGM ? SETTINGS.colorTheme.tag : SETTINGS.playerColorTheme.tag;
      const oldThemeName = SettingsUtil.get(oldThemeTag);
      
      if (oldThemeName) {
        const migratedColors = ColorPickerUtil.migrateFromOldTheme(oldThemeName);
        
        try {
          await SettingsUtil.set(settingTag, migratedColors);
          this.currentColors = migratedColors;
          this.render();
        } catch (error) {
        }
      }
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    
    // Convert RGB to HSL for the pickers
    context.accentHSL = ColorPickerUtil.rgbToHsl(this.currentColors.accent);
    context.secondaryDarkHSL = ColorPickerUtil.rgbToHsl(this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1]);
    context.secondaryLightHSL = ColorPickerUtil.rgbToHsl(this.currentColors.secondaryLight || 'rgb(223, 227, 231)');
    
    // Use preset themes directly as they now have the correct order
    context.themes = THEMES;
    
    // Add checkbox states - use local state to preserve unsaved changes
    context.applySecondaryColorToBg = this.applySecondaryColorToBg;

    // Add scope so template can conditionally show player-only options
    context.isPlayerScope = this.scope === 'player';
    
    // Calculate contrast ratings
    // First box: white text on accent background
    context.textOnAccent = ColorPickerUtil.getContrastRating(
      'rgb(255, 255, 255)', 
      this.currentColors.accent
    );
    
    // Second box: accent text on control background
    // Get the current control-bg-color from computed styles
    const controlBgColor = getComputedStyle(document.documentElement).getPropertyValue('--control-bg-color')?.trim() || 'rgb(11, 10, 19)';
    context.accentOnBg = ColorPickerUtil.getContrastRating(
      this.currentColors.accent, 
      controlBgColor
    );
    
    context.currentColors = this.currentColors;
    
    // Add separate dark and light secondary colors for preview
    context.secondaryColorDark = this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1];
    context.secondaryColorLight = this.currentColors.secondaryLight || 'rgb(223, 227, 231)';

    context.accentHex = ColorPickerUtil.rgbToHex(this.currentColors.accent);
    context.secondaryDarkHex = ColorPickerUtil.rgbToHex(context.secondaryColorDark);

    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    
    switch (partId) {
      case "footer": {
        partContext.buttons = [
          { 
            type: "button", 
            icon: "", 
            label: "Cancel",
            action: "close"
          },
          { 
            type: "submit", 
            icon: "", 
            label: "CRLNGN_UI.settings.colorPicker.apply",
            action: "submit"
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
    const SETTINGS = getSettings();
    const settingTag = this.scope === 'player' ? SETTINGS.playerCustomThemeColors.tag : SETTINGS.customThemeColors.tag;
    const customColors = SettingsUtil.get(settingTag);
    if (customColors?.accent && customColors?.secondaryDark) {
      return customColors;
    }

    // If player scope and no player colors, fallback to world colors
    if (this.scope === 'player') {
      const worldColors = SettingsUtil.get(SETTINGS.customThemeColors.tag);
      if (worldColors?.accent && worldColors?.secondaryDark) {
        return worldColors;
      }
    }
    
    // Fallback to first theme
    return {
      accent: THEMES[0].colorPreview[2],
      secondaryDark: THEMES[0].colorPreview[1],
      secondaryLight: THEMES[0].colorPreview[0] || 'rgb(223, 227, 231)',
      isPreset: false
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

    // Collect checkbox data
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      formData.append(checkbox.name, checkbox.checked);
    });
    
    const data = Object.fromEntries(formData.entries());
    
    // Convert HSL values back to RGB
    const accentRGB = ColorPickerUtil.hslToRgb(
      parseInt(data.accentHue), 
      parseInt(data.accentSaturation), 
      parseInt(data.accentLightness)
    );
    
    // Use the current colors object which has been updated by tab switching
    const colors = {
      accent: accentRGB,
      secondaryDark: this.currentColors.secondaryDark || THEMES[0].colorPreview[1],
      secondaryLight: this.currentColors.secondaryLight || THEMES[0].colorPreview[0] || 'rgb(223, 227, 231)',
      isPreset: this.currentColors.isPreset || false
    };
    
    let confirmReload = false;
    // Save applySecondaryColorToBg FIRST so it's available when the color save triggers theme reapply
    if (data.applySecondaryColorToBg !== undefined) {
      const bgSettingTag = this.scope === 'player'
        ? SETTINGS.playerApplySecondaryColorToBg.tag
        : SETTINGS.applySecondaryColorToBg.tag;
      const currentBgSetting = SettingsUtil.get(bgSettingTag);
      const newBgSetting = data.applySecondaryColorToBg === 'true';

      await SettingsUtil.set(bgSettingTag, newBgSetting);

      // Check if reload is needed
      if (SETTINGS.applySecondaryColorToBg.requiresReload && currentBgSetting !== newBgSetting) {
        confirmReload = true;
      }
    }

    await SettingsUtil.set(settingTag, colors);

    ColorPickerUtil.applyCustomTheme(colors, this.applySecondaryColorToBg);
    
    // Handle reload confirmation if needed
    if (confirmReload) {
      GeneralUtil.confirmReload();
    }
    
    if (this.callback) {
      this.callback(colors);
    }
    
    this.close();
  }

  /**
   * Handle secondary theme tab clicks
   */
  _onSecondaryTabClick(event) {
    const clickedTab = event.currentTarget;
    const theme = clickedTab.dataset.theme;

    this._toggleSection('secondary', true);

    // Update active tab
    this.element.querySelectorAll('.secondary-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    clickedTab.classList.add('active');
    
    // Store current theme and update sliders
    this.activeSecondaryTheme = theme;
    const currentColor = theme === 'dark' 
      ? (this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1])
      : (this.currentColors.secondaryLight || 'rgb(223, 227, 231)');
    
    const hsl = ColorPickerUtil.rgbToHsl(currentColor);
    
    // Update slider values
    const hueSlider = this.element.querySelector('[name="secondaryHue"]');
    const satSlider = this.element.querySelector('[name="secondarySaturation"]');
    const lightSlider = this.element.querySelector('[name="secondaryLightness"]');
    
    if (hueSlider) hueSlider.value = hsl.h;
    if (satSlider) satSlider.value = hsl.s;
    if (lightSlider) lightSlider.value = hsl.l;
    
    // Update value displays
    const hueParent = this.element.querySelector('[name="secondaryHue"]')?.parentElement;
    const satParent = this.element.querySelector('[name="secondarySaturation"]')?.parentElement;
    const lightParent = this.element.querySelector('[name="secondaryLightness"]')?.parentElement;
    
    if (hueParent) hueParent.querySelector('.value').textContent = hsl.h;
    if (satParent) satParent.querySelector('.value').textContent = hsl.s + '%';
    if (lightParent) lightParent.querySelector('.value').textContent = hsl.l + '%';
    
    this.#updateSliderGradients();
    this.#updatePreview();
  }

  /**
   * Toggle a collapsible section open/closed
   */
  _toggleSection(sectionName, forceExpand = false) {
    if (forceExpand) {
      this.collapsedSections[sectionName] = false;
    } else {
      this.collapsedSections[sectionName] = !this.collapsedSections[sectionName];
    }
    const sectionClass = sectionName === 'accent' ? '.accent-section' : '.secondary-section';
    const section = this.element?.querySelector(sectionClass);
    if (section) {
      section.classList.toggle('collapsed', this.collapsedSections[sectionName]);
    }
  }

  /**
   * Handle preset theme selection
   */
  _onClickPreset(event) {
    const button = event.currentTarget;
    const themeName = button.dataset.theme;
    const theme = THEMES.find(t => t.className === themeName);

    if (theme) {
      this.selectedPreset = themeName;
      this.currentColors = {
        accent: theme.colorPreview[2],
        secondaryDark: theme.colorPreview[1],
        secondaryLight: theme.colorPreview[0],
        isPreset: true
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
    
    // Update the appropriate secondary color based on active tab
    if (this.activeSecondaryTheme === 'dark') {
      this.currentColors.secondaryDark = secondaryRGB;
    } else {
      this.currentColors.secondaryLight = secondaryRGB;
    }
    
    this.currentColors.accent = accentRGB;
    this.currentColors.isPreset = false;

    if (this.selectedPreset) {
      this.selectedPreset = null;
      this.element.querySelectorAll('.preset-button.selected').forEach(b => b.classList.remove('selected'));
    }

    LogUtil.log("ColorPickerDialog._onColorChange", [this.currentColors]);

    this.#updatePreview();
    this.#updateSliderGradients();
  }

  /**
   * Update the preview display
   * @private
   */
  #updatePreview() {
    const content = this.element.querySelector('.color-picker-content');
    if (!content) return;
    
    // Get the actual control background color from computed styles
    const controlBgColor = getComputedStyle(document.documentElement).getPropertyValue('--control-bg-color')?.trim() || 'rgb(11, 10, 19)';
    const lightTextColor = 'rgb(240, 240, 240)'; // Always use --color-light-1 (white) on accent backgrounds
    
    // Update accent previews
    const accentPreviews = content.querySelectorAll('.accent-preview .preview-item');
    accentPreviews.forEach((preview, index) => {
      if (index === 0) {
        preview.style.backgroundColor = this.currentColors.accent;
        preview.style.color = lightTextColor;
        
        const rating = ColorPickerUtil.getContrastRating(lightTextColor, this.currentColors.accent);
        const ratingElement = preview.querySelector('.contrast-rating');
        if (ratingElement) {
          ratingElement.textContent = rating.label;
          ratingElement.className = `contrast-rating ${rating.class}`;
          ratingElement.style.color = lightTextColor; // Use white text color
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
    
    // Update accent color thumbnail
    const thumbnail = content.querySelector('.color-thumbnail');
    if (thumbnail) {
      thumbnail.style.backgroundColor = this.currentColors.accent;
    }

    // Update secondary previews with separate dark/light colors
    const secondaryPreviews = content.querySelectorAll('.secondary-preview .preview-item');
    if (secondaryPreviews.length > 0) {
      // Dark theme preview (first box)
      let darkColor = this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1];

      // Apply darkening to preview if it's a preset and checkbox is checked
      if (this.currentColors.isPreset && this.applySecondaryColorToBg) {
        darkColor = ColorPickerUtil.darkenColor(darkColor, 10);
      }
      secondaryPreviews[0].style.backgroundColor = darkColor;

      // Light theme preview (second box)
      if (secondaryPreviews[1]) {
        const lightColor = this.currentColors.secondaryLight || 'rgb(223, 227, 231)';
        secondaryPreviews[1].style.backgroundColor = lightColor;
      }
    }

    const secThumb = content.querySelector('.secondary-thumbnail');
    if (secThumb) {
      const thumbColor = this.activeSecondaryTheme === 'dark'
        ? (this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1])
        : (this.currentColors.secondaryLight || 'rgb(223, 227, 231)');
      secThumb.style.backgroundColor = thumbColor;
    }

    const accentHexInput = content.querySelector('.accent-hex-input');
    if (accentHexInput && document.activeElement !== accentHexInput) {
      accentHexInput.value = ColorPickerUtil.rgbToHex(this.currentColors.accent);
    }
    const secondaryHexInput = content.querySelector('.secondary-hex-input');
    if (secondaryHexInput && document.activeElement !== secondaryHexInput) {
      const secColor = this.activeSecondaryTheme === 'dark'
        ? (this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1])
        : (this.currentColors.secondaryLight || 'rgb(223, 227, 231)');
      secondaryHexInput.value = ColorPickerUtil.rgbToHex(secColor);
    }
  }

  /**
   * Sync secondary sliders to the displayed preview color (e.g. after darkening toggle)
   * @private
   */
  #syncSlidersToPreview() {
    const content = this.element?.querySelector('.color-picker-content');
    if (!content) return;

    let color;
    if (this.activeSecondaryTheme === 'dark') {
      color = this.currentColors.secondaryDark || this.currentColors.secondary || THEMES[0].colorPreview[1];
      if (this.currentColors.isPreset && this.applySecondaryColorToBg) {
        color = ColorPickerUtil.darkenColor(color, 10);
      }
    } else {
      color = this.currentColors.secondaryLight || 'rgb(223, 227, 231)';
    }

    const hsl = ColorPickerUtil.rgbToHsl(color);
    const hueSlider = content.querySelector('[name="secondaryHue"]');
    const satSlider = content.querySelector('[name="secondarySaturation"]');
    const lightSlider = content.querySelector('[name="secondaryLightness"]');
    if (hueSlider) { hueSlider.value = hsl.h; hueSlider.nextElementSibling.textContent = hsl.h; }
    if (satSlider) { satSlider.value = hsl.s; satSlider.nextElementSibling.textContent = hsl.s + '%'; }
    if (lightSlider) { lightSlider.value = hsl.l; lightSlider.nextElementSibling.textContent = hsl.l + '%'; }
    this.#updateSliderGradients();
  }

  #onHexInput(input, section) {
    const rgb = ColorPickerUtil.hexToRgb(input.value);
    if (!rgb) {
      input.classList.add('invalid');
      const currentColor = section === 'accent'
        ? this.currentColors.accent
        : (this.activeSecondaryTheme === 'dark'
          ? (this.currentColors.secondaryDark || THEMES[0].colorPreview[1])
          : (this.currentColors.secondaryLight || 'rgb(223, 227, 231)'));
      input.value = ColorPickerUtil.rgbToHex(currentColor);
      setTimeout(() => input.classList.remove('invalid'), 800);
      return;
    }

    input.classList.remove('invalid');
    input.value = ColorPickerUtil.rgbToHex(rgb);
    const content = this.element?.querySelector('.color-picker-content');
    if (!content) return;

    const hsl = ColorPickerUtil.rgbToHsl(rgb);

    if (section === 'accent') {
      this.currentColors.accent = rgb;
      const hueSlider = content.querySelector('[name="accentHue"]');
      const satSlider = content.querySelector('[name="accentSaturation"]');
      const lightSlider = content.querySelector('[name="accentLightness"]');
      if (hueSlider) { hueSlider.value = hsl.h; hueSlider.nextElementSibling.textContent = hsl.h; }
      if (satSlider) { satSlider.value = hsl.s; satSlider.nextElementSibling.textContent = hsl.s + '%'; }
      if (lightSlider) { lightSlider.value = hsl.l; lightSlider.nextElementSibling.textContent = hsl.l + '%'; }
    } else {
      if (this.activeSecondaryTheme === 'dark') {
        this.currentColors.secondaryDark = rgb;
      } else {
        this.currentColors.secondaryLight = rgb;
      }
      const hueSlider = content.querySelector('[name="secondaryHue"]');
      const satSlider = content.querySelector('[name="secondarySaturation"]');
      const lightSlider = content.querySelector('[name="secondaryLightness"]');
      if (hueSlider) { hueSlider.value = hsl.h; hueSlider.nextElementSibling.textContent = hsl.h; }
      if (satSlider) { satSlider.value = hsl.s; satSlider.nextElementSibling.textContent = hsl.s + '%'; }
      if (lightSlider) { lightSlider.value = hsl.l; lightSlider.nextElementSibling.textContent = hsl.l + '%'; }
    }

    this.currentColors.isPreset = false;
    if (this.selectedPreset) {
      this.selectedPreset = null;
      this.element.querySelectorAll('.preset-button.selected').forEach(b => b.classList.remove('selected'));
    }

    this.#updatePreview();
    this.#updateSliderGradients();
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
        // Always use 50% lightness for hue slider to show colors clearly
        gradient = `linear-gradient(to right, 
          hsl(0, ${currentS}%, 50%) 0%, 
          hsl(60, ${currentS}%, 50%) 16.66%, 
          hsl(120, ${currentS}%, 50%) 33.33%, 
          hsl(180, ${currentS}%, 50%) 50%, 
          hsl(240, ${currentS}%, 50%) 66.66%, 
          hsl(300, ${currentS}%, 50%) 83.33%, 
          hsl(360, ${currentS}%, 50%) 100%)`;
        break;

      case 'saturation':
        gradient = `linear-gradient(to right, 
          hsl(${currentH}, 0%, 50%) 0%, 
          hsl(${currentH}, 100%, 50%) 100%)`;
        break;

      case 'lightness':
        gradient = `linear-gradient(to right, 
          hsl(${currentH}, ${currentS}%, 0%) 0%, 
          hsl(${currentH}, ${currentS}%, 50%) 50%, 
          hsl(${currentH}, ${currentS}%, 100%) 100%)`;
        break;
    }

    slider.style.background = gradient;
    slider.style.backgroundSize = '100% 100%';
    slider.style.backgroundRepeat = 'no-repeat';
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    LogUtil.log("ColorPickerDialog._onRender", [this.element]);
    
    // Preset buttons
    this.element.querySelectorAll('.preset-button').forEach(button => {
      button.addEventListener('click', this._onClickPreset.bind(this));
      if (this.selectedPreset && button.dataset.theme === this.selectedPreset) {
        button.classList.add('selected');
      }
    });
    
    // Secondary theme tabs
    if (this._onSecondaryTabClick) {
      this.element.querySelectorAll('.secondary-tab').forEach(tab => {
        tab.addEventListener('click', this._onSecondaryTabClick.bind(this));
      });
    }
    
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

    // Re-apply collapsed state from instance (persists across render calls)
    const accentSection = this.element.querySelector('.accent-section');
    const secondarySection = this.element.querySelector('.secondary-section');
    if (accentSection) accentSection.classList.toggle('collapsed', this.collapsedSections.accent);
    if (secondarySection) secondarySection.classList.toggle('collapsed', this.collapsedSections.secondary);

    // Section header toggle clicks
    const accentHeader = this.element.querySelector('.accent-section .section-header h4');
    if (accentHeader) {
      accentHeader.addEventListener('click', () => this._toggleSection('accent'));
    }
    const secondaryHeader = this.element.querySelector('.secondary-section .section-header h4');
    if (secondaryHeader) {
      secondaryHeader.addEventListener('click', () => this._toggleSection('secondary'));
    }

    // Color thumbnail clicks expand their sections
    const accentThumb = this.element.querySelector('.accent-section .color-thumbnail');
    if (accentThumb) {
      accentThumb.addEventListener('click', () => this._toggleSection('accent', true));
    }
    const secThumb = this.element.querySelector('.secondary-thumbnail');
    if (secThumb) {
      secThumb.addEventListener('click', () => this._toggleSection('secondary', true));
    }

    // Hex color input listeners
    const accentHexInput = this.element.querySelector('.accent-hex-input');
    if (accentHexInput) {
      accentHexInput.addEventListener('change', () => {
        this.#onHexInput(accentHexInput, 'accent');
      });
    }
    const secondaryHexInput = this.element.querySelector('.secondary-hex-input');
    if (secondaryHexInput) {
      secondaryHexInput.addEventListener('change', () => {
        this.#onHexInput(secondaryHexInput, 'secondary');
      });
    }

    // Track checkbox state changes
    const bgCheckbox = this.element.querySelector('input[name="applySecondaryColorToBg"]');
    if (bgCheckbox) {
      bgCheckbox.addEventListener('change', (event) => {
        this.applySecondaryColorToBg = event.target.checked;
        this.#updatePreview();
        this.#syncSlidersToPreview();
      });
    }

    // Initialize slider gradients and preview
    this.#updateSliderGradients();
    this.#updatePreview();

    if (this.applySecondaryColorToBg && this.currentColors.isPreset) {
      this.#syncSlidersToPreview();
    }
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

  static rgbToHex(rgb) {
    const match = rgb.match(/\d+/g);
    if (!match) return '#000000';
    return '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  static hexToRgb(hex) {
    hex = hex.replace(/^#/, '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
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
   * Darken a color by a percentage
   * @param {string} rgb - RGB color string
   * @param {number} percent - Percentage to darken (0-100)
   * @returns {string} Darkened RGB color string
   */
  static darkenColor(rgb, percent) {
    const hsl = this.rgbToHsl(rgb);
    const newLightness = Math.max(0, hsl.l - percent);
    return this.hslToRgb(hsl.h, hsl.s, newLightness);
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
   * @param {string} forTheme - 'light' or 'dark' theme target
   * @param {boolean} [applySecondaryToBg] - Whether to apply secondary color to backgrounds
   * @returns {Object} CSS variable mappings
   */
  static generateColorVariations(baseColor, type, forTheme = 'dark', applySecondaryToBg = false) {
    const vars = {};
    const match = baseColor.match(/\d+/g);
    if (!match) return vars;

    const [r, g, b] = match.map(n => parseInt(n));

    // Use the forTheme parameter to determine which theme we're generating for
    const isLightTheme = forTheme === 'light';

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
      vars['--color-secondary-bright'] = `rgb(${Math.min(255, r + 120)}, ${Math.min(255, g + 120)}, ${Math.min(255, b + 120)})`;
      vars['--color-secondary-bright-50'] = `rgba(${Math.min(255, r + 120)}, ${Math.min(255, g + 120)}, ${Math.min(255, b + 120)}, 0.5)`;
      
      // Opacity variations
      vars['--color-secondary-15'] = `rgba(${r}, ${g}, ${b}, 0.15)`;
      vars['--color-secondary-25'] = `rgba(${r}, ${g}, ${b}, 0.25)`;
      vars['--color-secondary-50'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-secondary-65'] = `rgba(${r}, ${g}, ${b}, 0.65)`;
      vars['--color-secondary-75'] = `rgba(${r}, ${g}, ${b}, 0.75)`;
      vars['--color-secondary-90'] = `rgba(${r}, ${g}, ${b}, 0.9)`;
      
      // B variant (darker)
      vars['--color-secondary-b'] = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
      vars['--color-secondary-b-25'] = `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.25)`;
      vars['--color-secondary-b-50'] = `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.5)`;
      vars['--color-secondary-b-75'] = `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.75)`;
      vars['--color-secondary-b-90'] = `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.9)`;
      
      // Text color - should have good contrast with the secondary color
      // For text that appears ON secondary backgrounds, we need to ensure readability
      const hsl = this.rgbToHsl(baseColor);
      
      if (isLightTheme) {
        // Darker version of the same hue
        const textLightness = Math.min(30, hsl.l - 65);
        vars['--color-text-secondary'] = this.hslToRgb(hsl.h, hsl.s, textLightness).replace('rgb(', 'rgba(').replace(')', ', 0.75)');
      } else {
        // Lighter version of the same hue
        const textLightness = Math.max(70, hsl.l + 65);
        vars['--color-text-secondary'] = this.hslToRgb(hsl.h, hsl.s, textLightness).replace('rgb(', 'rgba(').replace(')', ', 0.75)');
      }
      vars['--color-ownership-none'] = baseColor;
      // vars['--toggle-active-bg-color'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      // vars['--toggle-active-border-color'] = `rgba(${r}, ${g}, ${b}, 0.5)`;
      vars['--color-fieldset-border'] = `rgba(${r}, ${g}, ${b}, 0.25)`;
      vars['--input-border-color'] = baseColor;

      if (applySecondaryToBg) {
        const bgR = r; // isLightTheme ? Math.min(255, r + 150) : r;
        const bgG = g; // isLightTheme ? Math.min(255, g + 150) : g;
        const bgB = b; // isLightTheme ? Math.min(255, b + 150) : b;

        const bgColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

        vars['--color-cool-5'] = bgColor;
        vars['--color-cool-5-15'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.15)`;
        vars['--color-cool-5-25'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.25)`;
        vars['--color-cool-5-50'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.5)`;
        vars['--color-cool-5-75'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.75)`;
        vars['--color-cool-5-90'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.95)`;
        vars['--background'] = `rgba(${bgR}, ${bgG}, ${bgB}, var(--background-opacity, 0.98))`;
        vars['--background-color'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.75)`;

        vars['--control-bg-color'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.75)`;
        vars['--sidebar-background'] = `rgba(${bgR}, ${bgG}, ${bgB}, 0.94)`;
        vars['--color-bg-button'] = 'light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1))';
      } else {
        // When not applying secondary to background, still use the opacity setting
        // Use the default light/dark theme backgrounds with opacity
        const defaultBgR = isLightTheme ? 226 : 11;
        const defaultBgG = isLightTheme ? 232 : 10;
        const defaultBgB = isLightTheme ? 233 : 19;
        const defaultOpacity = isLightTheme ? 0.98 : 0.95;

        vars['--background'] = `rgba(${defaultBgR}, ${defaultBgG}, ${defaultBgB}, var(--background-opacity, ${defaultOpacity}))`;
      }
    }
    
    return vars;
  }
  
  /**
   * Apply custom theme colors to the UI
   * @param {Object} colors - Object with accent and secondary color values
   * @param {boolean} [applySecondaryToBgOverride] - Optional override for applySecondaryColorToBg setting
   */
  static applyCustomTheme(colors, applySecondaryToBgOverride) {
    const SETTINGS = getSettings();
    let applySecondaryToBg;
    if (applySecondaryToBgOverride !== undefined) {
      applySecondaryToBg = applySecondaryToBgOverride;
    } else {
      // Determine which setting to use based on whether player has custom colors
      const playerCustomColors = SettingsUtil.get(SETTINGS.playerCustomThemeColors.tag);
      const hasPlayerColors = playerCustomColors?.accent && (playerCustomColors?.secondaryDark || playerCustomColors?.secondary);

      if (hasPlayerColors) {
        // Player has custom colors, use player's applySecondaryColorToBg setting
        applySecondaryToBg = SettingsUtil.get(SETTINGS.playerApplySecondaryColorToBg.tag) === true;
      } else {
        // No player colors, use world's applySecondaryColorToBg setting
        applySecondaryToBg = SettingsUtil.get(SETTINGS.applySecondaryColorToBg.tag) === true;
      }
    }
    
    // Remove any existing custom theme style
    const existingStyle = document.getElementById('crlngn-custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const uiConfig = game.settings.get('core', 'uiConfig');
    const interfaceTheme = uiConfig?.colorScheme?.interface || 'dark';
    
    const accentVars = this.generateColorVariations(colors.accent, 'accent');
    
    // Use the provided dark and light secondary colors
    let secondaryForDark = colors.secondaryDark || colors.secondary || THEMES[0].colorPreview[1];
    const secondaryForLight = colors.secondaryLight || 'rgb(223, 227, 231)';

    // If this is a preset AND applySecondaryColorToBg is enabled, darken the dark secondary by 20%
    if (colors.isPreset && applySecondaryToBg) {
      secondaryForDark = this.darkenColor(secondaryForDark, 10);
    }
    
    // Generate secondary variables for both themes
    const secondaryVarsDark = this.generateColorVariations(secondaryForDark, 'secondary', 'dark', applySecondaryToBg);
    const secondaryVarsLight = this.generateColorVariations(secondaryForLight, 'secondary', 'light', applySecondaryToBg);
    
    let cssText = 'body.crlngn-ui, body.crlngn-ui.game .app {\n';
    for (const [varName, value] of Object.entries(accentVars)) {
      cssText += `  ${varName}: ${value};\n`;
    }
    cssText += '}\n';
    
    // body.crlngn-ui.theme-dark .application:not(.sheet, .theme-light, .monks-enhanced-journal),
    cssText += `
      body.crlngn-ui.theme-dark,
      body.crlngn-ui.theme-dark .app:not(.pf2e),
      body.crlngn-ui.crlngn-sheets.theme-dark .app.pf2e.sheet,
      body.crlngn-ui.theme-dark .application:not(.theme-light),
      body.crlngn-ui #interface.theme-dark,
      body.crlngn-ui #tooltip.theme-dark,
      body.crlngn-ui .application.theme-dark:not(.chat-popout),
      body.crlngn-ui .sidebar-popout.theme-dark,
      body.crlngn-ui .themed.theme-dark .ui-control, 
      body.crlngn-ui .themed.theme-dark .placeable-hud, 
      body.crlngn-ui .themed.theme-dark #measurement .waypoint-label,
      body.crlngn-ui .themed.theme-dark #players,
      body.crlngn-ui .application.dialog {
        ${Object.entries(secondaryVarsDark).map(([k, v]) => `${k}: ${v};`).join('\n    ')}
      }
      
      body.crlngn-ui.theme-light,
      body.crlngn-ui.theme-light .app:not(.pf2e),
      body.crlngn-ui.crlngn-sheets.theme-light .app.pf2e.sheet,
      body.crlngn-ui.theme-light .application:not(.theme-dark, .journal-sheet),
      body.crlngn-ui #interface.theme-light,
      body.crlngn-ui .application.theme-light:not(.chat-popout),
      body.crlngn-ui #interface.theme-light,
      body.crlngn-ui .sidebar-popout.theme-light,
      body.crlngn-ui .themed.theme-light .ui-control, 
      body.crlngn-ui .themed.theme-light .placeable-hud, 
      body.crlngn-ui .themed.theme-light #measurement .waypoint-label,
      body.crlngn-ui .themed.theme-light #players,
      body.crlngn-ui #tooltip.theme-light  {
        ${Object.entries(secondaryVarsLight).map(([k, v]) => `${k}: ${v};`).join('\n    ')}
      }
    `;
    if (game.system?.id === 'daggerheart') {
      cssText += `
        body.crlngn-ui.system-daggerheart.theme-light .application.sheet {
          ${Object.entries(secondaryVarsLight).map(([k, v]) => `${k}: ${v};`).join('\n      ')}
        }
        body.crlngn-ui.system-daggerheart.theme-dark .application.sheet {
          ${Object.entries(secondaryVarsDark).map(([k, v]) => `${k}: ${v};`).join('\n      ')}
        }
      `;
    }
    if (applySecondaryToBg) {
      cssText += `
        body.crlngn-ui {
          --tools-visible-opacity: 0.75;
        }
        body.crlngn-ui.theme-dark input[type=checkbox],
        body.crlngn-ui.theme-dark input[type=radio]{
          --checkbox-background-color: light-dark(rgba(0, 0, 0, 0.35), rgba(255, 255, 255, 0.35));
        }
        body.crlngn-ui.theme-dark .application.sheet:not(.sheet-config),
        body.crlngn-ui .application.sheet.theme-dark .controls-dropdown {
          --background: ${secondaryVarsDark['--background'] || 'inherit'};
        }
        body.crlngn-ui.theme-light .application.sheet:not(.sheet-config),
        body.crlngn-ui .application.sheet.theme-light .controls-dropdown {
          --background: ${secondaryVarsLight['--background'] || 'inherit'};
        }
      `;
    }
    
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
        accent: theme.colorPreview[2],        // Accent
        secondaryDark: theme.colorPreview[1], // Secondary Dark
        secondaryLight: theme.colorPreview[0] // Secondary Light
      };
    }
    
    // Default fallback
    return {
      accent: THEMES[0].colorPreview[2],
      secondaryDark: THEMES[0].colorPreview[1],
      secondaryLight: THEMES[0].colorPreview[0]
    };
  }
}