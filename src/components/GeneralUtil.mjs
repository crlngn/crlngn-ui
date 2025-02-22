import { LogUtil } from "./LogUtil.mjs";

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

  static getFullWidth(element) {
    const style = window.getComputedStyle(element);
    if (style.width === '0px') {
      return 0;
    }
    return element.offsetWidth;
  }

  static getOffsetBottom(element) {
    const offsetTop = element.offsetTop;
    const elementHeight = element.offsetHeight;
    const offsetParent = element.offsetParent;
    const parentHeight = offsetParent ? offsetParent.clientHeight : window.innerHeight;
  
    return parentHeight - (offsetTop + elementHeight);
  }


  // Function to get a list with all the fonts available 
  // (Foundry + CSS imported) - excludes Font Awesome
  static getAllFonts() {
    // Get Foundry built-in fonts
    const foundryFonts = new Set(Object.keys(CONFIG.fontDefinitions));
    LogUtil.log('Foundry built-in fonts:', [Array.from(foundryFonts)]);
    
    // Get custom fonts from settings
    const customFontsObj = game.settings.get("core", "fonts") || {};
    const customFonts = Object.entries(customFontsObj).map(([fontFamily]) => fontFamily);
    LogUtil.log('Custom fonts from settings:', [customFonts]);
  
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
              console.warn('Could not read stylesheet rules:', e);
            }
          }
  
          // Log the found CSS text for debugging
          LogUtil.log('Processing stylesheet text:', [cssText.slice(0, 200) + '...']);
  
          // Extract URLs from @import statements
          const importUrlRegex = /@import\s+url\(['"]([^'"]+)['"]\)/g;
          let match;
          
          while ((match = importUrlRegex.exec(cssText)) !== null) {
            const url = match[1]; // This is the actual URL
            LogUtil.log('Found import URL:', url);
  
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
                  LogUtil.log('Added Google Font family:', family);
                });
              }
            } else {
              // For non-Google Fonts, try to fetch and parse the CSS
              try {
                fetch(url)
                  .then(response => response.text())
                  .then(css => {
                    // Parse font-face rules
                    const fontFaceRules = css.match(/@font-face\s*{[^}]+}/g) || [];
                    fontFaceRules.forEach(rule => {
                      const fontFamilyMatch = rule.match(/font-family:\s*['"]?([^'";]+)['"]?/);
                      if (fontFamilyMatch) {
                        const fontFamily = fontFamilyMatch[1].trim();
                        cssImportedFonts.add(fontFamily);
                        LogUtil.log('Added font family from @font-face:', fontFamily);
                      }
                    });
                  })
                  .catch(error => console.warn('Error loading imported CSS:', error));
              } catch (e) {
                console.warn('Error processing imported CSS:', e);
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
                LogUtil.log('Found font-face rule for:', fontFamily);
              }
            }
          } catch (e) {
            console.warn('Could not read stylesheet rules:', e);
          }
        }
      } catch (e) {
        console.warn('Error processing stylesheet:', e);
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
  static wrapFontName = (fontName) => {
    const cleanName = fontName.replace(/['"`]/g, '');
    return cleanName.includes(' ') ? `"${cleanName}"` : cleanName;
  };
}
