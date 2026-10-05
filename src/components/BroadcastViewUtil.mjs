import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/** Name of the module's socket channel */
const SOCKET_NAME = `module.${MODULE_ID}`;
/** Class of the module's button on the primary scene controls */
const BUTTON_CLASS = "crlngn-broadcast-view";
/** Body class set while this client is broadcasting its view */
const BODY_CLASS = "crlngn-broadcasting-view";
/** Id of the outline drawn around the GM's screen while broadcasting */
const FRAME_ID = "crlngn-broadcast-frame";
/** Shortest time between two view messages, in milliseconds */
const SEND_INTERVAL = 66;
/** Time between repeats of the current view while the GM holds still, in milliseconds */
const HEARTBEAT_INTERVAL = 3000;
/** Age past which a broadcast counts as over when no message has arrived, in milliseconds */
const LIVE_TIMEOUT = 10000;
/** Time a follower's own view is kept after they last moved it, in milliseconds */
const USER_HOLD = 2000;
/** Duration of the pan that brings a follower back to the broadcast view, in milliseconds */
const RETURN_DURATION = 500;

/**
 * Lets a GM share their canvas view with the players. While broadcasting, every pan or zoom of
 * the GM's canvas is sent over the module socket and the players on the same scene pan along.
 * Broadcasting is switched with a button on the primary scene controls or with a keybinding, starts by
 * sending the current view so players line up at once, outlines the GM's screen while it is on,
 * and ends by itself when the GM changes scene. A follower who moves their own view keeps it
 * until shortly after they let go, then eases back to the broadcast view. Players can opt out of
 * following, and a GM who is broadcasting ignores other broadcasts.
 */
export class BroadcastView {
  /** @type {boolean} Whether this client is broadcasting */
  static active = false;
  /** @type {"off"|"keybinding"|"toggle"} How the world offers the feature: not at all, by keybinding only, or with the controls toggle as well */
  static mode = "toggle";
  /** @type {boolean} Whether broadcast views carry the zoom level */
  static includeZoom = true;
  /** @type {boolean} Whether this client follows a broadcast */
  static follow = true;
  /** @type {string|null} Id of the scene being broadcast */
  static #sceneId = null;
  /** @type {{x: number, y: number, scale: number}|null} Latest view waiting to be sent */
  static #pending = null;
  /** @type {number|null} Timer of the pending send */
  static #timer = null;
  /** @type {number} Time of the last send */
  static #lastSent = 0;
  /** @type {number|null} Timer repeating the current view while broadcasting */
  static #heartbeat = null;
  /** @type {{x: number, y: number, scale: number, height: number, sceneId: string}|null} Latest view received */
  static #received = null;
  /** @type {number} Time the latest view was received */
  static #receivedAt = 0;
  /** @type {boolean} Whether the canvas is being panned by this class */
  static #applying = false;
  /** @type {number} Counter telling the latest applied pan from earlier ones */
  static #applyId = 0;
  /** @type {boolean} Whether the follower is dragging the canvas */
  static #dragging = false;
  /** @type {number} Time until which the follower's own view is kept */
  static #holdUntil = 0;
  /** @type {number|null} Timer that returns the follower to the broadcast view */
  static #holdTimer = null;
  /** @type {boolean} Whether the canvas pointer listeners are in place */
  static #pointerBound = false;

