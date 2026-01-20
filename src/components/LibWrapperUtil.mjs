import { MODULE_ID } from '../constants/General.mjs';
import { LogUtil } from './LogUtil.mjs';

/**
 * Utility for managing libWrapper integrations
 * Provides centralized control for prototype overrides with graceful degradation
 */
export class LibWrapperUtil {
  static #registeredWrappers = new Set();

  /**
   * Check if libWrapper (or shim) is available
   * @returns {boolean} True if libWrapper is available
   */
  static isAvailable() {
    return typeof globalThis.libWrapper !== 'undefined';
  }

  /**
   * Register a wrapper using libWrapper
   * @param {string} target - The target to wrap (e.g., 'Combat.prototype.nextTurn')
   * @param {Function} fn - The wrapper function
   * @param {string} type - The wrapper type ('WRAPPER', 'MIXED', 'OVERRIDE')
   * @returns {boolean} True if registration succeeded
   */
  static register(target, fn, type = 'WRAPPER') {
    if (!this.isAvailable()) {
      LogUtil.warn(`LibWrapperUtil - libWrapper not available for: ${target}`);
      return false;
    }

    try {
      libWrapper.register(MODULE_ID, target, fn, type);
      this.#registeredWrappers.add(target);
      LogUtil.log(`LibWrapperUtil - Successfully registered: ${target}`);
      return true;
    } catch (error) {
      LogUtil.error(`LibWrapperUtil - Failed to register ${target}:`, error);
      return false;
    }
  }

  /**
   * Get all registered wrapper targets
   * @returns {string[]} Array of registered targets
   */
  static getRegisteredWrappers() {
    return Array.from(this.#registeredWrappers);
  }
}
