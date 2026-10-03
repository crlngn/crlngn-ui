import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/** Body class that switches the compact layout on */
const BODY_CLASS = "crlngn-compact-notifications";
/** Class on the notification list while the stack is spread out */
const EXPANDED_CLASS = "crlngn-expanded";
/** Notifications that take part in the stack: everything but progress bars */
const STACK_SELECTOR = ".notification:not(.progress)";

/**
 * Compact notifications. Core shows notifications as a full-width column; with this option on
 * they become small pills at the top center of the screen, stacked behind the newest one when
 * there are several. Clicking the stack spreads it into a column, where each pill can be
 * dismissed as usual; clicking elsewhere or pressing Escape folds it back. Progress bars, such as
 * scene loading, stay out of the stack and keep their own row.
 */
export class CompactNotifications {
  /** @type {boolean} Whether the compact layout is on */
  static enabled = false;
  /** @type {HTMLOListElement|null} Core's notification list */
  static #list = null;
  /** @type {MutationObserver|null} Watches the list for notifications coming and going */
  static #observer = null;
  /** @type {boolean} Whether the document listeners are in place */
  static #bound = false;

  /**
   * Reads the setting and attaches to core's notification list
   * @static
   */
  static init() {
    const SETTINGS = getSettings();
    CompactNotifications.enabled = SettingsUtil.get(SETTINGS.compactNotifications.tag) === true;
    CompactNotifications.#attach();
    CompactNotifications.#applyBodyClass();
    LogUtil.log("CompactNotifications - init", [CompactNotifications.enabled]);
  }

  /**
   * Applies the setting
   * @static
   * @param {boolean} value
   */
  static applySetting(value) {
    CompactNotifications.enabled = value === true;
    CompactNotifications.#applyBodyClass();
    CompactNotifications.#collapse();
  }

  /**
   * Toggles the body class the stylesheet keys on
   */
  static #applyBodyClass() {
    document.body.classList.toggle(BODY_CLASS, CompactNotifications.enabled);
  }

  /**
   * Finds core's notification list, which core prepends to the body while the UI is set up, and
   * starts watching it. Waits for it when it is not there yet.
   */
  static #attach() {
    const list = document.getElementById("notifications");
    if (!list) {
      const waiter = new MutationObserver(() => {
        if (!document.getElementById("notifications")) return;
        waiter.disconnect();
        CompactNotifications.#attach();
      });
      waiter.observe(document.body, { childList: true });
      return;
    }
    if (CompactNotifications.#list === list) return;
    CompactNotifications.#observer?.disconnect();
    CompactNotifications.#list = list;
    CompactNotifications.#observer = new MutationObserver(CompactNotifications.#onListChange);
    CompactNotifications.#observer.observe(list, { childList: true });
    list.addEventListener("click", CompactNotifications.#onListClick, true);
    CompactNotifications.#bindDocument();
    CompactNotifications.#onListChange();
  }

  /**
   * Listens for clicks outside the list and for Escape, both of which fold the stack
   */
  static #bindDocument() {
    if (CompactNotifications.#bound) return;
    CompactNotifications.#bound = true;
    document.addEventListener("pointerdown", (event) => {
      if (!CompactNotifications.#isExpanded()) return;
      if (CompactNotifications.#list?.contains(event.target)) return;
      CompactNotifications.#collapse();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && CompactNotifications.#isExpanded()) CompactNotifications.#collapse();
    });
  }

  /**
   * Numbers the stacked notifications in display order, newest first, and records their count
   * on the list and on the newest one, which shows it as a chip. A stack of one needs no
   * spreading, so it folds back.
   */
  static #onListChange = () => {
    const list = CompactNotifications.#list;
    if (!list) return;
    const stacked = Array.from(list.querySelectorAll(`:scope > ${STACK_SELECTOR}`));
    stacked.forEach((element, index) => {
      element.dataset.stackIndex = String(index);
      if (index === 0) element.dataset.stackCount = String(stacked.length);
      else delete element.dataset.stackCount;
    });
    list.dataset.count = String(stacked.length);
    if (stacked.length <= 1) CompactNotifications.#collapse();
  };

  /**
   * While folded, a click on the stack spreads it instead of dismissing the notification that
   * was hit. Core's own click handler sits on the notification itself, so the event is stopped
   * here, in the capture phase, before it gets there. A lone pill is dismissed as usual.
   * @param {MouseEvent} event
   */
  static #onListClick = (event) => {
    if (!CompactNotifications.enabled || CompactNotifications.#isExpanded()) return;
    const list = CompactNotifications.#list;
    const target = event.target instanceof Element ? event.target.closest(STACK_SELECTOR) : null;
    if (!list || !target || Number(list.dataset.count) <= 1) return;
    event.preventDefault();
    event.stopPropagation();
    list.classList.add(EXPANDED_CLASS);
  };

  /**
   * Whether the stack is spread out
   * @returns {boolean}
   */
  static #isExpanded() {
    return CompactNotifications.#list?.classList.contains(EXPANDED_CLASS) === true;
  }

  /**
   * Folds the stack
   */
  static #collapse() {
    CompactNotifications.#list?.classList.remove(EXPANDED_CLASS);
  }
}
