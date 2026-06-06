import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { TopNavigation } from "./TopNavUtil.mjs";
import { CombatTrackerManager } from "./combat-tracker/CombatTrackerManager.mjs";
import { ChatUtil } from "./ChatUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { LeftControls } from "./LeftControlsUtil.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { ModuleCompatUtil } from "./ModuleCompatUtil.mjs";
import { SceneNavFolders } from "./SceneFoldersUtil.mjs";
import { UpdateNewsUtil } from "./UpdateNewsUtil.mjs";
import { CustomHandlebarsHelpers } from "./CustomHandlebarsHelpers.mjs";
import { CameraDockUtil } from "./CameraDockUtil.mjs";
import { SidebarTabs } from "./SidebarUtil.mjs";
import { MacroHotbar } from "./MacroHotbarUtil.mjs";
import { ChatLogControls } from "./ChatLogControlsUtil.mjs";
import { TokenWheel } from "./TokenWheelUtil.mjs";
import { SheetsUtil } from "./SheetsUtil.mjs";
import { HintTooltipUtil } from "./HintTooltipUtil.mjs";
import { BottomDockUtil } from "./BottomDockUtil.mjs";
import { JournalUtil } from "./JournalUtil.mjs";
import { JournalPageUtil } from "./JournalPageUtil.mjs";

/**
 * Main class handling core module initialization and setup
 * Manages module lifecycle, hooks, and core functionality
 */
export class Main {
  static isIncompatible = false;
  /**
   * Initialize the module and set up core hooks
   * @static
   */
  static init(){
    Hooks.once(HOOKS_CORE.INIT, () => { 
      document.querySelector("body").classList.add(MODULE_ID); 
      document.querySelector("#ui-middle")?.classList.add(MODULE_ID);

      // Add notification if Foundry version is incompatible
      const foundryVersion = game.data.version;
      const minVersion = "13.339";
      if(foundryVersion < minVersion){
        Main.isIncompatible = true;
        return;
      }

      LogUtil.log("Initiating module...", [game.system.title]); 
      window.crlngnUI = window.crlngnUI || {};

      SettingsUtil.registerSettings();
      const SETTINGS = getSettings();
      const uiDisabled = SettingsUtil.get(SETTINGS.disableUI.tag);
      LogUtil.log(HOOKS_CORE.INIT,[uiDisabled]);

      if(uiDisabled){
        document.querySelector("body").classList.remove(MODULE_ID); 
        document.querySelector("#ui-middle")?.classList.remove(MODULE_ID);

        return;
      }

      // Check if we're in stream mode
      const isStreamMode = document.body.classList.contains('stream');

      // Always initialize these essential utilities
      ChatUtil.init();
      LogUtil.init?.();
      CameraDockUtil.init();
      BottomDockUtil.init();

      // Only initialize UI components if not in stream mode
      if(isStreamMode){
        LogUtil.log("Stream mode detected - skipping UI component initialization");
        return;
      }

      // Initialize remaining UI components for non-stream mode
      ChatLogControls.init();
      PlayersList.init();
      TopNavigation.init();
      LeftControls.init();
      SidebarTabs.init();
      MacroHotbar.init();
      // TokenWheel.init();

      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, Main.#onRenderChatMessage); 
    });

    // Scene loading state hooks - add/remove class for CSS targeting
    Hooks.on(HOOKS_CORE.CANVAS_INIT, () => {
      document.body.classList.add('scene-loading');
    });
    Hooks.on(HOOKS_CORE.CANVAS_READY, () => {
      // Delay removal to allow progress notification to be removed first
      setTimeout(() => {
        document.body.classList.remove('scene-loading');
      }, 500);
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      LogUtil.log("Core Ready", [game]);
      if(Main.isIncompatible){
        ui.notifications.error(game.i18n.localize("CRLNGN_UI.notifications.incompatibleVersion"), {permanent: true});
        return;
      }

      document.body.classList.toggle("crlngn-is-gm", !!game.user?.isGM);

      const SETTINGS = getSettings();
      const uiDisabled = SettingsUtil.get(SETTINGS.disableUI.tag);
      if(uiDisabled) return;

      // Check if we're in stream mode
      const isStreamMode = document.body.classList.contains('stream');

      var isDebugOn = SettingsUtil.get(SETTINGS.debugMode.tag);
      if(isDebugOn){CONFIG.debug.hooks = true};

      // Always apply chat styles if enabled
      const chatStylesEnabled = SettingsUtil.get(SETTINGS.enableChatStyles.tag);
      if(chatStylesEnabled){
        Main.addCSSLocalization();
      }

      // Exit early if in stream mode - skip UI component setup
      if(isStreamMode){
        LogUtil.log("Stream mode - skipping READY hook UI initialization");
        return;
      }

      // Non-stream mode initialization
      CustomHandlebarsHelpers.init();
      TopNavigation.checkSideBar(ui.sidebar?.expanded || false);

      // Scrub any recursive appliedSoftDefaults contamination before enforcing,
      // so corrupt data from the pre-fix bulk-lock bug doesn't propagate further.
      SettingsUtil.cleanupAppliedSoftDefaults();

      // Enforce GM settings and refresh components if needed
      const settingsChanged = SettingsUtil.enforceGMSettings();
      if (settingsChanged) {
        TopNavigation.refreshSettings();
      }

      PlayersList.applyPlayersListSettings();
      // TopNavigation.checkSceneNavCompat();

      // Migrate otherModulesList setting to new array format if needed
      SettingsUtil.migrateOtherModulesList();

      ModuleCompatUtil.init();
      UpdateNewsUtil.init();
      SheetsUtil.init();
      JournalUtil.init();
      JournalPageUtil.init();
      HintTooltipUtil.init();
      BottomDockUtil.setup();
      SidebarTabs.onReady();

      SettingsUtil.resetFoundryThemeSettings();

      // Scene nav specific ready actions
      TopNavigation.handleSceneFadeOut();
      if(GeneralUtil.isModuleOn("forien-quest-log")){
        Hooks.on("questTrackerBoundaries", (boundaries) => boundaries.top = 42);
      }

      setTimeout(()=>{
        CombatTrackerManager.checkForActiveCombat();
      }, 500);

      // Show carousel welcome dialog for GM on first load
      Main.#showCarouselWelcomeDialog();

      // Check for Force Client Settings conflict and warn user
      // Only warns if settings are enforced by BOTH modules AND have requiresReload: true
      if (SettingsUtil.hasForceClientSettingsConflict()) {
        ui.notifications.warn(
          game.i18n.localize('CRLNGN_UI.ui.notifications.enforceGMSettingsConflict')
        );
      }

    });
  }

