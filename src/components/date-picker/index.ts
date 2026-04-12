import template from "./template.html";
import css from "./style.css?raw";
import { initCustomElement, attachStyles2 } from "@/utils/customElementHelpers";
import { assert } from "@/utils/assert";
import { CustomCalendar } from "../custom-calendar";

const style = document.createElement("style");
style.id = "default-style";
style.textContent = css;

const defaultMinYear = 1970;
const defaultMaxYear = 2050;

const dateExpandableSequences = ["00", "01", "02", "03", "10", "20", "30"];
const monthExpandableSequeses = ["00", "01"];

const getHost = (elem: Element) => {
  const host = (elem.getRootNode() as ShadowRoot).host;
  assert(host instanceof DatePicker);
  return host;
};

const focusInputToThe = (dir: "left" | "right", from: HTMLInputElement) => {
  const method = dir === "left" ? "previousElementSibling" : "nextElementSibling";
  let next = from[method];
  while (next && !(next instanceof HTMLInputElement)) {
    next = next[method];
  }
  if (next) next.focus();
};

const getDateString = (date: Date) => date.toLocaleDateString("en", {
  year: "numeric", 
  month: "2-digit",
  day: "2-digit",
});

const observedAttributes = ["disabled", "min-year", "max-year", "open", "date", "locale"] as const;
type ObservedAttribute = (typeof observedAttributes)[number];

/**
 * @element date-picker
 * @description
 * A form-associated custom element that provides a user-friendly way to enter a date.
 * It consists of three input fields (day, month, year) and a popup calendar.
 *
 * @attr {boolean} open - Controls the visibility of the calendar popup.
 * @attr {string | null} date - The selected date as a string (e.g., "04/12/2026"). 
 * The format is based on toLocaleDateString with an "en" locale.
 * @attr {boolean} disabled - Disables the date picker.
 * @attr {boolean} required - Marks the date picker as a required field in a form.
 * @attr {number} min-year - The minimum selectable year in the calendar.
 * @attr {number} max-year - The maximum selectable year in the calendar.
 * @attr {string} locale - The locale to use for formatting the date inputs (e.g., "en-US", "en-GB").
 *
 * @prop {boolean} open
 * @prop {string | null} date
 * @prop {boolean} disabled
 * @prop {boolean} required
 * @prop {number} minYear
 * @prop {number} maxYear
 * @prop {string} locale
 *
 * @fires {CustomEvent<{ source: DatePicker, attribute: 'date', oldValue: string | null, newValue: string | null }>} change - 
 * Fired only when the `date` attribute's value actually changes.
 *
 * @example
 * <date-picker date="04/12/2026"></date-picker>
 */
export class DatePicker extends HTMLElement {
  [key: string]: unknown;
  ["constructor"]!: typeof DatePicker;

  shadowRoot!: ShadowRoot;
  internals;
  pendingUpdates = new Set<ObservedAttribute>();

  static defaultStyles: (HTMLStyleElement | HTMLLinkElement)[] = [style];
  static formAssociated = true;
  eventAttributes = new Set(["date"]);

