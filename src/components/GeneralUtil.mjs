import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

/**
 * Utility class providing general-purpose functionality for the module
 */
/**
 * General utility functions
 */
export class GeneralUtil {
  /**
   * Checks if module is currently installed and active
   * @param {string} moduleName 
   * @returns {boolean}
   */
  static isModuleOn(moduleName){
    const module = game.modules?.get(moduleName);
    // LogUtil.log("isModuleOn", [module?.active]);
    return Boolean(module?.active);
  }

  /**
   * Finds and returns the first element matching the selector within the parent element
   * @param {HTMLElement} parent - The parent element to search within
   * @param {string} selector - CSS selector string
   * @returns {HTMLElement|null} The first matching element or null if not found
   */
  static html(parent, selector) {
    return parent.querySelector(selector);
  }

  /**
   * Gets the full width of an element including margins and borders
   * @param {HTMLElement} element - The element to measure
   * @returns {number} The full width in pixels
   */
  static getFullWidth(element) {
    const style = window.getComputedStyle(element);
    if (style.width === '0px') {
      return 0;
    }
    return element.offsetWidth;
  }

  /**
   * Calculates the distance from the bottom of an element to the bottom of its offset parent
   * @param {HTMLElement} element - The element to measure
   * @returns {number} The offset from the bottom in pixels
   */
  static getOffsetBottom(element) {
    const offsetTop = element.offsetTop;
    const elementHeight = element.offsetHeight;
    const offsetParent = element.offsetParent;
    const parentHeight = offsetParent ? offsetParent.clientHeight : window.innerHeight;
  
    return parentHeight - (offsetTop + elementHeight);
  }

