import { MODULE_ID } from "../constants/General.mjs";
import { getSettings } from "../constants/Settings.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { HOOKS_CORE } from "../constants/Hooks.mjs";

/**
 * Utility class for enhancing hint tooltips in Foundry forms
 * Adds question mark icons and hover tooltips to p.hint elements
 */
export class HintTooltipUtil {
  static #initialized = false;
  static #hookId = null;

  /**
   * Initialize the hint tooltip enhancement system
   * Hooks into renderApplication to enhance all rendered forms
   */
  static init() {
    if (HintTooltipUtil.#initialized) {
      LogUtil.log('HintTooltipUtil already initialized, skipping', [])
      return;
    }

    const SETTINGS = getSettings();
    const enabled = SettingsUtil.get(SETTINGS.hoverableSettingsHints.tag);

    LogUtil.log('HintTooltipUtil init called', [enabled, SETTINGS.hoverableSettingsHints.tag]);

    if (enabled) {
      LogUtil.log('HintTooltipUtil: Setting is enabled, registering hook', [])
      HintTooltipUtil.#registerHook();
    } else {
      LogUtil.log('HintTooltipUtil: Setting is disabled, not registering hook', [])
    }

    // Note: Setting has requiresReload: true, so changes will trigger a page reload

    HintTooltipUtil.#initialized = true;
    LogUtil.log('HintTooltipUtil initialized', [enabled]);
  }

  /**
   * Register the renderApplication hook
   * @private
   */
  static #registerHook() {
    if (HintTooltipUtil.#hookId) {
      LogUtil.log('HintTooltipUtil: Hook already registered, skipping', [])
      return; // Already registered
    }

    LogUtil.log('HintTooltipUtil: Registering hooks for ApplicationV2 forms', [])

    // Hook for specific ApplicationV2 forms (Foundry V13+)
    const specificHooks = [
      HOOKS_CORE.RENDER_SETTINGS_CONFIG,
      HOOKS_CORE.RENDER_MODULE_MANAGEMENT,
      HOOKS_CORE.RENDER_CONFIG_PANEL
    ];

    const hookIds = [];
    specificHooks.forEach(hookName => {
      const id = Hooks.on(hookName, (app, html) => {
        // Get the form element from the app
        const element = app.element;

        LogUtil.log(`HintTooltipUtil: ${hookName} hook called`, [app.constructor.name, element?.id, element?.className]);

        // Apply handlers directly since this is a specific settings form
        // setTimeout(() => {
        HintTooltipUtil.applyHintHandlers(element);
        // }, 10);
      });
      hookIds.push(id);
    });

    // Also hook generic renderApplicationV2 as a fallback for custom module config dialogs
    const genericId = Hooks.on(HOOKS_CORE.RENDER_APPLICATION_V2, (app, html) => {
      const element = app.element;

      // Only apply to forms that look like settings dialogs
      // Check for form.standard-form or presence of .form-group elements
      if (!element) return;

      const hasFormGroups = element.querySelector('.form-group') !== null;
      const isStandardForm = element.querySelector('form.standard-form') !== null;

      if (hasFormGroups || isStandardForm) {
        setTimeout(() => {
          HintTooltipUtil.applyHintHandlers(element);
        }, 10);
      }
    });
    hookIds.push(genericId);

    HintTooltipUtil.#hookId = hookIds;

