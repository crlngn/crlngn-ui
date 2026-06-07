import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * GM-driven settings enforcement system extracted from SettingsUtil.
 *
 * Concepts:
 * - Per-setting enforcement state (unlocked / soft / locked / gate), stored
 *   in a world-scope map and applied to client-scoped settings.
 * - GM saves a defaults snapshot that players' clients reconcile against on
 *   load; soft enforcement remembers what's already been applied via the
 *   appliedSoftDefaults client tracker.
 * - Force Client Settings compatibility check.
 */
export class SettingsEnforcement {
  /**
   * Checks if any Carolingian UI settings are being forced by both Force Client Settings
   * module AND Carolingian UI's enforcement system, with requiresReload: true.
   * Only these settings are likely to cause actual problems.
   * @returns {boolean} True if there's a real conflict
   */
  static hasForceClientSettingsConflict = () => {
    const isActive = GeneralUtil.isModuleOn('force-client-settings');
    LogUtil.log('FCS Check - Module active:', [isActive]);

    if (!isActive) return false;

    try {
      const SETTINGS = getSettings();
      const allSettings = game.settings.settings;
      const conflictingSettings = [];

      const enforcement = SettingsUtil.get(SETTINGS.settingEnforcement.tag) || {};

      allSettings.forEach((setting, key) => {
        if (key.startsWith('force-client-settings._crlngn-ui.') ||
            key.startsWith(`force-client-settings._${MODULE_ID}.`)) {
          const settingTag = key.replace('force-client-settings._crlngn-ui.', '')
                                .replace(`force-client-settings._${MODULE_ID}.`, '');

          const cuiEnforcementState = enforcement[settingTag];
          const isEnforcedByCUI = cuiEnforcementState && cuiEnforcementState !== 'unlocked';

          const cuiSetting = Object.values(SETTINGS).find(s => s.tag === settingTag);
          const hasReloadRequired = cuiSetting?.requiresReload === true;

          if (isEnforcedByCUI && hasReloadRequired) {
            conflictingSettings.push({ key, settingTag, cuiEnforcementState });
          }
        }
      });

      LogUtil.log('Found conflicting settings (enforced by both + requiresReload):', [conflictingSettings]);

      return conflictingSettings.length > 0;
    } catch (e) {
      LogUtil.log('Error checking FCS conflict', [e]);
      return false;
    }
  }

  /**
   * Get the enforcement state for a specific setting
   * @param {string} settingTag - The setting tag to check
   * @returns {string} The enforcement state: 'unlocked', 'soft', 'locked', or 'gate'
   */
  static getEnforcementState(settingTag) {
    const SETTINGS = getSettings();
    const enforcement = SettingsUtil.get(SETTINGS.settingEnforcement.tag) || {};
    const state = enforcement[settingTag] || 'unlocked';
    LogUtil.log(`getEnforcementState for ${settingTag}:`, [state, enforcement]);
    return state;
  }

  /**
   * Set the enforcement state for a specific setting.
   * If a setting transitions out of soft mode, removes it from the
   * client-side appliedSoftDefaults tracker so a re-entry to soft will
   * trigger a fresh apply.
   * @param {string} settingTag - The setting tag
   * @param {string} state - The enforcement state: 'unlocked', 'soft', 'locked', or 'gate'
   */
  static setEnforcementState(settingTag, state) {
    const SETTINGS = getSettings();
    const enforcement = SettingsUtil.get(SETTINGS.settingEnforcement.tag) || {};
    const previousState = enforcement[settingTag] || 'unlocked';
    enforcement[settingTag] = state;
    SettingsUtil.set(SETTINGS.settingEnforcement.tag, enforcement);

    if (previousState === 'soft' && state !== 'soft') {
      const appliedSoftDefaults = SettingsUtil.get(SETTINGS.appliedSoftDefaults.tag) || {};
      if (settingTag in appliedSoftDefaults) {
        delete appliedSoftDefaults[settingTag];
        SettingsUtil.set(SETTINGS.appliedSoftDefaults.tag, appliedSoftDefaults);
      }
    }

    LogUtil.log(`Set enforcement state for ${settingTag}:`, [state]);
  }

