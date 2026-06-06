import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Handles the "other modules" compatibility list: migration from the legacy
 * comma-separated string format, merging user preferences with the current
 * default set (auto-enabling new modules), and applying the resulting list
 * to the body class layer that controls module-specific style adjustments.
 */
export class SettingsOtherModules {
  /**
   * Migrates otherModulesList from old string format to new array format.
   * Also merges user's saved preferences with current module options
   * (auto-enables new modules).
   * @returns {Array} The migrated/merged array of module objects
   */
  static migrate = () => {
    const SETTINGS = getSettings();
    const savedValue = game.settings.get(MODULE_ID, SETTINGS.otherModulesList.tag);

    if (Array.isArray(savedValue)) {
      const mergedArray = SettingsOtherModules.mergeDefaults(savedValue);
      if (JSON.stringify(mergedArray) !== JSON.stringify(savedValue)) {
        SettingsUtil.set(SETTINGS.otherModulesList.tag, mergedArray);
      }
      return mergedArray;
    }

    if (typeof savedValue === 'string' && savedValue.length > 0) {
      LogUtil.log('Migrating otherModulesList from string to array format', [savedValue]);
      const migratedArray = SettingsOtherModules.parseLegacyFormat(savedValue);
      const mergedArray = SettingsOtherModules.mergeDefaults(migratedArray);
      SettingsUtil.set(SETTINGS.otherModulesList.tag, mergedArray);
      LogUtil.log('Migration complete', [mergedArray]);
      return mergedArray;
    }

    LogUtil.log('No saved otherModulesList found, using defaults');
    return SETTINGS.otherModulesList.default;
  }

  /**
   * Parses old comma-separated string format into new array format.
   * @param {string} stringValue - Old format: "'module-a','module-b','module-c'"
   * @returns {Array} Array of objects: [{ id: 'module-a', enabled: true }, ...]
   */
  static parseLegacyFormat = (stringValue) => {
    const SETTINGS = getSettings();
    const moduleArray = [];

    const enabledModules = stringValue
      .split(',')
      .map(item => item.replace(/['''"]/g, "").trim())
      .filter(id => id.length > 0);

    LogUtil.log('Parsed enabled modules from old format', [enabledModules]);

    Object.values(SETTINGS.otherModulesList.options).forEach(moduleId => {
      const cleanId = moduleId.replace(/['''"]/g, "").trim();
      moduleArray.push({
        id: cleanId,
        enabled: enabledModules.includes(cleanId)
      });
    });

    return moduleArray;
  }

  /**
   * Merges user's saved module preferences with current module options.
   * New modules (not in user's array) are auto-enabled; existing modules
   * preserve user's enabled/disabled choice.
   * @param {Array} userArray - User's saved array of module objects
   * @returns {Array} Merged array with all current modules
   */
  static mergeDefaults = (userArray) => {
    const SETTINGS = getSettings();
    const mergedArray = [];

    const allModuleIds = Object.values(SETTINGS.otherModulesList.options)
      .map(id => id.replace(/['''"]/g, "").trim());

    const userPrefs = new Map(userArray.map(item => [item.id, item.enabled]));

    allModuleIds.forEach(moduleId => {
      mergedArray.push({
        id: moduleId,
        enabled: userPrefs.has(moduleId) ? userPrefs.get(moduleId) : true
      });
    });

    return mergedArray;
  }

  /**
   * Applies the list of other modules to adjust styles for.
   * @param {Array} [value] - Array of module objects; if omitted, reads from settings.
   */
  static apply = (value) => {
    const SETTINGS = getSettings();
    let currSetting = value || SettingsUtil.get(SETTINGS.otherModulesList.tag);
    LogUtil.log("applyOtherModulesList - before merge", [currSetting]);

    if (Array.isArray(currSetting)) {
      const defaultList = SETTINGS.otherModulesList.default;
      const mergedList = [];
      const currentIds = new Set(currSetting.map(m => m.id));

      defaultList.forEach(defaultModule => {
        const userModule = currSetting.find(m => m.id === defaultModule.id);
        if (userModule) {
          mergedList.push(userModule);
        } else {
          mergedList.push({ ...defaultModule });
        }
      });

      const defaultIds = new Set(defaultList.map(m => m.id));
      const hasMissingModules = [...defaultIds].some(id => !currentIds.has(id));

      if (hasMissingModules || mergedList.length !== currSetting.length) {
        LogUtil.log("applyOtherModulesList - merged missing modules", [currSetting.length, 'to', mergedList.length, 'missing:', [...defaultIds].filter(id => !currentIds.has(id))]);
        SettingsUtil.set(SETTINGS.otherModulesList.tag, mergedList);
        currSetting = mergedList;
      }
    }

    LogUtil.log("applyOtherModulesList - after merge", [currSetting]);
    ModuleCompatUtil.addModuleClasses();
  }
}
