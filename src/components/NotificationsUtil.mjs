import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LibWrapperUtil } from "./LibWrapperUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/** Body class that switches the compact layout on */
const BODY_CLASS = "crlngn-compact-notifications";
/** Class on the notification list while the stack is spread out */
const EXPANDED_CLASS = "crlngn-expanded";
/** Class on the notification list while positions are applied without animating */
const STILL_CLASS = "crlngn-still";
/** Notifications that take part in the stack: everything but progress bars */
const STACK_SELECTOR = ".notification:not(.progress)";
/** Core method every notification goes through */
const NOTIFY_TARGET = "foundry.applications.ui.Notifications.prototype.notify";
/** Script path of the wrapper library, whose frames surround every wrapper's own */
const LIBWRAPPER_PATH = "/modules/lib-wrapper/";
/** Most notification origins remembered at once */
const MAX_ORIGINS = 100;
/** Distance, in pixels, a pill already in the stack settles from when the stack changes */
const SETTLE_DISTANCE = 4;
/** Width, in pixels, of the zone at a pill's right end that holds core's close glyph */
const CLOSE_GLYPH_ZONE = 48;
/** Notification types from most to least urgent; the folded stack shows the icon of the most urgent one it holds */
const URGENCY = ["error", "warning", "success", "info"];

/**
 * @typedef {Object} NotificationOrigin
 * @property {"module"|"system"|"core"|"script"} kind
 * @property {string} id - Package id, or the kind for core and scripts
 * @property {string} label - Name shown to the user
 */

