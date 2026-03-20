import { getSettings } from "../constants/Settings.mjs";
import { HOOKS_CORE, HOOKS_CRLNGN } from "../constants/Hooks.mjs";
import { GeneralUtil } from "./GeneralUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { PlayersList } from "./PlayersListUtil.mjs";

/**
 * Utility class for handling compatibility with other Foundry VTT modules
 * Manages interactions and adjustments needed for module interoperability
 */
export class ModuleCompatUtil {
  /**
   * @private
   * Timeout handle for debouncing players list checks
   */
  static #checkPlayersTimeout;
  static #ytPlayerInterval;
  static #ytPlayerIntervalCount = 0;
  // static ytWigdetFadeOut = true;
  /**
   * Initializes module compatibility features
   * Sets up hooks for players list and taskbar integration
   */
  static init(){
    // taskbar
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    if(isTaskbarOn){
      Hooks.on(HOOKS_CORE.UPDATE_USER, ModuleCompatUtil.checkTaskbarLock);
    }
    ModuleCompatUtil.checkTaskbarLock();

    // Add module classes - at READY hook, game.modules should be populated
    // Also start retry interval in case some modules aren't fully loaded yet
    ModuleCompatUtil.addModuleClasses();
    ModuleCompatUtil.startModuleClassesRetry();

    const isMinimalUiOn = GeneralUtil.isModuleOn('minimal-ui');
    if(isMinimalUiOn){
      ui.notifications.warn(game.i18n.localize('CRLNGN_UI.ui.notifications.minimalUiNotSupported'),{ permanent: true });
    }

    Hooks.on(HOOKS_CORE.CLIENT_SETTING_CHANGED, (settings)=>{
      if(settings.includes('fvtt-youtube-player.windowPosition')) ModuleCompatUtil.handleYTPlayerFadeOut();
    });

    ModuleCompatUtil.#ytPlayerIntervalCount = 0;
    ModuleCompatUtil.#ytPlayerInterval = setInterval(() => {
      if(document.querySelector('#sidebar-video-player') || ModuleCompatUtil.#ytPlayerIntervalCount >= 10){
        clearInterval(ModuleCompatUtil.#ytPlayerInterval);
        ModuleCompatUtil.handleYTPlayerFadeOut();
      }
      ModuleCompatUtil.#ytPlayerIntervalCount++;
    }, 200);

