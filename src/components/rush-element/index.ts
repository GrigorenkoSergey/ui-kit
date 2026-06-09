
export interface RushElementConstructor extends CustomElementConstructor {
  new(): RushElementInterface;
  defaultTemplate: string,
  defaultSheets: CSSStyleSheet[];
  observedAttributes: string[];
  init(): void;
  /**
   * Должен возвращать "правильный" конструктор кастомного элемента.
   * Это решает проблему дублирования модулей, когда сборщики (напр. Webpack)
   * могут создать несколько экземпляров класса при динамическом импорте.
   * Метод гарантирует, что мы всегда работаем с тем конструктором,
   * который был зарегистрирован в `customElements`.
   * @example
   * static getConstructor() {
   * const result = customElements.get("your-custom-tag-name") || YourClass;
   *   return result as typeof YourClass;
   * }
   */
  getConstructor(): RushElementConstructor;
}

export interface RushElementInterface {
  shadowRoot: ShadowRoot;
  pendingUpdates: Set<string>
  eventAttributes: Set<string>
}

export abstract class RushElement extends HTMLElement implements RushElementInterface {
  shadowRoot!: ShadowRoot;

  abstract pendingUpdates: Set<string>;
  abstract eventAttributes: Set<string>;

  abstract render(): void;
  abstract attachHandlers(): void;
  abstract setDefaultAttributes(): void;

  constructor() {
    super();
    this.attachShadow({mode: "open"});

    const ctor = customElements.get(this.localName) as RushElementConstructor;
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

export function createRushElement<T extends RushElementConstructor>(ctor: T): T {
  return ctor;
}

/**
 * @param {String} name
 * @param {HTMLElement} constructor
 */
export function initCustomElement<C extends RushElementConstructor>(name: string, constructor: C) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor); 
  }
}
