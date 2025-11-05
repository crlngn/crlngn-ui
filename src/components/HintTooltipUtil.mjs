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
        setTimeout(() => {
          HintTooltipUtil.applyHintHandlers(element);
        }, 100);
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
        LogUtil.log(`HintTooltipUtil: renderApplicationV2 hook called (generic)`, [app.constructor.name, element?.id, element?.className], true);

        setTimeout(() => {
          HintTooltipUtil.applyHintHandlers(element);
        }, 100);
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

      // Inject a span element for the question mark icon instead of using ::after
      const iconSpan = document.createElement('span');
      iconSpan.className = 'crlngn-hint-icon';
      iconSpan.textContent = '?';
      iconSpan.style.cursor = 'help';
      label.appendChild(iconSpan);

      // Helper function to check if mouse is over icon span
      const isOverIcon = (e) => {
        const iconRect = iconSpan.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        return mouseX >= iconRect.left &&
               mouseX <= iconRect.right &&
               mouseY >= iconRect.top &&
               mouseY <= iconRect.bottom;
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

        if (isOverIcon(e)) {
          label.style.cursor = 'help';
          if (!formGroup.classList.contains('show-hint') && !showTimeout) {
            clearTimeout(hoverTimeout);

            // Wait 500ms before showing tooltip
            showTimeout = setTimeout(() => {
              // Check positioning BEFORE showing the hint
              // Find the scrollable parent
              let scrollParent = formGroup.parentElement;
              while (scrollParent && scrollParent !== document.body) {
                const overflowY = window.getComputedStyle(scrollParent).overflowY;
                if (overflowY === 'auto' || overflowY === 'scroll') {
                  break;
                }
                scrollParent = scrollParent.parentElement;
              }

              // Estimate if hint would be clipped based on form-group position
              if (scrollParent && scrollParent !== document.body) {
                const scrollRect = scrollParent.getBoundingClientRect();
                const formGroupRect = formGroup.getBoundingClientRect();

                // Estimate hint height (roughly 60-80px with padding)
                const estimatedHintHeight = 80;
                const wouldBeClipped = (formGroupRect.top - estimatedHintHeight) < scrollRect.top;

                if (wouldBeClipped) {
                  formGroup.classList.add('hint-below');
                } else {
                  formGroup.classList.remove('hint-below');
                }
              }

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
        }, 200);
      });

      // Keep hint visible when hovering over it
      hint.addEventListener('mouseenter', () => {
        // Don't manage visibility if global toggle-hint is active
        if (hint.classList.contains('shown')) return;

        clearTimeout(hoverTimeout);
        formGroup.classList.add('show-hint');
      });

      hint.addEventListener('mouseleave', () => {
        // Don't hide if global toggle-hint is active
        if (hint.classList.contains('shown')) return;

        hoverTimeout = setTimeout(() => {
          formGroup.classList.remove('show-hint');
        }, 200);
      });
    });

    LogUtil.log('Set up hint handlers for form groups with hints', [hintsFound]);
  }
}
