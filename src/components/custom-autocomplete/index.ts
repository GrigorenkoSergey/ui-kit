import template from "./template.html";
import css from "./style.css?raw";
import { initCustomElement } from "@/utils/customElementHelpers";
import { assert } from "@/utils/assert";

import { createRushElement, RushElement } from "../rush-element";

const defaultSheet = new CSSStyleSheet();
defaultSheet.replaceSync(css);

const observedAttributes = ["value", "open"] as const;
type ObservedAttribute = typeof observedAttributes[number];
const tagName = "custom-autocomplete";

const getHost = (elem: Element) => {
  const host = (elem.getRootNode() as ShadowRoot).host;
  assert(host instanceof CustomAutocomplete);
  return host;
};

export const CustomAutocomplete = createRushElement(class extends RushElement {
  pendingUpdates: Set<ObservedAttribute> = new Set();
  eventAttributes: Set<string> = new Set();

  static defaultSheets = [defaultSheet];
  static observedAttributes = [...observedAttributes];

  static init() {
    initCustomElement(tagName, CustomAutocomplete);
  }

  static getConstructor() {
    const result = customElements.get(tagName) || CustomAutocomplete;
    return result as typeof CustomAutocomplete;
  }

  #nodes = {} as {
    input: HTMLInputElement,
  };

  get open() {
    return this.hasAttribute("open");
  }
  set open(value: boolean) {
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  constructor() {
    super();
  }

  connectedCallback(): void {
    this.shadowRoot.innerHTML = template;
    this.cacheStaticNodes(); 
    super.connectedCallback();
  }

  attachHandlers(): void {
    this.shadowRoot.addEventListener("click", this.onClick as EventListener);
  }

  setDefaultAttributes(): void {
    
  }

  cacheStaticNodes() {
    const input = this.shadowRoot.querySelector("input");
    assert(input instanceof HTMLInputElement);
    this.#nodes.input = input;
  }

  render() {
    if (this.pendingUpdates.has("open")) {
      this.removeEventListener("blur", this.onBlur);
      if (this.open) this.addEventListener("blur", this.onBlur);
    }

    this.pendingUpdates.clear();
  }

  onClick(event: MouseEvent) {
    const host = getHost(this);

    if (event.target === host.#nodes.input) {
      host.open = !host.open;
    }
  }

  onBlur() {
    this.open = false;
    this.removeEventListener("blur", this.onBlur);
  }
},
);