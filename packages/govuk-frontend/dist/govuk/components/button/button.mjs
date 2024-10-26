import { mergeConfigs } from '../../common/index.mjs';
import { normaliseDataset } from '../../common/normalise-dataset.mjs';
import { GOVUKFrontendComponent } from '../../govuk-frontend-component.mjs';

const DEBOUNCE_TIMEOUT_IN_SECONDS = 1;

/**
 * JavaScript enhancements for the Button component
 *
 * @preserve
 */
class Button extends GOVUKFrontendComponent {
  /**
   * @param {Element | null} $root - HTML element to use for button
   * @param {ButtonConfig} [config] - Button config
   */
  constructor($root, config = {}) {
    super($root);
    this.config = void 0;
    this.debounceFormSubmitTimer = null;
    this.config = mergeConfigs(Button.defaults, config, normaliseDataset(Button, this.$root.dataset));
    this.$form = this.$root.closest('form');
    this.$root.addEventListener('keydown', event => this.handleKeyDown(event));
    this.$root.addEventListener('click', event => this.handleClick(event));
  }

  /**
   * Handle click events
   * @param {MouseEvent} event - Click event
   */
  handleClick(event) {
    if (this.debounce(event) === false) {
      return;
    }
    if (this.config.enableValidation && this.$form && this.$root.getAttribute('type') === 'submit') {
      this.handleFormSubmit(event);
    }
  }

  /**
   * Handle form submission and validation
   * @param {Event} event - The submission event
   */
  handleFormSubmit(event) {
    this.clearErrors();
    const validationSelectors = this.config.validationSelectors || {};
    let isValid = true;
    const errors = [];
    for (const [field, selector] of Object.entries(validationSelectors)) {
      const $element = this.$form.querySelector(selector);
      if (!$element) continue;
      const valid = this.validateElement($element, field);
      if (!valid) {
        var _this$config$validati;
        isValid = false;
        errors.push({
          field,
          element: $element,
          message: ((_this$config$validati = this.config.validationMessages) == null ? void 0 : _this$config$validati[field]) || 'This field is required'
        });
      }
    }
    if (!isValid) {
      event.preventDefault();
      this.showErrors(errors);
      if (this.config.focusOnError && errors.length > 0) {
        errors[0].element.focus();
      }
    }
  }

  /**
   * Validate a single form element
   * @param {Element} $element - The element to validate
   * @param {string} field - The field name
   * @returns {boolean} - Whether the element is valid
   */
  validateElement($element, field) {
    if ($element.type === 'checkbox') {
      return $element.checked;
    }
    if ($element.type === 'radio') {
      const name = $element.getAttribute('name');
      return name ? this.$form.querySelector(`input[name="${name}"]:checked`) !== null : false;
    }
    return $element.value.trim() !== '';
  }
  clearErrors() {
    this.$form.querySelectorAll('.govuk-form-group--error').forEach($group => $group.classList.remove('govuk-form-group--error'));
    this.$form.querySelectorAll('.govuk-error-message').forEach($error => $error.remove());
    const $errorSummary = this.$form.querySelector('.govuk-error-summary');
    if ($errorSummary) {
      $errorSummary.remove();
    }
  }

  /**
   * Display validation errors
   * @param {Array<{field: string, element: Element, message: string}>} errors - List of errors
   */
  showErrors(errors) {
    errors.forEach(({
      element,
      message
    }) => {
      const $formGroup = element.closest('.govuk-form-group');
      if (!$formGroup) return;
      $formGroup.classList.add('govuk-form-group--error');
      const $error = document.createElement('p');
      $error.className = 'govuk-error-message';
      $error.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`;
      const $field = $formGroup.querySelector('.govuk-input, .govuk-fieldset');
      if ($field) {
        var _$field$parentNode;
        (_$field$parentNode = $field.parentNode) == null || _$field$parentNode.insertBefore($error, $field);
      }
    });
    if (this.config.showErrorSummary && errors.length > 0) {
      this.createErrorSummary(errors);
    }
  }

  /**
   * Create and insert error summary
   * @param {Array<{field: string, element: Element, message: string}>} errors - List of errors
   */
  createErrorSummary(errors) {
    const $summary = document.createElement('div');
    $summary.className = 'govuk-error-summary';
    $summary.setAttribute('data-module', 'govuk-error-summary');
    $summary.innerHTML = `
      <div role="alert">
        <h2 class="govuk-error-summary__title">
          There is a problem
        </h2>
        <div class="govuk-error-summary__body">
          <ul class="govuk-list govuk-error-summary__list">
            ${errors.map(({
      message
    }) => `
              <li>${message}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    this.$form.insertBefore($summary, this.$form.firstChild);
  }
  handleKeyDown(event) {
    const $target = event.target;
    if (event.key !== ' ') {
      return;
    }
    if ($target instanceof HTMLElement && $target.getAttribute('role') === 'button') {
      event.preventDefault();
      $target.click();
    }
  }
  debounce(event) {
    if (!this.config.preventDoubleClick) {
      return;
    }
    if (this.debounceFormSubmitTimer) {
      event.preventDefault();
      return false;
    }
    this.debounceFormSubmitTimer = window.setTimeout(() => {
      this.debounceFormSubmitTimer = null;
    }, DEBOUNCE_TIMEOUT_IN_SECONDS * 1000);
  }
}

/**
 * Button config
 *
 * @typedef {object} ButtonConfig
 * @property {boolean} [preventDoubleClick=false] - Prevent accidental double
 *   clicks on submit buttons from submitting forms multiple times.
 * @property {boolean} [enableValidation=false] - Enable form validation
 * @property {Object.<string, string>} [validationSelectors] - Selectors for elements to validate
 * @property {Object.<string, string>} [validationMessages] - Custom error messages for fields
 * @property {boolean} [focusOnError=true] - Focus the first invalid element
 * @property {boolean} [showErrorSummary=true] - Show error summary at top of form
 */

/**
 * @typedef {import('../../common/index.mjs').Schema} Schema
 */
Button.moduleName = 'govuk-button';
Button.defaults = Object.freeze({
  preventDoubleClick: false,
  enableValidation: false,
  validationSelectors: {},
  validationMessages: {},
  focusOnError: true,
  showErrorSummary: true
});
Button.schema = Object.freeze({
  properties: {
    preventDoubleClick: {
      type: 'boolean'
    },
    enableValidation: {
      type: 'boolean'
    },
    validationSelectors: {
      type: 'object'
    },
    validationMessages: {
      type: 'object'
    },
    focusOnError: {
      type: 'boolean'
    },
    showErrorSummary: {
      type: 'boolean'
    }
  }
});

export { Button };
//# sourceMappingURL=button.mjs.map
