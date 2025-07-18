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
   * @returns {Promise<Set<string>>} Set of font family names from stylesheets
   * @private
   */
  static processStyleSheets = async () => {
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
    return cssImportedFonts;
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


  /**
     * Performs a smooth scroll with custom duration
     * @param {HTMLElement} element - The element to scroll
     * @param {number} to - The target scroll position
     * @param {string} [direction="horizontal"] - The scroll direction ("horizontal" or "vertical")
     * @param {number} [duration=300] - Duration of the animation in milliseconds
     * @param {Function} [onComplete] - Optional callback to run when animation completes
     * @returns {number} Animation ID that can be used to cancel the animation
     */
  static smoothScrollTo(element, to, direction = "horizontal", duration = 300, onComplete = null) {
    // Cancel any existing animation if it has the same ID as the element
    const animationId = element.dataset.scrollAnimationId;
    if (animationId) {
      cancelAnimationFrame(Number(animationId));
    }
    
    // Determine if we're scrolling horizontally or vertically
    const isHorizontal = direction === "horizontal";
    const start = isHorizontal ? element.scrollLeft : element.scrollTop;
    const change = to - start;
    
    // If there's no change or the element isn't scrollable, exit early
    if (change === 0) {
      if (onComplete) onComplete();
      return null;
    }
    
    const startTime = performance.now();
    
    // Animation function
    const animateScroll = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime >= duration) {
        // Set final position
        if (isHorizontal) {
          element.scrollLeft = to;
        } else {
          element.scrollTop = to;
        }
        
        // Clear animation ID
        delete element.dataset.scrollAnimationId;
        
        // Call completion callback if provided
        if (onComplete) onComplete();
        return;
      }
      
      // Easing function: easeInOutQuad
      const progress = elapsedTime / duration;
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Apply scroll position
      if (isHorizontal) {
        element.scrollLeft = start + change * easeProgress;
      } else {
        element.scrollTop = start + change * easeProgress;
      }
      
      // Continue animation
      const newAnimationId = requestAnimationFrame(animateScroll);
      element.dataset.scrollAnimationId = newAnimationId;
      return newAnimationId;
    };
    
    // Start animation
    const newAnimationId = requestAnimationFrame(animateScroll);
    element.dataset.scrollAnimationId = newAnimationId;
    return newAnimationId;
  }

  /**
   * Shows a confirmation dialog for reloading the application
   * @param {Object} [options] - Configuration options for the dialog
   * @param {string} [options.title="Confirm Reload"] - Dialog title
   * @param {string} [options.content=""] - Dialog content
   * @param {string} [options.yes="Reload"] - Text for the confirm button
   * @param {string} [options.no="Cancel"] - Text for the cancel button
   * @param {Function} [options.onConfirm] - Optional callback to run before reloading
   * @returns {Promise<boolean>} Returns true if confirmed, false if canceled
   */
  static async showReloadDialog() {
    // Default options
    const title = game.i18n.localize("CRLNGN_UI.ui.notifications.reloadConfirmTitle");
    const content = game.i18n.localize("CRLNGN_UI.ui.notifications.reloadConfirm");
    const yes = game.i18n.localize("CRLNGN_UI.ui.notifications.reloadConfirmYes");
    const no = game.i18n.localize("CRLNGN_UI.ui.notifications.reloadConfirmNo");
    
    // Show the dialog and wait for user response
    let confirmed;
    
    try {
      // Foundry V12 approach
      if (typeof foundry !== "undefined" && foundry.applications?.api?.DialogV2) {
        confirmed = await foundry.applications.api.DialogV2.confirm({
          window: { title: title },
          content: `<p>${content}</p>`
        });
      }
      // Foundry V10/V11 approach
      else if (typeof Dialog !== "undefined") {
        confirmed = await Dialog.confirm({
          title: title,
          content: `<p>${content}</p>`,
          yes: yes,
          no: no,
          defaultYes: false
        });
      }
      // Absolute fallback
      else {
        confirmed = window.confirm(content);
      }
    } catch (error) {
      console.error("Error showing reload dialog:", error);
      confirmed = window.confirm(content);
    }
    
    // If confirmed, reload
    if (confirmed) {
      window.location.reload();
    }else{
      SettingsUtil.reloadRequired = false;
    }
    
    return confirmed;
  }
}
