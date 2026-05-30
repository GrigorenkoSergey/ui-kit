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
    ul: HTMLUListElement,
  };
  options: unknown[] = [];

  get open() {
    return this.hasAttribute("open");
  }
  set open(value: boolean) {
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  get value() {
    return this.getAttribute("value") || "";
  }
  set value(value: string) {
    this.setAttribute("value", value);
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

    const ul = this.shadowRoot.querySelector("ul");
    assert(ul instanceof HTMLUListElement);
    this.#nodes.ul = ul;
  }

  render() {
    if (this.pendingUpdates.has("value")) {
      this.#nodes.input.value = this.value;
    }

    if (this.pendingUpdates.has("open")) {
      const isOpen = this.open;

      this.removeEventListener("blur", this.onBlur);
      this.ariaExpanded = String(isOpen);

      if (isOpen) {
        this.renderList();
        this.addEventListener("blur", this.onBlur);
      } else {
        this.#nodes.ul.innerHTML = "";
      }
    }

    this.pendingUpdates.clear();
  }

  renderLi(item: unknown, index: number) {
    const isSelected = item === this.value;

    // tabindex="-1" is important for proper blur event handler
    return `
      <li 
        id='option-${index}'
        data-value='${item}' 
        tabindex='${isSelected ? 0 : -1}'
        ${isSelected ? "aria-selected='true'" : ""}
        role='option'
      >
        ${item}
      </li>`;
  }

  renderList() {
    const lis = this.options.map((item, index) => this.renderLi(item, index));
    this.#nodes.ul.innerHTML = lis.join("");
  }

  onClick(event: MouseEvent) {
    const {target} = event;
    assert(target instanceof HTMLElement);

    const host = getHost(this);

    if (target === host.#nodes.input) {
      host.open = !host.open;
    }

    if (target.tagName === "LI") {
      host.value = target.getAttribute("data-value") || "";
      host.open = false;
    }
  }

  onBlur() {
    this.open = false;
    this.removeEventListener("blur", this.onBlur);
  }
},
);