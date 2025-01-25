
export class GeneralUtil {
  /**
   * Checks if module is currently installed and active
   * @param {string} moduleName 
   * @returns 
   */
  static isModuleOn(moduleName){
    const module = game.modules?.get(moduleName);
    // LogUtil.log("isModuleOn", [module?.active]);
    return module?.active ? true : false;
  }

  static html(parent, selector) {
    return parent.querySelector(selector);
  }
}
