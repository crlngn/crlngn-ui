import { ModuleSettings } from '../components/settings-dialogs/ModuleSettings.mjs';
import { MODULE_ID } from './General.mjs';
// import * as lang from '../lang/en.json' assert { type: "json" };

// Opens Patreon URL when instantiated
class PatreonSupport extends FormApplication {
  constructor(...args) {
    super(...args);
    window.open('https://www.patreon.com/c/carolingiandev/membership', '_blank');
    this.close();
  }

  render() {
    // Don't actually render anything, just open the URL
    this.close();
    return this;
  }
}

// Exports settings and active modules to JSON for troubleshooting
class ExportSettings extends FormApplication {
  constructor(...args) {
    super(...args);
    this.#exportSettings();
    this.close();
  }

  render() {
    this.close();
    return this;
  }

  async #exportSettings() {
    const exportData = {
      exportDate: new Date().toISOString(),
      foundryVersion: game.version,
      systemId: game.system.id,
      systemVersion: game.system.version,
      coreSettings: {
        uiConfig: game.settings.get('core', 'uiConfig')
      },
      cuiSettings: {},
      activeModules: []
    };

    // Get all Carolingian UI settings
    const moduleSettings = game.settings.settings;
    for (const [key, setting] of moduleSettings.entries()) {
      if (key.startsWith(`${MODULE_ID}.`)) {
        const settingKey = key.replace(`${MODULE_ID}.`, '');
        try {
          exportData.cuiSettings[settingKey] = game.settings.get(MODULE_ID, settingKey);
        } catch (e) {
          exportData.cuiSettings[settingKey] = `[Error: ${e.message}]`;
        }
      }
    }

    // Get active modules
    for (const [id, module] of game.modules.entries()) {
      if (module.active) {
        exportData.activeModules.push({
          id: id,
          title: module.title,
          version: module.version
        });
      }
    }

    // Create and download the JSON file
    const filename = `carolingian-ui-settings-${new Date().toISOString().slice(0, 10)}.json`;
    const jsonStr = JSON.stringify(exportData, null, 2);

    // Use Foundry's saveDataToFile utility for reliable downloads
    saveDataToFile(jsonStr, 'application/json', filename);

    ui.notifications.info(game.i18n.localize("CRLNGN_UI.settings.exportSettings.success"));
  }
}

// Imports settings from a JSON file (GM only)
class ImportSettings extends FormApplication {
  constructor(...args) {
    super(...args);
    this.#importSettings();
    this.close();
  }

  render() {
    this.close();
    return this;
  }

  async #importSettings() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Support both old (carolingianSettings) and new (cuiSettings) property names
        const settings = data.cuiSettings || data.carolingianSettings;

        // Validate the file has settings
        if (!settings) {
          ui.notifications.error(game.i18n.localize("CRLNGN_UI.settings.importSettings.invalidFile"));
          return;
        }

        // Apply each setting
        let appliedCount = 0;
        let errorCount = 0;

        for (const [key, value] of Object.entries(settings)) {
          // Skip error entries from export
          if (typeof value === 'string' && value.startsWith('[Error:')) continue;

          try {
            // Check if this setting exists
            const settingKey = `${MODULE_ID}.${key}`;
            if (game.settings.settings.has(settingKey)) {
              await game.settings.set(MODULE_ID, key, value);
              appliedCount++;
            }
          } catch (e) {
            console.warn(`Failed to import setting ${key}:`, e);
            errorCount++;
          }
        }

        if (errorCount > 0) {
          ui.notifications.warn(
            game.i18n.format("CRLNGN_UI.settings.importSettings.partialSuccess", {
              applied: appliedCount,
              errors: errorCount
            })
          );
        } else {
          ui.notifications.info(
            game.i18n.format("CRLNGN_UI.settings.importSettings.success", {
              count: appliedCount
            })
          );
        }