    LogUtil.log('HintTooltipUtil hook registered');
  }

  /**
   * Unregister all registered hooks and remove enhancements from existing forms
   * @private
   */
  static #unregisterHook() {
    if (HintTooltipUtil.#hookId) {
      const allHooks = [
        HOOKS_CORE.RENDER_SETTINGS_CONFIG,
        HOOKS_CORE.RENDER_MODULE_MANAGEMENT,
        HOOKS_CORE.RENDER_CONFIG_PANEL,
        HOOKS_CORE.RENDER_APPLICATION_V2
      ];
      const ids = Array.isArray(HintTooltipUtil.#hookId) ? HintTooltipUtil.#hookId : [HintTooltipUtil.#hookId];

      allHooks.forEach((hookName, index) => {
        if (ids[index]) {
          Hooks.off(hookName, ids[index]);
        }
      });

      HintTooltipUtil.#hookId = null;
      LogUtil.log('HintTooltipUtil hooks unregistered');
    }

    // Remove .crlngn-hints class from all enhanced forms
    const enhancedForms = document.querySelectorAll('.crlngn-hints');
    enhancedForms.forEach(form => {
      form.classList.remove('crlngn-hints');
    });
    LogUtil.log('HintTooltipUtil: Removed enhancements from existing forms', [enhancedForms.length]);
  }

  /**
   * Apply hint handlers to a given element
   * This can be called directly for Carolingian UI's own forms
   * @param {HTMLElement} element - The root element to search for hints
   */
  static applyHintHandlers(element) {
    if (!element) return;

    // Mark the container as having enhanced hints
    if (element.classList) {
      element.classList.add('crlngn-hints');
    } else if (element[0]?.classList) {
      element[0].classList.add('crlngn-hints');
    }

    const formGroupsWithHints = element.querySelectorAll('.form-group');
    LogUtil.log('Applying hint handlers to form groups:', [formGroupsWithHints.length]);

    let hintsFound = 0;
    formGroupsWithHints.forEach(formGroup => {
      const hint = formGroup.querySelector('p.hint, p.notes, div.notes');
      if (!hint) return;

      // Skip hints with class "on" or "shown" - they are always visible
      if (hint.classList.contains('on') || hint.classList.contains('shown')) {
        return;
      }

      const label = formGroup.querySelector('label, span.label');
      if (!label) return;

      // Skip if already enhanced (check for data attribute)
      if (formGroup.dataset.hintEnhanced === 'true') return;
      formGroup.dataset.hintEnhanced = 'true';

      hintsFound++;
      let hoverTimeout;
      let showTimeout;

      // Preserve existing child elements (for compatibility with modules like Force Client Settings)
      const existingChildren = Array.from(label.childNodes);

      // Separate text nodes from element nodes
      const textNodes = existingChildren.filter(node => node.nodeType === Node.TEXT_NODE);
      const elementNodes = existingChildren.filter(node => node.nodeType === Node.ELEMENT_NODE);

      // Get the label text from text nodes only
      const labelText = textNodes.map(node => node.textContent).join('').trim();
      const words = labelText.split(/\s+/).filter(word => word.length > 0);

      if (words.length > 1) {
        // Remove the last word from the label
        const lastWord = words.pop();
        const remainingText = words.join(' ');

        // Clear only text nodes, preserve element nodes (like lock icons)
        textNodes.forEach(node => node.remove());

        // Find where to insert text - after any existing element nodes (like lock icons)
        // or at the beginning if there are no element nodes
        const insertAfter = elementNodes.length > 0 ? elementNodes[elementNodes.length - 1] : null;

        // Add remaining text back
        const textNode = document.createTextNode(remainingText + ' ');
        if (insertAfter && insertAfter.nextSibling) {
          label.insertBefore(textNode, insertAfter.nextSibling);
        } else if (insertAfter) {
          label.appendChild(textNode);
        } else {
          label.insertBefore(textNode, label.firstChild);
        }

        // Create a wrapper span for the last word and icon
        const wrapper = document.createElement('span');
        wrapper.style.whiteSpace = 'nowrap';
        wrapper.textContent = lastWord + ' ';

        // Create the icon span
        const iconSpan = document.createElement('span');
        iconSpan.className = 'crlngn-hint-icon';
        iconSpan.textContent = '?';
        iconSpan.style.cursor = 'help';

        // Append icon to wrapper, then wrapper to label
        wrapper.appendChild(iconSpan);
        label.appendChild(wrapper);
      } else if (words.length === 1) {
        // If there's only one word, just append the icon normally
        const iconSpan = document.createElement('span');
        iconSpan.className = 'crlngn-hint-icon';
        iconSpan.textContent = '?';
        iconSpan.style.cursor = 'help';
        label.appendChild(iconSpan);
      }

      // Get reference to the icon for hover detection
      const iconSpan = label.querySelector('.crlngn-hint-icon');

      LogUtil.log('Icon span found for hint', [!!iconSpan, label.textContent]);

      // Helper function to check if mouse is over icon span
      const isOverIcon = (e) => {
        if (!iconSpan) return false;

        const iconRect = iconSpan.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const isOver = mouseX >= iconRect.left &&
               mouseX <= iconRect.right &&
               mouseY >= iconRect.top &&
               mouseY <= iconRect.bottom;

        return isOver;
      };

      // Click handler - toggle hint
      label.addEventListener('click', (e) => {
        // Don't toggle if global toggle-hint is active
        if (hint.classList.contains('shown')) return;

        if (isOverIcon(e)) {
          formGroup.classList.toggle('show-hint');
          e.preventDefault();
          e.stopPropagation();
        }
      });

      // Detect when hovering over icon to show hint
      label.addEventListener('mousemove', (e) => {
        // Don't show on hover if global toggle-hint is active
        if (hint.classList.contains('shown')) {
          label.style.cursor = 'default';
          return;
        }

        const overIcon = isOverIcon(e);
        LogUtil.log('Mousemove over label', [overIcon, !!iconSpan]);

        if (overIcon) {
          label.style.cursor = 'help';
          if (!formGroup.classList.contains('show-hint') && !showTimeout) {
            clearTimeout(hoverTimeout);

            // Wait 500ms before showing tooltip
            showTimeout = setTimeout(() => {
              // Get actual hint element height (hint is already in DOM but invisible)
              // Use scrollHeight as a fallback in case offsetHeight is 0
              const actualHintHeight = hint.offsetHeight || hint.scrollHeight;
              const hintOffset = 0.5; // rem offset from CSS (0.25rem above + 0.25rem spacing)
              const offsetInPx = hintOffset * parseFloat(getComputedStyle(document.documentElement).fontSize);
              const totalHintSpace = actualHintHeight + offsetInPx;

              LogUtil.log('Hint height calculation', [actualHintHeight, hint.offsetHeight, hint.scrollHeight, totalHintSpace]);

              // Find the scrollable parent
              let scrollParent = formGroup.parentElement;
              while (scrollParent && scrollParent !== document.body) {
                const overflowY = window.getComputedStyle(scrollParent).overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                  break;
                }
                scrollParent = scrollParent.parentElement;
              }

              // Check if hint would be clipped at the top if positioned above
              if (scrollParent && scrollParent !== document.body) {
                const scrollRect = scrollParent.getBoundingClientRect();
                const formGroupRect = formGroup.getBoundingClientRect();

                // Check if hint would be clipped at the top
                const wouldBeClippedAbove = (formGroupRect.top - totalHintSpace) < scrollRect.top;

                LogUtil.log('Clipping check', [wouldBeClippedAbove, formGroupRect.top, totalHintSpace, scrollRect.top]);

                if (wouldBeClippedAbove) {
                  formGroup.classList.add('hint-below');
                } else {
                  formGroup.classList.remove('hint-below');
                }
              }

              // Now show the hint
              formGroup.classList.add('show-hint');

              showTimeout = null;
            }, 500);
          }
        } else {
          label.style.cursor = 'default';
          // Cancel the show timeout if moving away from icon
          if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
          }
        }
      });

      label.addEventListener('mouseleave', () => {
        label.style.cursor = 'default';
        // Cancel the show timeout if leaving before it triggers
        if (showTimeout) {
          clearTimeout(showTimeout);
          showTimeout = null;
        }
        // Don't hide if global toggle-hint is active
        if (hint.classList.contains('shown')) return;

        // Delay hiding to allow moving to the hint itself
        hoverTimeout = setTimeout(() => {
          formGroup.classList.remove('show-hint');
        }, 500);
      });

      // Keep hint visible when hovering over it
      hint.addEventListener('mouseenter', () => {
        if (hint.classList.contains('shown')) return;

        clearTimeout(hoverTimeout);
        formGroup.classList.add('show-hint');
      });

      hint.addEventListener('mouseleave', () => {
        // Don't hide if global toggle-hint is active
        if (hint.classList.contains('shown')) return;

        hoverTimeout = setTimeout(() => {
          formGroup.classList.remove('show-hint');
        }, 500);
      });
    });

    LogUtil.log('Set up hint handlers for form groups with hints', [hintsFound]);
  }
}
