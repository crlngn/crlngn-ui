import { collapseSceneNavigation } from "../../foundry/client/hooks.mjs"

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

/**
 * Hooks for DnD5e 4.x
 * According to https://github.com/foundryvtt/dnd5e/wiki/Hooks
 */
export const HOOKS_DND5E ={
  // Rolls
  PRE_ROLL_V2: "dnd5e.preRollV2",
  PRE_ROLL_ABILITY_TEST: "dnd5e.preRollAbilityTest",
  PRE_ROLL_ABILITY_SAVE: "dnd5e.preRollAbilitySave",
  PRE_ROLL_SAVING_THROW: "dnd5e.preRollSavingThrow",
  PRE_ROLL_ATTACK_V2: "dnd5e.preRollAttackV2",
  PRE_ROLL_CLASS_HIT_POINTS: "dnd5e.preRollClassHitPoints",
  PRE_ROLL_CONCENTRATION: "dnd5e.preRollConcentration",
  PRE_ROLL_DAMAGE_V2: "dnd5e.preRollDamageV2",
  PRE_ROLL_DEATH_SAVE: "dnd5e.preRollDeathSave",
  PRE_ROLL_FORMULA_V2: "dnd5e.preRollFormulaV2", 
  PRE_ROLL_HIT_DIE_V2: "dnd5e.preRollHitDieV2",
  PRE_ROLL_INITIATIVE: "dnd5e.preRollInitiative",
  PRE_ROLL_NPC_HIT_POINTS: "dnd5e.preRollNPCHitPoints",
  PRE_ROLL_RECHARGE_V2: "dnd5e.preRollRechargeV2",
  PRE_ROLL_SKILL: "dnd5e.preRollSkill",
  PRE_ROLL_TOOL_CHECK: "dnd5e.preRollToolCheck",
  PRE_USE_ITEM: "dnd5e.preUseItem",
  ROLL_ABILITY_TEST: "dnd5e.rollAbilityTest",
  ROLL_ABILITY_SAVE: "dnd5e.rollAbilitySave",
  ROLL_ATTACK_V2: "dnd5e.rollAttackV2",
  ROLL_CLASS_HIT_POINTS: "dnd5e.rollClassHitPoints",
  ROLL_CONCENTRATION: "dnd5e.rollConcentration",
  ROLL_DEATH_SAVE: "dnd5e.rollDeathSave",
  ROLL_DAMAGE_V2: "dnd5e.rollDamageV2",
  ROLL_FORMULA_V2: "dnd5e.rollFormulaV2", 
  ROLL_HIT_DIE_V2: "dnd5e.rollHitDieV2",
  ROLL_INITIATIVE: "dnd5e.rollInitiative",
  ROLL_NPC_HIT_POINTS: "dnd5e.rollNPCHitPoints",
  ROLL_RECHARGE_V2: "dnd5e.rollRechargeV2",
  ROLL_SKILL: "dnd5e.rollSkill",
  ROLL_TOOL_CHECK: "dnd5e.rollToolCheck",

  // Rendering / Chat Messages
  DISPLAY_CARD: "dnd5e.preDisplayCardV2",
  PRE_DISPLAY_CARD_V2: "dnd5e.preDisplayCardV2",
  RENDER_CHAT_MESSAGE: "dnd5e.renderChatMessage",

  // Rest
  PRE_LONG_REST: "dnd5e.preLongRest",
  PRE_REST_COMPLETED: "dnd5e.preRestCmpleted",
  PRE_SHORT_REST: "dnd5e.preShortRest",
  REST_COMPLETED: "dnd5e.restCmpleted",

  // Activities
  ACTIVITY_CONSUMPTION: "dnd5e.activityConsumption",
  POST_ACTIVITY_CONSUMPTION: "dnd5e.postActivityConsumption",
  POST_CREATE_USAGE_MESSAGE: "dnd5e.postCreateUsageMessage",
  POST_USE_ACTIVITY: "dnd5e.postUseActivity",
  PRE_ACTIVITY_CONSUMPTION: "dnd5e.preActivityConsumption",
  PRE_CREATE_USAGE_MESSAGE: "dnd5e.preCreateUsageMessage",
  PRE_USE_ACTIVITY: "dnd5e.preUseActivity",

}

export const HOOKS_DDBGL = {
  PENDING_ROLL: "ddb-game-log.pendingRoll",
  FULFILLED_ROLL: "ddb-game-log.fulfilledRoll"
}