  #nodes = {} as {
    yearInput: HTMLInputElement,
    monthInput: HTMLInputElement,
    dateInput: HTMLInputElement,
    calendarIcon: HTMLButtonElement,
  };

  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.internals = this.attachInternals();
  }

  formStateRestoreCallback(state: string) {
    this.date = state;
  }

  formResetCallback() {
    this.date = null;
    this.setInputs("");
  }

  formDisabledCallback(isDisabled: boolean) {
    this.disabled = isDisabled;
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

  focus() {
    this.#nodes.yearInput.focus();
  }

  static init() {
    initCustomElement("date-picker", DatePicker);
  }

  static observedAttributes = [...observedAttributes];

  get form() {
    return this.internals.form;
  }

  get open() {
    return this.hasAttribute("open");
  }

  set open(value: boolean) {
    this.toggleAttribute("open", value);
  }

  get minYear() {
    if (!this.hasAttribute("min-year")) return defaultMinYear;
    return Number(this.getAttribute("min-year"));
  }

  get maxYear() {
    if (!this.hasAttribute("max-year")) return defaultMaxYear;
    return Number(this.getAttribute("max-year"));
  }

  get date() {
    return this.getAttribute("date");
  }

  set date(value: string | null) {
    if (value) {
      this.setAttribute("date", value);
      this.internals.setFormValue(value);
    } else {
      this.removeAttribute("date");
      this.internals.setFormValue("");
    }

    if (this.required) {
      this.internals.setValidity({ valueMissing: !value }, "Please enter a valid date");
    }
  }

  get locale() {
    return this.getAttribute("locale") || navigator.language;
  }

  set locale(value: string) {
    this.setAttribute("locale", value);
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

  connectedCallback() {
    this.shadowRoot.innerHTML = template;
    attachStyles2(this, DatePicker.defaultStyles);

    this.cacheStaticNodes();
    this.attachHandlers();
    this.setDefaultAttributes();

    this.render();
  }

  attributeChangedCallback(
    name: ObservedAttribute,
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

  cacheStaticNodes() {
    const calendarIcon = this.shadowRoot.getElementById("icon-wrapper");
    assert(calendarIcon instanceof HTMLButtonElement);
    const yearInput = this.shadowRoot.getElementById("year");
    assert(yearInput instanceof HTMLInputElement);
    const monthInput = this.shadowRoot.getElementById("month");
    assert(monthInput instanceof HTMLInputElement);
    const dateInput = this.shadowRoot.getElementById("date");
    assert(dateInput instanceof HTMLInputElement);

    this.#nodes.calendarIcon = calendarIcon;
    this.#nodes.yearInput = yearInput;
    this.#nodes.monthInput = monthInput;
    this.#nodes.dateInput = dateInput;
  }

  attachHandlers() {
    const yearInput = this.#nodes.yearInput;
    yearInput.addEventListener("beforeinput", this.onBeforeInput as EventListener);
    yearInput.addEventListener("keydown", this.onInputKeydown as EventListener);

    const monthInput = this.#nodes.monthInput;
    monthInput.addEventListener("beforeinput", this.onBeforeInput as EventListener);
    monthInput.addEventListener("keydown", this.onInputKeydown as EventListener);

    const dateInput = this.#nodes.dateInput;
    dateInput.addEventListener("beforeinput", this.onBeforeInput as EventListener);
    dateInput.addEventListener("keydown", this.onInputKeydown as EventListener);

    const calendarIcon = this.#nodes.calendarIcon;
    calendarIcon?.addEventListener("click", this.onCalendarIconClick as EventListener);
  }

  setDefaultAttributes() {
    const ensureAttribute = (name: string, value: string | boolean) => {
      if (typeof value === "boolean") {
        if (value) this.setAttribute(name, "");
        else if (this.hasAttribute(name)) this.removeAttribute(name);
      } else if (!this.hasAttribute(name)) this.setAttribute(name, value);
    };

    ensureAttribute("min-year", String(this.minYear));
    ensureAttribute("max-year", String(this.maxYear));
    ensureAttribute("open", this.open);
    ensureAttribute("locale", this.locale);
  }

  render() {
    const yearInput = this.#nodes.yearInput;
    assert(yearInput instanceof HTMLInputElement);

    const {pendingUpdates} = this;
    if (pendingUpdates.has("min-year")) yearInput.min = String(this.minYear);
    if (pendingUpdates.has("max-year")) yearInput.max = String(this.maxYear);

    if (pendingUpdates.has("open")) {
      if (this.open) this.renderCalendar();
      else this.shadowRoot.getElementById("calendar")?.remove();
    }

    if (pendingUpdates.has("date")) {
      if (this.date) this.setInputs(new Date(this.date));
    }

    if (pendingUpdates.has("locale")) {
      this.reorderInputsAccordingToLocale(this.locale || undefined);
    }

    if (pendingUpdates.has("disabled")) this.disableOrEnableInputs();
    
    this.pendingUpdates.clear();
  }

  renderCalendar() {
    const calendarWrapper = this.shadowRoot.querySelector(".wrapper");
    assert(calendarWrapper);

    const calendar = document.createElement("custom-calendar") as CustomCalendar;
    calendar.id = "calendar";

    const validDate = this.date ? new Date(this.date) : new Date();
    calendar.year = validDate.getFullYear();
    calendar.month = validDate.getMonth();
    calendar.date = getDateString(validDate);

    calendarWrapper.append(calendar);
    calendar.shadowRoot.getElementById("ok")?.remove();

    const dateCell = calendar.shadowRoot?.
      getElementById("dates")?.
      querySelector("td[tabindex='0']");
    assert(dateCell instanceof HTMLElement);

    dateCell.focus();
    this.trapFocusInCalendar(calendar);

    calendar.addEventListener("keydown", this.onCalendarKeydown.bind(this));
    calendar.addEventListener("date-select", this.onDateSelectionInCalendar as EventListener);

    calendar.shadowRoot.getElementById("today")?. addEventListener("click", () => {
      this.open = false;
      this.date = getDateString(new Date());
    });

    calendar.shadowRoot.getElementById("cancel")?.addEventListener("click", () => {
      this.open = false;
    });

    calendar.addEventListener("blur", (e) => { 
      if (e.relatedTarget !== this.#nodes.calendarIcon) {
        this.open = false; 
      }
    }, {once: true});
  }

  onBeforeInput(event: InputEvent) {
    const {data, target} = event;
    if (!data) return;

    event.preventDefault();
    assert(target instanceof HTMLInputElement);
    if (data && !/\d+/.test(data)) return;

    const setValidValue = (
      max: number, 
      maxFirstChar?: string, 
      expandableSequences?: string[],
    ) => {
      let newValue = target.value.replace(/^0+/, "") + data;

      const {maxLength} = target;
      if (newValue.length > maxLength) newValue = data;
      if (maxFirstChar && newValue[0] > maxFirstChar) newValue = data;
      if (max && +newValue > max) newValue = String(max);

      target.value = newValue.padStart(maxLength, "0");

      if (expandableSequences && !expandableSequences?.includes(target.value)) {
        focusInputToThe("right", target);
      }
    };

    const host = getHost(target);
    if (target === host.#nodes.yearInput) {
      setValidValue(9999);
    } else if (target === host.#nodes.monthInput) {
      setValidValue(12, "1", monthExpandableSequeses);
    } else if (target === host.#nodes.dateInput) {
      setValidValue(31, "3", dateExpandableSequences);
    }
    
    const dateOrNull = host.inferDateFromInputs();
    host.date = dateOrNull ? getDateString(dateOrNull) : null;
  }

  onYearBeforeInput(event: InputEvent) {
    const {data, target} = event;
    if (!data) return;

    event.preventDefault();

    assert(target instanceof HTMLInputElement);
    if (data && !/\d+/.test(data)) return;
   
    const maxFirstChar: string = "";
    const max = 9999;
    let newValue = target.value.replace(/^0+/, "") + data;

    const {maxLength} = target;
    if (newValue.length > maxLength) newValue = data;
    if (maxFirstChar && newValue[0] > maxFirstChar) newValue = data;
    if (max && +newValue > max) newValue = String(max);

    target.value = newValue.padStart(maxLength, "0");
  }

  onInputKeydown(event: KeyboardEvent) {
    const {target, code} = event;
    assert(target instanceof HTMLInputElement);

    const host = getHost(this);

    switch (code) {
      case "Backspace": {
        event.preventDefault();
        target.value = "";
        break;
      }

      case "ArrowUp": {
        event.preventDefault();
        const {value} = target;

        const increase = (min: string, max: string, defaultValue: number) => {
          let newValue = "";
          if (value === max) newValue = min;
          else if (value === "") newValue = String(defaultValue);
          else newValue = String(+value + 1);
          target.value = newValue.padStart(target.maxLength, "0");
        };

        if (target === host.#nodes.yearInput) {
          increase("0000", "9999", new Date().getFullYear());
        } else if (target === host.#nodes.monthInput) {
          increase("01", "12", new Date().getMonth() + 1);
        } else if (target === host.#nodes.dateInput) {
          increase("01", "31", new Date().getDate());
        }
        break;
      }

      case "ArrowDown": {
        event.preventDefault();
        const {value} = target;

        const decrease = (min: string, max: string, defaultValue: number) => {
          let newValue = "";
          if (value === min) newValue = max;
          else if (value === "") newValue = String(defaultValue);
          else newValue = String(+value - 1);
          target.value = newValue.padStart(target.maxLength, "0");
        };

        if (target === host.#nodes.yearInput) {
          decrease("0000", "9999", new Date().getFullYear());
        } else if (target === host.#nodes.monthInput) {
          decrease("01", "12", new Date().getMonth() + 1);
        } else if (target === host.#nodes.dateInput) {
          decrease("01", "31", new Date().getDate());
        }
        break;
      }

      case "ArrowLeft": {
        event.preventDefault();
        focusInputToThe("left", target);
        break;
      }

      case "ArrowRight": {
        event.preventDefault();
        focusInputToThe("right", target);
        break;
      }
    }

    const dateOrNull = host.inferDateFromInputs();
    host.date = dateOrNull ? getDateString(dateOrNull) : null;
  }

  onCalendarIconClick() {
    const host = getHost(this);

    if (host.open) {
      host.open = false;
      return;
    }

    if (host.shadowRoot.querySelector(":invalid") === null) {
      host.open = true;
    }
  }

  onDateSelectionInCalendar(event: CustomEvent) {
    event.stopPropagation();

    const { date } = event.detail;
    assert(typeof date === "string");

    const host = getHost(this);
    host.open = false;
    host.date = date;
  }

  onCalendarKeydown(event: KeyboardEvent) {
    const {code} = event;
    const isDateCell = (item: unknown) => item instanceof HTMLElement && item.dataset.date;

    switch (code) {
      case "Enter":
      case "Space": {
        if (event.composedPath().some(isDateCell)) {
          this.#nodes.calendarIcon.focus();
          this.open = false;
        }
        break;
      }
      case "Escape": {
        this.#nodes.calendarIcon.focus();
        this.open = false; 
        break;
      }
    }
  }

  inferDateFromInputs() {
    if ([
      this.#nodes.dateInput.value, 
      this.#nodes.monthInput.value, 
      this.#nodes.yearInput.value,
    ].some(value => value === "")) return null;

    let validDate;
    const dateInInput = +this.#nodes.dateInput.value;
    if (dateInInput > 0 && dateInInput <= 31) {
      validDate = dateInInput;
    }
    if (!validDate) return null;

    let validMonth;
    const monthInInput = +this.#nodes.monthInput.value;
    if (monthInInput > 0 && monthInInput <= 12) {
      validMonth = monthInInput;
    }
    if (!validMonth) return null;

    let validYear;
    const yearInInput = +this.#nodes.yearInput.value;
    if (yearInInput >= this.minYear && yearInInput <= this.maxYear) {
      validYear = yearInInput;
    }
    if (!validYear) return null;

    return new Date(validYear, validMonth - 1, validDate);
  }

  trapFocusInCalendar(calendar: CustomCalendar) {
    const calendarRoot = calendar.shadowRoot;

    const first = calendarRoot.getElementById("year-month-toggler");
    const last = calendarRoot.getElementById("cancel");
    assert(first && last);

    const focusTrap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      if (event.shiftKey && calendarRoot.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (calendarRoot.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    calendarRoot.addEventListener("keydown", focusTrap as EventListener);
  }

  setInputs(validDate: Date | "") {
    const setIfNeeded = (input: HTMLInputElement, value: string) => {
      if (input.value !== value) input.value = value;
    };

    if (validDate) {
      setIfNeeded(this.#nodes.yearInput, String(validDate.getFullYear()).padStart(4, "0"));
      setIfNeeded(this.#nodes.monthInput, String(validDate.getMonth() + 1).padStart(2, "0"));
      setIfNeeded(this.#nodes.dateInput, String(validDate.getDate()).padStart(2, "0"));
    } else {
      setIfNeeded(this.#nodes.yearInput, "");
      setIfNeeded(this.#nodes.monthInput, "");
      setIfNeeded(this.#nodes.dateInput, "");
    }
  }

  reorderInputsAccordingToLocale(locale?: string) {
    const formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit"});
    const parts = formatter.formatToParts(new Date());

    if (parts[0].type === "literal") parts.shift();
    if (parts[parts.length - 1].type === "literal") parts.pop();

    const orderedNodes = parts.map(item => {
      switch (item.type) {
        case "day": return this.#nodes.dateInput;
        case "month": return this.#nodes.monthInput;
        case "year": return this.#nodes.yearInput;
        default: {
          const span = document.createElement("span");
          span.textContent = item.value;
          return span;
        }
      }
    });

    const container = this.shadowRoot.getElementById("input-wrapper");
    container?.replaceChildren(...orderedNodes);

    const label = this.shadowRoot.getElementById("first-input-label");
    const firstElementId = orderedNodes[0].id;
    label?.setAttribute("for", firstElementId);
  }

  private disableOrEnableInputs() {
    const isDisabled = this.disabled;
    this.#nodes.calendarIcon.disabled = isDisabled;
    this.#nodes.dateInput.disabled = isDisabled;
    this.#nodes.monthInput.disabled = isDisabled;
    this.#nodes.yearInput.disabled = isDisabled;
  }
}