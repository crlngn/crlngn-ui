import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

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
   * Retrieves an HTML element from a parent element
   * @param {HTMLElement} parent 
   * @param {string} selector 
   * @returns {HTMLElement|null}
   */
  static html(parent, selector) {
    return parent.querySelector(selector);
  }

  /**
   * Gets the full width of an element
   * @param {HTMLElement} element 
   * @returns {number}
   */
  static getFullWidth(element) {
    const style = window.getComputedStyle(element);
    if (style.width === '0px') {
      return 0;
    }
    return element.offsetWidth;
  }

  /**
   * Processes all stylesheets to extract font-family names
   * @param {Set<string>} cssImportedFonts
   */
  static processStyleSheets = async (cssImportedFonts) => {
    for (const sheet of document.styleSheets) {
      try {
        // Handle stylesheet text content for @import rules
        if (sheet.ownerNode) {
          // Check if the stylesheet is from core Foundry or our module
          const href = sheet.href || '';
          const isFoundryCore = href.includes('/css/') || href.includes('/styles/');
          const isOurModule = href.includes('/modules/crlngn-ui/');
          
          // Skip if not from core or our module
          if (href && !isFoundryCore && !isOurModule) {
            LogUtil.log('Skipping non-core/module stylesheet:', [href]);
            continue;
          }
          
          let cssText = '';
          
          if (sheet.ownerNode instanceof Element) {
            // Get text content from style tags
            if (sheet.ownerNode.tagName === 'STYLE') {
              cssText = sheet.ownerNode.textContent;
            }
            // Get text content from link tags
            else if (sheet.ownerNode.tagName === 'LINK') {
              try {
                const rules = sheet.cssRules || sheet.rules;
                cssText = Array.from(rules).map(rule => rule.cssText).join('\n');
              } catch (e) {
                LogUtil.warn('Could not read stylesheet rules:', [e]);
              }
            }
          }
          
          LogUtil.log('Processing stylesheet:', [href || 'inline style']);

          // Log the found CSS text for debugging
          // LogUtil.log('Processing stylesheet text:', s[cssText.slice(0, 200) + '...']);

          // Extract URLs from @import statements
          const importUrlRegex = /@import\s+url\(['"]([^'"]+)['"]\)/g;
          let match;
          
          while ((match = importUrlRegex.exec(cssText)) !== null) {
            let url = match[1]; // This is the actual URL

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
              // Skip relative path imports
              if (url.startsWith('./') || url.startsWith('../')) {
                LogUtil.log('Skipping relative import:', [url]);
                continue;
              }
              
              // For absolute paths or URLs, use as is
              let resolvedUrl = url;

              try {
                const response = await fetch(resolvedUrl);
                if (!response.ok) {
                  LogUtil.warn('Error loading imported CSS:', [response.status]);
                  continue;
                }
                const css = await response.text();
                /** @type {RegExpMatchArray | null} */
                const fontFaceRules = css.match(/@font-face\s*{[^}]+}/g);
                if (!fontFaceRules) continue;
                
                fontFaceRules.forEach(rule => {
                  /** @type {RegExpMatchArray | null} */
                  const fontFamilyMatch = rule.match(/font-family:\s*['"]?([^'";]+)['"]?/);
                  if (fontFamilyMatch && fontFamilyMatch[1]) {
                    const fontFamily = fontFamilyMatch[1].trim();
                    cssImportedFonts.add(fontFamily);
                  }
                });
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
    return [];
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


  // Function to get a list with all the fonts available 
  // (Foundry + CSS imported) - excludes Font Awesome
  /**
   * Retrieves a list of all available fonts
   * @returns {Promise<string[]>}
   */
  static async getAllFonts() {
    // Get Foundry built-in fonts
    const foundryFonts = new Set(Object.keys(CONFIG.fontDefinitions));
    
    // Get custom fonts from settings
    const customFontsObj = SettingsUtil.get("fonts","core") || {};
    const customFonts = Object.entries(customFontsObj).map(([fontFamily]) => fontFamily);
  
    // Get CSS imported fonts
    const cssImportedFonts = new Set();

    await this.processStyleSheets(cssImportedFonts);
  
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
    .map(f => f.replace(/['"`]/g, '').trim())
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Move return statement to the end of the function
    return allFonts || [];
  }

  /**
   * Helper function to format font names
   * @param {string} fontName 
   * @returns {string}
   */
  static wrapFontName(fontName) {
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
