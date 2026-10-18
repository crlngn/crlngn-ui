import { LockHost, LockIcons, LOCK_STATES } from "@crlngn/settings-kit";
import { HOOKS_CORE, HOOKS_CRLNGN } from "../constants/Hooks.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Settings locks for other modules, through the Carolingian Settings Kit.
 * - API: other modules lock the settings of their custom menus with Carolingian UI's lock states,
 *   stored in Carolingian UI's world settings, without bundling the kit.
 * - Opt-in (GM world setting): lock icons on other modules' client settings in Configure Settings.
 * Carolingian UI's own settings keep using SettingsEnforcement.
 */
export class SettingsLocksHost {
  static #host = null;
  static #configLocks = false;

  /**
   * Registers the lock storage and publishes the API. Call during init, after the module's settings.
   * Modules get the API from `game.modules.get("crlngn-ui").api.settingsLocks`, or with the
   * "crlngn-ui.settingsLocksReady" hook, which fires at setup once every module has registered its settings.
   */
  static init() {
    const host = new LockHost({
      hostId: MODULE_ID,
      storage: {
        states: "v2-guest-lock-states",
        values: "v2-guest-lock-values",
        applied: "v2-guest-lock-applied"
      }
    });
    host.registerSettings();
    SettingsLocksHost.#host = host;
    SettingsLocksHost.#configLocks = SettingsUtil.get(getSettings().lockOtherModules.tag) === true;
    SettingsLocksHost.#exposeApi();

    if (SettingsLocksHost.#configLocks) host.watchSettingsConfig({ titles: SettingsLocksHost.#titles() });

    Hooks.once(HOOKS_CORE.SETUP, () => {
      if (SettingsLocksHost.#configLocks) host.lockConfigSettings();
      Hooks.callAll(HOOKS_CRLNGN.SETTINGS_LOCKS_READY, SettingsLocksHost.api);
    });
    Hooks.once(HOOKS_CORE.READY, () => host.apply());
  }

  /**
   * The public API
   * @returns {object}
   */
  static get api() {
    const host = SettingsLocksHost.#host;
    return {
      LOCK_STATES,
      /** Whether the GM turned on locks for other modules' settings in Configure Settings */
      get configLocks() { return SettingsLocksHost.#configLocks; },
      /**
       * Make a module's client settings lockable. Call once the settings are registered; for one
       * registered later, pass its onChange through the returned locks' `wrapOnChange`.
       * @param {string} moduleId
       * @param {string[]} keys
       * @returns {import("@crlngn/settings-kit").SettingsLocks} getState, lockedValue, cycle, apply, wrapOnChange
       */
      register: (moduleId, keys) => host.register(moduleId, keys),
      /**
       * @param {string} moduleId
       * @returns {import("@crlngn/settings-kit").SettingsLocks|undefined}
       */
      get: (moduleId) => host.get(moduleId),
      /**
       * Draw the lock icons into a module's settings form (e.g. in its ApplicationV2 _onRender)
       * @param {HTMLElement} root - The rendered form
       * @param {string|object} locks - A module id, or the locks returned by `register`
       * @param {object} [options] - scope, fieldKeys, fieldPrefix, skipSelector (see LockIcons.render)
       */
      render: (root, locks, options = {}) => {
        const guest = typeof locks === "string" ? host.get(locks) : locks;
        if (!guest) return;
        LockIcons.render(root, guest, { titles: SettingsLocksHost.#titles(), ...options });
      }
    };
  }

  /**
   * Publishes the API on the module object, next to the existing entries
   */
  static #exposeApi() {
    const module = game.modules?.get(MODULE_ID);
    if (!module) return;
    module.api = { ...(module.api ?? {}), settingsLocks: SettingsLocksHost.api };
  }

  /**
   * @returns {{toggle: string, locked: string}}
   */
  static #titles() {
    return {
      toggle: game.i18n.localize("CRLNGN_UI.ui.enforcementTooltip"),
      locked: game.i18n.localize("CRLNGN_UI.ui.lockedByGM")
    };
  }
}
