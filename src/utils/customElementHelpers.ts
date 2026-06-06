import { RushElementConstructor } from "@/components/rush-element";

/**
 * @param {String} name
 * @param {HTMLElement} constructor
 */
export function initCustomElement<C extends RushElementConstructor>(name: string, constructor: C) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor); 
  }
}
