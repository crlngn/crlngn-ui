import { LogUtil } from "./LogUtil.mjs";

export class CustomHandlebarsHelpers {
  /**
   * Initialize
   * @static
   */
  static init(){
    // Legacy helper - kept for backward compatibility but deprecated
    Handlebars.registerHelper('normalizedIncludes', function(str, searchValue) {
      // Check if the string contains the search value
      LogUtil.log("CustomHandlebarsHelpers normalizedIncludes (deprecated)", [str, searchValue, str?.includes(searchValue)]);
      return str?.includes(searchValue);
    });

    // New helper for array-based module list
    Handlebars.registerHelper('moduleEnabled', function(moduleListOrJson, moduleId) {
      try {
        // Parse if it's a JSON string, otherwise use as-is
        const moduleList = typeof moduleListOrJson === 'string'
          ? JSON.parse(moduleListOrJson)
          : moduleListOrJson;

        if (!Array.isArray(moduleList)) {
          LogUtil.log("moduleEnabled: not an array", [moduleListOrJson]);
          return false;
        }

        // Clean the module ID (remove quotes if present)
        const cleanId = moduleId.replace(/['''"]/g, "").trim();

        // Find module and return enabled state
        const module = moduleList.find(item => item.id === cleanId);
        const isEnabled = module ? module.enabled : false;

        LogUtil.log("moduleEnabled", [cleanId, isEnabled, moduleList]);
        return isEnabled;

      } catch (e) {
        console.warn('Failed to parse moduleList in moduleEnabled helper', e);
        return false;
      }
    });
  }

}