import { WindowStyles } from "@crlngn/window-styles";
import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * The shared Swipe window look (@crlngn/window-styles) for Foundry's dialogs and framed forms.
 * Carolingian UI installs the kit and votes it on while its windowStyles client setting is on;
 * the styles stay active while any Carolingian module votes on. Setting changes reach apply()
 * through SettingsUtil.apply.
 */
export class WindowStylesUtil {
  /**
   * Installs the kit and casts the first vote. Call during init, after the settings are registered.
   */
  static init() {
    WindowStyles.install({ moduleId: MODULE_ID });
    WindowStylesUtil.apply();
  }

  /**
   * Votes the styles on or off.
   * @param {boolean} [value] - The setting value; read from the settings when omitted
   */
  static apply(value) {
    const SETTINGS = getSettings();
    WindowStyles.request(MODULE_ID, !!(value ?? SettingsUtil.get(SETTINGS.windowStyles.tag)));
  }
}
