import { registerCompactCards, getCompactCardsRegistry, COMPACT_CARDS_HOOKS } from "../../shared/dnd5e-compact-cards/src/index.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { HOOKS_CRLNGN } from "../constants/Hooks.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Host wrapper for the compact activity cards feature (dnd5e 6.0), whose implementation lives in
 * the shared package under `shared/dnd5e-compact-cards` and is also bundled by Flash Token Bar 5e.
 * Registers this module's copy at init; the shared registry activates exactly one copy at setup,
 * preferring the newest package version and this module on ties. When the other module wins, the
 * compact card settings show a hint pointing at it. The compact cards setting is kept in sync
 * with the dnd5e "Summary Chat Cards" client setting: this module's value wins at load, and
 * afterwards whichever of the two the user changed last applies to both.
 */
export class ChatCards5eUtil {
  /** @type {import("../../shared/dnd5e-compact-cards/src/CompactCards5e.mjs").CompactCards5e|null} */
  static instance = null;

  /** Setting keys whose hint points at the other module when it handles the feature */
  static SETTING_KEYS = ["compactActivityCards", "collapseCardTags", "labeledCardButtons", "retroAdvantageButtons"];

  /**
   * Registers this module's copy of the feature. Must run during the init hook, after settings
   * are registered.
   */
  static init(){
    if(game.system?.id !== "dnd5e"){ return; }
    const SETTINGS = getSettings();
    ChatCards5eUtil.instance = registerCompactCards({
      id: MODULE_ID,
      templatesPath: `modules/${MODULE_ID}/templates`,
      i18nPrefix: "CRLNGN_UI.dnd5e.chatCard",
      settings: {
        compactCards: () => SettingsUtil.get(SETTINGS.compactActivityCards.tag) ?? true,
        setCompactCards: (value) => ChatCards5eUtil.setCompactCards(value),
        collapseTags: () => SettingsUtil.get(SETTINGS.collapseCardTags.tag) ?? true,
        labeledButtons: () => SettingsUtil.get(SETTINGS.labeledCardButtons.tag) ?? true,
        retroAdvantage: () => SettingsUtil.get(SETTINGS.retroAdvantageButtons.tag) ?? true
      },
      hooks: {
        renderRoll: HOOKS_CRLNGN.RENDER_COMPACT_ROLL,
        renderCard: HOOKS_CRLNGN.RENDER_COMPACT_CARD
      },
      log: (ref, data) => LogUtil.log(ref, data),
      warn: (ref, data) => LogUtil.warn(ref, data)
    });
    window.crlngnUI = window.crlngnUI || {};
    window.crlngnUI.chatCards = ChatCards5eUtil;
    Hooks.once(COMPACT_CARDS_HOOKS.RESOLVED, ChatCards5eUtil.onResolved);
  }

  /**
   * Whether compact cards are in effect on this client, whichever module runs them
   * @returns {boolean}
   */
  static get isActive(){
    return getCompactCardsRegistry()?.isActive ?? false;
  }

  /**
   * Id of the module running the feature, or null before the registry resolved
   * @returns {string|null}
   */
  static get activeId(){
    return getCompactCardsRegistry()?.activeId ?? null;
  }

  /**
   * Id of the other module handling the feature, or null when this module runs it
   * @returns {string|null}
   */
  static get handledBy(){
    return ChatCards5eUtil.instance?.handledBy ?? null;
  }

  /**
   * Localized hint explaining that another module handles the feature, or an empty string
   * @returns {string}
   */
  static getHandledByHint(){
    const handledBy = ChatCards5eUtil.handledBy;
    if(!handledBy){ return ""; }
    const title = game.modules.get(handledBy)?.title ?? handledBy;
    return game.i18n.format("CRLNGN_UI.dnd5e.chatCard.handledBy", { module: title });
  }

  /**
   * Logs which module was activated when it is not this one
   * @param {string} activeId - Id of the module running the feature
   */
  static onResolved(activeId){
    if(activeId === MODULE_ID){ return; }
    LogUtil.log("ChatCards5eUtil.onResolved - handled by another module", [activeId]);
  }

  /**
   * Writes the compact cards setting when the dnd5e "Summary Chat Cards" setting changed, and
   * updates the checkbox in this module's settings dialog if it is open, since that form does not
   * re-render and would otherwise save its stale value back.
   * @param {boolean} value
   */
  static async setCompactCards(value){
    const SETTINGS = getSettings();
    await SettingsUtil.set(SETTINGS.compactActivityCards.tag, value);
    const inputs = document.querySelectorAll('#crlngn-ui-settings input[type="checkbox"][name="compactActivityCards"]');
    for(const input of inputs){ input.checked = value; }
  }

  /**
   * Applies the compact cards setting
   * @param {boolean} [value]
   */
  static applyCompactCards(value){
    ChatCards5eUtil.instance?.applyCompactCards(value);
  }

  /**
   * Applies the collapse tags setting
   * @param {boolean} [value]
   */
  static applyCollapseTags(value){
    ChatCards5eUtil.instance?.applyCollapseTags(value);
  }

  /**
   * Applies the labeled buttons setting
   * @param {boolean} [value]
   */
  static applyLabeledButtons(value){
    ChatCards5eUtil.instance?.applyLabeledButtons(value);
  }

  /**
   * Applies the retroactive advantage buttons setting
   * @param {boolean} [value]
   */
  static applyRetroAdvantage(value){
    ChatCards5eUtil.instance?.applyRetroAdvantage(value);
  }
}
