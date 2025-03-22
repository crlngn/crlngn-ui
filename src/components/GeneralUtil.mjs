import { LogUtil } from "./LogUtil.mjs";

/**
 * Utility class providing general-purpose functionality for the module
 */
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


  // Function to get a list with all the fonts available 
  // (Foundry + CSS imported) - excludes Font Awesome
  /**
   * Retrieves a comprehensive list of available fonts from multiple sources
   * Combines Foundry built-in fonts, custom fonts from settings, and CSS imported fonts
   * Excludes Font Awesome fonts from the results
   * @returns {Promise<string[]>} Array of font family names, sorted alphabetically
   */
  static getAllFonts = async () => {
    // Get Foundry built-in fonts
    const foundryFonts = new Set(Object.keys(CONFIG.fontDefinitions));
    // LogUtil.log('Foundry built-in fonts:', [Array.from(foundryFonts)]);
    
    // Get custom fonts from settings
    const customFontsObj = game.settings.get("core", "fonts") || {};
    const customFonts = Object.entries(customFontsObj).map(([fontFamily]) => fontFamily);
    // LogUtil.log('Custom fonts from settings:', [customFonts]);
  
    // Get CSS imported fonts
    const cssImportedFonts = new Set();
    
    for (const sheet of document.styleSheets) {
      try {
        // Handle stylesheet text content for @import rules
        if (sheet.ownerNode) {
          let cssText = '';
          
          // Get text content from style tags
          if (sheet.ownerNode.tagName === 'STYLE') {
            cssText = sheet.ownerNode.textContent;
          }
          // Get text content from link tags
          else if (sheet.ownerNode.tagName === 'LINK') {
            try {
              if (sheet.href?.startsWith(window.location.origin)) {
                const rules = sheet.cssRules || sheet.rules;
                cssText = Array.from(rules).map(rule => rule.cssText).join('\n');
              }
            } catch (e) {
              LogUtil.warn('Could not read stylesheet rules:', [e]);
            }
          }
          
          // Extract URLs from @import statements
          const importUrlRegex = /@import\s+url\(['"]([^'"]+)['"]\)/g;
          let match;
          
          while ((match = importUrlRegex.exec(cssText)) !== null) {
            const url = match[1]; // This is the actual URL
            LogUtil.log('Found import URL:', [url]);
  
            if (url.includes('fonts.googleapis.com')) {
              // Extract font family names from Google Fonts URL
              const familyMatch = url.match(/family=([^&]+)/);
              if (familyMatch) {
                const families = decodeURIComponent(familyMatch[1])
                  .split('|') // Split multiple families
                  .map(family => {
                    // Remove weight/style variations
                    return family.split(':')[0].replace(/\+/g, ' ');
                  });
                
                families.forEach(family => {
                  cssImportedFonts.add(family);
                  // LogUtil.log('Added Google Font family:', [family]);
                });
              }
            } else {
              // For non-Google Fonts, try to fetch and parse the CSS
              try {
                const response = await fetch(url);
                // response = response.text();
                if (!response.ok) {
                  if (response.status === 404) {
                    LogUtil.warn('getAllFonts() - Resource not found (404)', [url]);
                  } else {
                    LogUtil.warn('getAllFonts() - HTTP error', [response.status]);
                  }
                }else{
                  const fontFaceRules = css.match(/@font-face\s*{[^}]+}/g) || [];
                  fontFaceRules.forEach(rule => {
                    const fontFamilyMatch = rule.match(/font-family:\s*['"]?([^'";]+)['"]?/);
                    if (fontFamilyMatch) {
                      const fontFamily = fontFamilyMatch[1].trim();
                      cssImportedFonts.add(fontFamily);
                      // LogUtil.log('Added font family from @font-face:', fontFamily);
                    }
                  });
                }
                

                  // .then(response => response.text())
                  // .then(css => {
                  //   // Parse font-face rules
                  //   const fontFaceRules = css.match(/@font-face\s*{[^}]+}/g) || [];
                  //   fontFaceRules.forEach(rule => {
                  //     const fontFamilyMatch = rule.match(/font-family:\s*['"]?([^'";]+)['"]?/);
                  //     if (fontFamilyMatch) {
                  //       const fontFamily = fontFamilyMatch[1].trim();
                  //       cssImportedFonts.add(fontFamily);
                  //       // LogUtil.log('Added font family from @font-face:', fontFamily);
                  //     }
                  //   });
                  // })
                  // .catch(error => LogUtil.warn('Error loading imported CSS:', [error]));

                
              } catch (e) {
                LogUtil.warn('Error processing imported CSS:', [e]);
              }
            }
          }
        }
  
        // Check for @font-face rules in the current stylesheet
        if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            for (const rule of rules) {
              if (rule instanceof CSSFontFaceRule) {
                const fontFamily = rule.style.getPropertyValue('font-family')
                  .replace(/['"`]/g, '')
                  .trim();
                cssImportedFonts.add(fontFamily);
                // LogUtil.log('Found font-face rule for:', [fontFamily]);
              }
            }
          } catch (e) {
            LogUtil.warn('Could not read stylesheet rules:', [e]);
          }
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
    .filter(f => !f.includes("FontAwesome") && !f.includes("Font Awesome") )
    .map(f => f.replace(/['"`]/g, '').trim())
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  
    return allFonts;
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
  };

  /**
   * Adds automatic logging functionality to all methods of a class
   * @param {Function} Class - The class constructor to add logging to
   */
  static addLoggingToClass(Class) {
    // For static methods (properties of the constructor)
    const staticMethodNames = Object.getOwnPropertyNames(Class)
      .filter(prop => typeof Class[prop] === 'function' && 
              prop !== 'constructor' && 
              prop !== 'prototype' &&
              prop !== 'addLoggingToClass');
    
    console.log(`TEST: Adding logging to ${Class.name} static methods:`, staticMethodNames);
    
    staticMethodNames.forEach(methodName => {
      const originalMethod = Class[methodName];
      
      Class[methodName] = function(...args) {
        console.log(`TEST: Executing: ${Class.name}.${methodName}`);
        return originalMethod.apply(this, args);
      };
    });
    
    // For instance methods (properties of the prototype)
    const protoMethodNames = Object.getOwnPropertyNames(Class.prototype)
      .filter(prop => typeof Class.prototype[prop] === 'function' && 
              prop !== 'constructor');
    
              console.log(`TEST: Adding logging to ${Class.name} prototype methods:`, protoMethodNames);
    
    protoMethodNames.forEach(methodName => {
      const originalMethod = Class.prototype[methodName];
      
      Class.prototype[methodName] = function(...args) {
        console.log(`TEST: Executing: ${Class.name}.${methodName}`);
        return originalMethod.apply(this, args);
      };
    });
  }

  /**
   * Adds css rules to a <style> element at the body
   * @param {string} varName 
   * @param {string} varValue 
   */
  static addCSSVars = (varName, varValue) => {
    let bodyStyle = document.querySelector('#crlngn-ui-vars');
    
    if (!bodyStyle) {
      // Create style element if it doesn't exist
      const body = document.querySelector('body');
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
  };

  static addCustomCSS = (content) => {
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