  /**
   * Reads the settings, listens on the socket and registers the hooks
   * @static
   */
  static init() {
    const SETTINGS = getSettings();
    BroadcastView.mode = SettingsUtil.get(SETTINGS.broadcastViewMode.tag) || "toggle";
    BroadcastView.includeZoom = SettingsUtil.get(SETTINGS.broadcastViewZoom.tag) !== false;
    BroadcastView.follow = SettingsUtil.get(SETTINGS.followBroadcastView.tag) !== false;
    game.socket?.on(SOCKET_NAME, BroadcastView.#onSocketMessage);
    Hooks.on(HOOKS_CORE.RENDER_SCENE_CONTROLS, BroadcastView.#onRenderSceneControls);
    Hooks.on(HOOKS_CORE.CANVAS_PAN, BroadcastView.#onCanvasPan);
    Hooks.on(HOOKS_CORE.CANVAS_READY, BroadcastView.#onCanvasReady);
    Hooks.on("closeControlsConfig", BroadcastView.#onCloseControlsConfig);
    LogUtil.log("BroadcastView - init", [BroadcastView.enabled, BroadcastView.follow]);
  }

  /**
   * Applies a changed setting
   * @static
   * @param {string} tag
   * @param {any} value
   */
  static applySetting(tag, value) {
    const SETTINGS = getSettings();
    switch (tag) {
      case SETTINGS.broadcastViewMode.tag:
        BroadcastView.mode = value || "toggle";
        if (!BroadcastView.enabled) BroadcastView.setActive(false);
        ui.controls?.render({ reset: true });
        break;
      case SETTINGS.broadcastViewZoom.tag:
        BroadcastView.includeZoom = value !== false;
        break;
      case SETTINGS.followBroadcastView.tag:
        BroadcastView.follow = value !== false;
        if (!BroadcastView.follow) BroadcastView.#clearHold();
        break;
      default:
        break;
    }
  }

  /**
   * Whether the feature is on in the world
   * @static
   * @returns {boolean}
   */
  static get enabled() {
    return BroadcastView.mode !== "off";
  }

  /**
   * Whether the toggle is shown on the token controls
   * @static
   * @returns {boolean}
   */
  static get showToggle() {
    return BroadcastView.mode === "toggle";
  }

  /**
   * Whether this user may broadcast
   * @static
   * @returns {boolean}
   */
  static get canBroadcast() {
    return BroadcastView.enabled && game.user?.isGM === true;
  }

  /**
   * Switches broadcasting on or off, from the keybinding
   * @static
   */
  static toggle() {
    if (!BroadcastView.canBroadcast) return;
    BroadcastView.setActive(!BroadcastView.active);
  }

  /**
   * Starts or stops broadcasting, keeping the scene controls button in step. Starting sends the
   * current view and repeats it every few seconds, so followers know the broadcast is still on
   * while the GM holds still; stopping tells them it is over.
   * @static
   * @param {boolean} active
   */
  static setActive(active) {
    active = Boolean(active) && BroadcastView.canBroadcast;
    if (active === BroadcastView.active) return;
    BroadcastView.active = active;
    BroadcastView.#sceneId = active ? (canvas?.scene?.id ?? null) : null;
    document.body.classList.toggle(BODY_CLASS, active);
    BroadcastView.#toggleFrame(active);

    BroadcastView.#syncButton();

    if (active) {
      BroadcastView.#showFirstHint();
      BroadcastView.#send(BroadcastView.#currentView());
      BroadcastView.#heartbeat = window.setInterval(() => BroadcastView.#send(BroadcastView.#currentView()), HEARTBEAT_INTERVAL);
    } else {
      BroadcastView.#clearPending();
      if (BroadcastView.#heartbeat !== null) window.clearInterval(BroadcastView.#heartbeat);
      BroadcastView.#heartbeat = null;
      game.socket?.emit(SOCKET_NAME, { type: "stop", userId: game.user.id });
    }
    LogUtil.log("BroadcastView.setActive", [active]);
  }

  /**
   * Tells the GM what broadcasting does the first time they turn it on. A client setting
   * remembers that the notice was shown, so it appears once per client.
   */
  static #showFirstHint() {
    const SETTINGS = getSettings();
    if (SettingsUtil.get(SETTINGS.broadcastViewHintShown.tag) === true) return;
    ui.notifications?.info(game.i18n.localize("CRLNGN_UI.ui.broadcastView.firstHint"));
    game.settings.set(MODULE_ID, SETTINGS.broadcastViewHintShown.tag, true);
  }

  /**
   * Adds or removes the outline around the screen that reminds the GM a broadcast is on
   * @param {boolean} shown
   */
  static #toggleFrame(shown) {
    let frame = document.getElementById(FRAME_ID);
    if (shown && !frame) {
      frame = document.createElement("div");
      frame.id = FRAME_ID;
      frame.setAttribute("aria-hidden", "true");
      frame.inert = true;
      document.body.appendChild(frame);
    } else if (!shown && frame) {
      frame.remove();
    }
  }

  /**
   * The view as the canvas tracks it
   * @static
   * @returns {{x: number, y: number, scale: number}|null}
   */
  static #currentView() {
    if (!canvas?.ready) return null;
    const { x, y } = canvas.stage.pivot;
    return { x, y, scale: canvas.stage.scale.x };
  }

  /**
   * Adds the broadcast button to the primary column of the scene controls, after the layer
   * buttons, unless the GM chose to work from the keybinding alone. Core rebuilds that column on
   * every render, so the button is added again each time and its label kept current.
   * @param {object} app - The scene controls application
   * @param {HTMLElement} html - The rendered element
   */
  static #onRenderSceneControls = (app, html) => {
    const root = html instanceof HTMLElement ? html : document;
    const menu = root.querySelector("#scene-controls-layers") ?? document.querySelector("#scene-controls-layers");
    if (!menu) return;
    let button = menu.querySelector(`.${BUTTON_CLASS}`);
    if (!BroadcastView.canBroadcast || !BroadcastView.showToggle) {
      button?.closest("li")?.remove();
      return;
    }
    if (!button) {
      const item = document.createElement("li");
      button = document.createElement("button");
      button.type = "button";
      button.className = `control ui-control layer icon toggle fa-solid fa-screencast ${BUTTON_CLASS}`;
      button.setAttribute("data-tooltip", "");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        BroadcastView.toggle();
      });
      item.appendChild(button);
      menu.appendChild(item);
    }
    button.setAttribute("aria-label", BroadcastView.#toolTitle());
    button.setAttribute("aria-pressed", String(BroadcastView.active));
  };

  /**
   * Reflects the broadcast state on the button
   */
  static #syncButton() {
    document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(button => button.setAttribute("aria-pressed", String(BroadcastView.active)));
  }

