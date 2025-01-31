/**
 * Foundry Core hooks
 * https://foundryvtt.com/api/classes/client.Hooks.html
 * https://foundryvtt.com/api/modules/hookEvents.html
 * */ 
export const HOOKS_CORE = {
  CHAT_MESSAGE: "chatMessage", 
  INIT: "init", 
  READY: "ready", 
  PRE_CREATE_CHAT_MESSAGE: "preCreateChatMessage", 
  CREATE_CHAT_MESSAGE: "createChatMessage", 
  RENDER_CHAT_MESSAGE: "renderChatMessage" ,
  CREATE_MEASURED_TEMPLATE: "createMeasuredTemplate",
  REFRESH_MEASURED_TEMPLATE: "refreshMeasuredTemplate",
  GET_SCENE_CONTROLS: "getSceneControlButtons",
  RENDER_SCENE_NAV: "renderSceneNavigation",
  COLLAPSE_SCENE_NAV: "collapseSceneNavigation",
  EXPAND_SCENE_NAV: "expandSceneNavigation"
}