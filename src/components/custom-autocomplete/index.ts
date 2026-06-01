import template from "./template.html";
import css from "./style.css?raw";
import { initCustomElement } from "@/utils/customElementHelpers";
import { assert } from "@/utils/assert";

import { createRushElement, RushElement } from "../rush-element";

const defaultSheet = new CSSStyleSheet();
defaultSheet.replaceSync(css);

const observedAttributes = ["value", "open", "pattern"] as const;
type ObservedAttribute = typeof observedAttributes[number];
const tagName = "custom-autocomplete";

type Option = {value: string, label?: string};

const getNextVisibleElement = (startPoint: Element | null, dir: 1 | -1) => {
  if (!startPoint) return null;

  const method = dir === 1 ? "nextElementSibling" : "previousElementSibling";
  let next = startPoint[method];
  while (next instanceof HTMLElement && next.hidden) next = next[method];

  return next;
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
  options: Option[] = [];

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

  get pattern() {
    return this.getAttribute("pattern") || "";
  }
  set pattern(value: string) {
    this.setAttribute("pattern", value);
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
    this.shadowRoot.addEventListener("click", this);
    this.#nodes.input.addEventListener("input", this);
    this.shadowRoot.addEventListener("keydown", this);
  }

  handleEvent(event: Event) {
    switch (event.type) {
      case ("click"): return this.onClick(event as MouseEvent);
      case ("input"): return this.onInput();
      case ("keydown"): return this.onKeydown(event as KeyboardEvent);
    }
  }

  setDefaultAttributes(): void {
    this.role = "combobox";
    this.ariaHasPopup = "listbox";
    this.setAttribute("aria-controls", "ul");
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

    if (this.pendingUpdates.has("value")) {
      this.#nodes.input.value = this.value;
    }

    if (this.pendingUpdates.has("pattern")) {
      this.filterList();
    }

    if (this.open) this.markSelectedLi(); // скорее всего проще закешировать ноду

    this.pendingUpdates.clear();
  }

  renderLi(option: Option, index: number) {
    const {value, label = value} = option;
    return `<li id='option-${index}' data-value='${value}' role='option' tabindex='-1'>${label}</li>`;
  }

  renderList() {
    const lis = this.options.map((option, index) => this.renderLi(option, index));
    this.#nodes.ul.innerHTML = lis.join("");
  }

  markSelectedLi() {
    const value = this.value;

    ([...this.#nodes.ul.children] as HTMLLIElement[]).forEach(li => {
      const liValue = li.getAttribute("data-value");
      const isSelected = liValue === value;

      li.tabIndex = isSelected ? 0 : -1;
      li.ariaSelected = isSelected ? "true" : "false";
    });
  }

  filterList() {
    const pattern = this.pattern;
    [...this.#nodes.ul.children].forEach(li => {
      const isMatch = pattern === "" ? true : li.textContent.toLowerCase().includes(pattern);

      const elem = li as HTMLLIElement;
      elem.hidden = !isMatch;
    });
  }

  onClick(event: MouseEvent) {
    const { target } = event;
    if (!(target instanceof HTMLElement)) return;
  
    if (target === this.#nodes.input) {
      this.open = !this.open;
    }
  
    if (target.tagName === "LI") {
      this.value = target.getAttribute("data-value") || "";
      this.open = false;
    }
  }

  onBlur() {
    this.open = false;
    this.removeEventListener("blur", this.onBlur);
  }

  onInput() {
    const newPattern = this.#nodes.input.value.toLowerCase();
    this.pattern = newPattern;
    if (newPattern === "") this.value = "";
  }

  onKeydown(event: KeyboardEvent) {
    const { key } = event;

    switch (key) {
      case ("ArrowDown"):
      case ("ArrowUp"): return this.onArrowKeydown(event);

      case ("Escape"): {
        if (this.open) this.open = false;
        return;
      }

      case ("Tab"): {
        if (this.open && this.value) {
          const next = this.#nodes.ul.querySelector("li:not(hidden)[tabindex='0']");
          if (next instanceof HTMLLIElement) {
            next.classList.add("keyboard-focused");
          }
        }
        return;
      }

      case ("Enter"): {
        const focusedLi = this.#nodes.ul.querySelector("li.keyboard-focused");
        if (focusedLi instanceof HTMLLIElement) {
          focusedLi.click();
        }
      }
    }
  }

  onArrowKeydown(event: KeyboardEvent) {
    event.preventDefault(); // so that the cursor does not move

    if (!this.open) return this.open = true;

    const {key} = event;
    const searchDirection = key === "ArrowDown" ? 1 : -1;
    const ul = this.#nodes.ul;
    const focusedLi = ul.querySelector("li.keyboard-focused");

    let next;
    if (focusedLi instanceof HTMLLIElement) {
      next = getNextVisibleElement(focusedLi, searchDirection);
    } else if (this.value) {
      next = ul.querySelector("li:not(hidden)[tabindex='0']");
    } else if (searchDirection === 1) {
      next = ul.querySelector("li:not(hidden)");
    } else {
      const nonHiddenLis = [...ul.querySelectorAll("li:not(hidden)")];
      next = nonHiddenLis[nonHiddenLis.length - 1];
    }

    if (next instanceof HTMLLIElement) {
      focusedLi?.classList.remove("keyboard-focused");
      next.classList.add("keyboard-focused");
      this.#nodes.input.setAttribute("aria-activedescendant", next.id);
    }
  }
},
);