  /**
   * Process stylesheets to extract font families
   * @returns {Promise<string[]>} Array of font family names from stylesheets
   * @private
   */
  static processStyleSheets = async () => {
    // Get Foundry built-in fonts
    const foundryFonts = new Set(Object.keys(CONFIG.fontDefinitions));
    LogUtil.log('Foundry built-in fonts:', [Array.from(foundryFonts)]);
    
    // Get custom fonts from settings
    const customFontsObj = game.settings.get("core", "fonts") || {};
    const customFonts = Object.entries(customFontsObj).map(([fontFamily]) => fontFamily);

    LogUtil.log('Stylesheets:', [document.styleSheets]);

    // Get CSS imported fonts
    const cssImportedFonts = new Set();
    
    // Process all stylesheets
    for (const sheet of document.styleSheets) {
      try {
        // Handle stylesheet content
        if (sheet.ownerNode) {
          // Check if the stylesheet is from core Foundry, our module, or a system
          const href = sheet.href || '';
          const isFoundryCore = href.includes('css/') || href.includes('styles/');
          const isCrlngnUI = href.includes('modules/crlngn-ui/');
          const isSystem = href.includes('systems/');
          
          // Skip if not from core, not from crlngn-ui, and not from a system
          if (href && !isFoundryCore && !isCrlngnUI && !isSystem) {
            LogUtil.log('Skipping stylesheet:', [href]);
            continue;
          }
          
          LogUtil.log('Processing stylesheet:', [sheet, href]);
          
          // Process CSS rules directly
          await this.processStyleSheetRules(sheet, cssImportedFonts);
        }
      } catch (e) {
        LogUtil.warn('Error processing stylesheet:', [e]);
      }
    }

    // Log what we found for debugging
    LogUtil.log('Found fonts:', [{
      foundry: Array.from(foundryFonts),
      custom: customFonts,
      cssImported: Array.from(cssImportedFonts)
    }]);

    // Combine all fonts, filter, clean, sort
    const allFonts = Array.from(new Set([
      ...foundryFonts,
      ...customFonts,
      ...cssImportedFonts
    ]))
    .filter(f => !/FontAwesome|Font Awesome|FoundryVTT/.test(f))
    .map(f => f.replace(/['"]/g, '').trim())
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return allFonts;
  }

  /**
   * Process CSS rules from a stylesheet to extract font families
   * @param {CSSStyleSheet} sheet - The stylesheet to process
   * @param {Set<string>} cssImportedFonts - Set to collect found font families
   * @private
   */
  static async processStyleSheetRules(sheet, cssImportedFonts) {
    try {
      // Extract text content from style tags
      if (sheet.ownerNode?.tagName === 'STYLE') {
        const cssText = sheet.ownerNode.textContent;
        this.extractFontsFromCSSText(cssText, cssImportedFonts);
      }
      
      // Process rules directly
      try {
        // Try to access rules - this may fail due to CORS restrictions
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) return;
        
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          
          // Handle @font-face rules
          if (rule instanceof CSSFontFaceRule) {
            const fontFamily = rule.style.getPropertyValue('font-family');
            if (fontFamily) {
              cssImportedFonts.add(fontFamily);
              LogUtil.log('Found font-face rule:', [fontFamily]);
            }
          }
          // Handle @import rules (v13 uses these for module CSS)
          else if (rule instanceof CSSImportRule) {
            LogUtil.log('Found import rule:', [rule.href]);
            
            // For v13, we need to access the imported stylesheet
            if (rule.styleSheet) {
              // Recursively process the imported stylesheet
              await this.processStyleSheetRules(rule.styleSheet, cssImportedFonts);
            } else {
              // If we can't access the stylesheet directly, we try to fetch it
              if (rule.href) {
                try {
                  const response = await fetch(rule.href);
                  const cssText = await response.text();
                  this.extractFontsFromCSSText(cssText, cssImportedFonts);
                } catch (e) {
                  LogUtil.warn('Error fetching imported CSS:', [e]);
                }
              }
            }
          }
        }
      } catch (e) {
        // Handle SecurityError for cross-origin stylesheets
        if (e.name === 'SecurityError' && sheet.href) {
          LogUtil.log('Security restriction on stylesheet, trying to fetch directly:', [sheet.href]);
          try {
            // Try to fetch the stylesheet directly
            const response = await fetch(sheet.href);
            const cssText = await response.text();
            this.extractFontsFromCSSText(cssText, cssImportedFonts);
          } catch (fetchError) {
            LogUtil.warn('Error fetching cross-origin stylesheet:', [fetchError]);
          }
        } else {
          LogUtil.warn('Error accessing CSS rules:', [e]);
        }
      }
    } catch (e) {
      LogUtil.warn('Error in processStyleSheetRules:', [e]);
    }
  }

  /**
   * Extract font families from CSS text
   * @param {string} cssText - CSS text to process
   * @param {Set<string>} cssImportedFonts - Set to collect found font families
   * @private
   */
  static extractFontsFromCSSText(cssText, cssImportedFonts) {
    if (!cssText) return;
    
    // Extract font-face declarations
    const fontFaceRegex = /@font-face\s*{[^}]*font-family\s*:\s*(['"])(.+?)\1[^}]*}/gs;
    const fontFaceMatches = cssText.match(fontFaceRegex) || [];
    
    LogUtil.log('Font face matches in CSS text:', [fontFaceMatches.length]);
    
    // Extract font family names from font-face rules
    fontFaceMatches.forEach(match => {
      const fontFamilyRegex = /font-family\s*:\s*(['"])(.+?)\1/;
      const fontFamilyMatch = match.match(fontFamilyRegex);
      
      if (fontFamilyMatch && fontFamilyMatch[2]) {
        const fontName = fontFamilyMatch[2].trim();
        cssImportedFonts.add(fontName);
        LogUtil.log('Found font-face in CSS text:', [fontName]);
      }
    });
  }
  

  /**
   * Gets the offset bottom of an element
   * @param {HTMLElement} element 
   * @returns {number}
   */
  static getOffsetBottom(element) {
    const offsetTop = element.offsetTop;
    const elementHeight = element.offsetHeight;
    const offsetParent = element.offsetParent;
    const parentHeight = offsetParent ? offsetParent.clientHeight : window.innerHeight;
  
    return parentHeight - (offsetTop + elementHeight);
  }


  /**
   * Retrieves a list of all available fonts
   * @returns {Promise<string[]>}
   */
  static async getAllFonts() {
    // Get Foundry built-in fonts
    const foundryFonts = new Set(Object.keys(CONFIG.fontDefinitions));
    
    // Get custom fonts from settings
    const customFontsObj = game.settings.get("core", "fonts") || {};
    const customFonts = Object.entries(customFontsObj).map(([fontFamily]) => fontFamily);
  
    // Get CSS imported fonts
    const cssImportedFonts = await this.processStyleSheets();
  
    // Log what we found for debugging
    LogUtil.log('Found fonts:', [{
      foundry: Array.from(foundryFonts),
      custom: customFonts,
      cssImported: Array.from(cssImportedFonts)
    }]);
  
    // Combine all fonts, filter, clean, sort
    const allFonts = Array.from(new Set([
      ...foundryFonts,
      ...customFonts,
      ...cssImportedFonts
    ]))
    .filter(f => !/FontAwesome|Font Awesome|FoundryVTT/.test(f))
    .map(f => f.replace(/['"]/g, '').trim())
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return allFonts || [];
  }

  // Helper function to format font names
  /**
   * Formats a font name by cleaning it and wrapping it in quotes if it contains spaces
   * @param {string} fontName - The font name to format
   * @returns {string} The formatted font name
   */
  static wrapFontName = (fontName) => {
    const cleanName = fontName.replace(/['"`]/g, '');
    return cleanName.includes(' ') ? `"${cleanName}"` : cleanName;
  }

  /**
   * Adds CSS variables to a style element
   * @param {string} varName 
   * @param {string} varValue 
   */
  static addCSSVars(varName, varValue) {
    let bodyStyle = document.querySelector('#crlngn-ui-vars');
    
    if (!bodyStyle) {
      // Create style element if it doesn't exist
      const body = document.querySelector('body.crlngn-ui');
      bodyStyle = document.createElement('style');
      bodyStyle.id = 'crlngn-ui-vars';
      bodyStyle.textContent = 'body.crlngn-ui {\n}\n';
      body.prepend(bodyStyle);
    }
    
    // Parse the current CSS content
    let cssText = bodyStyle.textContent;
    
    // Find or create the rule block
    let ruleStart = cssText.indexOf('body.crlngn-ui {');
    let ruleEnd = cssText.indexOf('}', ruleStart);
    
    if (ruleStart === -1) {
      // If rule doesn't exist, create it
      cssText = 'body.crlngn-ui {\n}\n';
      ruleStart = 0;
      ruleEnd = cssText.indexOf('}');
    }
    
    // Get all the current declarations
    const rulePart = cssText.substring(ruleStart + 'body.crlngn-ui {'.length, ruleEnd);
    
    // Split by semicolons to get individual declarations
    const declarations = rulePart.split(';')
      .map(decl => decl.trim())
      .filter(decl => decl !== '');
    
    // Create a map of existing variables
    const varsMap = {};
    declarations.forEach(decl => {
      const parts = decl.split(':');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join(':').trim(); // Handle values that might contain colons
        if (name) varsMap[name] = value;
      }
    });
    
    // Format the value if it appears to need quotes
    // For string values used in content properties (i18n text)
    if (varName.includes('i18n') && 
        typeof varValue === 'string' && 
        !varValue.startsWith('"') && 
        !varValue.startsWith("'") && 
        !varValue.match(/^url\(|^rgba?\(|^hsla?\(/)) {
      varValue = `"${varValue}"`;
    }
    
    // Update or add the new variable
    varsMap[varName] = varValue;
    
    // Rebuild the rule content
    const newRuleContent = Object.entries(varsMap)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join('\n');
    
    // Rebuild the entire CSS
    const newCss = 
      cssText.substring(0, ruleStart) + 
      'body.crlngn-ui {\n' + 
      newRuleContent + 
      '\n}' + 
      cssText.substring(ruleEnd + 1);
    
    // Update the style element
    bodyStyle.textContent = newCss;
  }

  /**
   * Adds custom CSS to a style element
   * @param {string} content 
   */
  static addCustomCSS(content) {
    let customStyle = document.querySelector('#crlngn-ui-custom-css');
    
    if (!customStyle) {
      // Create style element if it doesn't exist
      const body = document.querySelector('body');
      customStyle = document.createElement('style');
      customStyle.id = 'crlngn-ui-custom-css';
      customStyle.textContent = 'body.crlngn-ui {\n}\n';
      body.appendChild(customStyle);
    }

    customStyle.textContent = content;
  }
}
