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

  /* Scene Navigation*/
  RENDER_SCENE_NAV: "renderSceneNavigation",
  COLLAPSE_SCENE_NAV: "collapseSceneNavigation",
  EXPAND_SCENE_NAV: "expandSceneNavigation",

  /* Right Side Panel */
  COLLAPSE_SIDE_BAR: "collapseSidebar",

  /* Macros */
  RENDER_HOTBAR: "renderHotbar",
}