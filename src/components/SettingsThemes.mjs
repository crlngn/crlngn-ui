import { DARK_MODE_RULES } from "../constants/General.mjs";
import { getSettings, THEMES } from "../constants/Settings.mjs";
import { ColorPickerUtil } from "./ColorPickerUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Theme, dark-mode, custom-CSS, debug, and stream-mode appliers extracted
 * from SettingsUtil. Holds the cached Foundry uiConfig / color scheme used
 * by applyForcedDarkTheme and the stream-mode body class sync.
 */
export class SettingsThemes {
  static foundryUiConfig = null;
  static coreColorScheme = null;

  /**
   * Resets Foundry's theme settings to defaults.
   * Body is entirely commented out; retained as a no-op stub to keep the
   * Main.mjs init call site stable until the surrounding flow is reworked.
   */
  static resetFoundryThemeSettings() {
    // intentional no-op (see git history for the disabled enforcement flow)
  }

  /**
   * Applies debug mode settings
   * @param {boolean} [value] - Whether to enable debug mode
   */
  static applyDebugSettings(value) {
    const SETTINGS = getSettings();
    LogUtil.debugOn = value || SettingsUtil.get(SETTINGS.debugMode.tag);
  }

  /**
   * Applies the selected theme to the UI
   * @param {string} [value] - Theme name to apply, if not provided uses stored setting
   */
  static applyThemeSettings = async (value) => {
    const SETTINGS = getSettings();
    const body = document.querySelector("body");

    let customColors = SettingsUtil.get(SETTINGS.playerCustomThemeColors.tag);
    let migratedFrom = 'player';

    if (!customColors) {
      customColors = SettingsUtil.get(SETTINGS.customThemeColors.tag);
      migratedFrom = 'world';
    }

    if (customColors?.accent && (customColors?.secondaryDark || customColors?.secondary)) {
      ColorPickerUtil.applyCustomTheme(customColors);
      LogUtil.log("Applied custom theme colors", [customColors, migratedFrom]);
    } else {
      const themeName = value || SettingsUtil.get(SETTINGS.playerColorTheme.tag) || SettingsUtil.get(SETTINGS.colorTheme.tag) || "";

      THEMES.forEach((theme) => {
        if (theme.className) {
          body.classList.remove(theme.className);
        }
      });

      if (themeName) {
        body.classList.add(themeName);
      }

      const defaultColors = {
        accent: THEMES[0].colorPreview[2],
        secondaryDark: THEMES[0].colorPreview[1],
        secondaryLight: THEMES[0].colorPreview[0] || 'rgb(223, 227, 231)',
        isPreset: false
      };
      ColorPickerUtil.applyCustomTheme(defaultColors);
      LogUtil.log("Applied default theme colors", [defaultColors]);
    }
  }

  /**
   * Applies custom CSS styles to the UI
   * @param {string} [value] - CSS content to apply, if not provided uses stored setting
   */
  static applyCustomCSS = (value) => {
    const SETTINGS = getSettings();
    const cssContent = value || SettingsUtil.get(SETTINGS.customStyles.tag) || "";
    GeneralUtil.addCustomCSS(cssContent);
  }

  /**
   * Applies dark mode to defined CSS selectors
   * @param {string} [value] - CSS selectors / rules to apply dark theme to. If not provided uses stored setting
   */
  static applyForcedDarkTheme = (value) => {
    const isDarkMode = SettingsThemes.foundryUiConfig?.colorScheme?.applications === 'dark'
      || SettingsThemes.foundryUiConfig?.colorScheme?.interface === 'dark';
    if (!isDarkMode) return;

    const SETTINGS = getSettings();
    const cssSelectorStr = value || SettingsUtil.get(SETTINGS.forcedDarkTheme.tag) || "";
    if (!cssSelectorStr.trim()) return;

    const finalStyle = GeneralUtil.processCSSRules(DARK_MODE_RULES, cssSelectorStr);
    LogUtil.log("applyForcedDarkTheme", [finalStyle.substring(0, 100) + "..."]);
    GeneralUtil.addCustomCSS(finalStyle, 'crlngn-forced-dark-mode');
  }

  /**
   * Applies style adjustments to other modules
   * @param {boolean} [value] - Whether to enforce styles, if not provided uses stored setting
   */
  static applyModuleAdjustments = (value) => {
    const SETTINGS = getSettings();
    const enforceStyles = value || SettingsUtil.get(SETTINGS.adjustOtherModules.tag) || false;

    if (enforceStyles) {
      ModuleCompatUtil.addModuleClasses();
    }
  }

  /**
   * Forces light app sheets into dark theme when Foundry's app color scheme is dark.
   * @param {boolean} [value]
   */
  static applyDarkThemeToModules = (value) => {
    const SETTINGS = getSettings();
    const enforceDarkTheme = value || SettingsUtil.get(SETTINGS.applyDarkThemeToModules.tag) || false;
    const foundryUiConfig = game.settings.get('core', 'uiConfig') || null;

    if (enforceDarkTheme && foundryUiConfig?.colorScheme?.applications === 'dark') {
      SettingsThemes.applyForcedDarkTheme('.app.theme-light:not(.sheet.dnd5e2, .journal-sheet, #hurry-up, .sheet)');
      document.querySelector('body').classList.add('crlngn-forced-dark-theme');
    }
  }

  /**
   * Updates color scheme detection and applies themed class for stream mode.
   * Caches the result on coreColorScheme for callers that need it.
   */
  static updateColorScheme() {
    const foundryUiConfig = game.settings.get('core', 'uiConfig');
    let interfaceTheme = foundryUiConfig?.colorScheme?.interface;

    if (!interfaceTheme) {
      if (matchMedia("(prefers-color-scheme: dark)").matches) {
        interfaceTheme = "dark";
      } else if (matchMedia("(prefers-color-scheme: light)").matches) {
        interfaceTheme = "light";
      }
    }

    SettingsThemes.coreColorScheme = interfaceTheme;
    LogUtil.log('SettingsThemes.updateColorScheme', [foundryUiConfig, SettingsThemes.coreColorScheme]);

    SettingsThemes.applyStreamModeTheme(interfaceTheme);
  }

  /**
   * Applies themed.theme-{colorScheme} class to body in stream mode
   * @param {string} interfaceTheme - The detected interface theme (light/dark)
   */
  static applyStreamModeTheme(interfaceTheme = 'dark') {
    const body = document.querySelector("body");
    const isStreamMode = body?.classList.contains("stream");
    LogUtil.log('Applied stream mode theme', [interfaceTheme, isStreamMode]);

    if (isStreamMode && interfaceTheme) {
      body.classList.remove("themed", "theme-light", "theme-dark");
      body.classList.add("themed", `theme-${interfaceTheme}`);

      const chatLog = document.querySelector(".chat-log");
      if (chatLog) {
        chatLog.classList.remove("theme-light", "theme-dark");
        chatLog.classList.add(`theme-${interfaceTheme}`);
      }
    }
  }
}
