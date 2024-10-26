function normaliseString(value, property) {
  const trimmedValue = value ? value.trim() : '';
  let output;
  let outputType = property == null ? void 0 : property.type;
  if (!outputType) {
    if (['true', 'false'].includes(trimmedValue)) {
      outputType = 'boolean';
    }
    if (trimmedValue.length > 0 && isFinite(Number(trimmedValue))) {
      outputType = 'number';
    }
  }
  switch (outputType) {
    case 'boolean':
      output = trimmedValue === 'true';
      break;
    case 'number':
      output = Number(trimmedValue);
      break;
    default:
      output = value;
  }
  return output;
}

/**
 * @typedef {import('./index.mjs').SchemaProperty} SchemaProperty
 */

function mergeConfigs(...configObjects) {
  const formattedConfigObject = {};
  for (const configObject of configObjects) {
    for (const key of Object.keys(configObject)) {
      const option = formattedConfigObject[key];
      const override = configObject[key];
      if (isObject(option) && isObject(override)) {
        formattedConfigObject[key] = mergeConfigs(option, override);
      } else {
        formattedConfigObject[key] = override;
      }
    }
  }
  return formattedConfigObject;
}
function extractConfigByNamespace(Component, dataset, namespace) {
  const property = Component.schema.properties[namespace];
  if ((property == null ? void 0 : property.type) !== 'object') {
    return;
  }
  const newObject = {
    [namespace]: ({})
  };
  for (const [key, value] of Object.entries(dataset)) {
    let current = newObject;
    const keyParts = key.split('.');
    for (const [index, name] of keyParts.entries()) {
      if (typeof current === 'object') {
        if (index < keyParts.length - 1) {
          if (!isObject(current[name])) {
            current[name] = {};
          }
          current = current[name];
        } else if (key !== namespace) {
          current[name] = normaliseString(value);
        }
      }
    }
  }
  return newObject[namespace];
}
function isInitialised($root, moduleName) {
  return $root instanceof HTMLElement && $root.hasAttribute(`data-${moduleName}-init`);
}

/**
 * Checks if GOV.UK Frontend is supported on this page
 *
 * Some browsers will load and run our JavaScript but GOV.UK Frontend
 * won't be supported.
 *
 * @param {HTMLElement | null} [$scope] - (internal) `<body>` HTML element checked for browser support
 * @returns {boolean} Whether GOV.UK Frontend is supported on this page
 */
function isSupported($scope = document.body) {
  if (!$scope) {
    return false;
  }
  return $scope.classList.contains('govuk-frontend-supported');
}
function isArray(option) {
  return Array.isArray(option);
}
function isObject(option) {
  return !!option && typeof option === 'object' && !isArray(option);
}
function formatErrorMessage(Component, message) {
  return `${Component.moduleName}: ${message}`;
}

/**
 * Schema for component config
 *
 * @typedef {object} Schema
 * @property {{ [field: string]: SchemaProperty | undefined }} properties - Schema properties
 * @property {SchemaCondition[]} [anyOf] - List of schema conditions
 */

/**
 * Schema property for component config
 *
 * @typedef {object} SchemaProperty
 * @property {'string' | 'boolean' | 'number' | 'object'} type - Property type
 */

/**
 * Schema condition for component config
 *
 * @typedef {object} SchemaCondition
 * @property {string[]} required - List of required config fields
 * @property {string} errorMessage - Error message when required config fields not provided
 */
/**
 * @typedef ComponentWithModuleName
 * @property {string} moduleName - Name of the component
 */

function normaliseDataset(Component, dataset) {
  const out = {};
  for (const [field, property] of Object.entries(Component.schema.properties)) {
    if (field in dataset) {
      out[field] = normaliseString(dataset[field], property);
    }
    if ((property == null ? void 0 : property.type) === 'object') {
      out[field] = extractConfigByNamespace(Component, dataset, field);
    }
  }
  return out;
}

class GOVUKFrontendError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'GOVUKFrontendError';
  }
}
class SupportError extends GOVUKFrontendError {
  /**
   * Checks if GOV.UK Frontend is supported on this page
   *
   * @param {HTMLElement | null} [$scope] - HTML element `<body>` checked for browser support
   */
  constructor($scope = document.body) {
    const supportMessage = 'noModule' in HTMLScriptElement.prototype ? 'GOV.UK Frontend initialised without `<body class="govuk-frontend-supported">` from template `<script>` snippet' : 'GOV.UK Frontend is not supported in this browser';
    super($scope ? supportMessage : 'GOV.UK Frontend initialised without `<script type="module">`');
    this.name = 'SupportError';
  }
}
class ElementError extends GOVUKFrontendError {
  constructor(messageOrOptions) {
    let message = typeof messageOrOptions === 'string' ? messageOrOptions : '';
    if (typeof messageOrOptions === 'object') {
      const {
        component,
        identifier,
        element,
        expectedType
      } = messageOrOptions;
      message = identifier;
      message += element ? ` is not of type ${expectedType != null ? expectedType : 'HTMLElement'}` : ' not found';
      message = formatErrorMessage(component, message);
    }
    super(message);
    this.name = 'ElementError';
  }
}
class InitError extends GOVUKFrontendError {
  constructor(componentOrMessage) {
    const message = typeof componentOrMessage === 'string' ? componentOrMessage : formatErrorMessage(componentOrMessage, `Root element (\`$root\`) already initialised`);
    super(message);
    this.name = 'InitError';
  }
}
/**
 * @typedef {import('../common/index.mjs').ComponentWithModuleName} ComponentWithModuleName
 */

class GOVUKFrontendComponent {
  /**
   * Returns the root element of the component
   *
   * @protected
   * @returns {RootElementType} - the root element of component
   */
  get $root() {
    return this._$root;
  }
  constructor($root) {
    this._$root = void 0;
    const childConstructor = this.constructor;
    if (typeof childConstructor.moduleName !== 'string') {
      throw new InitError(`\`moduleName\` not defined in component`);
    }
    if (!($root instanceof childConstructor.elementType)) {
      throw new ElementError({
        element: $root,
        component: childConstructor,
        identifier: 'Root element (`$root`)',
        expectedType: childConstructor.elementType.name
      });
    } else {
      this._$root = $root;
    }
    childConstructor.checkSupport();
    this.checkInitialised();
    const moduleName = childConstructor.moduleName;
    this.$root.setAttribute(`data-${moduleName}-init`, '');
  }
  checkInitialised() {
    const constructor = this.constructor;
    const moduleName = constructor.moduleName;
    if (moduleName && isInitialised(this.$root, moduleName)) {
      throw new InitError(constructor);
    }
  }
  static checkSupport() {
    if (!isSupported()) {
      throw new SupportError();
    }
  }
}

/**
 * @typedef ChildClass
 * @property {string} moduleName - The module name that'll be looked for in the DOM when initialising the component
 */

/**
 * @typedef {typeof GOVUKFrontendComponent & ChildClass} ChildClassConstructor
 */
GOVUKFrontendComponent.elementType = HTMLElement;

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
//# sourceMappingURL=button.bundle.mjs.map
