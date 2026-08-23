import { getSettings } from "../../constants/Settings.mjs";
import { LogUtil } from "../LogUtil.mjs";
import { SettingsUtil } from "../SettingsUtil.mjs";
import { SettingsThemes } from "../SettingsThemes.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Custom CSS editor with separate world and per-player stylesheets.
 * World styles apply to everyone; player styles apply only to non-GM users,
 * either to all of them or to one specific user.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CustomCssSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  // Key used in the player styles map for styles shared by every player
  static ALL_PLAYERS = "all";

  /**
   * Default application options
   * @static
   */
  static DEFAULT_OPTIONS = {
    id: "crlngn-ui-custom-css-editor",
    tag: "form",
    window: {
      icon: "fas fa-file-code",
      title: "CRLNGN_UI.settings.customCssMenu.title",
      contentClasses: ["standard-form", "crlngn", "tabbed-settings", "crlngn-custom-css"],
      resizable: true
    },
    position: {
      width: 820,
      height: "auto"
    },
    form: {
      handler: CustomCssSettings.#onSubmit,
      closeOnSubmit: true
    }
  }

  /**
   * Template parts used for rendering the application
   * @static
   */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    world: {
      template: "modules/crlngn-ui/templates/custom-css-world.hbs"
    },
    player: {
      template: "modules/crlngn-ui/templates/custom-css-player.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /**
   * Tab configuration
   * @static
   */
  static TABS = {
    primary: {
      initial: "world",
      tabs: [
        { id: "world", icon: "", group: "primary-tabs", label: "CRLNGN_UI.settings.customCssMenu.tabs.world" },
        { id: "player", icon: "", group: "primary-tabs", label: "CRLNGN_UI.settings.customCssMenu.tabs.users" }
      ],
      labelPrefix: ""
    }
  };

  // Working copy of the world styles, seeded once from the stored setting
  #worldStyles = "";

  // Working copy of the player styles map, so edits survive switching targets
  #playerStyles = {};

  // Id of the player styles entry currently loaded in the editor
  #currentTarget = CustomCssSettings.ALL_PLAYERS;

  // Whether the working copy has been seeded from the stored setting
  #loaded = false;

  /**
   * Read the stored player styles map, tolerating a missing or malformed value
   * @static
   * @returns {Record<string, string>} Map of target id to CSS
   */
  static getPlayerStyles() {
    const SETTINGS = getSettings();
    const stored = SettingsUtil.get(SETTINGS.playerCustomStyles.tag);
    return foundry.utils.getType(stored) === "Object" ? foundry.utils.deepClone(stored) : {};
  }

  /**
   * Every user that can be targeted individually, Game Masters included
   * The shared "All Players" bucket still never reaches a Game Master
   * @static
   * @returns {User[]} The targetable users
   */
  static getTargetUsers() {
    return Array.from(game.users ?? []);
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const SETTINGS = getSettings();

    if (!this.#loaded) {
      this.#worldStyles = SettingsUtil.get(SETTINGS.customStyles.tag) || "";
      this.#playerStyles = CustomCssSettings.getPlayerStyles();
      this.#loaded = true;
    }

    context.activeTab = options.activeTab || Object.keys(context.tabs)[0];
    context.worldHint = game.i18n.localize("CRLNGN_UI.settings.customCssMenu.fields.worldStyles.hint");
    context.playerHint = game.i18n.localize("CRLNGN_UI.settings.customCssMenu.fields.playerStyles.hint");
    context.targetLabel = game.i18n.localize("CRLNGN_UI.settings.customCssMenu.fields.target.label");
    context.targets = this.#getTargets();

    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) partContext.tab = partContext.tabs[partId];

    if (partId === "footer") {
      partContext.buttons = [
        { type: "submit", icon: "", label: "CRLNGN_UI.settings.customCssMenu.save" }
      ];
    }

    return partContext;
  }

  /**
   * Build the target dropdown entries, flagging which ones already hold styles
   * @private
   * @returns {object[]} Target descriptors for the template
   */
  #getTargets() {
    const targets = [{
      id: CustomCssSettings.ALL_PLAYERS,
      name: game.i18n.localize("CRLNGN_UI.settings.customCssMenu.fields.target.allPlayers"),
      selected: this.#currentTarget === CustomCssSettings.ALL_PLAYERS,
      hasStyles: !!this.#playerStyles[CustomCssSettings.ALL_PLAYERS]?.trim()
    }];

    const gmLabel = game.i18n.localize("USER.RoleGamemaster");
    for (const user of CustomCssSettings.getTargetUsers()) {
      targets.push({
        id: user.id,
        name: user.isGM ? `${user.name} (${gmLabel})` : user.name,
        selected: this.#currentTarget === user.id,
        hasStyles: !!this.#playerStyles[user.id]?.trim()
      });
    }

    return targets;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    const worldEditor = this.element.querySelector('code-mirror[name="worldStyles"]');
    const playerEditor = this.element.querySelector('code-mirror[name="playerStyles"]');

    if (worldEditor) worldEditor.value = this.#worldStyles;
    if (playerEditor) playerEditor.value = this.#playerStyles[this.#currentTarget] || "";

    const selector = this.element.querySelector(".crlngn-css-target");
    selector?.addEventListener("change", this.#onTargetChange.bind(this));
  }

  /**
   * Swap the editor contents when a different target is picked,
   * keeping unsaved edits for the target being left behind
   * @private
   * @param {Event} event - The change event
   */
  #onTargetChange(event) {
    const editor = this.element.querySelector('code-mirror[name="playerStyles"]');
    if (!editor) return;

    this.#playerStyles[this.#currentTarget] = editor.value ?? "";
    this.#currentTarget = event.target.value;
    editor.value = this.#playerStyles[this.#currentTarget] || "";

    LogUtil.log("CustomCssSettings | Switched target", [this.#currentTarget]);
  }

  /**
   * Collect the editor contents and persist both settings
   * @private
   * @static
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {object} formData - The submitted form data
   */
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    event.stopPropagation();

    const SETTINGS = getSettings();
    const worldEditor = form.querySelector('code-mirror[name="worldStyles"]');
    const playerEditor = form.querySelector('code-mirror[name="playerStyles"]');

    this.#worldStyles = worldEditor?.value ?? "";
    this.#playerStyles[this.#currentTarget] = playerEditor?.value ?? "";

    const playerStyles = {};
    for (const [target, css] of Object.entries(this.#playerStyles)) {
      if (css?.trim()) playerStyles[target] = css;
    }

    await SettingsUtil.set(SETTINGS.customStyles.tag, this.#worldStyles);
    await SettingsUtil.set(SETTINGS.playerCustomStyles.tag, playerStyles);

    SettingsThemes.applyCustomCSS();
    SettingsThemes.applyPlayerCustomCSS();

    ui.notifications.info(game.i18n.localize("CRLNGN_UI.ui.notifications.settingsUpdated"));
    LogUtil.log("CustomCssSettings | Saved", [playerStyles]);
  }
}