        // Prompt for reload
        if (appliedCount > 0) {
          const reload = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("CRLNGN_UI.settings.importSettings.reloadTitle") },
            content: `<p>${game.i18n.localize("CRLNGN_UI.settings.importSettings.reloadPrompt")}</p>`,
            yes: { default: true }
          });

          if (reload) {
            window.location.reload();
          }
        }
      } catch (e) {
        console.error("Failed to parse settings file:", e);
        ui.notifications.error(game.i18n.localize("CRLNGN_UI.settings.importSettings.parseError"));
      }
    });

    // Trigger file selection
    input.click();
  }
}

export function getSettingMenus() {
  return {
    moduleSettingsMenu: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.title"),
      label: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.title"), 
      hint: game.i18n.localize("CRLNGN_UI.settings.moduleSettingsMenu.hint"),
      icon: "fas fa-sliders-h",  
      propType: ModuleSettings,
      restricted: false
    },
    supportPatreon: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.label"),
      label: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.buttonLabel"),
      hint: game.i18n.localize("CRLNGN_UI.settings.supportPatreon.hint"),
      icon: "fas fa-heart",
      propType: PatreonSupport,
      restricted: false
    },
    exportSettings: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.exportSettings.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.exportSettings.label"),
      label: game.i18n.localize("CRLNGN_UI.settings.exportSettings.buttonLabel"),
      hint: game.i18n.localize("CRLNGN_UI.settings.exportSettings.hint"),
      icon: "fas fa-file-export",
      propType: ExportSettings,
      restricted: false
    },
    importSettings: {
      tab: '',
      tag: game.i18n.localize("CRLNGN_UI.settings.importSettings.label"),
      name: game.i18n.localize("CRLNGN_UI.settings.importSettings.label"),
      label: game.i18n.localize("CRLNGN_UI.settings.importSettings.buttonLabel"),
      hint: game.i18n.localize("CRLNGN_UI.settings.importSettings.hint"),
      icon: "fas fa-file-import",
      propType: ImportSettings,
      restricted: true
    }
  };
}

/**
 * Applies a bulk lock state to all client-scoped settings
 * Shows a confirmation dialog before applying
 * @param {string} state - The lock state to apply: 'unlocked', 'soft', or 'locked'
 */
export async function applyBulkLockState(state) {
  if (!game.user?.isGM || !state) return;

  // Get state label for display
  const stateLabels = {
    'unlocked': game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.unlocked"),
    'soft': game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.soft"),
    'locked': game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.options.locked")
  };

  // Show confirmation dialog
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("CRLNGN_UI.settings.bulkLockAction.confirmTitle") },
    content: `<p>${game.i18n.format("CRLNGN_UI.settings.bulkLockAction.confirmMessage", { state: stateLabels[state] })}</p>`,
    yes: { default: false }
  });

  if (!confirmed) {
    // Reset the select to empty since action was cancelled
    game.settings.set(MODULE_ID, 'v2-bulk-lock-action', '');
    return;
  }

  // Import settings utilities
  const { getSettings, SETTING_SCOPE } = await import('./Settings.mjs');
  const { SettingsUtil } = await import('../components/SettingsUtil.mjs');

  const SETTINGS = getSettings();
  let appliedCount = 0;

  // Apply state to all client-scoped settings (excluding menus and special settings)
  for (const [key, setting] of Object.entries(SETTINGS)) {
    if (setting.tag &&
        setting.scope === SETTING_SCOPE.client &&
        !setting.isMenu &&
        setting.config === false &&
        !['v2-bulk-lock-action', 'disable-ui', 'v2-debug-mode'].includes(setting.tag)) {
      SettingsUtil.setEnforcementState(setting.tag, state);
      appliedCount++;
    }
  }

  // Save default settings if state is not unlocked
  if (state !== 'unlocked') {
    SettingsUtil.saveDefaultSettings();
  }

  // Show success notification
  ui.notifications.info(
    game.i18n.format("CRLNGN_UI.settings.bulkLockAction.success", {
      state: stateLabels[state]
    })
  );

  // Reset the select back to empty
  game.settings.set(MODULE_ID, 'v2-bulk-lock-action', '');
}