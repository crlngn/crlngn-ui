import { BORDER_COLOR_TYPES, getSettings, ICON_SIZES } from "../constants/Settings.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";

/**
 * Pure visual / DOM-mutating settings appliers extracted from SettingsUtil.
 * Each method reads (or accepts) the current setting value and applies it
 * to the DOM: body classes, CSS variables, or delegates to a component
 * (CameraDockUtil, TopNavigation).
 *
 * No persistent state — these are stateless mutators called from the
 * SettingsUtil.apply switch dispatch.
 */
export class SettingsAppliers {
  /**
   * Applies border color settings to chat messages.
   * Can be based on player color or roll type.
   */
  static applyBorderColors() {
    const SETTINGS = getSettings();
    const borderColorSettings = SettingsUtil.get(SETTINGS.chatBorderColor.tag);
    const body = document.querySelector("body");

    if (borderColorSettings === BORDER_COLOR_TYPES.playerColor.name) {
      body.classList.add("player-chat-borders");
      body.classList.remove("roll-chat-borders");
    } else if (borderColorSettings === BORDER_COLOR_TYPES.rollType.name) {
      body.classList.add("roll-chat-borders");
      body.classList.remove("player-chat-borders");
    } else {
      body.classList.remove("player-chat-borders");
      body.classList.remove("roll-chat-borders");
    }
  }

  static applyHideLoadingSceneName(value) {
    const body = document.querySelector("body");
    if (value) {
      body.classList.add("hide-scene-name");
    } else {
      body.classList.remove("hide-scene-name");
    }
  }

  /**
   * Checks whether backdrop-filter blur is supported based on Foundry's performance mode.
   * Checks both the core setting value and body classes as fallback.
   * @returns {boolean}
   */
  static isBlurSupported() {
    try {
      const perfMode = game.settings.get("core", "performanceMode");
      if (perfMode === 0) return false;
      const experimental = game.settings.get("core", "experimental");
      if (experimental?.noBlur) return false;
    } catch (e) {
      // Fallback to body classes if settings not yet available
    }
    const body = document.body;
    return !body.classList.contains("performance-low") && !body.classList.contains("noblur");
  }

  /**
   * Applies or removes glass effect (backdrop-filter) from windows
   * @param {boolean} value - Whether to enable glass effect
   */
  static applyGlassEffect(value) {
    const body = document.querySelector("body");
    const SETTINGS = getSettings();
    const blurSupported = SettingsAppliers.isBlurSupported();

    if (value) {
      body.classList.add("crlngn-glass-effect");
      const glassTranslucence = SettingsUtil.get(SETTINGS.glassTranslucence.tag);
      SettingsAppliers.applyTranslucence(glassTranslucence);
    } else {
      body.classList.remove("crlngn-glass-effect");
      GeneralUtil.addCSSVars("--background-blur", "0px");
      GeneralUtil.addCSSVars("--background-opacity", "1");
    }
    LogUtil.log("applyGlassEffect", [value, { blurSupported }]);
  }

  /**
   * Applies translucence effect to windows (controls both opacity and blur)
   * @param {number} value - Translucence value from 0 to 1
   *   - 0 = fully opaque (opacity: 1, blur: 4px)
   *   - 1 = translucent (opacity: 0.75, blur: 20px)
   */
  static applyTranslucence(value) {
    if (!SettingsAppliers.isBlurSupported()) {
      GeneralUtil.addCSSVars("--background-opacity", "1");
      GeneralUtil.addCSSVars("--background-blur", "0px");
      return;
    }

    const opacity = 1 - (value * 0.3);
    const blurPx = 10 + (value * 20);

    GeneralUtil.addCSSVars("--background-opacity", opacity.toFixed(2));
    GeneralUtil.addCSSVars("--background-blur", `${blurPx.toFixed(1)}px`);
    LogUtil.log("applyTranslucence", [value, { opacity, blur: `${blurPx}px` }]);
  }

  /**
   * Applies chat message styling settings
   */
  static applyChatStyles() {
    const SETTINGS = getSettings();
    const chatMsgSettings = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
    const body = document.querySelector("body");
    const isDaggerheart = game.system?.id === 'daggerheart';

    LogUtil.log("applyChatStyles", [chatMsgSettings, SETTINGS]);

    if (chatMsgSettings) {
      if (isDaggerheart) {
        body.classList.add("crlngn-chat-dh");
        body.classList.remove("crlngn-chat");
      } else {
        body.classList.add("crlngn-chat");
        body.classList.remove("crlngn-chat-dh");
      }
    } else {
      body.classList.remove("crlngn-chat");
      body.classList.remove("crlngn-chat-dh");
    }
  }

