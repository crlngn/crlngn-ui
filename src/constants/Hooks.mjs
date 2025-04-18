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
  RENDER_CHAT_MESSAGE: "renderChatMessage" ,

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

  /* Macros */
  RENDER_HOTBAR: "renderHotbar",

  /* Camera Views */
  RENDER_CAMERA_VIEWS: "renderCameraViews",
  WEBRTC_USER_STATE_CHANGED: "webrtcUserStateChanged",
  WEBRTC_SETTINGS_CHANGED: "webrtcSettingsChanged",

  /* Update user */
  UPDATE_USER: "updateUser",
  UPDATE_DOCUMENT: "updateDocument"
}

/**
 * DND5e System hooks
 * https://github.com/foundryvtt/dnd5e/blob/master/module/documents/actor.mjs
 * */ 
export const HOOKS_DND5E = {
  /* Example hooks - add real ones as needed */
  // ROLL_ABILITY_TEST: "dnd5e.rollAbilityTest",
  // ROLL_SKILL_TEST: "dnd5e.rollSkillTest"
}