    // check Chat Pins module
    const isChatPinsOn = GeneralUtil.isModuleOn('dfreds-chat-pins');
    if(isChatPinsOn){
      const chatPinsPopout = document.querySelector('#chat-pins');
      const uiConfig = game.settings.get('core', 'uiConfig');
      const currentTheme = uiConfig?.colorScheme?.interface;

      LogUtil.log("currentTheme", [currentTheme, chatPinsPopout]);
      chatPinsPopout?.classList.add(`theme-${currentTheme}`);
    }
  }

  static handleYTPlayerFadeOut(){
    const isYTPlayerOn = GeneralUtil.isModuleOn('fvtt-youtube-player');
    const ytPlayer = document.querySelector('#sidebar-video-player.tyw-docked');
    
    
    LogUtil.log("handleYTPlayerFadeOut", [isYTPlayerOn, PlayersList.useFadeOut, ytPlayer]);
    if(isYTPlayerOn && ytPlayer && PlayersList.useFadeOut){
      document.querySelector('#sidebar-video-player.tyw-docked')?.classList.add('faded-ui');
    }else if(isYTPlayerOn){
      document.querySelector('#sidebar-video-player')?.classList.remove('faded-ui');
    }
  }

  static #addModuleClassesAttempts = 0;
  static #addModuleClassesInterval = null;

  static #moduleClassesApplied = false;

  static addModuleClasses = () => {
    const SETTINGS = getSettings();
    let moduleList = SettingsUtil.get(SETTINGS.otherModulesList.tag) || [];
    LogUtil.log("addModuleClasses", [moduleList]);

    // If moduleList is not an array, try to convert it
    if (!Array.isArray(moduleList)) {
      LogUtil.warn('otherModulesList is not an array, attempting to convert', [moduleList]);

      if (typeof moduleList === 'string' && moduleList.length > 0) {
        // Old string format: "'module-a','module-b'" - convert to array
        const enabledModules = moduleList
          .split(',')
          .map(item => item.replace(/['''"]/g, "").trim())
          .filter(id => id.length > 0);

        moduleList = Object.values(SETTINGS.otherModulesList.options).map(moduleId => {
          const cleanId = moduleId.replace(/['''"]/g, "").trim();
          return { id: cleanId, enabled: enabledModules.includes(cleanId) };
        });
        LogUtil.log('Converted string to array format', [moduleList]);
      } else {
        // Fallback to defaults if conversion not possible
        moduleList = SETTINGS.otherModulesList.default || [];
      }
    }

    // Remove all module classes only on first call (fresh apply or settings change)
    if (!ModuleCompatUtil.#moduleClassesApplied) {
      Object.values(SETTINGS.otherModulesList.options).forEach(opt => {
        const moduleId = opt.replace(/['''"]/g, "").trim();
        document.body.classList.remove('crlngn-' + moduleId);
      });
    }

    // Then add classes for enabled modules that are installed
    let allResolved = true;
    moduleList.forEach(item => {
      if (item.enabled && item.id) {
        const cleanId = item.id.trim();
        const className = 'crlngn-' + cleanId;

        if (document.body.classList.contains(className)) return;

        const moduleData = game.modules.get(cleanId);
        const isModuleInstalled = !!moduleData;

        if (isModuleInstalled) {
          document.body.classList.add(className);
          LogUtil.log(`Added class for installed module: ${className}`);
        } else {
          allResolved = false;
        }
      }
    });

    ModuleCompatUtil.#moduleClassesApplied = true;

    if (allResolved && ModuleCompatUtil.#addModuleClassesInterval) {
      clearInterval(ModuleCompatUtil.#addModuleClassesInterval);
      ModuleCompatUtil.#addModuleClassesInterval = null;
    }

    // Emit hook so other components know module classes are ready
    Hooks.callAll(HOOKS_CRLNGN.MODULE_CLASSES_READY);
  }

  /**
   * Starts a retry interval to ensure module classes are added
   * Will retry every 5 seconds for up to 3 attempts
   * @static
   */
  static startModuleClassesRetry = () => {
    ModuleCompatUtil.#addModuleClassesAttempts = 0;

    // Clear any existing interval
    if (ModuleCompatUtil.#addModuleClassesInterval) {
      clearInterval(ModuleCompatUtil.#addModuleClassesInterval);
    }

    ModuleCompatUtil.#addModuleClassesInterval = setInterval(() => {
      ModuleCompatUtil.#addModuleClassesAttempts++;

      ModuleCompatUtil.addModuleClasses();

      if (ModuleCompatUtil.#addModuleClassesAttempts >= 1) {
        clearInterval(ModuleCompatUtil.#addModuleClassesInterval);
        ModuleCompatUtil.#addModuleClassesInterval = null;
        LogUtil.log("addModuleClasses retry complete");
      }
    }, 5000);
  }

  /**
   * Checks and applies taskbar lock settings
   * Adjusts UI variables based on taskbar module state and settings
   */
  static checkTaskbarLock = () => {
    const isTaskbarOn = GeneralUtil.isModuleOn('foundry-taskbar');
    
    /** @type {{taskbarSettings?: {locked?: boolean, reduceSidebar?: boolean}} | undefined} */
    const taskbarFlag = game.user.flags?.['foundry-taskbar'];

    if(!isTaskbarOn || !taskbarFlag?.taskbarSettings){
      return;
    }

    const taskbarReduceSidebar = game.settings.get('foundry-taskbar','reduceSidebar');
    LogUtil.log("checkTaskbarLock #2",[taskbarFlag, taskbarReduceSidebar]);

    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-margin-bottom', taskbarReduceSidebar ? '50px' : '0px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-margin-bottom', taskbarReduceSidebar ? '10px' : '0px');
    }

    if(taskbarFlag.taskbarSettings?.locked){
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '50px');
    }else{
      GeneralUtil.addCSSVars('--crlngn-taskbar-height', '10px');
    }

    GeneralUtil.addCustomCSS(`body.crlngn-ui #ui-right {height: calc((100% - var(--crlngn-margin-bottom)) / var(--ui-scale));}`);

    const ftMoveStyle = document.querySelector("#ft-move-players-macro");
    if(ftMoveStyle){ftMoveStyle.innerHTML = '';}
  }
}