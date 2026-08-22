import template from "./template.html";
import css from "./style.css?raw";
import { assert } from "@/utils/assert";
import { createRushElement, RushElement, initCustomElement } from "../rush-element";
import translations from "./translations";

const msInDay = 24 * 60 * 60 * 1000;

const monthDates = (d: string) => {
  const date = new Date(d);

  const startOfMonth = new Date(date).setDate(1);
  const endOfMonth = new Date(date).setFullYear(date.getFullYear(), date.getMonth() + 1, 0);
  const daysInCurrentMonth = (endOfMonth - startOfMonth) / (msInDay) + 1;

  const weekDayOfMonthStart = new Date(startOfMonth).getDay();
  const weekDayOfMonthEnd = new Date(endOfMonth).getDay();
  const daysFromPrevMonth = weekDayOfMonthStart === 0 ? 6 : weekDayOfMonthStart - 1;
  const daysFromNextMonth = weekDayOfMonthEnd === 0 ? 0 : 7 - weekDayOfMonthEnd;

  const daysInCalendar = daysFromPrevMonth + daysInCurrentMonth + daysFromNextMonth; 
  const dates = Array.from(
    {length: daysInCalendar}, 
    (_, i) => new Date(startOfMonth - (daysFromPrevMonth - i) * msInDay),
  );

  return dates;
};

const getHost = (elem: Element) => {
  const host = (elem.getRootNode() as ShadowRoot).host;
  assert(host instanceof CustomCalendar);
  return host;
};

type View = "dates" | "months" | "years";
type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowDown" | "ArrowUp";

const observedAttributes = ["year", "month", "date", "view", "locale"] as const;
type ObservedAttribute = typeof observedAttributes[number];

export const getDateString = (date: Date) => { // to YYYY-MM-DD (locale date)
  const fullYear = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateStr = String(date.getDate()).padStart(2, "0");

  return `${fullYear}-${month}-${dateStr}`;
};

export const defaultMinDate = getDateString(new Date(1970, 0, 1));
export const defaultMaxDate = getDateString(new Date(2050, 11, 31, 23, 59, 49));

const defaultSheet = new CSSStyleSheet();
defaultSheet.replaceSync(css);

// grid pattern https://www.w3.org/WAI/ARIA/apg/patterns/grid/
/**
 * @element custom-calendar
 * @description
 * A custom element that provides a calendar grid for date selection.
 * It allows navigation by month and year, and selection of a specific date.
 *
 * @attr {string} view - The current view of the calendar. Can be "dates", "months", or "years".
 * @attr {number} year - The currently displayed year.
 * @attr {number} month - The currently displayed month (0-indexed).
 * @attr {string} date - The selected date in "YYYY-MM-DD" format.
 * @attr {string} min-date - The minimum selectable date in the format YYYY-MM-DD or ISO format
 * @attr {string} max-date - The maximum selectable date in the format YYYY-MM-DD or ISO format
 *
 * @prop {View} view
 * @prop {number} year
 * @prop {number} month
 * @prop {string} date
 * @prop {string} minDate
 * @prop {string} maxDate
 *
 * @fires {CustomEvent<{ date: string }>} date-select - Fired on every user selection action (click or keyboard), regardless of whether the date value has changed.
 * @fires {CustomEvent<{ source: CustomCalendar, attribute: 'date', oldValue: string | null, newValue: string }>} change - Fired only when the `date` attribute's value actually changes.
 */
