export interface RushFormElementConstructor extends CustomElementConstructor {
  new(): RushFormElementInterface;
  defaultTemplate: string,
  defaultSheets: CSSStyleSheet[];
  observedAttributes: string[];
  init(): void;
  getConstructor(): RushFormElementConstructor;
}

export interface RushFormElementInterface {
  shadowRoot: ShadowRoot;
  pendingUpdates: Set<string>
  eventAttributes: Set<string>
}

export abstract class RushFormElement extends HTMLElement implements RushFormElementInterface {
  shadowRoot!: ShadowRoot;
  internals;

  abstract pendingUpdates: Set<string>;
  abstract eventAttributes: Set<string>;

  abstract render(): void;
  abstract attachHandlers(): void;
  abstract setDefaultAttributes(): void;

  static formAssociated = true;
  abstract formResetCallback(): void;
  abstract formStateRestoreCallback(state: string): void;

  formDisabledCallback(isDisabled: boolean) {
    this.disabled = isDisabled;
  }

  get form() {
    return this.internals.form;
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.toggleAttribute("disabled", value);
  }

  get required() {
    return this.hasAttribute("required");
  }

  set required(value: boolean) {
    this.toggleAttribute("required", value);
  }

  get validity() {
    return this.internals.validity;
  }

  get willValidate() {
    return this.internals.willValidate;
  }

  get validationMessage() {
    return this.internals.validationMessage;
  }
  
  reportValidity() {
    this.internals.reportValidity();
  }

  checkValidity() {
    this.internals.checkValidity();
  }

  setCustomValidity(message: string) {
    if (message === "") this.internals.setValidity({});
    else this.internals.setValidity({ customError: true }, message);
  }

  constructor() {
    super();
    this.attachShadow({mode: "open", delegatesFocus: true});
    this.internals = this.attachInternals();

    const ctor = customElements.get(this.localName) as RushFormElementConstructor;
    this.shadowRoot.adoptedStyleSheets = ctor.defaultSheets;
    this.shadowRoot.innerHTML = ctor.defaultTemplate;
  }

  connectedCallback() {
    this.attachHandlers();
    this.setDefaultAttributes();
    this.render();
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | boolean,
    newValue: string | boolean,
  ) {
    if (oldValue === newValue) return;

    this.pendingUpdates.add(name);
    if (this.pendingUpdates.size <= 1) {
      queueMicrotask(() => {
        if (this.pendingUpdates.size) this.render();
        this.pendingUpdates.clear();
      });
    }

    if (this.eventAttributes.has(name)) {
      queueMicrotask(() => {
        this.dispatchEvent(new CustomEvent("change", { 
          bubbles: true, 
          composed: true,
          detail: {source: this, attribute: name, oldValue, newValue},
        }));
      });
    }
  }
}

export function createRushElement<T extends RushFormElementConstructor>(ctor: T): T {
  return ctor;
}

/**
 * @param {String} name
 * @param {HTMLElement} constructor
 */
export function initCustomElement<C extends RushFormElementConstructor>(name: string, constructor: C) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor); 
  }
}
