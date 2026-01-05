import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Utility class for managing journal sheet styling
 */
export class JournalUtil {
  static journalStylesEnabled = true;

  static init() {
    const SETTINGS = getSettings();
    LogUtil.log("JournalUtil.init", []);

    JournalUtil.journalStylesEnabled = SettingsUtil.get(SETTINGS.enableJournalStyles.tag);
    JournalUtil.applyJournalStyles(JournalUtil.journalStylesEnabled);

    // Listen for setting changes
    Hooks.on(HOOKS_CORE.UPDATE_SETTING, JournalUtil.#onUpdateSetting);

    // Listen for journal sheet renders to add toggle button
    // v1 style sheets
    Hooks.on(HOOKS_CORE.RENDER_JOURNAL_SHEET, JournalUtil.#onRenderJournalSheet);
    // v2 style sheets use renderApplicationV2
    Hooks.on(HOOKS_CORE.RENDER_APPLICATION_V2, JournalUtil.#onRenderApplicationV2);
  }

  static #onUpdateSetting(setting, value, options, userId) {
    const SETTINGS = getSettings();
    if (setting.key === `crlngn-ui.${SETTINGS.enableJournalStyles.tag}`) {
      LogUtil.log(HOOKS_CORE.UPDATE_SETTING, ["enableJournalStyles changed", value]);
      JournalUtil.applyJournalStyles(value);
      // Update all toggle button icons
      JournalUtil.#updateAllToggleButtons();
    }
  }

  /**
   * Hook handler for journal sheet render (v1 style)
   * @param {Application} app - The journal sheet application
   * @param {jQuery} html - The rendered HTML
   * @param {object} data - The render data
   */
  static #onRenderJournalSheet(app, html, data) {
    LogUtil.log("JournalUtil.#onRenderJournalSheet", [app, html]);
    JournalUtil.#addToggleButton(app, html);
  }

  /**
   * Hook handler for ApplicationV2 render (v2 style sheets)
   * @param {ApplicationV2} app - The application
   * @param {HTMLElement} element - The rendered element
   * @param {object} options - Render options
   */
  static #onRenderApplicationV2(app, element, options) {
    // Check if this is a journal sheet by looking at the element classes or app type
    const isJournal = element?.classList?.contains('journal-sheet') ||
                      element?.classList?.contains('journal-entry') ||
                      app?.constructor?.name?.includes('Journal') ||
                      app?.document?.documentName === 'JournalEntry';

    if (!isJournal) return;

    LogUtil.log("JournalUtil.#onRenderApplicationV2", [app, element]);
    JournalUtil.#addToggleButton(app, element);
  }

  /**
   * Add a toggle button to the journal header
   * @param {Application} app - The journal sheet application
   * @param {jQuery|HTMLElement} html - The rendered HTML (jQuery for v1, HTMLElement for v2)
   */
  static #addToggleButton(app, html) {
    // Handle both jQuery objects (v1) and HTMLElements (v2)
    let header;
    if (html instanceof HTMLElement) {
      // v2 style - html is the element itself
      header = html.querySelector('.window-header');
    } else {
      // v1 style - html is jQuery or array-like
      header = html[0]?.querySelector?.('.window-header') || html.find?.('.window-header')[0];
    }

    if (!header) return;

    // Check if button already exists
    if (header.querySelector('.crlngn-journal-toggle')) return;

    // Find the close button - try multiple selectors for different Foundry versions
    // v2 sheets use button[data-action="close"], older sheets use a.header-button.close
    const closeBtn = header.querySelector('button[data-action="close"], a.header-button.close, button.header-button.close');
    if (!closeBtn) return;

    // Determine if we're using v2 style buttons
    const isV2Style = closeBtn.tagName === 'BUTTON' && closeBtn.dataset.action === 'close';

    // Create the toggle button matching the sheet's style
    const toggleBtn = document.createElement(isV2Style ? 'button' : 'a');
    toggleBtn.className = isV2Style
      ? 'header-control icon crlngn-journal-toggle'
      : 'header-button control crlngn-journal-toggle';
    toggleBtn.dataset.tooltip = JournalUtil.#getTooltipText();
    toggleBtn.ariaLabel = JournalUtil.#getTooltipText();

    if (isV2Style) {
      toggleBtn.type = 'button';
      toggleBtn.innerHTML = `<i class="fa-solid ${JournalUtil.#getIconClass()}"></i>`;
    } else {
      toggleBtn.dataset.tooltipDirection = 'DOWN';
      toggleBtn.innerHTML = `<i class="fas ${JournalUtil.#getIconClass()}"></i>`;
    }

    // Add click handler
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      JournalUtil.#toggleJournalStyles();
    });

    // Insert before close button
    closeBtn.parentNode.insertBefore(toggleBtn, closeBtn);
  }

  /**
   * Get the appropriate icon class based on current state
   * @returns {string} Font Awesome icon class
   */
  static #getIconClass() {
    return JournalUtil.journalStylesEnabled ? 'fa-feather-pointed' : 'fa-feather';
  }

  /**
   * Get tooltip text based on current state
   * @returns {string} Tooltip text
   */
  static #getTooltipText() {
    return JournalUtil.journalStylesEnabled
      ? game.i18n.localize('CRLNGN_UI.ui.journalToggle.disable')
      : game.i18n.localize('CRLNGN_UI.ui.journalToggle.enable');
  }

  /**
   * Toggle journal styles on/off
   */
  static #toggleJournalStyles() {
    const SETTINGS = getSettings();
    const newValue = !JournalUtil.journalStylesEnabled;
    SettingsUtil.set(SETTINGS.enableJournalStyles.tag, newValue);
    // The onChange callback will handle updating the UI
  }

  /**
   * Update all toggle buttons in open journal sheets
   */
  static #updateAllToggleButtons() {
    const toggleBtns = document.querySelectorAll('.crlngn-journal-toggle');
    toggleBtns.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = `fas ${JournalUtil.#getIconClass()}`;
      }
      btn.dataset.tooltip = JournalUtil.#getTooltipText();
    });
  }

  /**
   * Apply or remove journal styling based on setting value
   * @param {boolean} value - Whether journal styles should be enabled
   */
  static applyJournalStyles(value) {
    JournalUtil.journalStylesEnabled = value;

    if (value) {
      document.body.classList.add("crlngn-journals");
    } else {
      document.body.classList.remove("crlngn-journals");
    }
  }
}