/**
 * Compact notifications. Core shows notifications as a full-width column; with this option on
 * they become one-line pills at the top center of the screen, stacked behind the newest one when
 * there are several. The newest pill then names where the stack came from, which is found by
 * wrapping core's notify method and reading the calling script off the stack trace. Clicking a
 * pill spreads the stack into a column of two-line pills, each showing its full message and its
 * origin and dismissed by a click as usual; clicking elsewhere or pressing Escape folds it back. Progress bars, such as
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
  /** @type {Map<number, NotificationOrigin>} Origin of each notification, by its id */
  static #origins = new Map();
  /** @type {Map<number, number>} Removal timers of the notifications whose lifetime this class runs, by id */
  static #timers = new Map();
  /** @type {Set<string>} Ids of modules seen wrapping core's notify method, whose frames a call passes through */
  static #notifyWrappers = new Set();

  /**
   * Reads the setting, wraps core's notify method and attaches to the notification list
   * @static
   */
  static init() {
    const SETTINGS = getSettings();
    CompactNotifications.enabled = SettingsUtil.get(SETTINGS.compactNotifications.tag) === true;
    CompactNotifications.#wrapNotify();
    CompactNotifications.#attach();
    CompactNotifications.#applyBodyClass();
    CompactNotifications.#exposeApi();
    LogUtil.log("CompactNotifications - init", [CompactNotifications.enabled]);
  }

  /**
   * Raises a notification from this module's own code, so that it is attributed to Carolingian
   * UI. Exposed on the module's API for macros that want to try the compact layout. It goes
   * through core's typed methods rather than notify itself: the origin detection skips the
   * wrapper's own frames at the top of the trace, and a core frame in between is what separates
   * them from this one.
   * @static
   * @param {string} message
   * @param {string} [type="info"] - info, warning, error or success
   * @param {object} [options] - Core notification options
   * @returns {object} The notification
   */
  static notify(message, type = "info", options = {}) {
    const method = { info: "info", warning: "warn", warn: "warn", error: "error", success: "success" }[type] ?? "info";
    return ui.notifications[method](message, options);
  }

  /**
   * Publishes the notify helper on the module's API object
   */
  static #exposeApi() {
    const module = game.modules?.get(MODULE_ID);
    if (!module) return;
    module.api = { ...(module.api ?? {}), notify: CompactNotifications.notify };
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
   * Wraps core's notify method so the origin of every notification is recorded against its id.
   * While the compact layout is on, notifications that would expire on their own are made
   * permanent for core and given a lifetime here instead, which can pause while the stack is
   * open to be read. Progress bars and notifications asked to be permanent are left to core.
   */
  static #wrapNotify() {
    LibWrapperUtil.register(NOTIFY_TARGET, function(wrapped, ...args) {
      const origin = CompactNotifications.#detectOrigin();
      const options = args[2] ?? {};
      const managed = CompactNotifications.enabled && !options.permanent && !options.progress;
      if (managed) args[2] = { ...options, permanent: true };
      const result = wrapped(...args);
      if (Number.isFinite(result?.id)) {
        if (origin) CompactNotifications.#rememberOrigin(result.id, origin);
        if (managed && !CompactNotifications.#isExpanded()) CompactNotifications.#startTimer(result.id);
        else if (managed) CompactNotifications.#timers.set(result.id, 0);
      }
      return result;
    }, "WRAPPER");
  }

  /**
   * Gives a notification the lifetime core would have, counted from now
   * @param {number} id
   */
  static #startTimer(id) {
    CompactNotifications.#stopTimer(id);
    const lifetime = foundry.applications?.ui?.Notifications?.LIFETIME_MS ?? 5000;
    const timer = window.setTimeout(() => {
      CompactNotifications.#timers.delete(id);
      ui.notifications?.remove(id);
    }, lifetime);
    CompactNotifications.#timers.set(id, timer);
  }

  /**
   * Stops a notification's timer, keeping it listed so it can be restarted
   * @param {number} id
   */
  static #stopTimer(id) {
    const timer = CompactNotifications.#timers.get(id);
    if (timer) window.clearTimeout(timer);
    CompactNotifications.#timers.set(id, 0);
  }

  /**
   * Pauses every lifetime while the stack is open, so nothing disappears while it is being read
   */
  static #pauseTimers() {
    for (const id of CompactNotifications.#timers.keys()) CompactNotifications.#stopTimer(id);
  }

  /**
   * Gives every notification still shown a full lifetime again once the stack folds, and forgets
   * the ones already gone
   */
  static #resumeTimers() {
    const list = CompactNotifications.#list;
    for (const id of Array.from(CompactNotifications.#timers.keys())) {
      if (list?.querySelector(`.notification[data-id="${id}"]`)) CompactNotifications.#startTimer(id);
      else CompactNotifications.#timers.delete(id);
    }
  }

  /**
   * Works out who raised a notification from the stack trace. Frames of this module and of the
   * wrapper library at the top belong to this wrapper and are skipped. Core's own notification
   * method, info, warn and the like, is the first core frame: whatever module frames come before
   * it belong to other modules that wrap notify, which the call only passed through, and they are
   * remembered as such. The frame right after that core frame names the origin: a module or
   * system frame is the caller, an evaluated frame means a macro or script, and another core
   * frame means core raised it itself. When no core frame exists the caller used notify
   * directly, and the first module frame not known as a wrapper is taken.
   * @returns {NotificationOrigin}
   */
  static #detectOrigin() {
    const frames = (new Error().stack ?? "").split("\n").map(line => {
      const url = line.match(/(?:https?|file):\/\/[^\s()]+/)?.[0] ?? "";
      const pkg = url.match(/\/(modules|systems)\/([^/]+)\//);
      return {
        isScript: /\beval at\b|> eval/.test(line),
        isLib: url.includes(LIBWRAPPER_PATH),
        isOurs: url.includes(`/modules/${MODULE_ID}/`),
        isCore: Boolean(url) && !pkg,
        pkg: pkg ? { kind: pkg[1] === "modules" ? "module" : "system", id: pkg[2] } : null
      };
    }).filter(frame => frame.isScript || frame.isLib || frame.isOurs || frame.isCore || frame.pkg);
    let start = 0;
    while (start < frames.length && (frames[start].isOurs || frames[start].isLib)) start++;
    const firstCore = frames.findIndex((frame, i) => i >= start && frame.isCore);
    if (firstCore >= 0) {
      for (let i = start; i < firstCore; i++) {
        if (frames[i].pkg) CompactNotifications.#notifyWrappers.add(frames[i].pkg.id);
      }
      const next = frames.slice(firstCore + 1).find(frame => !frame.isLib);
      if (next?.isScript) return CompactNotifications.#origin("script", "script");
      if (next?.pkg) return CompactNotifications.#origin(next.pkg.kind, next.pkg.id);
      return CompactNotifications.#origin("core", "core");
    }
    for (let i = start; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.isScript) return CompactNotifications.#origin("script", "script");
      if (frame.pkg && !CompactNotifications.#notifyWrappers.has(frame.pkg.id)) return CompactNotifications.#origin(frame.pkg.kind, frame.pkg.id);
    }
    return CompactNotifications.#origin("core", "core");
  }

  /**
   * Builds an origin with its display name
   * @param {"module"|"system"|"core"|"script"} kind
   * @param {string} id
   * @returns {NotificationOrigin}
   */
  static #origin(kind, id) {
    let label = id;
    if (kind === "module") label = game.modules?.get(id)?.title ?? id;
    else if (kind === "system") label = game.system?.title ?? id;
    else if (kind === "core") label = game.i18n.localize("CRLNGN_UI.ui.compactNotifications.originCore");
    else label = game.i18n.localize("CRLNGN_UI.ui.compactNotifications.originScript");
    return { kind, id, label };
  }

  /**
   * Remembers an origin, forgetting the oldest once the map is full
   * @param {number} id
   * @param {NotificationOrigin} origin
   */
  static #rememberOrigin(id, origin) {
    CompactNotifications.#origins.set(id, origin);
    if (CompactNotifications.#origins.size > MAX_ORIGINS) {
      const oldest = CompactNotifications.#origins.keys().next().value;
      CompactNotifications.#origins.delete(oldest);
    }
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
   * Numbers the stacked notifications in display order, newest first, records their count on
   * the list and on the newest one, and labels each with its origin. The index doubles as a
   * custom property, from which the stylesheet works out how far to pull each pill up behind the
   * newest one while folded, since folded pills all share one height. The newest pill gets the
   * summary shown while folded. An open stack stays open while pills are dismissed from it, so
   * the last one goes with a single click; it folds back once empty.
   *
   * A change of the list moves the column in layout at once, which the transform transition
   * would then visibly chase, so the new positions are applied with transitions off and the
   * pills already in the stack settle into place from a few pixels down instead.
   */
  static #onListChange = () => {
    const list = CompactNotifications.#list;
    if (!list) return;
    const stacked = Array.from(list.querySelectorAll(`:scope > ${STACK_SELECTOR}`));
    const settling = [];
    list.classList.add(STILL_CLASS);
    stacked.forEach((element, index) => {
      if (element.dataset.stackIndex !== undefined) settling.push(element);
      element.dataset.stackIndex = String(index);
      element.style.setProperty("--crlngn-stack-index", String(index));
      if (index === 0) element.dataset.stackCount = String(stacked.length);
      else delete element.dataset.stackCount;
      CompactNotifications.#labelOrigin(element);
    });
    CompactNotifications.#updateSummary(stacked);
    CompactNotifications.#updateLevel(stacked);
    list.dataset.count = String(stacked.length);
    if (!stacked.length) CompactNotifications.#collapse();
    CompactNotifications.#settle(list, settling);
  };

  /**
   * Lets the given pills take their new positions without animating, then eases them in from a
   * few pixels below, which reads as a nudge rather than a slide
   * @param {HTMLOListElement} list
   * @param {HTMLElement[]} elements
   */
  static #settle(list, elements) {
    for (const element of elements) element.style.translate = `0 ${SETTLE_DISTANCE}px`;
    void list.offsetHeight;
    list.classList.remove(STILL_CLASS);
    for (const element of elements) element.style.translate = "";
  }

  /**
   * Writes a notification's origin onto its element, as data and as a small label shown when the
   * stack is spread out
   * @param {HTMLElement} element
   */
  static #labelOrigin(element) {
    if (element.dataset.originKey) return;
    const origin = CompactNotifications.#origins.get(Number(element.dataset.id));
    if (!origin) return;
    element.dataset.originKey = `${origin.kind}:${origin.id}`;
    const label = document.createElement("small");
    label.className = "crlngn-origin";
    label.textContent = origin.label;
    element.appendChild(label);
  }

  /**
   * Gives the newest pill the text shown while folded: the count and where the notifications
   * came from. One shared origin is named as is. With several, the origin of the most urgent
   * notification is named, or of the most recent one when they are equally urgent, followed by
   * how many other origins there are.
   * @param {HTMLElement[]} stacked - The stacked notifications, newest first
   */
  static #updateSummary(stacked) {
    for (const element of stacked.slice(1)) element.querySelector(":scope > .crlngn-stack-summary")?.remove();
    const first = stacked[0];
    if (!first) return;
    let summary = first.querySelector(":scope > .crlngn-stack-summary");
    if (stacked.length <= 1) {
      summary?.remove();
      return;
    }
    if (!summary) {
      summary = document.createElement("span");
      summary.className = "crlngn-stack-summary";
      first.appendChild(summary);
    }
    const known = new Set(stacked.map(element => element.dataset.originKey).filter(Boolean));
    const count = stacked.length;
    const lead = CompactNotifications.#leadOrigin(stacked);
    let text;
    if (!known.size || !lead) {
      text = game.i18n.format("CRLNGN_UI.ui.compactNotifications.count", { count });
    } else if (known.size === 1) {
      text = game.i18n.format("CRLNGN_UI.ui.compactNotifications.fromOne", { count, name: lead });
    } else if (known.size === 2) {
      text = game.i18n.format("CRLNGN_UI.ui.compactNotifications.fromOneOther", { count, name: lead });
    } else {
      text = game.i18n.format("CRLNGN_UI.ui.compactNotifications.fromMany", { count, name: lead, others: known.size - 1 });
    }
    summary.textContent = text;
  }

  /**
   * Name of the origin to lead the summary with: that of the most urgent notification with a
   * known origin, the most recent one among equals
   * @param {HTMLElement[]} stacked - The stacked notifications, newest first
   * @returns {string}
   */
  static #leadOrigin(stacked) {
    const labeled = stacked.filter(element => element.dataset.originKey);
    const level = URGENCY.find(type => labeled.some(element => element.classList.contains(type)));
    const lead = labeled.find(element => !level || element.classList.contains(level)) ?? labeled[0];
    return lead?.querySelector(":scope > .crlngn-origin")?.textContent ?? "";
  }

  /**
   * Marks the newest pill with the most urgent type found in the stack, so the folded stack's
   * icon warns of an error further down
   * @param {HTMLElement[]} stacked - The stacked notifications, newest first
   */
  static #updateLevel(stacked) {
    for (const element of stacked.slice(1)) delete element.dataset.stackLevel;
    const first = stacked[0];
    if (!first) return;
    const level = URGENCY.find(type => stacked.some(element => element.classList.contains(type)));
    if (level) first.dataset.stackLevel = level;
    else delete first.dataset.stackLevel;
  }

  /**
   * While folded, a click on the stack spreads it instead of dismissing the notification that
   * was hit, so the full messages can be read. Core's own click handler sits on the notification
   * itself, so the event is stopped here, in the capture phase, before it gets there. A lone pill
   * opens the same way when its message is cut short; when the whole message already fits on its
   * single line, or the click lands on its close glyph, the click dismisses it as in core.
   * @param {MouseEvent} event
   */
  static #onListClick = (event) => {
    if (!CompactNotifications.enabled || CompactNotifications.#isExpanded()) return;
    const list = CompactNotifications.#list;
    const target = event.target instanceof Element ? event.target.closest(STACK_SELECTOR) : null;
    if (!list || !target) return;
    if (Number(list.dataset.count) <= 1 && (!CompactNotifications.#isTruncated(target) || CompactNotifications.#onCloseGlyph(event, target))) return;
    event.preventDefault();
    event.stopPropagation();
    list.classList.add(EXPANDED_CLASS);
    CompactNotifications.#pauseTimers();
  };

  /**
   * Whether a click landed on the close glyph core draws at the right end of a pill
   * @param {MouseEvent} event
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  static #onCloseGlyph(event, element) {
    const rect = element.getBoundingClientRect();
    return event.clientX >= rect.right - CLOSE_GLYPH_ZONE;
  }

  /**
   * Whether a folded pill's message is cut short by its single-line clamp
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  static #isTruncated(element) {
    const text = element.querySelector(":scope > p");
    if (!text) return false;
    return text.scrollHeight > text.clientHeight + 1 || text.scrollWidth > text.clientWidth + 1;
  }

  /**
   * Whether the stack is spread out
   * @returns {boolean}
   */
  static #isExpanded() {
    return CompactNotifications.#list?.classList.contains(EXPANDED_CLASS) === true;
  }

  /**
   * Folds the stack and lets the lifetimes run again
   */
  static #collapse() {
    const wasExpanded = CompactNotifications.#isExpanded();
    CompactNotifications.#list?.classList.remove(EXPANDED_CLASS);
    if (wasExpanded) CompactNotifications.#resumeTimers();
  }
}