  /**
   * Cycle through enforcement states (normal click) or toggle gate mode (alt-click).
   * Entering gate mode snapshots the GM's current value into defaultSettings
   * BEFORE the GM can change it, so the captured value is what players see.
   * @param {string} settingTag - The setting tag
   * @param {boolean} isAltClick - Whether alt key was pressed
   * @returns {string} The new enforcement state
   */
  static cycleEnforcementState(settingTag, isAltClick = false) {
    const SETTINGS = getSettings();
    const currentState = SettingsEnforcement.getEnforcementState(settingTag);

    if (isAltClick) {
      const newState = currentState === 'gate' ? 'locked' : 'gate';

      if (newState === 'gate' && currentState !== 'gate') {
        const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag) || {};
        const currentValue = SettingsUtil.get(settingTag);
        if (currentValue !== undefined) {
          defaultSettings[settingTag] = currentValue;
          SettingsUtil.set(SETTINGS.defaultSettings.tag, defaultSettings);
          LogUtil.log(`Saved default for gate mode: ${settingTag}`, [currentValue]);
        }
      }

      SettingsEnforcement.setEnforcementState(settingTag, newState);
      return newState;
    } else {
      const cycle = {
        'unlocked': 'soft',
        'soft': 'locked',
        'locked': 'unlocked',
        'gate': 'soft'
      };
      const newState = cycle[currentState];
      SettingsEnforcement.setEnforcementState(settingTag, newState);
      return newState;
    }
  }

  /**
   * Check if a setting should be enforced for the current user
   * @param {string} settingTag - The setting tag to check
   * @returns {boolean} True if the setting should be enforced
   */
  static shouldEnforceSetting(settingTag) {
    const state = SettingsEnforcement.getEnforcementState(settingTag);

    if (state === 'unlocked') return false;
    if (state === 'gate' && game.user?.isGM) return false;

    return true;
  }

  /**
   * Cleans up corruption from an earlier bug where the appliedSoftDefaults
   * client tracker got swept into the bulk-lock enforcement action, causing
   * saveDefaultSettings/enforceGMSettings to nest the tracker inside itself
   * on every round-trip (issue: 48MB settings exports observed).
   * Idempotent — safe to run on every load.
   */
  static cleanupAppliedSoftDefaults() {
    const SETTINGS = getSettings();
    const trackerTag = SETTINGS.appliedSoftDefaults.tag;

    const tracker = SettingsUtil.get(trackerTag);
    if (tracker && typeof tracker === 'object' && trackerTag in tracker) {
      SettingsUtil.set(trackerTag, {});
      LogUtil.log("Reset recursive appliedSoftDefaults tracker");
    }

    if (game.user?.isGM) {
      const enforcement = SettingsUtil.get(SETTINGS.settingEnforcement.tag);
      if (enforcement && trackerTag in enforcement) {
        delete enforcement[trackerTag];
        SettingsUtil.set(SETTINGS.settingEnforcement.tag, enforcement);
        LogUtil.log("Removed appliedSoftDefaults from enforcement map");
      }

      const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag);
      if (defaultSettings && trackerTag in defaultSettings) {
        delete defaultSettings[trackerTag];
        SettingsUtil.set(SETTINGS.defaultSettings.tag, defaultSettings);
        LogUtil.log("Removed appliedSoftDefaults from GM defaults snapshot");
      }
    }
  }

  /**
   * Enforces GM settings to players based on individual enforcement states
   * Called during module initialization for non-GM users
   */
  static enforceGMSettings() {
    const SETTINGS = getSettings();

    const defaultSettings = SettingsUtil.get(SETTINGS.defaultSettings.tag);
    if (!defaultSettings || Object.keys(defaultSettings).length <= 1) { // <= 1 because of _version
      LogUtil.log("No default GM settings found to enforce");
      return;
    }

    LogUtil.log("Checking individual enforcement states for settings", [defaultSettings]);

    let settingsApplied = false;
    const appliedSoftDefaults = SettingsUtil.get(SETTINGS.appliedSoftDefaults.tag) || {};
    let softDefaultsChanged = false;

    // Apply each stored setting based on its individual enforcement state.
    // Never re-apply the appliedSoftDefaults tracker — if it leaked into a
    // pre-fix GM snapshot, applying it would re-nest the client tracker
    // inside itself.
    for (const [settingTag, value] of Object.entries(defaultSettings)) {
      if (settingTag === '_version') continue;
      if (settingTag === SETTINGS.appliedSoftDefaults.tag) continue;

      try {
        if (!SettingsEnforcement.shouldEnforceSetting(settingTag)) {
          continue;
        }

        const setting = Object.values(SETTINGS).find(s => s.tag === settingTag);
        if (setting && setting.scope === 'client') {
          const currentValue = SettingsUtil.get(settingTag);
          const enforcementState = SettingsEnforcement.getEnforcementState(settingTag);

          if (enforcementState === 'soft') {
            const lastApplied = appliedSoftDefaults[settingTag];
            const gmDefaultChanged = lastApplied === undefined || JSON.stringify(lastApplied) !== JSON.stringify(value);

            if (gmDefaultChanged) {
              if (currentValue !== value) {
                SettingsUtil.set(settingTag, value);
                LogUtil.log(`Applied soft-enforced GM setting: ${settingTag}`, [value]);
                settingsApplied = true;
              }
              appliedSoftDefaults[settingTag] = value;
              softDefaultsChanged = true;
            } else {
              LogUtil.log(`Skipping soft-enforced setting (player override preserved): ${settingTag}`, [currentValue]);
            }
          } else if (enforcementState === 'locked' || enforcementState === 'gate') {
            if (currentValue !== value) {
              SettingsUtil.set(settingTag, value);
              LogUtil.log(`Applied ${enforcementState}-enforced GM setting: ${settingTag}`, [value]);
              settingsApplied = true;
            }
          }
        }
      } catch (error) {
        LogUtil.log(`Failed to apply GM setting: ${settingTag}`, [error]);
      }
    }

    if (softDefaultsChanged) {
      SettingsUtil.set(SETTINGS.appliedSoftDefaults.tag, appliedSoftDefaults);
    }

    return settingsApplied;
  }

  /**
   * Saves current GM settings as defaults for enforcement.
   * Only saves settings that have an enforcement state (not unlocked).
   * Excludes the appliedSoftDefaults tracker to prevent recursive nesting.
   */
  static saveDefaultSettings() {
    const SETTINGS = getSettings();

    if (!game.user?.isGM) {
      return;
    }

    const existingDefaults = SettingsUtil.get(SETTINGS.defaultSettings.tag) || {};
    const defaultSettings = {
      ...existingDefaults,
      _version: Date.now()
    };

    for (const [key, setting] of Object.entries(SETTINGS)) {
      if (setting.tag && setting.scope === 'client' && !setting.isMenu && setting.tag !== SETTINGS.appliedSoftDefaults.tag) {
        const enforcementState = SettingsEnforcement.getEnforcementState(setting.tag);

        if (enforcementState === 'unlocked') {
          delete defaultSettings[setting.tag];
        } else if (enforcementState === 'soft' || enforcementState === 'locked') {
          const value = SettingsUtil.get(setting.tag);
          if (value !== undefined) {
            defaultSettings[setting.tag] = value;
          }
        }
        // Gate mode: don't update - preserve whatever was saved when entering gate mode
      }
    }

    SettingsUtil.set(SETTINGS.defaultSettings.tag, defaultSettings);
    LogUtil.log("Saved enforced GM settings", [defaultSettings]);
  }

  /**
   * Hook for when settings change to update default settings.
   * Only saves if the changed setting is enforced (but not gate mode).
   */
  static onSettingChange(settingTag) {
    if (game.user?.isGM) {
      const enforcementState = SettingsEnforcement.getEnforcementState(settingTag);
      if (enforcementState === 'soft' || enforcementState === 'locked') {
        SettingsEnforcement.saveDefaultSettings();
      }
    }
  }
}
