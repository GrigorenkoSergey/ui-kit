export interface RushElementConstructor extends CustomElementConstructor {
  new(): RushElementInterface;
  defaultSheets: CSSStyleSheet[];
  observedAttributes: string[];
  init(): void;
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
  }

  connectedCallback() {
    const ctor = customElements.get(this.localName) as RushElementConstructor;
    this.shadowRoot.adoptedStyleSheets = ctor.defaultSheets;
    
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
