import { LogUtil } from "./LogUtil.mjs";

export class CustomHandlebarsHelpers {
  /**
   * Initialize
   * @static
   */
  static init(){
    // Handlebars.registerHelper('normalizedIncludes', function(array, value) {
    //   return array.includes(value?.toString().replace(/['"]/g, ''));
    // });
    Handlebars.registerHelper('normalizedIncludes', function(str, searchValue) {
      // Check if the string contains the search value
      LogUtil.log("CustomHandlebarsHelpers", [str, searchValue, str?.includes(searchValue)]);
      return str?.includes(searchValue);
    });
  }

}