/**
 * @file Type definitions for the crlngn-ui module
 */

/**
 * @typedef {Object} SceneNavUser
 * @property {string} name - The name of the user
 * @property {string} letter - The letter representation of the user
 * @property {string} color - The hex color code for the user's background
 * @property {string} border - The hex color code for the user's border
 */

/**
 * @typedef {Object} SceneNavItem
 * @property {string} id - The unique identifier for the scene
 * @property {boolean} active - Whether the scene is active
 * @property {boolean} isView - Whether the scene is currently being viewed
 * @property {number} navOrder - The navigation order value for sorting
 * @property {string} name - The display name of the scene
 * @property {string} tooltip - The tooltip text for the scene
 * @property {SceneNavUser[]} [users] - Users currently viewing the scene (only present for active scenes)
 * @property {string} cssClass - CSS classes applied to the scene item
 */

/**
 * @typedef {Object} SceneNavData
 * @property {Object} scenes - Collection of scenes organized by state
 * @property {SceneNavItem[]} scenes.active - Array of currently active scenes
 * @property {SceneNavItem[]} scenes.inactive - Array of inactive scenes
 * @property {number} canExpand - Number of items that can be expanded
 * @property {string} partId - The HTML part ID for the scene navigation
 */

export {};