  // Custom labels for DnD5e buttons, added via CSS
  /**
   * Add CSS variables for DnD5e button localization
   * @static
   */
  static addCSSLocalization(){
    const locBtnPath = 'CRLNGN_UI.dnd5e.chatCard.buttons';
    
    GeneralUtil.addCSSVars('--crlngn-i18n-attack', game.i18n.localize(`${locBtnPath}.attack`));
    GeneralUtil.addCSSVars('--crlngn-i18n-damage', game.i18n.localize(`${locBtnPath}.damage`));
    GeneralUtil.addCSSVars('--crlngn-i18n-summons', game.i18n.localize(`${locBtnPath}.summons`));
    GeneralUtil.addCSSVars('--crlngn-i18n-healing', game.i18n.localize(`${locBtnPath}.healing`));
    GeneralUtil.addCSSVars('--crlngn-i18n-template', game.i18n.localize(`${locBtnPath}.template`));
    GeneralUtil.addCSSVars('--crlngn-i18n-consume', game.i18n.localize(`${locBtnPath}.consume`));
    GeneralUtil.addCSSVars('--crlngn-i18n-refund', game.i18n.localize(`${locBtnPath}.refund`));
    GeneralUtil.addCSSVars('--crlngn-i18n-macro', game.i18n.localize(`${locBtnPath}.macro`));
    GeneralUtil.addCSSVars('--crlngn-i18n-save-dc', game.i18n.localize(`${locBtnPath}.savedc`));
    GeneralUtil.addCSSVars('--crlngn-i18n-save', game.i18n.localize(`${locBtnPath}.save`));
  }

  /**
   * Handle chat message rendering
   * @private
   * @static
   * @param {ChatMessage} chatMessage - The chat message being rendered
   * @param {jQuery} html - The HTML element of the chat message
   */
  static #onRenderChatMessage = (chatMessage, html, c) => {
    LogUtil.log(HOOKS_CORE.RENDER_CHAT_MESSAGE,[chatMessage, html, c]);

    ChatUtil.enrichCard(chatMessage, html);
  }

  /**
   * Show carousel welcome dialog for GM on first load
   * Only shows once per world, saves answer to world flag
   */
  static #showCarouselWelcomeDialog = async () => {
    if (!game.user?.isGM) return;

    const SETTINGS = getSettings();
    const hasSeenDialog = SettingsUtil.get(SETTINGS.carouselWelcomeShown.tag) ?? false;

    if (hasSeenDialog) return;

    const isCarouselModuleOn = GeneralUtil.isModuleOn('combat-carousel');
    const i18nPath = 'CRLNGN_UI.ui.carouselWelcome';

    let content = `
      <div style="text-align: center; padding: 0.5rem;">
        <img src="modules/${MODULE_ID}/assets/combat-carousel-cui.webp"
             alt="Combat Carousel Preview"
             style="max-width: 100%; border-radius: 8px; margin-bottom: 1rem;" />
        <p>${game.i18n.localize(`${i18nPath}.message`)}</p>
        ${isCarouselModuleOn ? `<p style="color: var(--color-warm-2); font-weight: bold;">${game.i18n.localize(`${i18nPath}.moduleWarning`)}</p>` : ''}
      </div>
    `;

    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${i18nPath}.title`) },
      content,
      yes: {
        label: game.i18n.localize(`${i18nPath}.yes`),
        icon: "",
        default: true,
        callback: () => true
      },
      no: {
        label: game.i18n.localize(`${i18nPath}.no`),
        icon: "",
        callback: () => false
      },
      rejectClose: false
    });

    if (result === true) {
      await SettingsUtil.set(SETTINGS.carouselWelcomeShown.tag, true);
      await SettingsUtil.set(SETTINGS.enableCombatTrackerCarousel.tag, true);
      ui.notifications.info(game.i18n.localize(`${i18nPath}.enabledNotification`));
    } else if (result === false) {
      await SettingsUtil.set(SETTINGS.carouselWelcomeShown.tag, true);
      await SettingsUtil.set(SETTINGS.enableCombatTrackerCarousel.tag, false);
      ui.notifications.info(game.i18n.localize(`${i18nPath}.disabledNotification`));
    }
  }

}
