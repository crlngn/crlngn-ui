import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";

/**
 * @typedef {Object} OwnershipInfo
 * @property {string} icon - Font Awesome icon class
 * @property {string} cssClass - CSS class for color coding
 * @property {string} label - Human-readable label
 */

const OWNERSHIP_LEVELS = {
  INHERIT: -1,
  NONE: 0,
  LIMITED: 1,
  OBSERVER: 2,
  OWNER: 3
};

/** @type {Record<number, OwnershipInfo>} */
const OWNERSHIP_DISPLAY = {
  [OWNERSHIP_LEVELS.NONE]: { icon: "fa-ban", cssClass: "none", label: "None" },
  [OWNERSHIP_LEVELS.LIMITED]: { icon: "fa-eye-low-vision", cssClass: "limited", label: "Limited" },
  [OWNERSHIP_LEVELS.OBSERVER]: { icon: "fa-eye", cssClass: "observer", label: "Observer" },
  [OWNERSHIP_LEVELS.OWNER]: { icon: "fa-feather-pointed", cssClass: "owner", label: "Owner" }
};

/**
 * Utility class for displaying journal page ownership indicators to GMs
 */
export class JournalPageUtil {

  static init() {
    if (!game.user?.isGM) return;

    LogUtil.log("JournalPageUtil.init", []);
    Hooks.on(HOOKS_CORE.RENDER_APPLICATION_V2, JournalPageUtil.#onRenderApplicationV2);
    Hooks.on(HOOKS_CORE.RENDER_JOURNAL_SHEET, JournalPageUtil.#onRenderJournalSheet);
  }

  static #onRenderJournalSheet(app, html, data) {
    const element = html instanceof HTMLElement ? html : html[0];
    JournalPageUtil.#injectOwnershipIndicators(app, element);
  }

  static #onRenderApplicationV2(app, element, options) {
    const isJournal = element?.classList?.contains('journal-sheet') ||
                      element?.classList?.contains('journal-entry') ||
                      app?.document?.documentName === 'JournalEntry';
    if (!isJournal) return;

    JournalPageUtil.#injectOwnershipIndicators(app, element);
  }

  /**
   * Resolves the effective default ownership level for a page,
   * walking up to the parent JournalEntry if set to INHERIT.
   * @param {object} page - A JournalEntryPage document
   * @returns {number} The resolved ownership level
   */
  static #resolveDefaultOwnership(page) {
    const level = page.ownership?.default;
    if (level !== undefined && level !== OWNERSHIP_LEVELS.INHERIT) {
      return level;
    }
    return page.parent?.ownership?.default ?? OWNERSHIP_LEVELS.NONE;
  }

  /**
   * Injects ownership indicator spans into all page entries in the journal TOC sidebar
   * @param {object} app - The journal sheet application
   * @param {HTMLElement} element - The rendered element
   */
  static #injectOwnershipIndicators(app, element) {
    const journal = app.document;
    if (!journal?.pages) return;

    const pageEntries = element?.querySelectorAll('.journal-sidebar .toc li[data-page-id]');
    if (!pageEntries?.length) return;

    pageEntries.forEach(li => {
      const pageId = li.dataset.pageId;
      const page = journal.pages.get(pageId);
      if (!page) return;

      const effectiveLevel = JournalPageUtil.#resolveDefaultOwnership(page);
      const display = OWNERSHIP_DISPLAY[effectiveLevel] || OWNERSHIP_DISPLAY[OWNERSHIP_LEVELS.NONE];

      const heading = li.querySelector('.page-heading');
      if (!heading) return;

      const existingFoundry = heading.querySelector('.page-ownership');
      if (existingFoundry) {
        existingFoundry.className = `page-ownership crlngn-page-ownership ${display.cssClass}`;
        existingFoundry.dataset.tooltip = display.label;
        existingFoundry.innerHTML = `<i class="fa-solid ${display.icon}"></i>`;
        return;
      }

      const existing = heading.querySelector('.crlngn-page-ownership');
      if (existing) {
        existing.className = `crlngn-page-ownership ${display.cssClass}`;
        existing.dataset.tooltip = display.label;
        existing.innerHTML = `<i class="fa-solid ${display.icon}"></i>`;
        return;
      }

      const span = document.createElement('span');
      span.className = `crlngn-page-ownership ${display.cssClass}`;
      span.dataset.tooltip = display.label;
      span.innerHTML = `<i class="fa-solid ${display.icon}"></i>`;
      heading.appendChild(span);
    });

    LogUtil.log("JournalPageUtil.#injectOwnershipIndicators", [journal.name]);
  }
}
