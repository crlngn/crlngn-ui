/**
 * Foundry Core hooks
 * https://foundryvtt.com/api/classes/client.Hooks.html
 * https://foundryvtt.com/api/modules/hookEvents.html
 * */ 
export const HOOKS_CORE = {
  INIT: "init", 
  READY: "ready", 

  /* Chat Messages */
  RENDER_CHAT_MESSAGE: "renderChatMessage" ,

  /* Left Side Controls */
  GET_SCENE_CONTROLS: "getSceneControlButtons",
  RENDER_SCENE_CONTROLS: "renderSceneControls",
  RENDER_PLAYERS_LIST: "renderPlayerList",

  /* Scenes */
  RENDER_SCENE_NAV: "renderSceneNavigation",
  COLLAPSE_SCENE_NAV: "collapseSceneNavigation",
  EXPAND_SCENE_NAV: "expandSceneNavigation",
  GET_SCENE_NAV_CONTEXT: "getSceneNavigationContext",

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

  /* Macros */
  RENDER_HOTBAR: "renderHotbar",

  /* Camera Views */
  RENDER_CAMERA_VIEWS: "renderCameraViews",

  /* Update user */
  UPDATE_USER: "updateUser",
  UPDATE_DOCUMENT: "updateDocument"
}