  /**
   * Applies settings to left controls bar
   * @param {string} tag - Setting tag to apply
   * @param {*} value - Value to apply for the setting
   */
  static applyLeftControlsSettings(tag, value) {
    const SETTINGS = getSettings();
    const navEnabled = SettingsUtil.get(SETTINGS.sceneNavEnabled.tag);
    const controls = document.querySelector("#ui-left");
    const body = document.querySelector('body.crlngn-ui');
    const bodyStyleElem = document.querySelector('#crlngn-ui-vars');

    LogUtil.log("applyLeftControlsSettings", [tag]);

    if (!controls) {
      LogUtil.log("applyLeftControlsSettings - no controls found (stream mode?)");
      return;
    }

    switch (tag) {
      case SETTINGS.controlsAutoHide.tag:
        if (SettingsUtil.get(SETTINGS.controlsAutoHide.tag)) {
          controls.classList.add("auto-hide");
        } else {
          controls.classList.remove("auto-hide");
        }
        break;
      default:
        //
    }
  }

  /**
   * Applies size settings for control icons.
   * Updates the size of icons in the left controls panel.
   */
  static applyControlIconSize() {
    const SETTINGS = getSettings();
    const iconSize = SettingsUtil.get(SETTINGS.controlsIconSize.tag);
    const body = document.querySelector("body");
    const size = ICON_SIZES[iconSize] ? ICON_SIZES[iconSize].size : ICON_SIZES.regular.size;

    function getIconFontSize(currIconSize) {
      switch (currIconSize) {
        case ICON_SIZES.large.name:
          return `var(--font-size-18);`;
        case ICON_SIZES.regular.name:
          return `var(--font-size-16);`;
        default:
          return `var(--font-size-14);`;
      }
    }
    LogUtil.log("applyControlIconSize", [size]);
    GeneralUtil.addCSSVars('--icon-font-size', getIconFontSize(iconSize));
    GeneralUtil.addCSSVars('--control-item-size', size);
    SettingsAppliers.applyLeftControlsSettings();
  }

  /**
   * Applies scene navigation position settings
   * @param {number} [value] - Position value to apply, if not provided uses stored setting
   */
  static applySceneNavPos(value) {
    const SETTINGS = getSettings();
    TopNavigation.navPos = value || SettingsUtil.get(SETTINGS.sceneNavPos.tag);
  }

  /**
   * Applies horizontal position of camera dock
   * @param {number} [pos] - X position to apply
   */
  static applyCameraPosX(pos) {
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockPosX.tag);
    const xPos = pos || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ x: xPos });
  }

  /**
   * Applies vertical position of camera dock
   * @param {number} [pos] - Y position to apply
   */
  static applyCameraPosY(pos) {
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockPosY.tag);
    const yPos = pos || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ y: yPos });
  }

  /**
   * Applies width of camera dock
   * @param {number} [value] - Width value to apply
   */
  static applyCameraWidth(value) {
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockWidth.tag);
    const width = value || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ w: width });
  }

  /**
   * Applies height of camera dock
   * @param {number} [value] - Height value to apply
   */
  static applyCameraHeight(value) {
    const SETTINGS = getSettings();
    const cameraSettings = SettingsUtil.get(SETTINGS.dockHeight.tag);
    const height = value || cameraSettings;
    CameraDockUtil.resetPositionAndSize({ h: height });
  }

  /**
   * Applies custom font settings
   * @param {string} tag - Font setting tag to apply
   * @param {string} [value] - Font value to apply
   */
  static applyCustomFonts(tag, value) {
    const SETTINGS = getSettings();
    const fields = SETTINGS.customFontsMenu.fields;
    const customFonts = {};

    LogUtil.log("applyCustomFonts", [tag, value]);
    fields.forEach(fieldName => {
      customFonts[fieldName] = SettingsUtil.get(SETTINGS[fieldName].tag);
    });

    const body = document.querySelector("body.crlngn-ui");
    if (!body) return;

    switch (tag) {
      case SETTINGS.enableFontUI.tag:
        body.classList.toggle('cui-font-ui', value ?? customFonts.enableFontUI ?? true);
        break;
      case SETTINGS.enableFontTitles.tag:
        body.classList.toggle('cui-font-t', value ?? customFonts.enableFontTitles ?? true);
        break;
      case SETTINGS.enableFontJournal.tag:
        body.classList.toggle('cui-font-jrnl', value ?? customFonts.enableFontJournal ?? true);
        break;
      case SETTINGS.enableFontJournalTitles.tag:
        body.classList.toggle('cui-font-jrnl-t', value ?? customFonts.enableFontJournalTitles ?? true);
        break;
      case SETTINGS.uiFontBody.tag:
        GeneralUtil.addCSSVars('--crlngn-font-family', value || customFonts.uiFontBody || '');
        break;
      case SETTINGS.uiFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-titles', value || customFonts.uiFontTitles || '');
        break;
      case SETTINGS.journalFontBody.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-body', value || customFonts.journalFontBody || '');
        break;
      case SETTINGS.journalFontTitles.tag:
        GeneralUtil.addCSSVars('--crlngn-font-journal-title', value || customFonts.journalFontTitles || '');
        break;
      default:
        //
    }
  }
}
