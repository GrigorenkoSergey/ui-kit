export interface RushElementConstructor extends CustomElementConstructor {
  new(): typeof RushElement;
  getConstructor(): typeof RushElement;
  defaultSheets: CSSStyleSheet[];
  observedAttributes: string[];
}

export interface RushElementInterface {
  shadowRoot: ShadowRoot;
  pendingUpdates: Set<string>
  eventAttributes: Set<string>
  
}

export const RushElement = class extends HTMLElement implements RushElementInterface {
  ["constructor"]!: typeof RushElement;

  shadowRoot!: ShadowRoot;
  pendingUpdates = new Set<string>();
  eventAttributes = new Set<string>();

  constructor() {
    super();
    this.attachShadow({mode: "open"});
  }

  static defaultSheets: CSSStyleSheet[] = [];
  static observedAttributes: string[] = [];
  static getConstructor() {
    return RushElement;
  }

  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = this.constructor.getConstructor().defaultSheets;
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

  render() {}
  attachHandlers() {}
  setDefaultAttributes() {}
};