export const CustomCalendar = createRushElement(class extends RushElement {
  [key: string]: unknown;

  pendingUpdates = new Set<ObservedAttribute>();
  eventAttributes = new Set(["date"]);

  static defaultTemplate = template;
  static defaultSheets = [defaultSheet];
  static observedAttributes = [...observedAttributes];

  static translations: {[locale: string]: {[key: string]: string}} = translations;

  static init() {
    initCustomElement("custom-calendar", CustomCalendar);
  }

  static getConstructor() {
    const result = customElements.get("custom-calendar") || CustomCalendar;
    return result as typeof CustomCalendar;
  }

  get locale() {
    return this.getAttribute("locale") || "en";
  }
  set locale(value: string) {
    this.setAttribute("locale", value);
  }

  get view(): View {
    return this.getAttribute("view") as View || "dates";
  }
  set view(value: View) {
    this.setAttribute("view", value);
  }

  get year() {
    return Number(this.getAttribute("year") || new Date().getFullYear());
  }
  set year(num: number) {
    this.setAttribute("year", String(num));
  }

  get month() {
    return Number(this.getAttribute("month") || new Date().getMonth());
  }
  set month(value: number) {
    this.setAttribute("month", String(value));
  }

  get date() {
    return this.getAttribute("date") || 
      getDateString(new Date(this.year, this.month, new Date().getDate()));
  }
  set date(d: string) {
    this.setAttribute("date", d);
  }

  get minDate() {
    return this.getAttribute("min-date") || defaultMinDate;
  }
  set minDate(value: string) {
    this.setAttribute("min-date", value);
  }

  get maxDate() {
    return this.getAttribute("max-date") || defaultMaxDate;
  }
  set maxDate(value: string) {
    this.setAttribute("max-date", value);
  }

  connectedCallback() {
    super.connectedCallback();
  }

  attachHandlers() {
    const nextMonthButton = this.shadowRoot.getElementById("next-month");
    const prevMonthButton = this.shadowRoot.getElementById("prev-month");
    nextMonthButton?.addEventListener("click", this.onNextMonthClick as EventListener);
    prevMonthButton?.addEventListener("click", this.onNextMonthClick as EventListener);

    const yearMonthToggler = this.shadowRoot.getElementById("year-month-toggler");
    yearMonthToggler?.addEventListener("click", this.onYearSelectorClick as EventListener);

    this.shadowRoot.addEventListener("click", this.onDateClick as EventListener);
    this.shadowRoot.addEventListener("click", this.onYearTdClick as EventListener);
    this.shadowRoot.addEventListener("click", this.onMonthTdClick as EventListener);

    this.shadowRoot.addEventListener("keydown", this.onTdKeyDown as EventListener);

    const todayButton = this.shadowRoot.getElementById("today");
    todayButton?.addEventListener("click", this.onTodayClick as EventListener);
  }

  setDefaultAttributes() {
    const ensureAttribute = (name: string, value: string) => {
      if (!this.hasAttribute(name)) this.setAttribute(name, value);
    };

    const dateTimestamp = this.date ? +new Date(this.date) : -1;
    const isOutsideRange = dateTimestamp < +new Date(this.minDate) || dateTimestamp > +new Date(this.maxDate);

    if (dateTimestamp !== -1 && isOutsideRange) {
      throw new Error("Date is less than minimum or greater than maximum");
    }

    ensureAttribute("locale", navigator.language);
    ensureAttribute("view", "dates");
    ensureAttribute("date", this.date);
    ensureAttribute("month", String(this.month));
    ensureAttribute("year", String(this.year));
    ensureAttribute("min-date", this.minDate);
    ensureAttribute("max-date", this.maxDate);
  }

  render() {
    const view = this.view;
    const {pendingUpdates} = this;

    if (pendingUpdates.has("locale")) {
      this.renderActions();
      pendingUpdates.add("view").add("month").add("year");
    }

    if (pendingUpdates.has("month") || pendingUpdates.has("year")) {
      if (view === "dates" && !pendingUpdates.has("view")) this.renderDates();
      
      const h2 = this.shadowRoot.getElementById("month-year");
      if (h2) h2.textContent = this.formatYearMonth(this.year, this.month);
    }

    if (pendingUpdates.has("view")) {
      const tbodies = [...this.shadowRoot.querySelectorAll("tbody")];
      tbodies.forEach(tbody => tbody.innerHTML = "");

      if (view === "years") this.renderYears();
      else if (view === "months") this.renderMonths();
      else if (view === "dates") {
        this.renderWeekDays();
        this.renderDates();
        this.restrictTableHeight(false);
      }
    }

    this.highlightSelected(this.view);
    this.disableMonthArrowIfNeeded();

    pendingUpdates.clear();
  }

  renderWeekDays() {
    const currentTimestamp = Number(new Date());
    const formatter = new Intl.DateTimeFormat(this.locale, {
      weekday: "short",
    });

    const days = Array.from({length: 14}, (_, i) => new Date(currentTimestamp + msInDay * i));
    const startOfWeekIndex = days.findIndex(date => date.getDay() === 1);
    const weekDays = days
      .slice(startOfWeekIndex, startOfWeekIndex + 7)
      .map(date => formatter.format(date));

    const weadDaysRow = this.shadowRoot.getElementById("weekdays");
    assert(weadDaysRow instanceof HTMLTableRowElement);
    [...weadDaysRow.cells].forEach((cell, index) => cell.textContent = weekDays[index]);
  }

  renderDates() {
    const visibledDates = monthDates(new Date(this.year, this.month).toString());
    const weeksInMonth = visibledDates.length / 7;

    let ptr = 0;
    const tbody = document.createElement("tbody");
    tbody.id = "dates-tbody";

    for (let week = 0; week < weeksInMonth; week++) {
      const tr = document.createElement("tr");

      for (let day = 0; day < 7; day++) {
        const pointedDate = visibledDates[ptr];

        const td = document.createElement("td");
        td.classList.add("date-cell");
        td.dataset.date = getDateString(pointedDate);
        td.textContent = String(pointedDate.getDate());
        td.tabIndex = -1;

        const cellMonth = pointedDate.getMonth();
        if (cellMonth !== this.month) td.setAttribute("disabled", "");

        tr.append(td);
        ptr += 1;
      }

      tbody.append(tr);
    }

    const oldTbody = this.shadowRoot.getElementById("dates-tbody");
    assert(oldTbody);
    oldTbody.replaceWith(tbody);
  }

  renderYears() {
    const {minDate, maxDate} = this;
    const minYear = new Date(minDate).getFullYear();
    const maxYear = new Date(maxDate).getFullYear();
    const yearsPerRow = 4;
    const maxRows = Math.ceil((maxYear + 1 - minYear) / yearsPerRow);
    const tbody = document.createElement("tbody");
    tbody.id = "years-tbody";

    for (let row = 0; row < maxRows; row++) {
      const tr = document.createElement("tr");

      for (let col = 0; col < yearsPerRow; col++) {
        const td = document.createElement("td");
        td.classList.add("year-cell");

        const year = String(minYear + (row * yearsPerRow) + col);
        if (Number(year) > maxYear) break;

        td.dataset.year = year;
        td.tabIndex = -1;
        td.textContent = year;

        tr.append(td);
      }

      tbody.append(tr);
    }

    this.shadowRoot.getElementById("years-tbody")?.replaceWith(tbody);

    const currentYearTd = tbody.querySelector(`[data-year="${this.year}"]`);

    assert(currentYearTd instanceof HTMLTableCellElement);
    currentYearTd.focus();
  }

  renderMonths() {
    const tbody = document.createElement("tbody");
    tbody.id = "months-tbody";
    const rows = 4;
    const cols = 3;
    const locale = this.locale;

    for (let row = 0; row < rows; row++) {
      const tr = document.createElement("tr");
      for (let col = 0; col < cols; col++) {
        const td = document.createElement("td");
        td.classList.add("month-cell");

        const index = row * cols + col;
        td.dataset.month = String(index);
        td.tabIndex = -1;
        td.textContent = new Date(
          new Date().setMonth(index),
        ).toLocaleDateString(locale, {month: "short"});

        tr.append(td);
      }
      tbody.append(tr);
    }

    this.shadowRoot.getElementById("months-tbody")?.replaceWith(tbody);

    const currentMonthTd = tbody.querySelector(`[data-month="${this.month}"]`);
    if (currentMonthTd instanceof HTMLTableCellElement) {
      currentMonthTd.focus();
    }
  }

  renderActions() {
    const translations = CustomCalendar.translations[this.locale];

    const todayButton = this.shadowRoot.getElementById("today");
    if (todayButton) todayButton.textContent = translations?.today || "Today";

    const cancelButton = this.shadowRoot.getElementById("cancel");
    if (cancelButton) cancelButton.textContent = translations?.cancel || "Cancel";
  }

  onNextMonthClick() {
    const host = getHost(this);

    const isNextMonthBtn = this.id === "next-month";
    const next = isNextMonthBtn ? host.month + 1 : host.month - 1;

    if (next < 0) host.year -= 1;
    else if (next > 11) host.year += 1;

    host.month = (next + 12) % 12;
  }

  onDateClick(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof Element)) return;
    if (target.hasAttribute("disabled")) return;
    if (!target.classList.contains("date-cell")) return;

    const host = getHost(this);
    const newDate = getDateString(new Date(host.year, host.month, Number(target.textContent)));
    host.date = newDate;

    this.dispatchEvent(new CustomEvent("date-select", {
      bubbles: true, 
      composed: true,
      detail: { source: this, date: newDate },
    }));
  }

  onYearSelectorClick() {
    const host = getHost(this);
    host.restrictTableHeight(true);

    if (host.view === "dates") host.view = "years";
    else host.view = "dates";
  }

  onYearTdClick(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof HTMLTableCellElement)) return;
    if (!target.classList.contains("year-cell")) return;

    const host = getHost(target);

    host.year = Number(target.textContent);
    host.view = "months";
  }

  onMonthTdClick(event: PointerEvent) {
    const {target} = event;
    if (!(target instanceof HTMLTableCellElement)) return;
    if (!target.classList.contains("month-cell")) return;

    const host = getHost(target);

    host.month = Number(target.dataset.month);
    host.view = "dates";

    const yearToggler = host.shadowRoot.getElementById("year-month-toggler");
    if (yearToggler instanceof HTMLButtonElement) {
      queueMicrotask(() => yearToggler.focus());
    }
  }
  
  onTdKeyDown(event: KeyboardEvent) {
    const { target: td, code } = event;
    if (!(td instanceof HTMLTableCellElement)) return;

    // Универсальные ключи
    if (code === "Enter" || code === "Space") {
      event.preventDefault(); // Запретим прокрутку
      td.click();
      return;
    }

    const host = getHost(td);
    if (host.view === "dates") host.onDateCellKeyDown(event, td);
    else host.onGridViewKeyDown(event, td);
  }

  onTodayClick() {
    const today = new Date();
    const host = getHost(this);

    host.view = "dates";
    host.year = today.getFullYear();
    host.month = today.getMonth();
    host.date = getDateString(today);
  }

  onDateCellKeyDown(event: KeyboardEvent, td: HTMLTableCellElement) {
    const { code, shiftKey } = event;
    const tr = td.closest("tr");
    assert(tr instanceof HTMLTableRowElement);
    const host = getHost(td);

    switch (code) {
      case "ArrowLeft": {
        event.preventDefault();
        const nextDate = new Date(Number(new Date(String(td.dataset.date))) - msInDay);
        host.moveDateFocus(nextDate, host);
        break;
      }
      case "ArrowRight": {
        event.preventDefault();
        const nextDate = new Date(Number(new Date(String(td.dataset.date))) + msInDay);
        host.moveDateFocus(nextDate, host);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const nextDate = new Date(Number(new Date(String(td.dataset.date))) - 7 * msInDay);
        host.moveDateFocus(nextDate, host);
        break;
      }
      case "ArrowDown": {
        event.preventDefault();
        const nextDate = new Date(Number(new Date(String(td.dataset.date))) + 7 * msInDay);
        host.moveDateFocus(nextDate, host);
        break;
      }
      case "Home": {
        tr.cells[0].focus();
        break;
      }
      case "End": {
        tr.cells[tr.cells.length - 1].focus();
        break;
      }
      case "PageUp":
      case "PageDown": {
        event.preventDefault();
        const { date } = td.dataset;
        assert(date);

        const dir = code === "PageUp" ? -1 : 1;
        const monthDiff = (shiftKey ? 12 : 1) * dir;
        const minYear = new Date(host.minDate).getFullYear();
        const maxYear = new Date(host.maxDate).getFullYear();
        const dateToFocus = host.addMonthSafely(new Date(date), monthDiff, minYear, maxYear);
        if (!dateToFocus) return;

        host.year = dateToFocus.getFullYear();
        host.month = dateToFocus.getMonth();

        queueMicrotask(() => {
          const cellToFocus = host.getDateCell(dateToFocus);
          assert(cellToFocus instanceof HTMLTableCellElement);
          cellToFocus.focus();
        });
        break;
      }
    }
  }

  onGridViewKeyDown(event: KeyboardEvent, td: HTMLTableCellElement) {
    const { code } = event;
    const host = getHost(td);

    switch (code) {
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        host.moveFocusFromTd(td, code as ArrowKey);
        break;
    }
  }

  addMonthSafely(d: Date, delta: number, minYear: number, maxYear: number) {
    const nextPeriodLastDate = new Date(d.getFullYear(), d.getMonth() + delta + 1, 0);
    const nextPeriodFirstDate = new Date(d.getFullYear(), d.getMonth() + delta);
    const dateOfNextPeriod = new Date(d.getFullYear(), d.getMonth() + delta, d.getDate());

    const nextPeriodYear = nextPeriodFirstDate.getFullYear();
    if (nextPeriodYear < minYear || nextPeriodYear > maxYear) return null;

    return new Date(Math.min(+dateOfNextPeriod, +nextPeriodLastDate));
  }

  highlightSelected(view: View) {
    const {shadowRoot} = this;

    const selected = shadowRoot.querySelector("[aria-selected='true']");
    if (selected instanceof HTMLElement) {
      selected.ariaSelected = null;
      selected.tabIndex = -1;
    }

    const field = view.slice(0, -1); // dates -> date, months -> month...
    const selectedValue = this[field];
    const cell = shadowRoot.querySelector(`[data-${field}="${selectedValue}"]`);

    if (cell instanceof HTMLElement) {
      cell.ariaSelected = "true";
      cell.tabIndex = 0;
    } else {
      const firstTd = shadowRoot.querySelector("td:not([disabled])");
      if (firstTd instanceof HTMLTableCellElement) firstTd.tabIndex = 0;
    }
  }

  moveDateFocus(nextDate: Date, host: this) {
    if (+nextDate < +new Date(host.minDate) || +nextDate > +new Date(host.maxDate)) return;

    const isNextDateFromOtherMonth = nextDate.getMonth() !== host.month;
    const isNextDateFromOtherYear = nextDate.getFullYear() !== host.year;

    if (isNextDateFromOtherYear) host.year = nextDate.getFullYear();
    if (isNextDateFromOtherMonth) host.month = nextDate.getMonth();

    queueMicrotask(() => {
      const nextTd = host.getDateCell(nextDate);
      assert(nextTd instanceof HTMLTableCellElement);
      nextTd.focus();
    });
  }

  moveFocusFromTd(td: HTMLTableCellElement, code: ArrowKey) {
    const tr = td.closest("tr");
    assert(tr instanceof HTMLTableRowElement);

    const tbody = tr.closest("tbody");
    assert(tbody instanceof HTMLTableSectionElement);

    const {sectionRowIndex} = tr;
    const {cellIndex} = td;

    const maxRowIndex = tbody.rows.length - 1;
    const maxColIndex = tr.cells.length - 1;

    let nextCell: HTMLTableCellElement | undefined;

    if (code === "ArrowDown" && sectionRowIndex < maxRowIndex) {
      nextCell = tbody.rows[sectionRowIndex + 1].cells[cellIndex];
    } 

    if (code === "ArrowUp" && sectionRowIndex > 0) {
      nextCell = tbody.rows[sectionRowIndex - 1].cells[cellIndex];
    } 

    if (code === "ArrowLeft") {
      if (cellIndex > 0) {
        nextCell = tbody.rows[sectionRowIndex].cells[cellIndex - 1];
      } else if (sectionRowIndex > 0) {
        nextCell = tbody.rows[sectionRowIndex - 1].cells[maxColIndex];
      }
    }

    if (code === "ArrowRight") {
      if (cellIndex < maxColIndex) {
        nextCell = tbody.rows[sectionRowIndex].cells[cellIndex + 1];
      } else if (sectionRowIndex < maxRowIndex) {
        nextCell = tbody.rows[sectionRowIndex + 1].cells[0];
      }
    }

    if (nextCell && !nextCell.hasAttribute("disabled")) {
      td.tabIndex = -1;
      nextCell.tabIndex = 0;
      nextCell.focus();
    }
  }

  disableMonthArrowIfNeeded() {
    const {year, month, minDate, maxDate, shadowRoot} = this;

    const prevMonthBtn = shadowRoot.getElementById("prev-month");
    assert(prevMonthBtn instanceof HTMLButtonElement);
    const prevMonthDate = new Date(year, month - 1);
    prevMonthBtn.disabled = +prevMonthDate < +new Date(minDate);

    const nextMonthBtn = shadowRoot.getElementById("next-month");
    assert(nextMonthBtn instanceof HTMLButtonElement);
    const nextMonthDate = new Date(year, month + 1);
    nextMonthBtn.disabled = +nextMonthDate > +new Date(maxDate);
  }

  getDateCell(date: Date) {
    return this.shadowRoot.querySelector(`[data-date="${getDateString(date)}"]`);
  }

  formatYearMonth(year: number, month: number) {
    return new Date(year, month).toLocaleDateString(this.locale, {
      month: "long",
      year: "numeric",
    });
  }

  restrictTableHeight(shouldBeRestricted: boolean) {
    const tablesContainer = this.shadowRoot.querySelector(".tables-container");
    assert(tablesContainer instanceof HTMLElement);

    const varName = "--table-height";

    if (shouldBeRestricted) {
      const currentHeight = tablesContainer.getBoundingClientRect().height + "px";
      tablesContainer.style.setProperty(varName, currentHeight);
    } else {
      tablesContainer.style.setProperty(varName, "");
    }
  }
});

export type CustomCalendar = InstanceType<typeof CustomCalendar>;