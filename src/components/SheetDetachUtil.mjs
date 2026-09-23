import { LogUtil } from "./LogUtil.mjs";

/** Icon of the header button while the sheet is in the main window */
const DETACH_ICON = "fa-solid fa-arrow-up-right-from-square";
/** Icon of the header button while the sheet lives in its own window */
const ATTACH_ICON = "fa-solid fa-arrow-down-to-square";
/** Class of the header button */
const BUTTON_CLASS = "crlngn-detach";
/** Class set on a sheet's window element while it lives in a detached window */
const DETACHED_CLASS = "crlngn-detached-app";

/**
 * Detaches legacy (ApplicationV1) sheets into their own browser window on Foundry v14 through the
 * core detached window manager, which core only wires up for ApplicationV2. A header button moves
 * the sheet's element into a new popup, where it fills the window, and brings it back on a second
 * click. Closing the popup closes the sheet and closing the sheet closes the popup. Dragging,
 * resizing and minimizing are inert while detached, as the legacy handlers listen on the main
 * window. Registered for Blade Runner, whose sheets are still on the legacy framework.
 */
export class SheetDetachUtil {
  /** @type {Map<Application, { win: Window, position: object, stopMinimize: (event: Event) => void }>} */
  static #detached = new Map();

  /**
   * Whether the running Foundry version exposes the detached window manager
   * @returns {boolean}
   */
  static get isSupported(){
    return typeof foundry.applications?.detached?.openWindow === "function";
  }

  /**
   * Registers the header button and close hooks for legacy actor and item sheets
   */
  static init(){
    if(!SheetDetachUtil.isSupported){ return; }
    for(const cls of ["ActorSheet", "ItemSheet"]){
      Hooks.on(`get${cls}HeaderButtons`, SheetDetachUtil.#onGetHeaderButtons);
      Hooks.on(`close${cls}`, SheetDetachUtil.#onClose);
    }
  }

  /**
   * Whether a sheet currently lives in a detached window
   * @param {Application} app
   * @returns {boolean}
   */
  static isDetached(app){
    return SheetDetachUtil.#detached.has(app);
  }

  /**
   * Moves a sheet into its own window, or back into the main window when it is already detached
   * @param {Application} app
   */
  static async toggle(app){
    try{
      if(SheetDetachUtil.isDetached(app)){ await SheetDetachUtil.attach(app); }
      else{ await SheetDetachUtil.detach(app); }
    }catch(error){
      LogUtil.warn("SheetDetachUtil.toggle", [error]);
    }
  }

  /**
   * Opens a popup the size and place of the sheet and moves the sheet's element into it
   * @param {Application} app
   */
  static async detach(app){
    const manager = foundry.applications.detached;
    const element = SheetDetachUtil.#element(app);
    if(!element || SheetDetachUtil.isDetached(app)){ return; }
    const rect = element.getBoundingClientRect();
    const chrome = Math.max(window.outerHeight - window.innerHeight, 0);
    const win = await manager.openWindow({
      id: `crlngn-detached-${app.appId}`,
      position: {
        top: Math.round(window.screenY + chrome + rect.top),
        left: Math.round(window.screenX + rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    });
    const stopMinimize = (event) => { event.stopImmediatePropagation(); };
    manager.windows.get(win.id)?.applications.set(app.id, app);
    SheetDetachUtil.#detached.set(app, { win, position: { ...app.position }, stopMinimize });
    element.classList.add(DETACHED_CLASS);
    element.classList.remove("minimized");
    element.querySelector(".window-header")?.addEventListener("dblclick", stopMinimize, { capture: true });
    manager.adoptNodes(win.document.body, element);
    win.document.title = app.title ?? "";
    SheetDetachUtil.#updateButton(app, true);
    LogUtil.log("SheetDetachUtil.detach", [app.id, win.id]);
  }

  /**
   * Moves a detached sheet back into the main window at its previous position and closes the popup
   * @param {Application} app
   */
  static async attach(app){
    const manager = foundry.applications.detached;
    const state = SheetDetachUtil.#detached.get(app);
    const element = SheetDetachUtil.#element(app);
    if(!state || !element){ return; }
    SheetDetachUtil.#detached.delete(app);
    manager.windows.get(state.win.id)?.applications.delete(app.id);
    element.querySelector(".window-header")?.removeEventListener("dblclick", state.stopMinimize, { capture: true });
    element.classList.remove(DETACHED_CLASS);
    manager.adoptNodes(document.body, element);
    app.setPosition(state.position);
    app.bringToTop?.();
    SheetDetachUtil.#updateButton(app, false);
    manager.checkEmpty(state.win);
    LogUtil.log("SheetDetachUtil.attach", [app.id]);
  }

  /**
   * Adds the detach button next to the close button of pop-out legacy sheets
   * @param {Application} app
   * @param {object[]} buttons
   */
  static #onGetHeaderButtons(app, buttons){
    if(!app?.options?.popOut){ return; }
    if(buttons.some(b => b.class === BUTTON_CLASS)){ return; }
    const detached = SheetDetachUtil.isDetached(app);
    const button = {
      label: SheetDetachUtil.#labelKey(detached),
      class: BUTTON_CLASS,
      icon: detached ? ATTACH_ICON : DETACH_ICON,
      onclick: () => SheetDetachUtil.toggle(app)
    };
    const closeIndex = buttons.findIndex(b => b.class === "close");
    buttons.splice(closeIndex < 0 ? buttons.length : closeIndex, 0, button);
  }

  /**
   * Forgets a closing sheet and closes its popup when nothing else lives there
   * @param {Application} app
   */
  static #onClose(app){
    const state = SheetDetachUtil.#detached.get(app);
    if(!state){ return; }
    SheetDetachUtil.#detached.delete(app);
    const manager = foundry.applications.detached;
    manager.windows.get(state.win.id)?.applications.delete(app.id);
    manager.checkEmpty(state.win);
  }

  /**
   * Swaps the header button between its detach and attach states
   * @param {Application} app
   * @param {boolean} detached
   */
  static #updateButton(app, detached){
    const button = SheetDetachUtil.#element(app)?.querySelector(`.window-header a.${BUTTON_CLASS}`);
    if(!button){ return; }
    const label = game.i18n.localize(SheetDetachUtil.#labelKey(detached));
    button.innerHTML = `<i class="${detached ? ATTACH_ICON : DETACH_ICON}"></i>${label}`;
    button.setAttribute("data-tooltip", label);
  }

  /**
   * Localization key of the button label for a state
   * @param {boolean} detached
   * @returns {string}
   */
  static #labelKey(detached){
    return detached ? "CRLNGN_UI.ui.attachWindow" : "CRLNGN_UI.ui.detachWindow";
  }

  /**
   * The sheet's window element, whichever framework wrapper the app exposes
   * @param {Application} app
   * @returns {HTMLElement|null}
   */
  static #element(app){
    const element = app?.element;
    if(element instanceof HTMLElement){ return element; }
    return element?.[0] ?? null;
  }
}
