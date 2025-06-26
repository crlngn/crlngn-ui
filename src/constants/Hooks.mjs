/**
 * Foundry Core hooks
 * https://foundryvtt.com/api/classes/client.Hooks.html
 * https://foundryvtt.com/api/modules/hookEvents.html
 * */ 
export const HOOKS_CORE = {
  INIT: "init", 
  READY: "ready", 
  CANVAS_READY: "canvasReady",
  CANVAS_INIT: "canvasInit",

  /* Chat Messages */
  RENDER_CHAT_MESSAGE: "renderChatMessageHTML" ,

  /* Left Side Controls */
  GET_SCENE_CONTROLS: "getSceneControlButtons",
  RENDER_SCENE_CONTROLS: "renderSceneControls",
  RENDER_PLAYERS_LIST: "renderPlayers",
  ACTIVATE_SCENE_CONTROLS: "activateSceneControls",

  /* Scenes */
  RENDER_SCENE_NAV: "renderSceneNavigation",
  COLLAPSE_SCENE_NAV: "collapseSceneNavigation",
  EXPAND_SCENE_NAV: "expandSceneNavigation",
  GET_SCENE_NAV_CONTEXT: "getSceneNavigationContext",
  RENDER_SCENE: "renderScene",

  /* Document Directory */
  RENDER_DOCUMENT_DIRECTORY: "renderDocumentDirectory",
  GET_SCENE_DIRECTORY_ENTRY_CONTEXT: "getSceneDirectoryEntryContext",
  RENDER_SCENE_DIRECTORY: "renderSceneDirectory",

  /* Folders */
  CREATE_FOLDER: "createFolder",
  UPDATE_FOLDER: "updateFolder",
  DELETE_FOLDER: "deleteFolder",

  /* Scene Document */
  CREATE_SCENE: "createScene",
  UPDATE_SCENE: "updateScene",
  DELETE_SCENE: "deleteScene",

  /* Right Side Panel */
  COLLAPSE_SIDE_BAR: "collapseSidebar",
  EXPAND_SIDE_BAR: "expandSidebar",
  RENDER_SIDE_BAR: "renderSidebar",
  ACTIVATE_CHAT_LOG: "activateChatLog",
  ACTIVATE_CHAT_LOG_5E: "activateChatLog5e",

  /* Macros */
  RENDER_HOTBAR: "renderHotbar",

  /* Camera Views */
  RENDER_CAMERA_VIEWS: "renderCameraViews",
  WEBRTC_USER_STATE_CHANGED: "webrtcUserStateChanged",
  WEBRTC_SETTINGS_CHANGED: "webrtcSettingsChanged",
  RTC_SETTINGS_CHANGED: "rtcSettingsChanged",
  RTC_MODE_CHANGED: "rtcModeChanged",
  RTC_VOICE_SETTINGS_CHANGED: "rtcVoiceSettingsChanged",
  RTC_LOCAL_STREAM_ESTABLISHED: "rtcLocalStreamEstablished",
  RTC_LOCAL_STREAM_ERROR: "rtcLocalStreamError",
  RTC_PEER_CONNECTED: "rtcPeerConnected",
  RTC_PEER_DISCONNECTED: "rtcPeerDisconnected",
  RTC_PEER_ERROR: "rtcPeerError",
  RTC_SIGNALING_EVENT: "rtcSignalingEvent",
  
  /* AV Configuration */
  RENDER_AV_CONFIG: "renderAVConfig",
  RENDER_AV_MASTER: "renderAVMaster",
  RENDER_AV_CLIENT: "renderAVClient",
  
  /* User Connection */
  USER_CONNECTED: "userConnected",
  USER_DISCONNECTED: "userDisconnected",

  /* Update user */
  UPDATE_USER: "updateUser",
  UPDATE_DOCUMENT: "updateDocument",

  /* Settings */
  UPDATE_SETTING: "updateSetting",
  CLIENT_SETTING_CHANGED: "clientSettingChanged",

  /* Token */
  RENDER_TOKEN_HUD: "renderTokenHUD",

  /* Sheets */
  RENDER_ACTOR_SHEET: "renderActorSheetV2",
  RENDER_ITEM_SHEET: "renderItemSheetV2",
  RENDER_COMPENDIUM_BROWSER: "renderCompendiumBrowser"
}

/**
 * DND5e System hooks
 * https://github.com/foundryvtt/dnd5e/blob/master/module/documents/actor.mjs
 * */ 
export const HOOKS_DND5E = {
  /* Example hooks - add real ones as needed */
  // ROLL_ABILITY_TEST: "dnd5e.rollAbilityTest",
  // ROLL_SKILL_TEST: "dnd5e.rollSkillTest"
  // RENDER_ACTOR_SHEET: "renderActorSheet",
}