  /**
   * Title of the toggle, naming the key currently bound to the broadcast action
   * @returns {string}
   */
  static #toolTitle() {
    const title = game.i18n.localize("CRLNGN_UI.ui.broadcastView.toolTitle");
    const key = BroadcastView.#bindingLabel();
    return key ? `${title} (${key})` : title;
  }

  /**
   * Human-readable form of the first key bound to the broadcast action, if any
   * @returns {string}
   */
  static #bindingLabel() {
    try {
      const binding = game.keybindings.get(MODULE_ID, "broadcastView")?.[0];
      if (!binding) return "";
      const humanize = foundry.applications?.sidebar?.apps?.ControlsConfig?.humanizeBinding;
      if (typeof humanize === "function") return humanize(binding);
      return foundry.helpers.interaction.KeyboardManager.getKeycodeDisplayString(binding.key);
    } catch (error) {
      return "";
    }
  }

  /**
   * Rebuilds the controls after the keybindings were edited, so the toggle names the new key
   */
  static #onCloseControlsConfig = () => {
    ui.controls?.render({ reset: true });
  };

  /**
   * Queues the new view while broadcasting. On a follower, a pan this class did not make is the
   * follower moving their own view, which is then kept for a while.
   * @param {Canvas} canvasObj
   * @param {{x: number, y: number, scale: number}} position
   */
  static #onCanvasPan = (canvasObj, position) => {
    if (BroadcastView.active) {
      if (position) BroadcastView.#queue({ x: position.x, y: position.y, scale: position.scale });
      return;
    }
    if (!BroadcastView.#applying && BroadcastView.#isLive()) BroadcastView.#holdUserView();
  };

  /**
   * Ends the broadcast when the GM views another scene, and listens for the follower's drags
   * once the canvas exists
   */
  static #onCanvasReady = () => {
    if (BroadcastView.active && canvas?.scene?.id !== BroadcastView.#sceneId) BroadcastView.setActive(false);
    BroadcastView.#bindPointer();
  };

  /**
   * Tracks right and middle button drags and touch drags on the canvas, so a follower's view is
   * kept for as long as they hold the map, however slowly they move it
   */
  static #bindPointer() {
    const board = canvas?.app?.view;
    if (BroadcastView.#pointerBound || !board) return;
    BroadcastView.#pointerBound = true;
    board.addEventListener("pointerdown", (event) => {
      if (event.button === 1 || event.button === 2 || event.pointerType === "touch") {
        BroadcastView.#dragging = true;
        if (BroadcastView.#isLive()) BroadcastView.#holdUserView();
      }
    });
    const release = () => {
      if (!BroadcastView.#dragging) return;
      BroadcastView.#dragging = false;
      if (BroadcastView.#isLive()) BroadcastView.#holdUserView();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  /**
   * Keeps the latest view and sends it once the send interval has passed, so a drag produces
   * a steady stream ending with its final position
   * @param {{x: number, y: number, scale: number}} view
   */
  static #queue(view) {
    BroadcastView.#pending = view;
    if (BroadcastView.#timer !== null) return;
    const wait = Math.max(0, SEND_INTERVAL - (Date.now() - BroadcastView.#lastSent));
    BroadcastView.#timer = window.setTimeout(() => {
      BroadcastView.#timer = null;
      const next = BroadcastView.#pending;
      BroadcastView.#pending = null;
      BroadcastView.#send(next);
    }, wait);
  }

  /**
   * Drops a queued send
   */
  static #clearPending() {
    if (BroadcastView.#timer !== null) window.clearTimeout(BroadcastView.#timer);
    BroadcastView.#timer = null;
    BroadcastView.#pending = null;
  }

  /**
   * Sends a view to the other clients, with the height of the viewport in map units so that a
   * follower can show the same stretch of map whatever the size of their window
   * @param {{x: number, y: number, scale: number}|null} view
   */
  static #send(view) {
    if (!view || !BroadcastView.active || !canvas?.scene) return;
    BroadcastView.#lastSent = Date.now();
    const screenHeight = BroadcastView.#screenHeight();
    game.socket.emit(SOCKET_NAME, {
      type: "view",
      userId: game.user.id,
      sceneId: canvas.scene.id,
      x: view.x,
      y: view.y,
      scale: view.scale,
      height: screenHeight && view.scale ? screenHeight / view.scale : null
    });
  }

  /**
   * Height of the canvas viewport in screen pixels
   * @returns {number}
   */
  static #screenHeight() {
    return canvas?.app?.renderer?.screen?.height || window.innerHeight || 0;
  }

  /**
   * Handles a broadcast message. Only a GM's broadcast is followed, a broadcasting GM ignores
   * other broadcasts, and a client that opted out leaves its view alone. A view is remembered
   * and applied at once unless the follower is holding their own view, in which case it is
   * applied when the hold ends. A stop message forgets the broadcast.
   * @param {object} data
   */
  static #onSocketMessage = (data) => {
    if (!data || data.userId === game.user.id || !game.users.get(data.userId)?.isGM) return;
    if (data.type === "stop") {
      BroadcastView.#received = null;
      BroadcastView.#clearHold();
      return;
    }
    if (data.type !== "view") return;
    if (!BroadcastView.enabled || !BroadcastView.follow || BroadcastView.active) return;
    BroadcastView.#received = { x: data.x, y: data.y, scale: data.scale, height: data.height, sceneId: data.sceneId };
    BroadcastView.#receivedAt = Date.now();
    if (BroadcastView.#dragging || Date.now() < BroadcastView.#holdUntil) return;
    BroadcastView.#applyReceived(SEND_INTERVAL * 2);
  };

  /**
   * Whether a broadcast for the viewed scene arrived recently enough to still be on
   * @returns {boolean}
   */
  static #isLive() {
    const received = BroadcastView.#received;
    if (!received || !BroadcastView.follow || BroadcastView.active) return false;
    if (!canvas?.ready || canvas.scene?.id !== received.sceneId) return false;
    return Date.now() - BroadcastView.#receivedAt < LIVE_TIMEOUT;
  }

  /**
   * Pans to the latest received view, when it is for the viewed scene. With zoom included, the
   * scale is the one that fits the broadcast map height into this viewport, so the follower sees
   * the same stretch of map top to bottom; the GM's own scale is the fallback.
   * @param {number} duration - Duration of the pan, in milliseconds
   */
  static #applyReceived(duration) {
    const received = BroadcastView.#received;
    if (!received || !canvas?.ready || canvas.scene?.id !== received.sceneId) return;
    const target = { x: received.x, y: received.y, duration };
    if (BroadcastView.includeZoom) {
      const screenHeight = BroadcastView.#screenHeight();
      if (received.height > 0 && screenHeight > 0) target.scale = screenHeight / received.height;
      else if (Number.isFinite(received.scale)) target.scale = received.scale;
    }
    BroadcastView.#applyView(target);
  }

  /**
   * Pans the canvas while marking the pan as this class's own, so the pan hook does not take it
   * for the follower moving their view. A later pan replaces an earlier one, whose end must not
   * clear the mark while the later one is still running.
   * @param {object} target - Arguments for the canvas pan animation
   */
  static async #applyView(target) {
    const id = ++BroadcastView.#applyId;
    BroadcastView.#applying = true;
    try {
      await canvas.animatePan(target);
    } catch (error) {
      LogUtil.log("BroadcastView.#applyView", [error]);
    } finally {
      if (id === BroadcastView.#applyId) BroadcastView.#applying = false;
    }
  }

  /**
   * Keeps the follower's own view and schedules the return to the broadcast view for shortly
   * after they last moved. The return waits while a drag is still going.
   */
  static #holdUserView() {
    BroadcastView.#holdUntil = Date.now() + USER_HOLD;
    if (BroadcastView.#holdTimer !== null) window.clearTimeout(BroadcastView.#holdTimer);
    BroadcastView.#holdTimer = window.setTimeout(BroadcastView.#endHold, USER_HOLD);
  }

  /**
   * Returns the follower to the broadcast view once the hold is over, if it is still on
   */
  static #endHold = () => {
    BroadcastView.#holdTimer = null;
    if (BroadcastView.#dragging) {
      BroadcastView.#holdUserView();
      return;
    }
    if (Date.now() < BroadcastView.#holdUntil) {
      BroadcastView.#holdTimer = window.setTimeout(BroadcastView.#endHold, BroadcastView.#holdUntil - Date.now());
      return;
    }
    if (BroadcastView.#isLive()) BroadcastView.#applyReceived(RETURN_DURATION);
  };

  /**
   * Drops a pending return to the broadcast view
   */
  static #clearHold() {
    if (BroadcastView.#holdTimer !== null) window.clearTimeout(BroadcastView.#holdTimer);
    BroadcastView.#holdTimer = null;
    BroadcastView.#holdUntil = 0;
  }
}
